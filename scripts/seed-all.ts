/**
 * Structural full rebuild orchestrator (local-first).
 * Runs the base seed + the portfolio generators in dependency order.
 * Only LLM cost is step 01 (archetypes, ~$0.51); everything else is free.
 * Stops at the first failing step. All steps are idempotent / re-runnable.
 *
 * Run from the project root:  npx tsx scripts/seed-all.ts
 */
import { execSync } from 'node:child_process';

const steps: [string, string][] = [
  ['Base seed — named projects, worked examples, portfolio patterns (free)', 'scripts/seed.ts'],
  ['01 · archetypes — one Opus call, ~$0.51', 'scripts/generators/01-archetypes.ts'],
  ['02 · procedural expansion to 96 specs (free)', 'scripts/generators/02-procedural.ts'],
  ['03 · insert 96 projects + risks/issues/COs/variance (free)', 'scripts/generators/03-insert-generated.ts'],
  ['06 · backfill intake sheets (free)', 'scripts/generators/06-backfill-intake.ts'],
  ['07 · simulate SAP ingestion + WBS (free)', 'scripts/generators/07-simulate-ingestion.ts'],
  ['08 · simulate scheduler tasks + milestones (free)', 'scripts/generators/08-simulate-schedule.ts'],
  ['09 · simulate cost actuals → earned value (free)', 'scripts/generators/09-simulate-cost-actuals.ts'],
  ['10 · simulate resource assignments (free)', 'scripts/generators/10-simulate-resources.ts'],
  ['11 · freeze as-sold margin baseline (free)', 'scripts/generators/11-simulate-margin-baseline.ts'],
  ['12 · set WBS target-finish envelopes (free)', 'scripts/generators/12-simulate-target-finish.ts'],
  ['13 · set contractual project window (free)', 'scripts/generators/13-simulate-project-dates.ts'],
  // Enrichment + cost-to-cash layers (all procedural, free). Order proven on
  // local 2026-06-07/08: risk EMV -> lifecycle -> issues; then 09 --force
  // (cost-element split) -> POs -> 10 --force (labour hours) -> billing -> RA;
  // then change-order enrichment, forecast snapshots, action items last.
  ['14 · risk EMV enrichment (free)', 'scripts/generators/14-enrich-risks.ts'],
  ['15 · risk lifecycle/residual (free)', 'scripts/generators/15-enrich-risks-2.ts'],
  ['16 · issue management enrichment (free)', 'scripts/generators/16-enrich-issues.ts'],
  ['09f · cost actuals re-run with element split (free)', 'scripts/generators/09-simulate-cost-actuals.ts --force'],
  ['17 · purchase-order commitments (free)', 'scripts/generators/17-simulate-purchase-orders.ts'],
  ['10f · resources re-run with labour hours (free)', 'scripts/generators/10-simulate-resources.ts --force'],
  ['18 · billing events (free)', 'scripts/generators/18-simulate-billing.ts'],
  ['19 · results analysis (free)', 'scripts/generators/19-simulate-results-analysis.ts'],
  ['21 · change-order enrichment + trend register (free)', 'scripts/generators/21-enrich-change-orders.ts'],
  ['22 · forecast snapshots (free)', 'scripts/generators/22-forecast-snapshots.ts'],
  ['20 · action items + responses (free)', 'scripts/generators/20-simulate-action-items.ts'],
];

console.log(`\nStructural rebuild: ${steps.length} steps. Only step 01 costs money (~$0.51).\n`);
let n = 0;
for (const [label, script] of steps) {
  n++;
  console.log(`\n\n========== [${n}/${steps.length}] ${label} ==========`);
  try {
    execSync(`npx tsx ${script}`, { stdio: 'inherit' }); // no quotes: entries may carry flags (e.g. --force); paths have no spaces
  } catch {
    console.error(`\n\n!!! STOPPED at step ${n}: ${script}`);
    console.error('Fix the error above, then re-run `npx tsx scripts/seed-all.ts` (all steps are idempotent).');
    process.exit(1);
  }
}
console.log('\n\n✅ Structural rebuild complete — all 99 projects with full canonical data.');
console.log('Next (optional, ~$7.80): npx tsx scripts/generators/deep-fill-all.ts');
