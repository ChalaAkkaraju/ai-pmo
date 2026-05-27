/**
 * One-off fix: restore Carmel Solar Phase 2 (NW-REN-2603) which was overwritten
 * by a generated wind farm (Marsh Landing) because the procedural code generator
 * started at NW-{SEG}-2600 and the 4th renewables variant collided with Carmel's
 * existing code.
 *
 * What this does:
 *   1. Delete the current NW-REN-2603 project's agent_outputs (orphan cleanup —
 *      the FK is ON DELETE SET NULL so they'd otherwise survive as orphans).
 *   2. Delete the current NW-REN-2603 project (cascades to risks/issues/COs/variance).
 *   3. Re-seed Carmel using the existing scripts/seeds/08-carmel-solar.ts data.
 *
 * Net effect: 100 projects, Carmel back, no orphan rows. ~$0.50 of agent-output
 * spend on Marsh Landing is sunk (acceptable per user decision).
 *
 * Run once from pmo-llm-demo/:
 *   ./node_modules/.bin/tsx scripts/generators/fix-restore-carmel.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';
import { seedCarmelSolar } from '../seeds/08-carmel-solar';

async function main() {
  log.header('Fix: restore Carmel Solar at NW-REN-2603');

  const supabase = getServiceClient();

  section('1. Locate the project currently at NW-REN-2603');
  const { data: current, error: findErr } = await supabase
    .from('projects')
    .select('id, name')
    .eq('code', 'NW-REN-2603')
    .maybeSingle();
  if (findErr) {
    log.error(`Lookup failed: ${findErr.message}`);
    process.exit(1);
  }
  if (!current) {
    log.info('No project at NW-REN-2603 currently. Will go straight to re-seed.');
  } else {
    log.info(`Found: ${current.name} (id=${(current.id as string).slice(0, 8)}…)`);

    section('2. Delete the project\'s agent_outputs (orphan cleanup)');
    const { error: aoErr, count } = await supabase
      .from('agent_outputs')
      .delete({ count: 'exact' })
      .eq('project_id', current.id as string);
    if (aoErr) log.warn(`agent_outputs delete: ${aoErr.message}`);
    else log.success(`Deleted ${count ?? 0} agent_outputs rows.`);

    section('3. Delete the project (cascades to risks/issues/COs/variance)');
    const { error: delErr } = await supabase
      .from('projects')
      .delete()
      .eq('code', 'NW-REN-2603');
    if (delErr) {
      log.error(`Project delete failed: ${delErr.message}`);
      process.exit(1);
    }
    log.success('Deleted Marsh Landing (and its cascaded sub-rows).');
  }

  section('4. Re-seed Carmel from the canonical seed module');
  const result = await seedCarmelSolar(supabase);
  log.success(
    `Carmel restored: project=${result.project}, issues=${result.issues}, risks=${result.risks}, variance=${result.variance}`,
  );

  log.header('Done. Refresh your dashboard — you should see 100 projects with Carmel Solar Phase 2 back.');
}

main().catch((err) => {
  log.error(`Restore failed: ${(err as Error).stack ?? err}`);
  process.exit(1);
});
