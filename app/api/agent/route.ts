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
];

// 'auto' triggers the agent router (lib/agent-router.ts) which picks a
// specialist using Claude Haiku. See PMO_LLM_Agent_Routing_Design.md.
const VALID_AGENT_INPUTS: Array<AgentType | 'auto'> = ['auto', ...VALID_AGENT_TYPES];

const invokeAgentSchema = z.object({
  token: z.string().min(8, 'token must be at least 8 characters'),
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
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
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
