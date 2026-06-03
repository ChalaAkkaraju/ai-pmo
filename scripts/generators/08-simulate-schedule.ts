/**
 * Simulate scheduler ingestion (Dataverse / Primavera P6) — Phase 2.
 *
 * Pure data, NO LLM. For each project that has a WBS (work_packages), creates
 * one task per leaf work package — joined to it by wbs_code — with start/finish
 * dates, % complete, predecessors and a critical-path flag, plus a few
 * milestones (NTP, major-equipment delivery, COD/substantial completion).
 *
 * Dates are anchored so the project's as-of point (current_week) lands on
 * TODAY — so the Gantt's "today" line is real. Each project gets a deterministic
 * schedule-health factor, so some run ahead and some slip (this feeds SPI in
 * Phase 3). source_system alternates DATAVERSE / P6 to show both feeding in.
 *
 * Requires migration 0017 + generator 07 (work packages). Idempotent: skips
 * projects that already have tasks unless --force.
 *
 * Run from pmo-llm-demo/:
 *   ./node_modules/.bin/tsx scripts/generators/08-simulate-schedule.ts
 *   ./node_modules/.bin/tsx scripts/generators/08-simulate-schedule.ts --force
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

type Segment = 'renewables' | 'water' | 'industrial' | 'power';

interface ProjectRow {
  id: string;
  code: string;
  segment: Segment;
  current_week: number;
  status: string;
}
interface WpRow {
  wbs_code: string;
  parent_wbs_code: string | null;
  name: string;
  responsible_role_type: string | null;
}

// Phase windows as fractions of the total project duration.
const PHASE_WINDOW: Record<string, [number, number]> = {
  '1.1': [0.0, 0.1],
  '1.2': [0.05, 0.28],
  '1.3': [0.1, 0.62],
  '1.4': [0.3, 0.85],
  '1.5': [0.82, 1.0],
};
const CRITICAL_PHASES = new Set(['1.3', '1.5']);

function hash(code: string): number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

async function main() {
  const force = process.argv.includes('--force');
  log.header('Simulate scheduler ingestion (tasks + milestones)');
  if (force) log.warn('FORCE — rebuilding tasks/milestones');

  const supabase = getServiceClient();
  const { data: pdata, error } = await supabase
    .from('projects')
    .select('id, code, segment, current_week, status')
    .order('code', { ascending: true });
  if (error) {
    log.error(`Could not load projects: ${error.message}`);
    process.exit(1);
  }
  const projects = (pdata ?? []) as ProjectRow[];
  const today = new Date();

  let taskCount = 0;
  let msCount = 0;
  let skipped = 0;
  let processed = 0;

  for (const p of projects) {
    const { data: wps } = await supabase
      .from('work_packages')
      .select('wbs_code, parent_wbs_code, name, responsible_role_type')
      .eq('project_id', p.id);
    const leaves = ((wps ?? []) as WpRow[]).filter((w) => w.parent_wbs_code).sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));
    if (leaves.length === 0) continue; // no WBS → skip (e.g. app-created project)

    const { data: existing } = await supabase.from('tasks').select('id').eq('project_id', p.id).limit(1);
    if (existing && existing.length > 0) {
      if (!force) {
        skipped++;
        continue;
      }
      await supabase.from('tasks').delete().eq('project_id', p.id);
      await supabase.from('milestones').delete().eq('project_id', p.id);
    }

    const rng = hash(p.code);
    const now = Number(p.current_week) || 0;
    // Elapsed fraction by status (with deterministic variance), then total weeks.
    const baseF = p.status === 'Closed' ? 1.0 : p.status === 'SC' ? 0.95 : 0.35 + ((rng % 30) / 100);
    const total = Math.max(now + 6, Math.round((now || 40) / baseF));
    // Schedule-health completion factor: <1 behind, >1 ahead.
    const cf = 0.75 + ((rng >>> 5) % 36) / 100; // 0.75 .. 1.10 (unsigned shift; ahead/behind)
    const front = now * cf; // progress front: < now = behind schedule, > now = ahead
    const src = (rng & 1) === 0 ? 'DATAVERSE' : 'P6';
    const ntp = addDays(today, -now * 7); // as-of (now) maps to today
    const ntpDate = new Date(ntp);

    // group leaves by phase to stagger within the phase window
    const byPhase = new Map<string, WpRow[]>();
    for (const w of leaves) {
      const ph = w.wbs_code.split('.').slice(0, 2).join('.');
      if (!byPhase.has(ph)) byPhase.set(ph, []);
      byPhase.get(ph)!.push(w);
    }

    const taskRows: Record<string, unknown>[] = [];
    let prevWbs: string | null = null;
    for (const w of leaves) {
      const ph = w.wbs_code.split('.').slice(0, 2).join('.');
      const win = PHASE_WINDOW[ph] ?? [0, 1];
      const sibs = byPhase.get(ph)!;
      const idx = sibs.indexOf(w);
      const n = sibs.length;
      const ws = (win[0] + (win[1] - win[0]) * (idx / n)) * total;
      const wf = (win[0] + (win[1] - win[0]) * ((idx + 1) / n)) * total;
      // Done tasks hit 100%, future 0%, the one straddling the front is partial.
      const pct = wf > ws ? clamp(Math.round(((front - ws) / (wf - ws)) * 100), 0, 100) : front >= wf ? 100 : 0;
      taskRows.push({
        project_id: p.id,
        wbs_code: w.wbs_code,
        name: w.name,
        start_date: addDays(ntpDate, ws * 7),
        finish_date: addDays(ntpDate, wf * 7),
        duration_days: Math.max(1, Math.round((wf - ws) * 7)),
        percent_complete: pct,
        predecessors: prevWbs,
        is_critical: CRITICAL_PHASES.has(ph),
        owner_role_type: w.responsible_role_type,
        source_system: src,
        external_id: `${p.code}-T-${w.wbs_code}`,
        synced_at: today.toISOString(),
        is_app_native: false,
      });
      prevWbs = w.wbs_code;
    }

    // link tasks to their work package by wbs_code (one round trip per project)
    const { data: wpIds } = await supabase.from('work_packages').select('id, wbs_code').eq('project_id', p.id);
    const wpByCode = new Map((wpIds ?? []).map((r) => [(r as { wbs_code: string }).wbs_code, (r as { id: string }).id]));
    for (const t of taskRows) t.work_package_id = wpByCode.get(t.wbs_code as string) ?? null;

    const { error: tErr } = await supabase.from('tasks').insert(taskRows);
    if (tErr) {
      log.error(`${p.code} tasks: ${tErr.message}`);
      continue;
    }
    taskCount += taskRows.length;

    // Milestones
    const codName = p.segment === 'power' || p.segment === 'renewables' ? 'Commercial operation (COD)' : 'Substantial completion';
    const msRows = [
      { project_id: p.id, name: 'Notice to proceed (NTP)', due_date: ntp, is_contractual: true, achieved: now >= 0, source_system: src, synced_at: today.toISOString() },
      { project_id: p.id, name: 'Major equipment delivered', due_date: addDays(ntpDate, 0.6 * total * 7), is_contractual: false, achieved: now >= 0.6 * total, source_system: src, synced_at: today.toISOString() },
      { project_id: p.id, name: codName, due_date: addDays(ntpDate, total * 7), is_contractual: true, achieved: p.status === 'Closed' || now >= total, source_system: src, synced_at: today.toISOString() },
    ];
    const { error: mErr } = await supabase.from('milestones').insert(msRows);
    if (!mErr) msCount += msRows.length;

    processed++;
    if (processed % 20 === 0) log.info(`… ${processed} projects scheduled`);
  }

  section('Summary');
  log.success(`${taskCount} tasks + ${msCount} milestones across ${processed} projects; ${skipped} skipped (already scheduled)`);
}

main().catch((e) => {
  log.error(String(e));
  process.exit(1);
});
