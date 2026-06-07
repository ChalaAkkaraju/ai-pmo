/**
 * Agent runner — the end-to-end orchestrator that:
 *   1. validates the role token and permission
 *   2. (optional) auto-routes to the right specialist via Haiku when
 *      agent_type === 'auto'
 *   3. assembles the context (agent prompt + worked example + project state)
 *   4. calls OpenRouter (Opus 4.7)
 *   5. writes the result to agent_outputs (including router metadata if routed)
 *   6. returns the new row + routing info to the caller
 *
 * Called from app/api/agent/route.ts and from scripts/test-agent.ts.
 */

import { createSupabaseServiceClient } from './supabase';
import { canRoleInvokeAgent, ROLE_DEFINITIONS } from './roles';
import {
  assembleUserMessage,
  loadAgentPrompt,
  loadProjectState,
  loadPortfolioState,
  loadWorkedExample,
} from './agent-context';
import { invokeModel } from './openrouter';
import { routeUserIntent, type RouterResult } from './agent-router';
import type { AgentType, Role } from './types';

export interface RunAgentInput {
  /** Role token from the URL (identifies the colleague). */
  token: string;
  /** Which agent to invoke. 'auto' invokes the router first to pick a specialist. */
  agent_type: AgentType | 'auto';
  /** Project code (e.g. NW-REN-2511) if the agent operates on a specific project. */
  project_code?: string;
  /** User's prompt text — what they typed into the chat. */
  user_prompt: string;
  /** When true, agent produces a chat-panel summary instead of a formal document. */
  concise?: boolean;
  /**
   * When true, the call goes through end-to-end (LLM + return markdown) but the
   * result is NOT written to agent_outputs. Used by the "Show full report"
   * regeneration on the dashboard — the original quick brief is already logged,
   * and we don't want a duplicate activity entry for the same underlying request.
   */
  skip_log?: boolean;
  /** Optional client-generated id grouping invocations from one chat thread. */
  session_id?: string | null;
}

export interface RoutingInfo {
  /** Was this output produced via the auto-router? */
  auto: boolean;
  /** Did the router fall back to a default because its output was invalid? */
  fallback: boolean;
  /** Raw text the router model returned (for debugging). */
  router_raw?: string;
  /** Router tokens used. */
  router_tokens_used?: number | null;
  /** Router dollar cost. */
  router_cost_usd?: number | null;
  /** Router wall-clock duration. */
  router_duration_ms?: number;
}

export type RunAgentResult =
  | {
      ok: true;
      agent_output_id: string;
      output_md: string;
      tokens_used: number | null;
      cost_usd: number | null;
      model: string | null;
      /** Echoed back so callers know which specialist ran (esp. after auto). */
      agent_type: AgentType;
      /** Routing metadata. Only `auto: false` for explicit selections. */
      routing: RoutingInfo;
    }
  | {
      ok: false;
      status: 400 | 401 | 403 | 404 | 500;
      error: string;
    };

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const supabase = createSupabaseServiceClient();

  // ---- 1. Validate role token ----
  const { data: role, error: roleErr } = await supabase
    .from('roles')
    .select('*')
    .eq('token', input.token)
    .maybeSingle<Role>();

  if (roleErr) {
    return { ok: false, status: 500, error: `Role lookup failed: ${roleErr.message}` };
  }
  if (!role) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  const allowedAgents = ROLE_DEFINITIONS[role.role_type]?.allowed_agents ?? [];
  if (allowedAgents.length === 0) {
    return {
      ok: false,
      status: 403,
      error: `Role ${role.role_type} has no allowed agents`,
    };
  }

  // ---- 2. Resolve agent_type — route if 'auto', else use directly ----
  let effectiveAgentType: AgentType;
  let routerResult: RouterResult | null = null;

  if (input.agent_type === 'auto') {
    try {
      routerResult = await routeUserIntent(input.user_prompt, allowedAgents);
      effectiveAgentType = routerResult.agent_type;
    } catch (err) {
      return {
        ok: false,
        status: 500,
        error: `Router call failed: ${(err as Error).message}`,
      };
    }
  } else {
    effectiveAgentType = input.agent_type;
  }

  // ---- 3. Permission check on the effective agent ----
  if (!canRoleInvokeAgent(role.role_type, effectiveAgentType)) {
    return {
      ok: false,
      status: 403,
      error: `Role ${role.role_type} is not permitted to invoke agent ${effectiveAgentType}`,
    };
  }

  // ---- 4. Load agent system prompt ----
  let systemPrompt: string;
  try {
    systemPrompt = loadAgentPrompt(effectiveAgentType);
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: `Could not load agent prompt: ${(err as Error).message}`,
    };
  }

  // ---- 5. Load worked example (best effort) ----
  const workedExample = await loadWorkedExample(supabase, effectiveAgentType);

  // ---- 6. Load project state if project_code provided ----
  let projectState = {
    project: null as Record<string, unknown> | null,
    issues: [] as Array<Record<string, unknown>>,
    risks: [] as Array<Record<string, unknown>>,
    change_orders: [] as Array<Record<string, unknown>>,
    variance_reports: [] as Array<Record<string, unknown>>,
  };
  let portfolioState = null as Awaited<ReturnType<typeof loadPortfolioState>>;
  if (input.project_code) {
    projectState = await loadProjectState(supabase, input.project_code);
    if (!projectState.project) {
      return {
        ok: false,
        status: 404,
        error: `Project with code "${input.project_code}" not found`,
      };
    }
  } else {
    // Portfolio-scope call — ground with real portfolio data.
    portfolioState = await loadPortfolioState(supabase);
  }

  // ---- 7. Assemble user message ----
  const userMessage = assembleUserMessage({
    userPrompt: input.user_prompt,
    workedExample,
    projectState,
    portfolioState,
    concise: input.concise === true,
  });

  // ---- 8. Call OpenRouter (specialist agent — Opus 4.7) ----
  let result;
  try {
    result = await invokeModel({ systemPrompt, userMessage });
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: `OpenRouter call failed: ${(err as Error).message}`,
    };
  }

  // ---- 9. Write to agent_outputs (unless skip_log requested) ----
  const projectId = projectState.project
    ? (projectState.project as { id: string }).id
    : null;

  const routedFromIntent = routerResult
    ? routerResult.is_fallback
      ? 'auto:fallback'
      : 'auto'
    : null;

  let agentOutputId = '';

  if (input.skip_log !== true) {
    // Base row (always valid against the current schema).
    const baseRow = {
      project_id: projectId,
      agent_type: effectiveAgentType,
      invoked_by_role_id: role.id,
      user_prompt: input.user_prompt,
      input_payload: {
        agent_type_requested: input.agent_type,
        agent_type_resolved: effectiveAgentType,
        project_code: input.project_code ?? null,
        has_worked_example: workedExample !== null,
        model_used: result.model,
        ...(routerResult && {
          router: {
            raw: routerResult.router_raw,
            tokens: routerResult.tokens_used,
            cost_usd: routerResult.cost_usd,
            duration_ms: routerResult.duration_ms,
            fallback: routerResult.is_fallback,
          },
        }),
      },
      output_md: result.output_md,
      tokens_used: result.tokens_used,
      cost_usd: result.cost_usd,
      routed_from_intent: routedFromIntent,
    };

    let { data: insertedRow, error: insertErr } = await supabase
      .from('agent_outputs')
      .insert({ ...baseRow, session_id: input.session_id ?? null })
      .select('id')
      .single();

    // Resilience: if migration 0008 (session_id column) hasn't been applied
    // yet, Supabase rejects the unknown column. Retry without it so agent
    // invocations keep working; session_id persists automatically once the
    // column exists.
    if (insertErr && /session_id/i.test(insertErr.message ?? '')) {
      ({ data: insertedRow, error: insertErr } = await supabase
        .from('agent_outputs')
        .insert(baseRow)
        .select('id')
        .single());
    }

    if (insertErr || !insertedRow) {
      return {
        ok: false,
        status: 500,
        error: `DB insert failed: ${insertErr?.message ?? 'no row returned'}`,
      };
    }
    agentOutputId = insertedRow.id;
  }

  return {
    ok: true,
    agent_output_id: agentOutputId,
    output_md: result.output_md,
    tokens_used: result.tokens_used,
    cost_usd: result.cost_usd,
    model: result.model,
    agent_type: effectiveAgentType,
    routing: {
      auto: routerResult !== null,
      fallback: routerResult?.is_fallback ?? false,
      router_raw: routerResult?.router_raw,
      router_tokens_used: routerResult?.tokens_used,
      router_cost_usd: routerResult?.cost_usd,
      router_duration_ms: routerResult?.duration_ms,
    },
  };
}
