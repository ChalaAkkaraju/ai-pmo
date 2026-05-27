/**
 * Phase 2.4 portfolio expansion — step 3 of 3 (DB insert).
 *
 * Reads scripts/seed-content/generated-projects.json (produced by step 2) and
 * inserts the 96 projects + their risks/issues/change-orders/variance into
 * Supabase. Idempotent: deletes any existing rows with the same project codes
 * first (cascades to dependent tables), then inserts fresh.
 *
 * Anchors (NW-REN-2511 Mariposa, NW-REN-2603 Carmel, NW-WTR-2412 Larkridge,
 * NW-IND-2508 Foxhaven) are NEVER touched because their codes are outside the
 * generated range (NW-{SEG}-2600+).
 *
 * Run from pmo-llm-demo/:  ./node_modules/.bin/tsx scripts/generators/03-insert-generated.ts
 *
 * NO inference cost — straight DB inserts via Supabase service role.
 * Expect ~5-15 seconds depending on network.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync } from 'fs';
import path from 'path';
import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';
import type { Severity } from '../lib/archetype-types';

// =============================================================================
// Types matching the generator output (mirror of GeneratedProject in 02-procedural.ts)
// =============================================================================

interface GeneratedRisk {
  risk_id: string;
  category: string;
  description: string;
  probability: Severity;
  impact: Severity;
  score: number;
  response: string;
  owner: string;
  trigger: string;
  status: string;
  cross_cutting_class: string;
  pattern_link: string | null;
}

interface GeneratedIssue {
  issue_id: string;
  description: string;
  category: string;
  severity: Severity;
  owner: string;
  status: string;
  linked_wbs: string[];
  linked_risk: string | null;
  opened_week: number;
  closed_week: number | null;
  closure_narrative: string | null;
}

interface GeneratedChangeOrder {
  co_id: string;
  driver: string;
  scope_summary: string;
  cost_impact_m: number;
  revenue_impact_m: number;
  schedule_impact_days: number;
  margin_realized_pct: number | null;
  status: string;
  approval_routing: string;
  executed_week: number | null;
  four_frame_analysis: null;
}

interface GeneratedVarianceReport {
  report_week: number;
  cpi: number;
  spi: number;
  cost_variance_m: number;
  schedule_variance_days: number;
  contingency_consumed_m: number;
  projected_margin_pct: number;
  buffer_intact_days: number;
  full_report_md: string;
}

interface GeneratedProject {
  archetype_id: string;
  name: string;
  code: string;
  client: string;
  contract_value_initial: number;
  contract_value_current: number;
  approved_budget_initial: number;
  approved_budget_current: number;
  contingency: number;
  segment: string;
  status: 'Active' | 'SC' | 'Closed';
  current_week: number;
  hard_deadline_description: string;
  risks: GeneratedRisk[];
  issues: GeneratedIssue[];
  change_order: GeneratedChangeOrder | null;
  variance_reports: GeneratedVarianceReport[];
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  log.header('PMO LLM — Phase 2.4 portfolio expansion · step 3: insert into Supabase');

  // Read generated projects file
  const inPath = path.join(__dirname, '..', 'seed-content', 'generated-projects.json');
  const raw = readFileSync(inPath, 'utf8');
  const generated: GeneratedProject[] = JSON.parse(raw);
  log.info(`Loaded ${generated.length} generated projects from disk.`);

  const supabase = getServiceClient();

  // Verify connectivity
  const { count: existingCount, error: countErr } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
  if (countErr) {
    log.error(`Could not read projects table: ${countErr.message}`);
    process.exit(1);
  }
  log.info(`Connected. ${existingCount ?? 0} projects already in DB (will be preserved if outside generated code set).`);

  // =============================================================================
  // Idempotency: delete any existing rows matching our generated codes
  // (cascades to risks/issues/COs/variance via FK ON DELETE CASCADE)
  // =============================================================================
  section('1. Removing any prior generated rows (idempotency)');
  const codes = generated.map((p) => p.code);
  const { error: delErr } = await supabase.from('projects').delete().in('code', codes);
  if (delErr) {
    log.error(`Delete failed: ${delErr.message}`);
    process.exit(1);
  }
  log.success(`Cleared any prior rows with codes NW-{SEG}-2600..${codes[codes.length - 1].slice(-4)}.`);

  // =============================================================================
  // 2. Insert projects (parent rows)
  // =============================================================================
  section('2. Inserting 96 project rows');
  const projectRows = generated.map((p) => ({
    name: p.name,
    code: p.code,
    client: p.client,
    contract_value_initial: p.contract_value_initial,
    contract_value_current: p.contract_value_current,
    approved_budget_initial: p.approved_budget_initial,
    approved_budget_current: p.approved_budget_current,
    contingency: p.contingency,
    segment: p.segment,
    status: p.status,
    current_week: p.current_week,
    hard_deadline_description: p.hard_deadline_description,
  }));

  const { data: insertedProjects, error: projErr } = await supabase
    .from('projects')
    .insert(projectRows)
    .select('id, code');

  if (projErr) {
    log.error(`Project insert failed: ${projErr.message}`);
    process.exit(1);
  }
  if (!insertedProjects || insertedProjects.length !== generated.length) {
    log.error(`Expected ${generated.length} inserted projects, got ${insertedProjects?.length ?? 0}`);
    process.exit(1);
  }
  log.success(`Inserted ${insertedProjects.length} projects.`);

  // Build code → uuid map
  const codeToId = new Map<string, string>();
  for (const row of insertedProjects) {
    codeToId.set(row.code, row.id);
  }

  // =============================================================================
  // 3. Insert risks
  // =============================================================================
  section('3. Inserting risks');
  const riskRows = generated.flatMap((p) => {
    const project_id = codeToId.get(p.code)!;
    return p.risks.map((r) => ({
      project_id,
      risk_id: r.risk_id,
      category: r.category,
      description: r.description,
      probability: r.probability,
      impact: r.impact,
      score: r.score,
      response: r.response,
      owner: r.owner,
      trigger: r.trigger,
      status: r.status,
      cross_cutting_class: r.cross_cutting_class,
      pattern_link: r.pattern_link,
    }));
  });
  const { error: riskErr } = await supabase.from('risks').insert(riskRows);
  if (riskErr) {
    log.error(`Risk insert failed: ${riskErr.message}`);
    process.exit(1);
  }
  log.success(`Inserted ${riskRows.length} risks.`);

  // =============================================================================
  // 4. Insert issues
  // =============================================================================
  section('4. Inserting issues');
  const issueRows = generated.flatMap((p) => {
    const project_id = codeToId.get(p.code)!;
    return p.issues.map((i) => ({
      project_id,
      issue_id: i.issue_id,
      description: i.description,
      category: i.category,
      severity: i.severity,
      owner: i.owner,
      status: i.status,
      linked_wbs: i.linked_wbs,
      linked_risk: i.linked_risk,
      opened_week: i.opened_week,
      closed_week: i.closed_week,
      closure_narrative: i.closure_narrative,
    }));
  });
  const { error: issueErr } = await supabase.from('issues').insert(issueRows);
  if (issueErr) {
    log.error(`Issue insert failed: ${issueErr.message}`);
    process.exit(1);
  }
  log.success(`Inserted ${issueRows.length} issues.`);

  // =============================================================================
  // 5. Insert change orders (where present)
  // =============================================================================
  section('5. Inserting change orders');
  const coRows = generated
    .filter((p) => p.change_order !== null)
    .map((p) => {
      const project_id = codeToId.get(p.code)!;
      const c = p.change_order!;
      return {
        project_id,
        co_id: c.co_id,
        driver: c.driver,
        scope_summary: c.scope_summary,
        cost_impact_m: c.cost_impact_m,
        revenue_impact_m: c.revenue_impact_m,
        schedule_impact_days: c.schedule_impact_days,
        margin_realized_pct: c.margin_realized_pct,
        status: c.status,
        approval_routing: c.approval_routing,
        executed_week: c.executed_week,
        four_frame_analysis: c.four_frame_analysis,
      };
    });
  if (coRows.length > 0) {
    const { error: coErr } = await supabase.from('change_orders').insert(coRows);
    if (coErr) {
      log.error(`Change order insert failed: ${coErr.message}`);
      process.exit(1);
    }
  }
  log.success(`Inserted ${coRows.length} change orders.`);

  // =============================================================================
  // 6. Insert variance reports
  // =============================================================================
  section('6. Inserting variance reports');
  const varRows = generated.flatMap((p) => {
    const project_id = codeToId.get(p.code)!;
    return p.variance_reports.map((v) => ({
      project_id,
      report_week: v.report_week,
      cpi: v.cpi,
      spi: v.spi,
      cost_variance_m: v.cost_variance_m,
      schedule_variance_days: v.schedule_variance_days,
      contingency_consumed_m: v.contingency_consumed_m,
      projected_margin_pct: v.projected_margin_pct,
      buffer_intact_days: v.buffer_intact_days,
      full_report_md: v.full_report_md,
    }));
  });
  const { error: varErr } = await supabase.from('variance_reports').insert(varRows);
  if (varErr) {
    log.error(`Variance insert failed: ${varErr.message}`);
    process.exit(1);
  }
  log.success(`Inserted ${varRows.length} variance reports.`);

  // =============================================================================
  // Final summary
  // =============================================================================
  log.header('Step 3 complete — portfolio expanded to 100 projects');
  log.info(`  ${insertedProjects.length} new project rows (96 generated + 4 anchors preserved = 100 total)`);
  log.info(`  ${riskRows.length} new risks`);
  log.info(`  ${issueRows.length} new issues`);
  log.info(`  ${coRows.length} new change orders`);
  log.info(`  ${varRows.length} new variance reports`);
  log.info('');
  log.info('Open your dashboard at http://localhost:3000/access/demo-pm-token-replace-me to see them.');
  log.info('The Active portfolio grid will now show 100 projects across renewables / water / industrial / power.');
}

main().catch((err) => {
  log.error(`Insert failed: ${(err as Error).stack ?? err}`);
  process.exit(1);
});
