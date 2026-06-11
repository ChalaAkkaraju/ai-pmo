/**
 * Agent context assembly.
 *
 * For each agent invocation we need to construct two messages that mirror the
 * Phase 1 lifecycle simulation pattern:
 *
 *   system: <agent prompt from lib/agent-prompts/*.md>
 *   user:   <worked example + project state + user prompt, concatenated as
 *           clearly-labelled sections>
 *
 * This module handles loading those pieces from disk + Supabase and serialising
 * them into a single user message string.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentType } from './types';

const AGENT_PROMPTS_DIR = join(process.cwd(), 'lib', 'agent-prompts');

/**
 * Filename mapping for each agent's prompt file.
 */
const AGENT_PROMPT_FILES: Record<AgentType, string> = {
  charter_drafter: 'charter_drafter.md',
  stakeholder_analyst: 'stakeholder_analyst.md',
  wbs_builder: 'wbs_builder.md',
  schedule_reasoner: 'schedule_reasoner.md',
  budget_builder: 'budget_builder.md',
  communications_planner: 'communications_planner.md',
  issue_logger: 'issue_logger.md',
  variance_analyst: 'variance_analyst.md',
  change_order_reviewer: 'change_order_reviewer.md',
  risk_analyst: 'risk_analyst.md',
  lessons_learned_synthesiser: 'lessons_learned_synthesiser.md',
  closeout_reporter: 'closeout_reporter.md',
  portfolio_risk_reviewer: 'portfolio_risk_reviewer.md',
  status_reporter: 'status_reporter.md',
  cost_controller: 'cost_controller.md',
};

/**
 * Load the agent system prompt from disk.
 */
export function loadAgentPrompt(agentType: AgentType): string {
  const filename = AGENT_PROMPT_FILES[agentType];
  if (!filename) {
    throw new Error(`No prompt file mapped for agent type "${agentType}"`);
  }
  const path = join(AGENT_PROMPTS_DIR, filename);
  return readFileSync(path, 'utf-8');
}

/**
 * Load the canonical worked example for an agent from Supabase.
 *
 * Returns null if not found (the agent invocation can still proceed without
 * a worked example, though output quality may suffer).
 */
export async function loadWorkedExample(
  supabase: SupabaseClient,
  agentType: AgentType,
): Promise<{ artefact_name: string; past_project: string; content_md: string } | null> {
  const { data, error } = await supabase
    .from('worked_examples')
    .select('artefact_name, past_project, content_md')
    .eq('agent_type', agentType)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[agent-context] worked example lookup error: ${error.message}`);
    return null;
  }
  return data;
}

/**
 * Planning agents whose latest output is worth pulling from a *reference*
 * project to ground a new project's planning. Ordered in lifecycle sequence.
 */
const REFERENCE_PLANNING_AGENTS: AgentType[] = [
  'charter_drafter',
  'stakeholder_analyst',
  'wbs_builder',
  'schedule_reasoner',
  'budget_builder',
  'communications_planner',
];

/** Per-artefact character cap so reference grounding doesn't blow the budget. */
const MAX_REFERENCE_ARTEFACT_CHARS = 6000;

export interface ReferenceGrounding {
  project: Record<string, unknown>;
  artefacts: Array<{ agent_type: string; output_md: string }>;
}

/**
 * Load a "similar project" the new project was created from (via the intake
 * form's reference picker) plus its latest planning artefacts, to use as a
 * grounding basis. Returns null if the reference can't be found.
 */
export async function loadReferenceGrounding(
  supabase: SupabaseClient,
  referenceCode: string,
): Promise<ReferenceGrounding | null> {
  const { data: refProject } = await supabase
    .from('projects')
    .select('id, name, code, segment, contract_value_current, approved_budget_current, contingency, hard_deadline_description')
    .eq('code', referenceCode)
    .maybeSingle();
  if (!refProject) return null;

  const { data: outputs } = await supabase
    .from('agent_outputs')
    .select('agent_type, output_md, created_at')
    .eq('project_id', (refProject as { id: string }).id)
    .in('agent_type', REFERENCE_PLANNING_AGENTS)
    .order('created_at', { ascending: false });

  // Keep only the latest output per agent type, then order by lifecycle.
  const seen = new Set<string>();
  const artefacts: Array<{ agent_type: string; output_md: string }> = [];
  for (const o of (outputs ?? []) as Array<{ agent_type: string; output_md: string | null }>) {
    if (seen.has(o.agent_type)) continue;
    seen.add(o.agent_type);
    artefacts.push({ agent_type: o.agent_type, output_md: (o.output_md ?? '').slice(0, MAX_REFERENCE_ARTEFACT_CHARS) });
  }
  artefacts.sort(
    (a, b) =>
      REFERENCE_PLANNING_AGENTS.indexOf(a.agent_type as AgentType) -
      REFERENCE_PLANNING_AGENTS.indexOf(b.agent_type as AgentType),
  );

  return { project: refProject, artefacts };
}

/**
 * Load the relevant project state from Supabase for the given project.
 *
 * Returns issues, risks, change orders, variance reports — all the structured
 * data the agent might need to reason about. The agent's system prompt
 * determines which subset matters; we pass everything and let the LLM filter.
 */
import { loadStructuredFacts } from './project-facts';

export async function loadProjectState(
  supabase: SupabaseClient,
  projectCode: string,
): Promise<{
  project: Record<string, unknown> | null;
  issues: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
  change_orders: Array<Record<string, unknown>>;
  variance_reports: Array<Record<string, unknown>>;
  reference?: ReferenceGrounding | null;
  structured_facts?: string | null;
}> {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('code', projectCode)
    .maybeSingle();

  if (!project) {
    return { project: null, issues: [], risks: [], change_orders: [], variance_reports: [], reference: null, structured_facts: null };
  }

  const [issuesRes, risksRes, cosRes, variancesRes] = await Promise.all([
    supabase
      .from('issues')
      .select('issue_id, description, category, severity, owner, status, linked_wbs, linked_risk, opened_week, closed_week, closure_narrative')
      .eq('project_id', project.id)
      .order('opened_week', { ascending: true }),
    supabase
      .from('risks')
      .select('risk_id, category, description, probability, impact, score, response, owner, trigger, status, cross_cutting_class, pattern_link')
      .eq('project_id', project.id)
      .order('risk_id', { ascending: true }),
    supabase
      .from('change_orders')
      .select('co_id, driver, scope_summary, cost_impact_m, revenue_impact_m, schedule_impact_days, margin_realized_pct, status, approval_routing, executed_week, four_frame_analysis')
      .eq('project_id', project.id)
      .order('co_id', { ascending: true }),
    supabase
      .from('variance_reports')
      .select('report_week, cpi, spi, cost_variance_m, schedule_variance_days, contingency_consumed_m, projected_margin_pct, buffer_intact_days, full_report_md')
      .eq('project_id', project.id)
      .order('report_week', { ascending: true }),
  ]);

  // If this project was created from a reference (intake form), pull the
  // reference's planning artefacts to ground the agent's output.
  let reference: ReferenceGrounding | null = null;
  const refCode = (project as { intake_json?: { reference_project_code?: unknown } }).intake_json?.reference_project_code;
  if (typeof refCode === 'string' && refCode && refCode !== projectCode) {
    reference = await loadReferenceGrounding(supabase, refCode);
  }

  const structured_facts = await loadStructuredFacts(supabase, (project as { id: string }).id, project as Record<string, unknown>);

  return {
    project,
    issues: issuesRes.data ?? [],
    risks: risksRes.data ?? [],
    change_orders: cosRes.data ?? [],
    variance_reports: variancesRes.data ?? [],
    reference,
    structured_facts,
  };
}

/**
 * Portfolio-level grounding for portfolio-scope agent calls (no single project).
 * Without this, a portfolio question has no real data and the agent falls back
 * to its (fictional) worked example. Bounded to ACTIVE projects. The project
 * `code` is the project number colleagues ask for.
 */
export interface PortfolioState {
  projectCount: number;
  rollup: Array<{ code: string; name: string; segment: string; status: string; risks: number; issues: number; change_orders: number; co_value_m: number }>;
  change_orders: Array<{ project_code: string; project_name: string; co_id: string; driver: string; scope: string; cost_impact_m: number; revenue_impact_m: number; margin_realized_pct: number | null; status: string }>;
}

export async function loadPortfolioState(supabase: SupabaseClient): Promise<PortfolioState | null> {
  const { data: projects } = await supabase.from('projects').select('id, code, name, segment, status').limit(10000);
  if (!projects || projects.length === 0) return null;
  const active = (projects as Array<{ id: string; code: string; name: string; segment: string; status: string }>).filter((p) => p.status === 'Active');
  if (active.length === 0) return null;
  const ids = active.map((p) => p.id);
  const byId = new Map(active.map((p) => [p.id, p]));

  const [cosRes, risksRes, issuesRes] = await Promise.all([
    supabase.from('change_orders').select('project_id, co_id, driver, scope_summary, cost_impact_m, revenue_impact_m, margin_realized_pct, status').in('project_id', ids),
    supabase.from('risks').select('project_id').in('project_id', ids),
    supabase.from('issues').select('project_id').in('project_id', ids),
  ]);
  const coRows = (cosRes.data ?? []) as Array<Record<string, unknown>>;
  const tally = (rows: Array<Record<string, unknown>> | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) { const k = String(r.project_id); m.set(k, (m.get(k) ?? 0) + 1); }
    return m;
  };
  const riskCount = tally(risksRes.data as Array<Record<string, unknown>> | null);
  const issueCount = tally(issuesRes.data as Array<Record<string, unknown>> | null);
  const coCount = new Map<string, number>(), coValue = new Map<string, number>();
  for (const c of coRows) {
    const k = String(c.project_id);
    coCount.set(k, (coCount.get(k) ?? 0) + 1);
    coValue.set(k, (coValue.get(k) ?? 0) + (Number(c.cost_impact_m) || 0));
  }

  const rollup = active.map((p) => ({
    code: p.code, name: p.name, segment: p.segment, status: p.status,
    risks: riskCount.get(p.id) ?? 0, issues: issueCount.get(p.id) ?? 0,
    change_orders: coCount.get(p.id) ?? 0, co_value_m: Math.round((coValue.get(p.id) ?? 0) * 1000) / 1000,
  }));
  const change_orders = coRows.map((c) => {
    const pr = byId.get(String(c.project_id));
    return {
      project_code: pr?.code ?? '', project_name: pr?.name ?? '', co_id: String(c.co_id),
      driver: String(c.driver ?? ''), scope: String(c.scope_summary ?? '').slice(0, 140),
      cost_impact_m: Number(c.cost_impact_m) || 0, revenue_impact_m: Number(c.revenue_impact_m) || 0,
      margin_realized_pct: (c.margin_realized_pct as number | null) ?? null, status: String(c.status ?? ''),
    };
  }).sort((a, b) => a.project_code.localeCompare(b.project_code));

  return { projectCount: active.length, rollup, change_orders };
}

/**
 * Assemble the structured user message for an agent invocation.
 *
 * Format follows the pattern used in Phase 1 (multiple labelled sections
 * separated by `---`). The LLM treats each section as part of the context
 * the user is supplying for the task.
 */
export function assembleUserMessage(params: {
  userPrompt: string;
  workedExample: { artefact_name: string; past_project: string; content_md: string } | null;
  projectState: Awaited<ReturnType<typeof loadProjectState>>;
  /** Portfolio grounding for portfolio-scope calls (no single project). */
  portfolioState?: PortfolioState | null;
  /** When true, append a strict response-format constraint for chat-panel use. */
  concise?: boolean;
}): string {
  const sections: string[] = [];

  // Section 1: User's actual prompt (what they typed)
  sections.push(`# Task\n\n${params.userPrompt}`);

  // Section 1b: If concise mode (floating widget), append a strict format constraint
  // that overrides the agent's default formal-document template.
  if (params.concise) {
    sections.push(
      `# Response format — QUICK MODE

This is a chat-panel response, NOT a formal document.

Constraints:
- Length: under 250 words total
- Structure:
  1. ONE-SENTENCE HEADLINE answer at the top (bold)
  2. 3–5 short bullets with concrete findings, recommendations, or next actions
  3. End with a 1-line caveat or next-step if useful
- NO template sections (no §1 Portfolio context, §2 Executive summary, §3 Cross-cutting taxonomy, etc.)
- NO methodology preamble
- NO "Notes for downstream consumers"
- NO redacted-placeholder tables — if you don't know something, say so in one bullet
- Hedging belongs inside the bullets, not as a separate section

EXCEPTION — machine-readable actions block: if your role defines one (the Risk Analyst's \`\`\`actions JSON block), you MUST still append it as the very last thing in your response, after the bullets. It is stripped out before the reader sees it and powers one-click "Assign" buttons, so quick mode does NOT suppress it. When you recommend a mitigation action that another role should own, include it in that block with the right \`assigned_to_role\` and, where the register in context has a matching risk ID, the \`source_ref\`.

EXCEPTION — create requests (raise an entry): if the user asks to LOG / RAISE / ADD / CAPTURE a risk, issue, or change / trend entry, you MUST still append your role's pmo-entry block (the fenced JSON block your role instructions describe) at the end of your response — followed, ONLY when the "suggested hand-off" in your role instructions applies, by one trailing \`\`\`actions block (pmo-entry block first, actions block last). It is stripped from the visible text and renders as an editable confirm card, so quick mode does NOT suppress it. A bare "log an issue" or "raise a risk" is a CREATE request, NOT a vague question — do NOT use the "The question is vague — you mean:" shape for it. Write at most one short sentence, then the block, using short placeholders like "[describe the issue]" for any field you genuinely cannot infer from context.

DELEGATE MODE — assigning a task to a colleague: if the user asks to ASSIGN / DELEGATE / HAND OFF / "ask <role> to …" a task (rather than asking you to analyse something), do not write analysis. Reply with ONE short sentence, then append a machine-readable actions block as the very last thing — it renders as an editable "Assign actions" confirm card (stripped from the visible text), so the user reviews and confirms before it is queued:

\`\`\`actions
[
  { "description": "<the task in one clear sentence>", "assigned_to_role": "<one of: pm | procurement | risk | sponsor | commercial | project_controls | program_manager | engineering_manager | construction_manager | hse_manager>", "urgency": "L|M|H", "source_ref": null }
]
\`\`\`

Map the named owner to the closest role in that list. Infer urgency from the wording (default M). This is a CREATE/assign request, NOT a vague question — never use the "The question is vague" shape for it.

The reader is busy. Give them the answer, then the action, then stop.

# When the question is too vague to answer well

If the user's question is genuinely ambiguous (you'd need to interpret it 2-5 different ways to answer), DO NOT write a long explanation of your confusion. Respond in this exact shape so the UI can render the options as one-click choice buttons:

\`\`\`
The question is vague — you mean:

- **(a) <Short headline of interpretation A>?** Brief one-line reason this might be what they meant.
- **(b) <Short headline of interpretation B>?** Brief one-line reason this might be what they meant.
- **(c) <Short headline of interpretation C>?** Brief one-line reason this might be what they meant.

Which one — (a), (b), or (c)?
\`\`\`

Rules for the vague-question shape:
- Total response under 60 words.
- Open with literally "The question is vague — you mean:" — nothing else on that line. The UI hides the bulleted options and the closing question once it detects this shape (it renders them as Quick Reply buttons instead), so the user only sees that one short sentence introducing the buttons. Don't try to soften or elaborate the intro — the brevity is the point.
- 2–4 lettered options, never more than 5.
- The headline inside the bold (between the **) is the part the UI surfaces as the button label, so make it self-explanatory on its own.
- ALWAYS end with the literal sentence "Which one — (a), (b), or (c)?" (or with the appropriate letters). That phrase is what triggers the UI to render the buttons, even though the user won't see the sentence itself.
- Do not append "Action:", "Next step:", or "Recommendation:" callouts in this shape — there's no action for the user beyond picking one.`,
    );
  }

  // Section 2: Worked example (the past-project artefact for this agent)
  if (params.workedExample) {
    sections.push(
      `# Worked example — ${params.workedExample.artefact_name} from ${params.workedExample.past_project}\n\n${params.workedExample.content_md}`,
    );
  }

  // Section 2b: Portfolio data — LIVE and authoritative, when no single project
  // is in scope. Placed after the worked example so the agent answers factual
  // portfolio questions from real data, not the (fictional) example.
  if (!params.projectState.project && params.portfolioState) {
    const ps = params.portfolioState;
    sections.push(
      `# Portfolio data — LIVE and AUTHORITATIVE\n\nThis is the real, current portfolio of ${ps.projectCount} active projects from the database. For ANY factual portfolio question — which projects have change orders, counts, totals, status, and especially **project numbers (the \`code\` field)** — answer ONLY from this data. Do NOT use the worked example above for facts; it is a style template with fictional project names.`,
    );
    sections.push(
      `## Portfolio rollup — per active project (risks / issues / change-order count + cost-impact $M)\n\n${JSON.stringify(ps.rollup, null, 2)}`,
    );
    sections.push(
      ps.change_orders.length > 0
        ? `## Change orders across the portfolio (${ps.change_orders.length}) — project_code IS the project number\n\n${JSON.stringify(ps.change_orders, null, 2)}`
        : `## Change orders across the portfolio\n\nNo change orders are recorded on active projects.`,
    );
  }

  // Section 3: Project state — only if a project context is provided
  if (params.projectState.project) {
    const p = params.projectState.project as Record<string, unknown>;
    sections.push(
      `# Active project: ${p.name} (${p.code})

- **Client:** ${p.client}
- **Segment:** ${p.segment}
- **Status:** ${p.status} (current week: ${p.current_week})
- **Contract value:** $${Number(p.contract_value_current).toLocaleString()}
- **Approved budget:** $${Number(p.approved_budget_current).toLocaleString()}
- **Contingency:** $${Number(p.contingency).toLocaleString()}
- **Hard deadline:** ${p.hard_deadline_description ?? 'none specified'}`,
    );

    if (params.projectState.structured_facts) {
      sections.push(params.projectState.structured_facts);
    }

    if (params.projectState.issues.length > 0) {
      sections.push(
        `# Current issue log (${params.projectState.issues.length} issues)\n\n${JSON.stringify(params.projectState.issues, null, 2)}`,
      );
    }
    if (params.projectState.risks.length > 0) {
      sections.push(
        `# Current risk register (${params.projectState.risks.length} risks)\n\n${JSON.stringify(params.projectState.risks, null, 2)}`,
      );
    }
    if (params.projectState.change_orders.length > 0) {
      sections.push(
        `# Change orders (${params.projectState.change_orders.length})\n\n${JSON.stringify(params.projectState.change_orders, null, 2)}`,
      );
    }
    if (params.projectState.variance_reports.length > 0) {
      // Variance reports include the full markdown — include only the most
      // recent one in full; summarise the older ones to keep tokens manageable.
      const reports = params.projectState.variance_reports as Array<{
        report_week: number;
        cpi: number;
        spi: number;
        projected_margin_pct: number;
        full_report_md: string;
      }>;
      const latest = reports[reports.length - 1];
      const older = reports.slice(0, -1);
      let varianceSection = `# Variance reports (${reports.length})\n\n`;
      if (older.length > 0) {
        varianceSection += `## Prior reports (summary)\n\n${older
          .map(
            (r) =>
              `- Week ${r.report_week}: CPI ${r.cpi}, SPI ${r.spi}, margin ${r.projected_margin_pct}%`,
          )
          .join('\n')}\n\n`;
      }
      varianceSection += `## Latest report (Week ${latest.report_week}) — full content\n\n${latest.full_report_md}`;
      sections.push(varianceSection);
    }
  }

  // Section 4: Reference project grounding (when this project was created from
  // a similar one via the intake form). Give the model the reference's planning
  // artefacts as a BASIS to adapt, not copy.
  const reference = params.projectState.reference;
  if (reference) {
    const rp = reference.project as Record<string, unknown>;
    let refSection = `# Reference project — ${rp.name} (${rp.code})

This project was set up using the project above as a *similar reference*. Use its structure, work breakdown, schedule logic, budget shape, and overall approach as a STARTING BASIS — then adapt to the current project's specific facts, scale, and constraints. Do NOT copy names, figures, or dates blindly; treat them as a template to tailor.

- **Segment:** ${rp.segment}
- **Contract value:** $${Number(rp.contract_value_current).toLocaleString()}
- **Approved budget:** $${Number(rp.approved_budget_current).toLocaleString()}
- **Hard deadline:** ${rp.hard_deadline_description ?? 'none specified'}`;

    if (reference.artefacts.length > 0) {
      refSection += `\n\n## Reference artefacts (latest planning outputs from the similar project)\n`;
      for (const a of reference.artefacts) {
        refSection += `\n### ${a.agent_type}\n\n${a.output_md}\n`;
      }
    } else {
      refSection += `\n\n(No planning artefacts have been generated on the reference project yet — use its facts above as the basis.)`;
    }
    sections.push(refSection);
  }

  return sections.join('\n\n---\n\n');
}
