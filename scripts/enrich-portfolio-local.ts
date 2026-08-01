/**
 * Local portfolio enrichment (FREE — no LLM / API calls).
 *
 * Loads the already-generated 96-project portfolio from the committed
 * seed-content/generated-projects.json and runs every procedural enrichment
 * layer in the proven dependency order — cost actuals, earned value, schedule,
 * resources, billing, results analysis, change-order trends, forecast
 * snapshots (generator 22), and action items.
 *
 * Skips step 01 (archetypes — the only paid Opus call) and step 02
 * (regenerate specs), so it uses the existing committed data and costs $0.
 *
 * Every step is idempotent — safe to re-run. Stops at the first failing step.
 *
 * Run from the project root:  pnpm exec tsx scripts/enrich-portfolio-local.ts
 */
import { execSync } from 'node:child_process';

const steps: [string, string][] = [
  ['03 · insert 96 projects + risks/issues/COs/variance', 'scripts/generators/03-insert-generated.ts'],
  ['06 · backfill intake sheets', 'scripts/generators/06-backfill-intake.ts'],
  ['07 · simulate SAP ingestion + WBS', 'scripts/generators/07-simulate-ingestion.ts'],
  ['08 · simulate scheduler tasks + milestones', 'scripts/generators/08-simulate-schedule.ts'],
  ['09 · simulate cost actuals -> earned value', 'scripts/generators/09-simulate-cost-actuals.ts'],
  ['10 · simulate resource assignments', 'scripts/generators/10-simulate-resources.ts'],
  ['11 · freeze as-sold margin baseline', 'scripts/generators/11-simulate-margin-baseline.ts'],
  ['12 · set WBS target-finish envelopes', 'scripts/generators/12-simulate-target-finish.ts'],
  ['13 · set contractual project window', 'scripts/generators/13-simulate-project-dates.ts'],
  ['14 · risk EMV enrichment', 'scripts/generators/14-enrich-risks.ts'],
  ['15 · risk lifecycle/residual', 'scripts/generators/15-enrich-risks-2.ts'],
  ['16 · issue management enrichment', 'scripts/generators/16-enrich-issues.ts'],
  ['09f · cost actuals re-run with element split', 'scripts/generators/09-simulate-cost-actuals.ts --force'],
  ['17 · purchase-order commitments', 'scripts/generators/17-simulate-purchase-orders.ts'],
  ['10f · resources re-run with labour hours', 'scripts/generators/10-simulate-resources.ts --force'],
  ['18 · billing events', 'scripts/generators/18-simulate-billing.ts'],
  ['19 · results analysis', 'scripts/generators/19-simulate-results-analysis.ts'],
  ['21 · change-order enrichment + trend register', 'scripts/generators/21-enrich-change-orders.ts'],
  ['22 · forecast snapshots (monthly closes)', 'scripts/generators/22-forecast-snapshots.ts'],
  ['20 · action items + responses', 'scripts/generators/20-simulate-action-items.ts'],
];

console.log(`\nLocal portfolio enrichment: ${steps.length} steps, all FREE (no API calls).\n`);
let n = 0;
for (const [label, script] of steps) {
  n++;
  console.log(`\n\n========== [${n}/${steps.length}] ${label} ==========`);
  try {
    execSync(`pnpm exec tsx ${script}`, { stdio: 'inherit' });
  } catch {
    console.error(`\n\n!!! STOPPED at step ${n}: ${script}`);
    console.error('Fix the error above, then re-run this script (all steps are idempotent).');
    process.exit(1);
  }
}
console.log('\n\nDone — full 96-project portfolio with cost, schedule, earned value, and forecast snapshots.');
console.log('Refresh the app to see it.');
