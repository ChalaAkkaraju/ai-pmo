/**
 * Variance trend backfill — give each active project a COHERENT weekly variance
 * series (not the 1–2 independent random rows the procedural generator emits),
 * so the Variance tab's trend chart shows a real progression of CPI / SPI,
 * contingency consumption, projected margin and buffer.
 *
 * Pure data, NO LLM. Deterministic per project (seeded on project id), so re-runs
 * reproduce the same curve. Idempotent: replaces the project's variance_reports.
 *
 * Safety: only fills projects that currently have FEWER THAN 3 variance reports —
 * i.e. the thin procedural ones. Projects with a hand-curated multi-week series
 * (e.g. the Mariposa demo) are left untouched. Pass --all to rebuild everyone
 * except an explicit skip list.
 *
 *   ./node_modules/.bin/tsx scripts/generators/23-variance-trend.ts
 *   ./node_modules/.bin/tsx scripts/generators/23-variance-trend.ts --all
 *
 * Targets whatever .env.local points at. To populate the cloud DB the Railway
 * demo reads, run it with the cloud Supabase env (service URL + service key).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

// Curated projects whose variance series must never be overwritten, even with --all.
const SKIP_CODES = new Set<string>(['NW-REN-2511']); // Mariposa Wind Farm — hand-curated weekly variance (weeks 0/28/52/78)

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Proj { id: string; code: string; current_week: number | string | null; approved_budget_current: number | string | null; contract_value_current: number | string | null; contingency: number | string | null; }

function buildSeries(p: Proj) {
  const r = rng(`${p.id}:variance-trend`);
  const cw = Math.max(4, Number(p.current_week) || 12);
  const contractM = (Number(p.contract_value_current) || Number(p.approved_budget_current) || 50_000_000) / 1_000_000;
  const contingencyM = (Number(p.contingency) || (Number(p.approved_budget_current) || 50_000_000) * 0.04) / 1_000_000;

  // Reporting cadence: aim for ~12 points regardless of how long the project runs.
  const step = clamp(Math.round(cw / 12), 1, 6);
  const weeks: number[] = [];
  for (let w = step; w < cw; w += step) weeks.push(w);
  weeks.push(cw); // the latest report is always the current week

  // Per-project temperament: a slight, persistent drift direction + an end-state.
  const cpiBias = (r() - 0.5) * 0.010;          // per-step drift
  const spiBias = (r() - 0.5) * 0.012;
  const consumeFrac = 0.25 + r() * 0.55;        // fraction of contingency consumed by the end
  const startBuffer = 30 + Math.floor(r() * 25);

  let cpi = 1.0 + (r() - 0.5) * 0.02;
  let spi = 1.0 + (r() - 0.5) * 0.02;
  let consumed = 0;
  const out: Array<Record<string, unknown>> = [];

  for (const w of weeks) {
    cpi = clamp(cpi + cpiBias + (r() - 0.5) * 0.012, 0.86, 1.12);
    spi = clamp(spi + spiBias + (r() - 0.5) * 0.014, 0.85, 1.12);
    const prog = w / cw;
    // Contingency draw rises monotonically (slightly accelerating), with light noise.
    const target = contingencyM * consumeFrac * Math.pow(prog, 1.2);
    consumed = clamp(Math.max(consumed, target * (0.95 + r() * 0.1)), 0, contingencyM);
    const cpiR = r3(cpi), spiR = r3(spi);
    // Margin tracks CPI around a ~9% baseline; schedule/buffer track SPI.
    const margin = clamp(9 + (cpiR - 1) * 65 + (r() - 0.5) * 0.6, 3, 14);
    const schedDays = Math.round((spiR - 1) * 42);
    const buffer = Math.max(0, Math.round(startBuffer - prog * (startBuffer - (spiR < 1 ? 8 : 28))));
    const costVar = r3((cpiR - 1) * contractM * 0.1);
    out.push({
      project_id: p.id,
      report_week: w,
      cpi: cpiR,
      spi: spiR,
      cost_variance_m: costVar,
      schedule_variance_days: schedDays,
      contingency_consumed_m: r3(consumed),
      projected_margin_pct: r2(margin),
      buffer_intact_days: buffer,
      full_report_md: `### Variance — Week ${w}\n\nCPI ${cpiR.toFixed(3)} · SPI ${spiR.toFixed(3)}. Contingency consumed $${consumed.toFixed(2)}M of $${contingencyM.toFixed(1)}M. Projected margin ${margin.toFixed(1)}%. Buffer intact ${buffer} days.`,
    });
  }
  return out;
}

async function main() {
  const all = process.argv.includes('--all');
  log.header(`Variance trend backfill — coherent weekly series ${all ? '(ALL projects)' : '(projects with <3 reports)'}`);
  const db = getServiceClient();

  const { data: projects, error } = await db
    .from('projects')
    .select('id, code, current_week, approved_budget_current, contract_value_current, contingency, status')
    .eq('status', 'Active')
    .order('code')
    .limit(10000);
  if (error) throw error;

  let processed = 0, skipped = 0, totalRows = 0;
  for (const p of (projects ?? []) as Array<Proj & { status: string }>) {
    if (SKIP_CODES.has(p.code)) { skipped++; continue; }
    const { count } = await db.from('variance_reports').select('id', { count: 'exact', head: true }).eq('project_id', p.id);
    const existing = count ?? 0;
    if (!all && existing >= 3) { skipped++; continue; }

    const series = buildSeries(p);
    // Replace the project's variance reports with the coherent series.
    await db.from('variance_reports').delete().eq('project_id', p.id);
    const { error: insErr } = await db.from('variance_reports').insert(series);
    if (insErr) { log.error(`${p.code}: ${insErr.message}`); continue; }
    processed++; totalRows += series.length;
    if (processed % 20 === 0) log.info(`… ${processed} projects`);
  }

  section('Summary');
  log.success(`${totalRows} weekly variance rows across ${processed} projects; ${skipped} skipped (curated or already-rich).`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
