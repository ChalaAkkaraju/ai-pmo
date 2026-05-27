/**
 * Agent auto-router — classifier that picks the most appropriate specialist
 * agent for a given user prompt.
 *
 * Uses a cheaper model (Claude Haiku by default) for one-token classification
 * so the cost is negligible against the specialist call. Falls back to the
 * first allowed agent if the router output is unrecognised.
 *
 * Cost: ~$0.001–0.005 per auto invocation depending on prompt length.
 * Latency: typically 0.5–1.5 seconds.
 *
 * See PMO_LLM_Agent_Routing_Design.md for the design rationale.
 */

import OpenAI from 'openai';
import type { AgentType } from './types';

// OpenRouter's Haiku 4.5 model ID uses a DOT, not a hyphen — different from
// Opus 4.7 which is hyphenated. See https://openrouter.ai/anthropic/claude-haiku-4.5
const ROUTER_MODEL = process.env.OPENROUTER_ROUTER_MODEL ?? 'anthropic/claude-haiku-4.5';

/** One-line description of each agent, used in the router's system prompt. */
const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  charter_drafter:
    'Drafts the project charter (12 sections including scope, deliverables, milestones, governance) following the Northwood template.',
  stakeholder_analyst:
    'Produces the stakeholder register and engagement-strategy plan, identifying ~12-15 stakeholder roles across client, regulator, community, vendor, and internal categories.',
  wbs_builder:
    'Builds the Work Breakdown Structure (PMBOK Level 1-3) with deliverable-oriented decomposition.',
  schedule_reasoner:
    'Reasons about the project schedule: critical path, milestones, float, sequencing logic, schedule risks.',
  budget_builder:
    'Builds the cost breakdown structure: allocation across engineering / procurement / construction / commissioning / contingency / management reserve.',
  communications_planner:
    'Produces the communications management plan: stakeholder needs, cadence, channels, escalation paths, reporting templates.',
  issue_logger:
    'Reviews the project issue log and analyses severity, age, ownership, and outstanding items.',
  variance_analyst:
    'Analyses CPI/SPI trends, cost variance, schedule variance, contingency consumption, projected margin trends.',
  change_order_reviewer:
    'Reviews change orders with four-frame commercial analysis (scope, schedule, cost, contractual basis) and assesses margin protection.',
  risk_analyst:
    'Produces risk register narrative: cross-cutting classification, status, response stance, trigger conditions, top items to watch.',
  lessons_learned_synthesiser:
    'Synthesises lessons learned: situation, action, outcome, generalised lesson. Spans technical, commercial, schedule, and stakeholder themes.',
  closeout_reporter:
    'Drafts the project closeout report: final cost & schedule outcome vs baseline, scope changes, risk closeout, lessons captured, outstanding items.',
  portfolio_risk_reviewer:
    'Reviews portfolio-level risk pattern emergence across multiple projects, recommends portfolio-level mitigation strategies.',
};

let cachedClient: OpenAI | null = null;
function getRouterClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your-openrouter-key') {
    throw new Error('OPENROUTER_API_KEY is missing or still the placeholder.');
  }
  cachedClient = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_REFERRER ?? 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? 'pmo-llm-demo-router',
    },
    // Tight timeout so a bad model name fails fast instead of hanging the
    // whole agent invocation.
    timeout: 20_000,
    maxRetries: 1,
  });
  return cachedClient;
}

export interface RouterResult {
  agent_type: AgentType;
  is_fallback: boolean;
  router_raw: string;
  tokens_used: number | null;
  cost_usd: number | null;
  duration_ms: number;
}

export async function routeUserIntent(
  userPrompt: string,
  allowedAgents: AgentType[],
): Promise<RouterResult> {
  const t0 = Date.now();

  if (allowedAgents.length === 0) {
    throw new Error('routeUserIntent: allowedAgents is empty');
  }
  if (allowedAgents.length === 1) {
    return {
      agent_type: allowedAgents[0],
      is_fallback: false,
      router_raw: '(single allowed agent — no routing needed)',
      tokens_used: 0,
      cost_usd: 0,
      duration_ms: Date.now() - t0,
    };
  }

  const client = getRouterClient();

  const agentList = allowedAgents
    .map((a) => `- ${a}: ${AGENT_DESCRIPTIONS[a]}`)
    .join('\n');

  const systemPrompt = `You are an agent router for an EPC project management system. Pick the single most appropriate specialist agent for the user's prompt.

Available agents (you must pick exactly one of these identifiers):
${agentList}

Respond with ONLY the agent_type identifier (e.g. "risk_analyst") — no explanation, no quotes, no markdown, no surrounding whitespace. The identifier must exactly match one from the list above.`;

  const response = await client.chat.completions.create({
    model: ROUTER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 30,
    temperature: 0,
  });

  const raw = (response.choices?.[0]?.message?.content ?? '').trim();
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z_]/g, '')
    .trim();

  const usage = response.usage as
    | (typeof response.usage & { cost?: number })
    | undefined;
  const tokens_used =
    typeof usage?.total_tokens === 'number' ? usage.total_tokens : null;
  const cost_usd = typeof usage?.cost === 'number' ? usage.cost : null;
  const duration_ms = Date.now() - t0;

  // Exact match against the allowed agent list
  if (allowedAgents.includes(cleaned as AgentType)) {
    return {
      agent_type: cleaned as AgentType,
      is_fallback: false,
      router_raw: raw,
      tokens_used,
      cost_usd,
      duration_ms,
    };
  }

  // Partial / substring match
  for (const candidate of allowedAgents) {
    if (cleaned.includes(candidate) || candidate.includes(cleaned)) {
      return {
        agent_type: candidate,
        is_fallback: false,
        router_raw: raw,
        tokens_used,
        cost_usd,
        duration_ms,
      };
    }
  }

  // Fallback: first allowed agent
  return {
    agent_type: allowedAgents[0],
    is_fallback: true,
    router_raw: raw,
    tokens_used,
    cost_usd,
    duration_ms,
  };
}
