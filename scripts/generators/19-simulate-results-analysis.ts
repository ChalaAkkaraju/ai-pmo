/**
 * Simulate SAP PS Results Analysis — the EXTERNAL / financial revenue figure.
 * Pure data, NO LLM. Deliberately INDEPENDENT of earned value: RA uses its own
 * cost-based percentage-of-completion (actual cost ÷ planned cost), NOT the EV %
 * (earned ÷ budget). The two diverge by CPI — which is the point: EVA is the
 * managerial view, RA is the posted/audited financial view. Keyed to WBS phase.
 *
 *   POC (RA)            = actual cost ÷ planned cost   (capped at 100%)
 *   planned revenue     = phase share of contract, set from a per-phase margin
 *   calculated revenue  = POC × planned revenue        (recognised revenue)
 *   recognised margin   = calculated revenue − actual cost (cost of sales)
 *
 * Requires migrations 0017 + 0029 and generators 07 (WBS) + 09 (cost actuals).
 * Idempotent: skips projects that already have RA rows unless --force.
 *   ./node_modules/.bin/tsx scripts/generators/19-simulate-results-analysis.ts
 *   ./node_modules/.bin/tsx scripts/generators/19-simulate-results-analysis.ts --force
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const force = process.argv.includes('--force');
  log.header('Simulate SAP PS Results Analysis (recognised revenue — external/financial) — migration 0029');
  const db = getServiceClient();

  const { data: projects, error } = await db.from('projects')
    .select('id, code, contract_value_current, sold_contract_value, approved_budget_current').order('code');
  if (error) throw error;
  const periodStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  let total = 0, processed = 0, skipped = 0;
  for (const p of projects ?? []) {
    const existing = await db.from('results_analysis').select('id').eq('project_id', p.id).limit(1);
    if ((existing.data?.length ?? 0) > 0) {
      if (!force) { skipped++; continue; }
      await db.from('results_analysis').delete().eq('project_id', p.id);
    }

    const { data: leaves } = await db.from('work_packages')
      .select('wbs_code, budget_bac').eq('project_id', p.id).not('parent_wbs_code', 'is', null);
    if (!leaves || leaves.length === 0) continue;
    const { data: costs } = await db.from('cost_actuals')
      .select('wbs_code, actual_cost').eq('project_id', p.id);

    // Aggregate planned cost (BAC) and actual cost per WBS Level-2 phase.
    const phase = (w: string) => w.split('.').slice(0, 2).join('.');
    const plannedCost = new Map<string, number>();
    for (const w of leaves as Array<{ wbs_code: string; budget_bac: number | null }>) {
      const ph = phase(w.wbs_code);
      plannedCost.set(ph, (plannedCost.get(ph) ?? 0) + (Number(w.budget_bac) || 0));
    }
    const actualCost = new Map<string, number>();
    for (const c of (costs ?? []) as Array<{ wbs_code: string; actual_cost: number | null }>) {
      const ph = phase(c.wbs_code);
      actualCost.set(ph, (actualCost.get(ph) ?? 0) + (Number(c.actual_cost) || 0));
    }

    const contract = Number(p.contract_value_current) || Number(p.sold_contract_value) || Number(p.approved_budget_current) * 1.15 || 0;
    const projBAC = [...plannedCost.values()].reduce((a, b) => a + b, 0);
    if (projBAC <= 0 || contract <= 0) { processed++; continue; }

    // Per-phase planned revenue from a per-phase margin, normalised so the phase
    // revenues sum to the contract value.
    const phases = [...plannedCost.keys()].sort();
    const rawRev = new Map<string, number>();
    let rawSum = 0;
    for (const ph of phases) {
      const r = rng(`${p.id}:${ph}:ra`);
      const margin = lerp(0.06, 0.20, r()); // phase planned margin 6–20%
      const rev = (plannedCost.get(ph) ?? 0) * (1 + margin);
      rawRev.set(ph, rev); rawSum += rev;
    }
    const scale = rawSum > 0 ? contract / rawSum : 1;

    const rows: Record<string, unknown>[] = [];
    for (const ph of phases) {
      const pc = plannedCost.get(ph) ?? 0;
      const ac = actualCost.get(ph) ?? 0;
      if (pc <= 0) continue;
      const planned_revenue = r2((rawRev.get(ph) ?? 0) * scale);
      const poc = clamp(ac / pc, 0, 1); // cost-based POC — independent of EV
      const calculated_revenue = r2(poc * planned_revenue);
      const cost_of_sales = r2(ac);
      const recognized_margin = r2(calculated_revenue - cost_of_sales);
      rows.push({
        project_id: p.id,
        wbs_code: ph,
        period: periodStr,
        ra_method: 'Cost-based POC',
        poc_pct: r2(poc * 100),
        planned_cost: r2(pc),
        planned_revenue,
        cost_of_sales,
        calculated_revenue,
        recognized_margin,
        reserve: 0,
        source_system: 'SAP_PS',
        external_id: `${p.code}-RA-${ph}`,
        synced_at: new Date().toISOString(),
      });
    }
    if (rows.length) {
      const { error: insErr } = await db.from('results_analysis').insert(rows);
      if (insErr) { log.error(`${p.code}: ${insErr.message}`); continue; }
      total += rows.length;
    }
    processed++;
    if (processed % 20 === 0) log.info(`… ${processed} projects`);
  }

  section('Summary');
  log.success(`${total} results-analysis rows across ${processed} projects; ${skipped} skipped (already had RA).`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
