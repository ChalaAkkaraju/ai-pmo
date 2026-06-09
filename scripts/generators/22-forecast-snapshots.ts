/**
 * Month-end forecast snapshots — the time series for month-over-month cost &
 * revenue forecasting to EAC. Pure data, NO LLM.
 *
 * ANCHORED to live earned value: for each active project we compute the current
 * BAC / EV / AC / CPI / EAC the same way the EV card does (work_packages leaves,
 * task % complete, cost actuals), make that the LATEST month-end close, then
 * back-cast earlier months with a smooth drift (CPI easing from ~1.0, progress
 * ramping up, budget & contract growing into their current values). So the trend
 * ENDS where the live EV card sits and evolves believably toward it.
 *
 * Requires migration 0032. Idempotent: skips projects that already have
 * snapshots unless --force (which rebuilds them).
 *   ./node_modules/.bin/tsx scripts/generators/22-forecast-snapshots.ts
 *   ./node_modules/.bin/tsx scripts/generators/22-forecast-snapshots.ts --force
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const num = (v: unknown) => Number(v) || 0;
function monthStart(d: Date, deltaMonths: number) { return new Date(d.getFullYear(), d.getMonth() + deltaMonths, 1); }
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const force = process.argv.includes('--force');
  log.header('Month-end forecast snapshots — anchored to live EV (migration 0032)');
  const db = getServiceClient();

  const { data: projects, error } = await db.from('projects')
    .select('id, code, contract_value_current, current_week')
    .eq('status', 'Active').order('code');
  if (error) throw error;

  const now = new Date();
  let total = 0, processed = 0, skipped = 0, noev = 0;
  for (const p of (projects ?? []) as Array<{ id: string; code: string; contract_value_current: number | string; current_week: number | string }>) {
    const has = await db.from('forecast_snapshots').select('id').eq('project_id', p.id).limit(1);
    if ((has.data?.length ?? 0) > 0) {
      if (!force) { skipped++; continue; }
      await db.from('forecast_snapshots').delete().eq('project_id', p.id);
    }

    // ---- live earned value (mirror lib/earned-value computeEv) ----
    const [{ data: wps }, { data: tks }, { data: cst }] = await Promise.all([
      db.from('work_packages').select('wbs_code, parent_wbs_code, budget_bac').eq('project_id', p.id),
      db.from('tasks').select('wbs_code, percent_complete').eq('project_id', p.id),
      db.from('cost_actuals').select('actual_cost, planned_value').eq('project_id', p.id),
    ]);
    const pct = new Map((tks ?? []).map((t) => [String((t as { wbs_code: string }).wbs_code), num((t as { percent_complete: number }).percent_complete)]));
    let bacLive = 0, evLive = 0;
    for (const w of (wps ?? []) as Array<{ wbs_code: string; parent_wbs_code: string | null; budget_bac: number | null }>) {
      if (!w.parent_wbs_code) continue;
      const b = num(w.budget_bac); bacLive += b; evLive += ((pct.get(w.wbs_code) ?? 0) / 100) * b;
    }
    const acLive = (cst ?? []).reduce((s, c) => s + num((c as { actual_cost: number }).actual_cost), 0);
    const pvLive = (cst ?? []).reduce((s, c) => s + num((c as { planned_value: number | null }).planned_value), 0);
    if (bacLive <= 0 || acLive <= 0 || evLive <= 0) { noev++; continue; }

    const cpiLive = evLive / acLive;
    const spiLive = pvLive > 0 ? evLive / pvLive : 1;
    const eacLive = bacLive / cpiLive;
    const contractLive = num(p.contract_value_current) || bacLive * 1.1;
    const currentProgress = clamp(evLive / bacLive, 0.05, 0.98);

    const r = rng(`${p.id}:forecast`);
    const months = clamp(Math.round(num(p.current_week) / 4.3), 3, 9);
    const startFrac = 0.25 + r() * 0.15;       // earliest progress as a share of current
    const bacGrowth = 0.01 + r() * 0.02;        // budget grew this much over the window
    const contractGrowth = 0.02 + r() * 0.025;  // contract grew (changes approved)

    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < months; i++) {
      const t = months === 1 ? 1 : i / (months - 1);  // 0 (oldest) .. 1 (latest = last month = live)
      const e = ease(t);
      const period = ymd(monthStart(now, -(months - i)));
      const bac = r2(bacLive * (1 - bacGrowth * (1 - t)));
      const contract = r2(contractLive * (1 - contractGrowth * (1 - t)));
      const cpi = r3(lerp(1.0, cpiLive, e));
      const spi = r3(lerp(1.0, spiLive, e));
      const prog = clamp(currentProgress * lerp(startFrac, 1.0, e), 0.03, 0.99);
      const ev = r2(prog * bac);
      const ac = r2(ev / cpi);
      const eac = r2(bac / cpi);
      const etc = r2(eac - ac);
      const vac = r2(bac - eac);
      const poc = r2((ac / eac) * 100);
      const recognised = r2((ac / eac) * contract);
      const billed = r2(recognised * lerp(0.78, 0.92, t));
      const forecast_margin = r2(contract - eac);
      rows.push({
        project_id: p.id, period, bac, ev, ac, eac, etc, vac, cpi, spi,
        contract_value: contract, poc_pct: poc, recognised_revenue: recognised, billed, forecast_margin,
        source_system: 'SAP_PS', synced_at: new Date().toISOString(),
      });
    }
    const { error: insErr } = await db.from('forecast_snapshots').insert(rows);
    if (insErr) { log.error(`${p.code}: ${insErr.message}`); continue; }
    total += rows.length; processed++;
    if (processed % 20 === 0) log.info(`… ${processed} projects`);
  }

  section('Summary');
  log.success(`${total} snapshots across ${processed} projects (latest close anchored to live EV); ${noev} no-EV skipped; ${skipped} already had snapshots.`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
