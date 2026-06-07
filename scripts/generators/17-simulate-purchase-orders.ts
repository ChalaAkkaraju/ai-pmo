/**
 * Simulate SAP PS purchase orders — the commitment layer. Pure data, NO LLM.
 *
 * POs are raised against procurement / construction / commissioning WBS and
 * drive committed cost: open commitment = po_value − received_value, where
 * received tracks the leaf's progress (goods receipt / invoice → actual). This
 * is the forward cost visibility a scheduler can't give — Budget → Commitment
 * → Actual, all tied to the WBS code.
 *
 * Requires migrations 0017 + 0027 and generators 07 (WBS) + 08 (tasks).
 * Idempotent: skips projects that already have POs unless --force.
 *   ./node_modules/.bin/tsx scripts/generators/17-simulate-purchase-orders.ts
 *   ./node_modules/.bin/tsx scripts/generators/17-simulate-purchase-orders.ts --force
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

type Cat = 'Materials/Equipment' | 'Subcontract' | 'Travel & expenses' | 'Other';
// Per WBS Level-2 phase: how much of the budget is PO-driven, and the category mix.
const PO_PROFILE: Record<string, { share: number; cats: [Cat, number][] }> = {
  '1.1': { share: 0.15, cats: [['Other', 0.6], ['Travel & expenses', 0.4]] },                       // Development & permitting
  '1.2': { share: 0.12, cats: [['Subcontract', 0.6], ['Travel & expenses', 0.4]] },                 // Engineering
  '1.3': { share: 0.85, cats: [['Materials/Equipment', 0.8], ['Subcontract', 0.2]] },               // Procurement
  '1.4': { share: 0.55, cats: [['Subcontract', 0.7], ['Materials/Equipment', 0.3]] },               // Construction
  '1.5': { share: 0.35, cats: [['Subcontract', 0.5], ['Materials/Equipment', 0.3], ['Other', 0.2]] }, // Commissioning
};
const VENDORS = ['Siemens Energy', 'GE Vernova', 'Hitachi Energy', 'Vestas', 'Voith Hydro', 'Bechtel', 'Kiewit', 'Fluor', 'Black & Veatch', 'Mott MacDonald', 'Sarens', 'ABB', 'Schneider Electric', 'Nexans', 'Prysmian'];

function catFor(r: () => number, cats: [Cat, number][]): Cat {
  const t = r(); let acc = 0;
  for (const [c, w] of cats) { acc += w; if (t <= acc) return c; }
  return cats[0][0];
}

async function main() {
  const force = process.argv.includes('--force');
  log.header('Simulate SAP PS purchase orders (commitment layer) — migrations 0017 + 0027');
  const db = getServiceClient();

  const { data: projects, error: pErr } = await db.from('projects').select('id, code, current_week').order('code');
  if (pErr) throw pErr;

  let total = 0, processed = 0, skipped = 0;
  for (const p of projects ?? []) {
    const existing = await db.from('purchase_orders').select('id').eq('project_id', p.id).limit(1);
    if ((existing.data?.length ?? 0) > 0) {
      if (!force) { skipped++; continue; }
      await db.from('purchase_orders').delete().eq('project_id', p.id);
    }

    const { data: leaves } = await db.from('work_packages')
      .select('wbs_code, budget_bac').eq('project_id', p.id).not('parent_wbs_code', 'is', null);
    if (!leaves || leaves.length === 0) continue;
    const { data: tasks } = await db.from('tasks')
      .select('wbs_code, percent_complete').eq('project_id', p.id);
    const pctByWbs = new Map((tasks ?? []).map((t) => [String((t as { wbs_code: string }).wbs_code), Number((t as { percent_complete: number }).percent_complete) || 0]));
    const currentWeek = Number(p.current_week) || 0;

    const rows: Record<string, unknown>[] = [];
    for (const w of leaves as Array<{ wbs_code: string; budget_bac: number | null }>) {
      const branch = w.wbs_code.split('.').slice(0, 2).join('.');
      const prof = PO_PROFILE[branch];
      const bac = Number(w.budget_bac) || 0;
      if (!prof || bac <= 0) continue;
      const r = rng(`${p.id}:${w.wbs_code}:po`);
      const poable = bac * prof.share;
      if (poable < 50000) continue; // skip trivial
      const nPo = 1 + Math.floor(r() * 2.5); // 1..3 POs per leaf
      const pct = pctByWbs.get(w.wbs_code) ?? 0;
      // Split the PO-able budget into nPo orders (slightly uneven).
      const weights = Array.from({ length: nPo }, () => 0.6 + r());
      const wsum = weights.reduce((a, b) => a + b, 0);
      for (let k = 0; k < nPo; k++) {
        const po_value = r2(poable * (weights[k] / wsum));
        if (po_value < 25000) continue;
        // Received tracks progress: goods receipted / invoiced to date.
        const recvFrac = clamp((pct / 100) * lerp(0.8, 1.05, r()), 0, 1);
        const received_value = r2(po_value * recvFrac);
        const status = received_value <= po_value * 0.02 ? 'Open'
          : received_value >= po_value * 0.98 ? 'Closed' : 'Partially received';
        rows.push({
          project_id: p.id,
          wbs_code: w.wbs_code,
          po_number: `${p.code}-PO-${branch.replace('.', '')}${String(k + 1).padStart(2, '0')}`,
          vendor: pick(r, VENDORS),
          value_category: catFor(r, prof.cats),
          po_value,
          received_value,
          status,
          raised_week: Math.max(0, Math.round(currentWeek * lerp(0.1, 0.6, r()))),
          source_system: 'SAP_PS',
          external_id: `${p.code}-PO-${w.wbs_code}-${k + 1}`,
          synced_at: new Date().toISOString(),
        });
      }
    }
    if (rows.length) {
      const { error: insErr } = await db.from('purchase_orders').insert(rows);
      if (insErr) { log.error(`${p.code}: ${insErr.message}`); continue; }
      total += rows.length;
    }
    processed++;
    if (processed % 20 === 0) log.info(`… ${processed} projects`);
  }

  section('Summary');
  log.success(`${total} purchase orders across ${processed} projects; ${skipped} skipped (already had POs).`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
