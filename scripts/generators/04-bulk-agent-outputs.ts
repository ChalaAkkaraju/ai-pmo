/**
 * Phase 2.4 portfolio expansion — step 4 (bulk planning-agent outputs).
 *
 * For each of the 96 generated projects, calls Opus 4.7 four times to produce:
 *   - Charter (charter_drafter)
 *   - Stakeholder analysis (stakeholder_analyst)
 *   - WBS (wbs_builder)
 *   - Risk register narrative (risk_analyst)
 *
 * 96 × 4 = 384 calls. Expected cost: $18-25. Expected wall-clock: ~25-45 min
 * with concurrency 4. Idempotent: skips projects/agents that already have an
 * agent_outputs row.
 *
 * CLI:
 *   ./node_modules/.bin/tsx scripts/generators/04-bulk-agent-outputs.ts [--limit N] [--cost-cap N]
 *
 * --limit N      Run for at most N projects (useful for smoke-testing the pipeline)
 * --cost-cap N   Abort if cumulative cost in USD exceeds N (default 28)
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
  'charter_drafter',
  'stakeholder_analyst',
  'wbs_builder',
  'risk_analyst',
] as const;
type AgentType = (typeof AGENT_TYPES)[number];

const AGENT_TASK_DESCRIPTION: Record<AgentType, string> = {
  charter_drafter:
    'Draft the project charter for this EPC project. Use the Northwood charter template structure (Sections 1-12). Flag every inferred commercial value with [NEEDS PM REVIEW: ...]. The project context below is your single source of truth.',
  stakeholder_analyst:
    'Produce the stakeholder register and engagement-strategy plan for this project. Identify ~12-15 stakeholder roles across client, regulator, community, vendor, and internal categories. Use the Northwood stakeholder-register template structure. Flag missing names/preferences with [NEEDS PM REVIEW: ...].',
  wbs_builder:
    'Build the Work Breakdown Structure for this project at PMBOK Level 1-3 using deliverable-oriented decomposition (100% rule). Include 7-9 Level-1 branches typical for this segment. Tag any branch needing PM input as (at draft stage [NEEDS PM REVIEW: ...]).',
  risk_analyst:
    'Produce the risk register narrative for this project. For each of the risks listed in the context, write 2-4 sentences of analysis covering cross-cutting class, current status, response stance, and trigger conditions. Append a "Top three to watch" summary at the end.',
};

const CONCURRENCY = 4;
const DEFAULT_COST_CAP = 28; // USD

// =============================================================================
// CLI arg parsing
// =============================================================================

function parseArgs(argv: string[]) {
  let limit = Infinity;
  let costCap = DEFAULT_COST_CAP;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--limit' && argv[i + 1]) {
      limit = parseInt(argv[++i], 10);
    } else if (argv[i] === '--cost-cap' && argv[i + 1]) {
      costCap = parseFloat(argv[++i]);
    }
  }
  return { limit, costCap };
}

// =============================================================================
// Project context types
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

interface ProjectContext {
  project: ProjectRow;
  risks: RiskRow[];
  issues: IssueRow[];
  changeOrderCount: number;
  varianceLatest: { report_week: number; cpi: number; spi: number } | null;
}

// =============================================================================
// Build the context summary that the agent reads
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
  md += `**Contract value (current):** ${fmtMoneyM(p.contract_value_current)}  \n`;
  md += `**Approved budget (current):** ${fmtMoneyM(p.approved_budget_current)}  \n`;
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
  md += `\n**Change orders to date:** ${ctx.changeOrderCount}  \n`;
  if (ctx.varianceLatest) {
    md += `**Latest variance (Week ${ctx.varianceLatest.report_week}):** CPI ${ctx.varianceLatest.cpi} · SPI ${ctx.varianceLatest.spi}  \n`;
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

async function loadGeneratedProjects(supabase: ReturnType<typeof getServiceClient>): Promise<ProjectRow[]> {
  // Generated projects have codes NW-{SEG}-2600+; anchors are below 2600.
  // We match by code prefix and numeric suffix >= 2600.
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .gte('code', 'NW-')
    .order('code', { ascending: true });
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  const generated = (data ?? []).filter((p) => {
    const m = /^NW-(REN|WTR|IND|PWR)-(\d+)$/.exec(p.code);
    return m !== null && parseInt(m[2], 10) >= 2600;
  });
  return generated as ProjectRow[];
}

async function loadProjectContext(
  supabase: ReturnType<typeof getServiceClient>,
  project: ProjectRow,
): Promise<ProjectContext> {
  const [risksRes, issuesRes, coCountRes, varRes] = await Promise.all([
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
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id),
    supabase
      .from('variance_reports')
      .select('report_week, cpi, spi')
      .eq('project_id', project.id)
      .order('report_week', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    project,
    risks: (risksRes.data ?? []) as RiskRow[],
    issues: (issuesRes.data ?? []) as IssueRow[],
    changeOrderCount: coCountRes.count ?? 0,
    varianceLatest: (varRes.data as { report_week: number; cpi: number; spi: number } | null) ?? null,
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

// =============================================================================
// Load 4 agent prompts from disk
// =============================================================================

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
      input_payload: { generator: '04-bulk-agent-outputs', project_code: project.code },
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
  const { limit, costCap } = parseArgs(process.argv);
  log.header('PMO LLM — Phase 2.4 portfolio expansion · step 4: bulk agent outputs');
  log.info(`Concurrency: ${CONCURRENCY} · cost cap: $${costCap}${limit !== Infinity ? ` · project limit: ${limit}` : ''}`);

  const supabase = getServiceClient();
  const prompts = loadAgentPrompts();
  const pmRoleId = await getPmRoleId(supabase);
  log.info(`Loaded ${AGENT_TYPES.length} agent prompts. PM role id: ${pmRoleId.slice(0, 8)}…`);

  // Load generated projects
  const projects = (await loadGeneratedProjects(supabase)).slice(0, limit);
  log.info(`Generated projects in scope: ${projects.length}`);

  // Build the queue: (project, agent) tuples, skipping any with existing output
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
    log.success('Nothing to do. All projects in scope already have outputs.');
    return;
  }

  // Process in batches of CONCURRENCY
  section(`Processing ${queue.length} calls in batches of ${CONCURRENCY}`);
  let cumulativeCost = 0;
  let totalTokens = 0;
  const failures: CallResult[] = [];
  let done = 0;
  const t0 = Date.now();

  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    // Prefetch contexts for the batch in parallel
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

  log.header('Step 4 complete. Refresh your dashboard — planning tabs now populated.');
}

main().catch((err) => {
  log.error(`Bulk run failed: ${(err as Error).stack ?? err}`);
  process.exit(1);
});
