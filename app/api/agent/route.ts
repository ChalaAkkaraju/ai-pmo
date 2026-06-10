/**
 * Agent invocation route handler (Phase 2.3 — fully wired).
 *
 * POST /api/agent
 *
 * Request body:
 *   {
 *     token: string;          // role URL token (8+ chars)
 *     agent_type: string;     // one of the AgentType union (see lib/types)
 *                             // OR 'auto' to invoke the auto-router (Phase 2.5)
 *     project_code?: string;  // e.g. "NW-REN-2511"; omit for portfolio-level agents
 *     user_prompt: string;    // what the colleague typed
 *   }
 *
 * Response:
 *   200 OK {
 *     agent_output_id, output_md, tokens_used, cost_usd, model,
 *     agent_type,        // resolved agent (after routing if 'auto')
 *     routing: {         // routing metadata
 *       auto: boolean,
 *       fallback: boolean,
 *       router_raw?: string,
 *       router_tokens_used?: number | null,
 *       router_cost_usd?: number | null,
 *       router_duration_ms?: number,
 *     }
 *   }
 *   400 Bad Request { error }
 *   401 Unauthorized { error } — invalid token
 *   403 Forbidden { error } — role can't invoke this agent
 *   404 Not Found { error } — project_code not found
 *   500 Internal { error } — OpenRouter or DB failure
 *
 * Implementation defers to lib/agent-runner.ts so the same logic is usable
 * from scripts/test-agent.ts (CLI verification) without going through HTTP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runAgent } from '@/lib/agent-runner';
import { createSupabaseServiceClient } from '@/lib/supabase';
import type { AgentType } from '@/lib/types';

const VALID_AGENT_TYPES: AgentType[] = [
  'charter_drafter',
  'stakeholder_analyst',
  'wbs_builder',
  'schedule_reasoner',
  'budget_builder',
  'communications_planner',
  'issue_logger',
  'variance_analyst',
  'change_order_reviewer',
  'risk_analyst',
  'lessons_learned_synthesiser',
  'closeout_reporter',
  'portfolio_risk_reviewer',
  'status_reporter',
  'cost_controller',
];

// 'auto' triggers the agent router (lib/agent-router.ts) which picks a
// specialist using Claude Haiku. See PMO_LLM_Agent_Routing_Design.md.
const VALID_AGENT_INPUTS: Array<AgentType | 'auto'> = ['auto', ...VALID_AGENT_TYPES];

const invokeAgentSchema = z.object({
  token: z.string().min(6, 'token must be at least 6 characters'),
  agent_type: z
    .string()
    .refine(
      (v): v is AgentType | 'auto' =>
        VALID_AGENT_INPUTS.includes(v as AgentType | 'auto'),
      {
        message: `agent_type must be one of: ${VALID_AGENT_INPUTS.join(', ')}`,
      },
    ),
  project_code: z.string().optional(),
  user_prompt: z.string().min(1, 'user_prompt cannot be empty'),
  concise: z.boolean().optional(),
  /** When true, don't write the response to agent_outputs (no duplicate activity entry). */
  skip_log: z.boolean().optional(),
  session_id: z.string().optional(),
});

// Vercel-serverless safety: Opus 4.7 can take 30-60s for long outputs.
// 60s is the default Hobby tier max. Pro is 300s.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: z.infer<typeof invokeAgentSchema>;
  try {
    const json = await request.json();
    body = invokeAgentSchema.parse(json);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: err.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Could not parse JSON body', detail: String(err) },
      { status: 400 },
    );
  }

  const result = await runAgent({
    token: body.token,
    agent_type: body.agent_type as AgentType | 'auto',
    project_code: body.project_code,
    user_prompt: body.user_prompt,
    concise: body.concise ?? false,
    skip_log: body.skip_log ?? false,
    session_id: body.session_id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Background long-form generation:
  // If this was a brief call (concise: true) AND we logged a row to attach
  // a cache to, fire off the long-form regen NOW so the cache is warm by
  // the time the user clicks "Show full report". The promise is intentionally
  // not awaited — the brief response goes back to the user immediately and
  // the long-form continues on the server.
  //
  // Note for Vercel deployment: serverless functions can be killed once the
  // response is sent; wrap this in next/server's `after()` (Next 15+) for prod.
  // Today (local dev / dev server keeps the process alive), `void` is enough.
  if (
    body.concise === true &&
    body.skip_log !== true &&
    result.agent_output_id
  ) {
    void generateAndCacheLongForm({
      token: body.token,
      agent_type: result.agent_type, // resolved type (not 'auto' — avoids re-routing)
      project_code: body.project_code,
      user_prompt: body.user_prompt,
      output_id: result.agent_output_id,
    });
  }

  return NextResponse.json(
    {
      agent_output_id: result.agent_output_id,
      output_md: result.output_md,
      tokens_used: result.tokens_used,
      cost_usd: result.cost_usd,
      model: result.model,
      agent_type: result.agent_type,
      routing: result.routing,
    },
    { status: 200 },
  );
}

/**
 * Generate the long-form version of an agent_output and cache it on the row.
 * Fire-and-forget — never throws. Logs to the server console on success/failure.
 *
 * Race-condition handling: if the user opens the report before this finishes
 * and the report page triggers its own regen, that path saves first. This
 * function double-checks the row before writing and bails out if the cache
 * is already populated.
 */
async function generateAndCacheLongForm(args: {
  token: string;
  agent_type: AgentType;
  project_code?: string;
  user_prompt: string;
  output_id: string;
}): Promise<void> {
  try {
    const longResult = await runAgent({
      token: args.token,
      agent_type: args.agent_type,
      project_code: args.project_code,
      user_prompt: args.user_prompt,
      concise: false, // long-form
      skip_log: true, // don't create a duplicate activity-feed entry
    });

    if (!longResult.ok) {
      console.warn(
        `[background long-form] runAgent failed for ${args.output_id.slice(0, 8)}…:`,
        longResult.error,
      );
      return;
    }

    const supabase = createSupabaseServiceClient();

    // Check cache state before writing. If something else (e.g., the report
    // page's own regen) already filled this in, leave it alone.
    const { data: existing, error: lookupError } = await supabase
      .from('agent_outputs')
      .select('full_output_md')
      .eq('id', args.output_id)
      .maybeSingle();

    if (lookupError) {
      console.warn(
        `[background long-form] lookup failed for ${args.output_id.slice(0, 8)}…:`,
        lookupError.message,
      );
      return;
    }
    if (existing?.full_output_md && existing.full_output_md.length > 0) {
      console.log(
        `[background long-form] ${args.output_id.slice(0, 8)}… already cached, skipping write`,
      );
      return;
    }

    const { error: updateError } = await supabase
      .from('agent_outputs')
      .update({ full_output_md: longResult.output_md })
      .eq('id', args.output_id);

    if (updateError) {
      console.warn(
        `[background long-form] DB update failed for ${args.output_id.slice(0, 8)}…:`,
        updateError.message,
      );
    } else {
      console.log(
        `[background long-form] cached ${longResult.output_md.length} chars for ${args.output_id.slice(0, 8)}…`,
      );
    }
  } catch (err) {
    console.warn(
      `[background long-form] unexpected error for ${args.output_id.slice(0, 8)}…:`,
      (err as Error).message,
    );
  }
}
