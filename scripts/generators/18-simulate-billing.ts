/**
 * Simulate SAP PS billing events — the revenue / billed side. Pure data, NO LLM.
 *
 * Earned revenue = (EV ÷ BAC) × contract value (revenue earned by progress).
 * Billed-to-date lags earned by a per-project factor, so net unbilled (earned −
 * billed) is usually positive WIP; a few projects bill ahead (advance/over-bill).
 * Invoices are split across WBS phases by their earned share. WBS-tied.
 *
 * Requires migrations 0017 + 0028 and generators 07 (WBS) + 08 (tasks).
 * Idempotent: skips projects that already have billing unless --force.
 *   ./node_modules/.bin/tsx scripts/generators/18-simulate-billing.ts
 *   ./node_modules/.bin/tsx scripts/generators/18-simulate-billing.ts --force
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r2 = (n: number) => Math.round(n * 100) / 100;

const PHASE_NAME: Record<string, string> = {
  '1.1': 'Development & permitting', '1.2': 'Engineering', '1.3': 'Procurement',
  '1.4': 'Construction', '1.5': 'Commissioning & start-up',
};

async function main() {
  const force = process.argv.includes('--force');
  log.header('Simulate SAP PS billing events (earned vs billed revenue) — migrations 0017 + 0028');
  const db = getServiceClient();

  const { data: projects, error } = await db.from('projects')
    .select('id, code, current_week, contract_value_current, sold_contract_value, approved_budget_current').order('code');
  if (error) throw error;

  let total = 0, processed = 0, skipped = 0;
  for (const p of projects ?? []) {
    const existing = await db.from('billing_events').select('id').eq('project_id', p.id).limit(1);
    if ((existing.data?.length ?? 0) > 0) {
      if (!force) { skipped++; continue; }
      await db.from('billing_events').delete().eq('project_id', p.id);
    }

    const { data: leaves } = await db.from('work_packages')
      .select('wbs_code, budget_bac').eq('project_id', p.id).not('parent_wbs_code', 'is', null);
    if (!leaves || leaves.length === 0) continue;
    const { data: tasks } = await db.from('tasks').select('wbs_code, percent_complete').eq('project_id', p.id);
    const pctByWbs = new Map((tasks ?? []).map((t) => [String((t as { wbs_code: string }).wbs_code), Number((t as { percent_complete: number }).percent_complete) || 0]));

    // Earned value + earned value per phase.
    let bac = 0, ev = 0;
    const evByPhase = new Map<string, number>();
    for (const w of leaves as Array<{ wbs_code: string; budget_bac: number | null }>) {
      const b = Number(w.budget_bac) || 0;
      const leafEv = ((pctByWbs.get(w.wbs_code) ?? 0) / 100) * b;
      bac += b; ev += leafEv;
      const phase = w.wbs_code.split('.').slice(0, 2).join('.');
      evByPhase.set(phase, (evByPhase.get(phase) ?? 0) + leafEv);
    }
    if (bac <= 0 || ev <= 0) { processed++; continue; }

    const contract = Number(p.contract_value_current) || Number(p.sold_contract_value) || Number(p.approved_budget_current) * 1.15 || 0;
    if (contract <= 0) { processed++; continue; }
    const r = rng(`${p.id}:billing`);
    const completeFrac = ev / bac;
    const earnedRevenue = completeFrac * contract;
    const billLag = lerp(0.78, 1.06, r()); // <1 = unbilled WIP; >1 = billed ahead
    const billedToDate = Math.max(0, earnedRevenue * billLag);
    const currentWeek = Number(p.current_week) || 0;

    const phases = [...evByPhase.entries()].filter(([, e]) => e > 0).sort((a, b) => a[0].localeCompare(b[0]));
    const evSum = phases.reduce((s, [, e]) => s + e, 0) || 1;
    const rows: Record<string, unknown>[] = [];
    let idx = 0;
    for (const [phase, e] of phases) {
      idx++;
      const amount = r2(billedToDate * (e / evSum));
      if (amount < 10000) continue;
      const billed_week = Math.max(1, Math.round(currentWeek * lerp(0.2, 0.85, r())));
      const status = billed_week < currentWeek - 8 ? 'Paid' : 'Invoiced';
      const billing_type = idx === 1 && r() < 0.4 ? 'Advance' : r() < 0.5 ? 'Milestone' : 'Progress';
      rows.push({
        project_id: p.id,
        wbs_code: phase,
        invoice_number: `${p.code}-INV-${String(idx).padStart(2, '0')}`,
        billing_type,
        amount,
        billed_week,
        status,
        source_system: 'SAP_PS',
        external_id: `${p.code}-INV-${phase}`,
        synced_at: new Date().toISOString(),
      });
    }
    if (rows.length) {
      const { error: insErr } = await db.from('billing_events').insert(rows);
      if (insErr) { log.error(`${p.code}: ${insErr.message}`); continue; }
      total += rows.length;
    }
    processed++;
    if (processed % 20 === 0) log.info(`… ${processed} projects`);
  }

  section('Summary');
  log.success(`${total} billing events across ${processed} projects; ${skipped} skipped (already billed).`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
