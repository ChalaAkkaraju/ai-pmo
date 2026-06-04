/**
 * Standalone sanity check for the SAP mapper + mock adapter (Phase 6).
 * Run: ./node_modules/.bin/tsx scripts/test-sap-mapper.ts
 */
import { mapSapWbs, mapSapCost, normalizeWbs } from '../lib/integration/mappers/sap-ps';
import { SapPsMockAdapter } from '../lib/integration/adapters/sap-ps-mock';

async function main() {
  const a = new SapPsMockAdapter();
  const wbsDtos = await a.fetchWbs('NW-PWR-2696');
  const costDtos = await a.fetchCostActuals('NW-PWR-2696');
  const at = new Date().toISOString();

  const wbs = mapSapWbs(wbsDtos, 'proj-1', at);
  const cost = mapSapCost(costDtos, 'proj-1', at);

  console.log('WBS DTOs:', wbsDtos.length, '→ rows:', wbs.rows.length, '| exceptions:', wbs.exceptions.length);
  console.log('exception:', wbs.exceptions[0]?.kind, '·', wbs.exceptions[0]?.reason);
  const leaf = wbs.rows.find((r) => r.wbs_code === '3.1');
  console.log('leaf 3.1 → role:', leaf?.responsible_role_type, '| billing:', leaf?.is_billing_element, '| bac:', leaf?.budget_bac);
  console.log('cost rows:', cost.rows.length);

  // idempotent mapping + normalisation
  const norm = normalizeWbs('  1.1 ') === '1.1';
  const again = mapSapWbs(wbsDtos, 'proj-1', at);

  const ok =
    wbsDtos.length === 14 &&
    wbs.rows.length === 13 &&
    wbs.exceptions.length === 1 &&
    wbs.exceptions[0].kind === 'validation' &&
    leaf?.is_billing_element === true &&
    leaf?.responsible_role_type === 'procurement' &&
    cost.rows.length === 8 &&
    norm &&
    again.rows.length === wbs.rows.length;

  console.log('PASS:', ok);
  if (!ok) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
