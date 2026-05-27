/**
 * Deep-fill pass — runs the 5 remaining planning agents on a hand-picked set
 * of projects. Companion to 04-bulk-agent-outputs.ts.
 *
 *   Agents: schedule_reasoner, budget_builder, communications_planner,
 *           lessons_learned_synthesiser, closeout_reporter
 *
 *   Default scope: a small (~10) list of project codes passed via --codes.
 *
 * CLI:
 *   ./node_modules/.bin/tsx scripts/generators/05-bulk-deep-fill.ts \
 *      --codes NW-PWR-2686,NW-IND-2632,...  [--cost-cap N]
 *
 * --codes CSV     Required. Comma-separated project codes to fill.
 * --cost-cap N    Abort if cumulative cost in USD exceeds N (default 12).
 *
 * Idempotent: skips any (project, agent) pair that already has an
 * agent_outputs row. Re-run after failures to retry only the missing ones.
 *
 * Run from pmo-llm-demo/.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync } from 'fs';
import path from 'path';
import { getServiceClient } from '../lib/supabase-admin';
import { invokeModel } from '../../lib/openrouter';
import { log, section } from '../lib/log';

// =============================================================================
// Configuration
// =============================================================================

const AGENT_TYPES = [
  'schedule_reasoner',
  'budget_builder',
  'communications_planner',
  'lessons_learned_synthesiser',
  'closeout_reporter',
] as const;
type AgentType = (typeof AGENT_TYPES)[number];

const AGENT_TASK_DESCRIPTION: Record<AgentType, string> = {
  schedule_reasoner:
    'Produce the project schedule narrative for this EPC project. Identify the critical path (~6-9 milestones), discuss float, sequencing logic, and schedule risks. Use the Northwood schedule-narrative template structure. Flag missing dates or sequence uncertainty with [NEEDS PM REVIEW: ...].',
  budget_builder:
    'Build the cost breakdown structure for this project. Allocate the approved budget across major work categories (engineering / procurement / construction / commissioning / contingency / management reserve). Show cost-loading curve assumptions. Use the Northwood CBS template structure. Flag any inferred allocations with [NEEDS PM REVIEW: ...].',
  communications_planner:
    'Produce the communications management plan for this project. Cover stakeholder communication needs, cadence, channels, escalation paths, and reporting templates. Use the Northwood comms-plan template structure (Sections 1-8). Flag missing stakeholder preferences with [NEEDS PM REVIEW: ...].',
  lessons_learned_synthesiser:
    'Synthesise lessons learned from this project, drawing on the risk register, issue log, change orders, and variance reports in the context. Identify 6-10 lessons spanning technical, commercial, schedule, and stakeholder themes. Use the Northwood lessons-learned template (situation / action / outcome / generalised lesson). Flag uncertain causation with [NEEDS PM REVIEW: ...].',
  closeout_reporter:
    'Draft the project closeout report. Cover final cost & schedule outcome vs baseline, scope changes, risk closeout, lessons captured, and outstanding items. Use the Northwood closeout-report template structure. For projects still Active/SC, frame the report as a "current-state closeout draft" (not final). Flag pending items with [NEEDS PM REVIEW: ...].',
};

const CONCURRENCY = 4;
const DEFAULT_COST_CAP = 12; // USD

// =============================================================================
// CLI arg parsing
// =============================================================================

function parseArgs(argv: string[]) {
  let codes: string[] = [];
  let costCap = DEFAULT_COST_CAP;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--codes' && argv[i + 1]) {
      codes = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === '--cost-cap' && argv[i + 1]) {
      costCap = parseFloat(argv[++i]);
    }
  }
  return { codes, costCap };
}

// =============================================================================
// Project context types (same shape as 04-bulk-agent-outputs.ts)
// =============================================================================

interface ProjectRow {
  id: string;
  name: string;
  code: string;
  client: string;
  contract_value_initial: number;
  contract_value_current: number;
  approved_budget_initial: number;
  approved_budget_current: number;
  contingency: number;
  segment: string;
  status: string;
  current_week: number;
  hard_deadline_description: string | null;
}

interface RiskRow {
  risk_id: string;
  category: string;
  description: string;
  probability: string;
  impact: string;
  score: number;
  cross_cutting_class: string;
  status: string;
  owner: string;
}

interface IssueRow {
  issue_id: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  opened_week: number;
}

interface VarianceRow {
  report_week: number;
  cpi: number;
  spi: number;
  cost_variance_m: number;
  schedule_variance_days: number;
  contingency_consumed_m: number;
}

interface ChangeOrderRow {
  co_id: string;
  description: string;
  delta_cost: number;
  delta_schedule_weeks: number;
  status: string;
}

interface ProjectContext {
  project: ProjectRow;
  risks: RiskRow[];
  issues: IssueRow[];
  variance: VarianceRow[];
  change_orders: ChangeOrderRow[];
}

// =============================================================================
// Context builder — slightly richer than 04 because the 5 agents here need
// variance trend, CO history, etc.
// =============================================================================

function fmtMoneyM(n: number): string {
  return `$${(n / 1_000_000).toFixed(2)}M`;
}

function buildContextSummary(ctx: ProjectContext): string {
  const p = ctx.project;
  let md = '';
  md += `# Project context — ${p.name}\n\n`;
  md += `**Code:** ${p.code}  \n`;
  md += `**Client:** ${p.client}  \n`;
  md += `**Segment:** ${p.segment}  \n`;
  md += `**Status:** ${p.status}  \n`;
  md += `**Current week:** ${p.current_week}  \n`;
  md += `**Contract value (initial → current):** ${fmtMoneyM(p.contract_value_initial)} → ${fmtMoneyM(p.contract_value_current)}  \n`;
  md += `**Approved budget (initial → current):** ${fmtMoneyM(p.approved_budget_initial)} → ${fmtMoneyM(p.approved_budget_current)}  \n`;
  md += `**Contingency:** ${fmtMoneyM(p.contingency)}  \n`;
  if (p.hard_deadline_description) {
    md += `**Hard deadline:** ${p.hard_deadline_description}  \n`;
  }

  md += `\n## Risk register (${ctx.risks.length} items)\n\n`;
  for (const r of ctx.risks) {
    md += `- **${r.risk_id} · ${r.category}** (P:${r.probability}/I:${r.impact}, score ${r.score}, status: ${r.status}, class: ${r.cross_cutting_class}). ${r.description}\n`;
  }

  md += `\n## Issue log (${ctx.issues.length} items)\n\n`;
  for (const i of ctx.issues.slice(0, 10)) {
    md += `- **${i.issue_id} · ${i.category}** (${i.severity}, ${i.status}, opened week ${i.opened_week}). ${i.description}\n`;
  }
  if (ctx.issues.length > 10) md += `- _...and ${ctx.issues.length - 10} more issues._\n`;

  md += `\n## Change orders (${ctx.change_orders.length})\n\n`;
  for (const co of ctx.change_orders) {
    const dC = fmtMoneyM(co.delta_cost);
    md += `- **${co.co_id}** (status: ${co.status}, Δcost ${dC}, Δsched ${co.delta_schedule_weeks}w). ${co.description}\n`;
  }
  if (ctx.change_orders.length === 0) md += `- _No change orders yet._\n`;

  md += `\n## Variance trend (${ctx.variance.length} reports)\n\n`;
  if (ctx.variance.length > 0) {
    md += `| Week | CPI | SPI | Cost variance | Sched variance | Contingency burn |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const v of ctx.variance) {
      md += `| ${v.report_week} | ${Number(v.cpi).toFixed(2)} | ${Number(v.spi).toFixed(2)} | ${fmtMoneyM(v.cost_variance_m * 1_000_000)} | ${v.schedule_variance_days}d | ${fmtMoneyM(v.contingency_consumed_m * 1_000_000)} |\n`;
    }
  } else {
    md += `_No variance reports yet._\n`;
  }
  return md;
}

function buildUserMessage(agent: AgentType, ctx: ProjectContext): string {
  const ctxMd = buildContextSummary(ctx);
  const task = AGENT_TASK_DESCRIPTION[agent];
  return `${task}\n\n---\n\n${ctxMd}`;
}

// =============================================================================
// Database helpers
// =============================================================================

async function loadProjectsByCode(
  supabase: ReturnType<typeof getServiceClient>,
  codes: string[],
): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .in('code', codes)
    .order('code', { ascending: true });
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return (data ?? []) as ProjectRow[];
}

async function loadProjectContext(
  supabase: ReturnType<typeof getServiceClient>,
  project: ProjectRow,
): Promise<ProjectContext> {
  const [risksRes, issuesRes, cosRes, varRes] = await Promise.all([
    supabase
      .from('risks')
      .select('risk_id, category, description, probability, impact, score, cross_cutting_class, status, owner')
      .eq('project_id', project.id)
      .order('risk_id'),
    supabase
      .from('issues')
      .select('issue_id, category, description, severity, status, opened_week')
      .eq('project_id', project.id)
      .order('opened_week', { ascending: true }),
    supabase
      .from('change_orders')
      .select('co_id, description, delta_cost, delta_schedule_weeks, status')
      .eq('project_id', project.id)
      .order('co_id', { ascending: true }),
    supabase
      .from('variance_reports')
      .select('report_week, cpi, spi, cost_variance_m, schedule_variance_days, contingency_consumed_m')
      .eq('project_id', project.id)
      .order('report_week', { ascending: true }),
  ]);

  return {
    project,
    risks: (risksRes.data ?? []) as RiskRow[],
    issues: (issuesRes.data ?? []) as IssueRow[],
    change_orders: (cosRes.data ?? []) as ChangeOrderRow[],
    variance: (varRes.data ?? []) as VarianceRow[],
  };
}

async function existingOutputAgentTypes(
  supabase: ReturnType<typeof getServiceClient>,
  projectId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('agent_outputs')
    .select('agent_type')
    .eq('project_id', projectId)
    .in('agent_type', AGENT_TYPES as unknown as string[]);
  if (error) throw new Error(`Failed to query existing outputs: ${error.message}`);
  return new Set((data ?? []).map((r) => r.agent_type as string));
}

async function getPmRoleId(supabase: ReturnType<typeof getServiceClient>): Promise<string> {
  const { data, error } = await supabase.from('roles').select('id').eq('role_type', 'pm').single();
  if (error || !data) throw new Error(`Could not find PM role: ${error?.message ?? 'no row'}`);
  return data.id as string;
}

function loadAgentPrompts(): Record<AgentType, string> {
  const promptsDir = path.join(__dirname, '..', '..', 'lib', 'agent-prompts');
  const out: Partial<Record<AgentType, string>> = {};
  for (const agent of AGENT_TYPES) {
    const file = path.join(promptsDir, `${agent}.md`);
    out[agent] = readFileSync(file, 'utf8');
  }
  return out as Record<AgentType, string>;
}

// =============================================================================
// Single-call wrapper
// =============================================================================

interface CallResult {
  ok: boolean;
  agent: AgentType;
  project_code: string;
  tokens: number | null;
  cost: number | null;
  elapsed_ms: number;
  error?: string;
}

async function invokeOne(
  supabase: ReturnType<typeof getServiceClient>,
  pmRoleId: string,
  systemPrompt: string,
  agent: AgentType,
  project: ProjectRow,
  ctx: ProjectContext,
): Promise<CallResult> {
  const t0 = Date.now();
  const userMessage = buildUserMessage(agent, ctx);
  try {
    const result = await invokeModel({ systemPrompt, userMessage });
    const { error: insertErr } = await supabase.from('agent_outputs').insert({
      project_id: project.id,
      agent_type: agent,
      invoked_by_role_id: pmRoleId,
      user_prompt: AGENT_TASK_DESCRIPTION[agent],
      input_payload: { generator: '05-bulk-deep-fill', project_code: project.code },
      output_md: result.output_md,
      tokens_used: result.tokens_used,
      cost_usd: result.cost_usd,
    });
    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);
    return {
      ok: true,
      agent,
      project_code: project.code,
      tokens: result.tokens_used,
      cost: result.cost_usd,
      elapsed_ms: Date.now() - t0,
    };
  } catch (err) {
    return {
      ok: false,
      agent,
      project_code: project.code,
      tokens: null,
      cost: null,
      elapsed_ms: Date.now() - t0,
      error: (err as Error).message,
    };
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const { codes, costCap } = parseArgs(process.argv);
  log.header('Phase 2.5 — deep planning fill (5 remaining agents)');

  if (codes.length === 0) {
    log.error('Required: --codes CODE1,CODE2,... (comma-separated, no spaces)');
    log.info('Tip: run scripts/generators/pick-deep-fill-projects.ts first.');
    process.exit(1);
  }

  log.info(`Codes in scope (${codes.length}): ${codes.join(', ')}`);
  log.info(`Agents per project (${AGENT_TYPES.length}): ${AGENT_TYPES.join(', ')}`);
  log.info(`Concurrency: ${CONCURRENCY} · cost cap: $${costCap}`);

  const supabase = getServiceClient();
  const prompts = loadAgentPrompts();
  const pmRoleId = await getPmRoleId(supabase);
  log.info(`Loaded ${AGENT_TYPES.length} agent prompts. PM role id: ${pmRoleId.slice(0, 8)}…`);

  const projects = await loadProjectsByCode(supabase, codes);
  if (projects.length !== codes.length) {
    const found = new Set(projects.map((p) => p.code));
    const missing = codes.filter((c) => !found.has(c));
    log.warn(`Some codes not found in DB: ${missing.join(', ')}`);
  }
  log.info(`Projects loaded: ${projects.length}`);

  // Build queue, skipping any (project, agent) pair already complete
  section('Building work queue (skipping any project/agent already done)');
  type Task = { project: ProjectRow; agent: AgentType };
  const queue: Task[] = [];
  let skippedExisting = 0;
  for (const p of projects) {
    const existing = await existingOutputAgentTypes(supabase, p.id);
    for (const a of AGENT_TYPES) {
      if (existing.has(a)) {
        skippedExisting++;
      } else {
        queue.push({ project: p, agent: a });
      }
    }
  }
  log.info(`Queue length: ${queue.length} (skipped ${skippedExisting} already-done outputs)`);

  if (queue.length === 0) {
    log.success('Nothing to do. All requested project/agent pairs already have outputs.');
    return;
  }

  section(`Processing ${queue.length} calls in batches of ${CONCURRENCY}`);
  let cumulativeCost = 0;
  let totalTokens = 0;
  const failures: CallResult[] = [];
  let done = 0;
  const t0 = Date.now();

  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    const ctxs = await Promise.all(batch.map((t) => loadProjectContext(supabase, t.project)));

    const results = await Promise.all(
      batch.map((t, idx) =>
        invokeOne(supabase, pmRoleId, prompts[t.agent], t.agent, t.project, ctxs[idx]),
      ),
    );
    for (const r of results) {
      done++;
      const costStr = r.cost !== null ? `$${r.cost.toFixed(4)}` : '$?';
      const tokStr = r.tokens !== null ? `${r.tokens} tok` : '? tok';
      if (r.ok) {
        cumulativeCost += r.cost ?? 0;
        totalTokens += r.tokens ?? 0;
        log.success(
          `[${done}/${queue.length}] ${r.project_code} ${r.agent} — ${(r.elapsed_ms / 1000).toFixed(1)}s · ${tokStr} · ${costStr} · running $${cumulativeCost.toFixed(2)}`,
        );
      } else {
        failures.push(r);
        log.error(`[${done}/${queue.length}] ${r.project_code} ${r.agent} — FAILED: ${r.error}`);
      }
    }

    if (cumulativeCost >= costCap) {
      log.error(`COST CAP HIT: cumulative $${cumulativeCost.toFixed(2)} >= cap $${costCap}. Aborting after this batch.`);
      break;
    }
  }

  const elapsed_min = (Date.now() - t0) / 60_000;
  section('Summary');
  log.info(`  Completed: ${done - failures.length} / ${queue.length}`);
  log.info(`  Failed: ${failures.length}`);
  log.info(`  Total tokens: ${totalTokens.toLocaleString()}`);
  log.info(`  Total cost: $${cumulativeCost.toFixed(2)}`);
  log.info(`  Wall-clock: ${elapsed_min.toFixed(1)} min`);

  if (failures.length > 0) {
    log.warn('Failures (re-run the script to retry; idempotency skips successful ones):');
    for (const f of failures) {
      log.warn(`  ${f.project_code} ${f.agent}: ${f.error}`);
    }
  }

  log.header('Deep fill complete. Refresh project pages — Schedule / Budget / Comms / Lessons / Closeout tabs now populated.');
}

main().catch((err) => {
  log.error(`Bulk run failed: ${(err as Error).stack ?? err}`);
  process.exit(1);
});
