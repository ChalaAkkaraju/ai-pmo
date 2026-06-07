/**
 * Risk register lifecycle/structure backfill — WBS link, realised actuals,
 * proximity, velocity. Pure data, NO LLM. Deterministic by risk id.
 *
 *   - wbs_code          a leaf WBS of the project (reuses a linked issue's WBS
 *                       where one exists, for coherence; else a deterministic leaf)
 *   - realised_cost_usd  Realised risks only: cost_impact_usd × jitter(0.6–1.5)
 *   - proximity_weeks    live risks: nearer for higher score; Realised = 0
 *   - velocity           by cross-cutting class (weather/regulatory escalate fast)
 *
 * Requires migration 0025 + generator 14 (cost_impact_usd). Idempotent.
 *   ./node_modules/.bin/tsx scripts/generators/15-enrich-risks-2.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log } from '../lib/log';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const FAST = new Set(['Weather / climate-sensitive construction', 'Regulatory / external deadline']);
const MED = new Set(['Vendor / supplier concentration', 'Resource / labour scarcity', 'Site-conditions variance']);

async function main() {
  const force = process.argv.includes('--force');
  log.header('Risk lifecycle/structure backfill (WBS · realised · proximity · velocity) — migration 0025');
  const db = getServiceClient();

  const { data: wps } = await db.from('work_packages').select('project_id, wbs_code, parent_wbs_code');
  // Leaves per project = wbs_codes never used as a parent.
  const leavesByProj = new Map<string, string[]>();
  const parents = new Set<string>();
  for (const w of wps ?? []) if (w.parent_wbs_code) parents.add(`${w.project_id}:${w.parent_wbs_code}`);
  for (const w of wps ?? []) {
    if (parents.has(`${w.project_id}:${w.wbs_code}`)) continue;
    const arr = leavesByProj.get(w.project_id) ?? []; arr.push(w.wbs_code); leavesByProj.set(w.project_id, arr);
  }

  // Issue → linked risk's WBS (for coherence): key `${project_id}:${risk_id}` → wbs_code
  const { data: issues } = await db.from('issues').select('project_id, linked_risk, linked_wbs');
  const issueWbs = new Map<string, string>();
  for (const i of issues ?? []) {
    const lw = Array.isArray(i.linked_wbs) ? i.linked_wbs[0] : null;
    if (i.linked_risk && lw) issueWbs.set(`${i.project_id}:${i.linked_risk}`, lw);
  }

  const { data: risks, error } = await db
    .from('risks')
    .select('id, project_id, risk_id, status, score, cost_impact_usd, cross_cutting_class, wbs_code');
  if (error) throw error;
  log.info(`${risks!.length} risks.`);

  let updated = 0;
  const batches: PromiseLike<unknown>[] = [];
  for (const risk of risks!) {
    if (risk.wbs_code && !force) continue;
    const r = rng((risk.id as string) + ':v2');
    const status = String(risk.status ?? '').toLowerCase();
    const score = Number(risk.score) || 4;

    // WBS: prefer the linked issue's WBS; else a deterministic leaf.
    let wbs_code: string | null = issueWbs.get(`${risk.project_id}:${risk.risk_id}`) ?? null;
    if (!wbs_code) {
      const leaves = leavesByProj.get(risk.project_id) ?? [];
      if (leaves.length) wbs_code = leaves[Math.floor(r() * leaves.length)];
    }

    // Realised actual cost (vs predicted EMV)
    const cost = Number(risk.cost_impact_usd) || 0;
    const realised_cost_usd = status.includes('realised') && cost > 0
      ? Math.round(cost * lerp(0.6, 1.5, r())) : null;

    // Proximity: nearer for higher score; Realised already hit; Not materialised n/a
    let proximity_weeks: number | null;
    if (status.includes('realised')) proximity_weeks = 0;
    else if (status.includes('not materialised')) proximity_weeks = null;
    else proximity_weeks = clamp(Math.round(lerp(4, 44, 1 - (score - 1) / 8) + lerp(-6, 6, r())), 1, 52);

    // Velocity by cross-cutting class
    const cc = String(risk.cross_cutting_class ?? '');
    let velocity = FAST.has(cc) ? 'Fast' : MED.has(cc) ? 'Medium' : 'Slow';
    if (r() < 0.18) velocity = velocity === 'Fast' ? 'Medium' : velocity === 'Slow' ? 'Medium' : 'Fast'; // jitter

    batches.push(db.from('risks').update({ wbs_code, realised_cost_usd, proximity_weeks, velocity }).eq('id', risk.id));
    updated++;
    if (batches.length >= 25) await Promise.all(batches.splice(0));
  }
  if (batches.length) await Promise.all(batches);
  log.success(`Backfilled ${updated} risks (WBS · realised · proximity · velocity).`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
