/**
 * Phase 2.2 seed orchestrator.
 *
 * Reads the .env.local environment variables, connects to Supabase via the
 * service role key, and runs each seed module in order. Idempotent: each
 * seed uses upsert with the natural key, so re-running won't duplicate.
 *
 * Run with: pnpm seed
 *
 * Subsequent Phase 2.2 sessions will extend this orchestrator with:
 *   - Narrative seeds (variance reports, agent outputs from runs/)
 *   - Portfolio patterns (4 cross-cutting patterns)
 *   - Three placeholder projects
 *   - Worked examples with pgvector embeddings (Phase 2.2 sub-task 3)
 */

import { config } from 'dotenv';
// Load .env.local explicitly (Next.js convention; dotenv defaults to .env)
config({ path: '.env.local' });

import { getServiceClient } from './lib/supabase-admin';
import { log, section } from './lib/log';

import { seedMariposaProject } from './seeds/01-mariposa-project';
import { seedMariposaIssues } from './seeds/02-mariposa-issues';
import { seedMariposaRisks } from './seeds/03-mariposa-risks';
import { seedMariposaChangeOrders } from './seeds/04-mariposa-change-orders';
import { seedMariposaVariance } from './seeds/05-mariposa-variance';
import { seedMariposaAgentOutputs } from './seeds/06-mariposa-agent-outputs';
import { seedPortfolioPatterns } from './seeds/07-portfolio-patterns';
import { seedCarmelSolar } from './seeds/08-carmel-solar';
import { seedLarkridgeWater } from './seeds/09-larkridge-water';
import { seedFoxhavenSteel } from './seeds/10-foxhaven-steel';
import { seedWorkedExamples } from './seeds/11-worked-examples';

async function main() {
  log.header('PMO LLM Demo — Phase 2.2 seed');

  const supabase = getServiceClient();

  // Verify connectivity by reading the existing roles count
  const { count: roleCount, error: roleErr } = await supabase
    .from('roles')
    .select('*', { count: 'exact', head: true });
  if (roleErr) {
    log.error(
      `Could not read roles table: ${roleErr.message}\n` +
        `Check that the 0001_init.sql + 0002_seed_roles.sql migrations have been applied.`,
    );
    process.exit(1);
  }
  log.info(`Connected to Supabase. Found ${roleCount ?? 0} role rows (expect 10 once migration 0006 is applied; legacy seed had 4).`);

  section('1. Mariposa project row');
  const mariposaId = await seedMariposaProject(supabase);
  log.success(`Mariposa project row seeded (id=${mariposaId.slice(0, 8)}…)`);

  section('2. Mariposa issues (31 rows)');
  const issuesResult = await seedMariposaIssues(supabase, mariposaId);
  log.success(`Seeded ${issuesResult.inserted} issues, ${issuesResult.updated} updated.`);

  section('3. Mariposa risks (12 rows)');
  const risksResult = await seedMariposaRisks(supabase, mariposaId);
  log.success(`Seeded ${risksResult.inserted} risks, ${risksResult.updated} updated.`);

  section('4. Mariposa change orders (CO-001)');
  const cosResult = await seedMariposaChangeOrders(supabase, mariposaId);
  log.success(`Seeded ${cosResult.inserted} change orders, ${cosResult.updated} updated.`);

  section('5. Mariposa variance reports (4 reports)');
  const varianceResult = await seedMariposaVariance(supabase, mariposaId);
  log.success(`Seeded ${varianceResult.inserted} variance reports.`);

  section('6. Mariposa agent outputs (26-run audit log)');
  // Look up the PM role for the invoked_by_role_id field
  const { data: pmRole, error: pmErr } = await supabase
    .from('roles')
    .select('id')
    .eq('role_type', 'pm')
    .single();
  if (pmErr || !pmRole) {
    log.error(`Could not find PM role: ${pmErr?.message ?? 'no row'}`);
    process.exit(1);
  }
  const outputsResult = await seedMariposaAgentOutputs(supabase, mariposaId, pmRole.id);
  log.success(`Seeded ${outputsResult.inserted} agent outputs.`);

  section('7. Portfolio patterns (4 cross-cutting)');
  const patternsResult = await seedPortfolioPatterns(supabase);
  log.success(`Seeded ${patternsResult.inserted} portfolio patterns.`);

  section('8. Carmel Solar Phase 2 (renewables-greenfield placeholder)');
  const carmelResult = await seedCarmelSolar(supabase);
  log.success(
    `Carmel: ${carmelResult.project} project, ${carmelResult.issues} issues, ${carmelResult.risks} risks, ${carmelResult.variance} variance.`,
  );

  section('9. Larkridge Water Treatment Upgrade (water-brownfield placeholder)');
  const larkridgeResult = await seedLarkridgeWater(supabase);
  log.success(
    `Larkridge: ${larkridgeResult.project} project, ${larkridgeResult.issues} issues, ${larkridgeResult.risks} risks, ${larkridgeResult.change_orders} CO, ${larkridgeResult.variance} variance.`,
  );

  section('10. Foxhaven Steel Mill Expansion (industrial-brownfield placeholder)');
  const foxhavenResult = await seedFoxhavenSteel(supabase);
  log.success(
    `Foxhaven: ${foxhavenResult.project} project, ${foxhavenResult.issues} issues, ${foxhavenResult.risks} risks, ${foxhavenResult.change_orders} CO, ${foxhavenResult.variance} variance.`,
  );

  section('11. Worked examples library (13 agent anchors + 3 context briefs)');
  const wxResult = await seedWorkedExamples(supabase);
  log.success(
    `Seeded ${wxResult.inserted} worked examples. (Embeddings deferred — agent invocation uses deterministic pairing.)`,
  );

  log.header('Phase 2.2 complete — all data layers seeded');
  log.info('Database state:');
  log.info('  • 4 projects across 3 segments (renewables / water / industrial)');
  log.info('  • Mariposa: 31 issues, 12 risks, 1 CO, 4 variance reports, 26 agent outputs (full lifecycle)');
  log.info('  • Carmel: 6 issues, 6 risks, 1 variance (mid-civil placeholder)');
  log.info('  • Larkridge: 6 issues, 5 risks, 1 CO, 1 variance (mid-execution placeholder)');
  log.info('  • Foxhaven: 7 issues, 6 risks, 1 CO, 1 variance (mid-execution placeholder)');
  log.info('  • 4 cross-cutting portfolio patterns (1 / 2 / 3 / 4)');
  log.info('  • 16 worked examples (13 agent anchors + 3 context briefs)');
  log.info('  • 10 role tokens (PM / Procurement / Risk / Sponsor / Commercial / Project Controls / Program Mgr / Engineering Mgr / Construction Mgr / HSE) — provided migration 0006 has been applied');
  log.info('');
  log.info('Phase 2.2 is complete. Next: Phase 2.3 — agent invocation layer.');
}

main().catch((err) => {
  log.error(`Seed failed: ${err.stack ?? err.message ?? err}`);
  process.exit(1);
});
