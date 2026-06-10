/**
 * DEV-ONLY throwaway: pad one project's WBS with extra leaf work packages so the
 * Structure tab tree is long enough to exercise the 70vh internal scroll and the
 * sticky right-hand concentration cards. Rows are tagged DEVTEST and fully
 * reversible.
 *
 *   Add 30 leaves to a project:
 *     ./node_modules/.bin/tsx scripts/dev/inflate-wbs.ts --code=NW-PWR-2690 --n=30
 *   Remove them again:
 *     ./node_modules/.bin/tsx scripts/dev/inflate-wbs.ts --code=NW-PWR-2690 --revert
 *
 * (Or just re-run scripts/generators/07-simulate-ingestion.ts --force to rebuild
 *  every project's WBS cleanly from the template.)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : null;
}

async function main() {
  const code = arg('code');
  const revert = process.argv.includes('--revert');
  const n = Number(arg('n') ?? '30');
  if (!code) {
    log.error('Pass --code=<PROJECT_CODE> (e.g. --code=NW-PWR-2690).');
    process.exit(1);
  }

  const supabase = getServiceClient();
  log.header(`Inflate WBS — ${code}${revert ? ' (revert)' : ` (+${n} leaves)`}`);

  const { data: proj, error: pErr } = await supabase
    .from('projects').select('id, code').eq('code', code).maybeSingle();
  if (pErr || !proj) {
    log.error(`Project ${code} not found${pErr ? `: ${pErr.message}` : ''}.`);
    process.exit(1);
  }

  if (revert) {
    const { error, count } = await supabase
      .from('work_packages')
      .delete({ count: 'exact' })
      .eq('project_id', proj.id)
      .like('external_id', '%-DEVTEST-%');
    if (error) { log.error(error.message); process.exit(1); }
    log.success(`Removed ${count ?? 0} DEVTEST work packages from ${code}.`);
    return;
  }

  const nowIso = new Date().toISOString();
  const rows = Array.from({ length: n }, (_, i) => {
    const idx = i + 1;
    return {
      project_id: proj.id,
      wbs_code: `1.4.${50 + idx}`,
      parent_wbs_code: '1.4',
      name: `Dev test package ${idx} — install sub-scope`,
      responsible_role_type: 'construction_manager',
      is_billing_element: false,
      budget_bac: 1.0,
      source_system: 'SAP_PS',
      external_id: `${code}-DEVTEST-${idx}`,
      synced_at: nowIso,
      is_app_native: false,
    };
  });

  const { error } = await supabase.from('work_packages').insert(rows);
  if (error) { log.error(error.message); process.exit(1); }
  section('Summary');
  log.success(`Added ${rows.length} leaves under 1.4 on ${code}. Open the Structure tab to test; revert with --revert.`);
}

main().catch((e) => { log.error(String(e)); process.exit(1); });
