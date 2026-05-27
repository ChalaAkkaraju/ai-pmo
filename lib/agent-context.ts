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
 * Load the relevant project state from Supabase for the given project.
 *
 * Returns issues, risks, change orders, variance reports — all the structured
 * data the agent might need to reason about. The agent's system prompt
 * determines which subset matters; we pass everything and let the LLM filter.
 */
export async function loadProjectState(
  supabase: SupabaseClient,
  projectCode: string,
): Promise<{
  project: Record<string, unknown> | null;
  issues: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
  change_orders: Array<Record<string, unknown>>;
  variance_reports: Array<Record<string, unknown>>;
}> {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('code', projectCode)
    .maybeSingle();

  if (!project) {
    return { project: null, issues: [], risks: [], change_orders: [], variance_reports: [] };
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

  return {
    project,
    issues: issuesRes.data ?? [],
    risks: risksRes.data ?? [],
    change_orders: cosRes.data ?? [],
    variance_reports: variancesRes.data ?? [],
  };
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

The reader is busy. Give them the answer, then the action, then stop.`,
    );
  }

  // Section 2: Worked example (the past-project artefact for this agent)
  if (params.workedExample) {
    sections.push(
      `# Worked example — ${params.workedExample.artefact_name} from ${params.workedExample.past_project}\n\n${params.workedExample.content_md}`,
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

  return sections.join('\n\n---\n\n');
}
