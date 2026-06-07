/**
 * Simulate scheduler resource assignments — Phase 4 (resource visibility).
 *
 * Pure data, NO LLM. For each task with dates + an owner discipline we spread a
 * small crew across the months the task spans, writing one resource_assignments
 * row per (task, month): planned_work_hours = crew × 160 × month-fraction,
 * resource_role = the task's owner discipline, source = the task's scheduler.
 * Aggregated at read time into FTE demand vs capacity (lib/resource-load).
 *
 * Requires migration 0017 + generator 08 (tasks). Idempotent: skips if
 * resource_assignments already exist unless --force.
 *
 * Run from pmo-llm-demo/:
 *   ./node_modules/.bin/tsx scripts/generators/10-simulate-resources.ts
 *   ./node_modules/.bin/tsx scripts/generators/10-simulate-resources.ts --force
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getServiceClient } from '../lib/supabase-admin';
import { log } from '../lib/log';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

function monthsBetween(start: Date, finish: Date): Array<{ key: string; frac: number }> {
  const out: Array<{ key: string; frac: number }> = [];
  if (finish <= start) return out;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const end = new Date(finish.getFullYear(), finish.getMonth(), 1);
  while (cur <= end) {
    const mStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const daysInMonth = (mEnd.getTime() - mStart.getTime()) / 86400000;
    const overlapStart = start > mStart ? start : mStart;
    const overlapEnd = finish < mEnd ? finish : mEnd;
    const overlapDays = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / 86400000);
    const frac = Math.min(1, overlapDays / daysInMonth);
    if (frac > 0.02) out.push({ key: `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}-01`, frac });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

// Blended labour rate ($/hr) by discipline — actuals × rate ≈ the Labour
// cost element. Actual hours track planned at a per-task productivity factor.
const RATE_BY_ROLE: Record<string, number> = {
  program_manager: 175, engineering_manager: 165, construction_manager: 145,
  procurement: 135, project_controls: 140,
};
const ROLE_LABEL: Record<string, string> = {
  engineering_manager: 'Engineering', construction_manager: 'Construction', procurement: 'Procurement',
  pm: 'Project management', project_controls: 'Project controls', commercial: 'Commercial',
  hse_manager: 'HSE', program_manager: 'Program', risk: 'Risk',
};

async function main() {
  const force = process.argv.includes('--force');
  log.header('Simulate scheduler resource assignments (Phase 4 — visibility)');
  const supabase = getServiceClient();

  const { count } = await supabase.from('resource_assignments').select('id', { count: 'exact', head: true });
  if ((count ?? 0) > 0 && !force) {
    log.warn(`resource_assignments already has ${count} rows — pass --force to rebuild. Skipping.`);
    return;
  }
  if (force && (count ?? 0) > 0) {
    log.warn('FORCE — clearing resource_assignments');
    await supabase.from('resource_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, project_id, owner_role_type, start_date, finish_date, source_system');
  if (error) { log.error(error.message); return; }

  let rows: Array<Record<string, unknown>> = [];
  let inserted = 0;
  for (const t of tasks ?? []) {
    if (!t.start_date || !t.finish_date || !t.owner_role_type) continue;
    const role = String(t.owner_role_type);
    const h = hash(String(t.id));
    const crew = 1 + (h % 4); // 1..4 people on the task
    const prod = 0.90 + (hash(`${t.id}:prod`) % 21) / 100; // 0.90..1.10 labour productivity
    const rate = (RATE_BY_ROLE[role] ?? 120) + (hash(`${t.id}:rate`) % 21) - 10; // ±10 jitter
    const nowKey = new Date().toISOString().slice(0, 7);
    const months = monthsBetween(new Date(t.start_date), new Date(t.finish_date));
    for (const m of months) {
      const hours = r2(crew * 160 * m.frac);
      rows.push({
        project_id: t.project_id,
        task_id: t.id,
        resource_name: `${ROLE_LABEL[role] ?? role} pool`,
        resource_role: role,
        period: m.key,
        planned_work_hours: hours,
        actual_work_hours: m.key.slice(0, 7) <= nowKey ? r2(hours / prod) : null,
        hourly_rate: rate,
        allocation_pct: Math.round(Math.min(1, m.frac) * 100),
        source_system: t.source_system === 'P6' ? 'P6' : 'MS_PROJECT',
        external_id: `${t.id}:${m.key}`,
        synced_at: new Date().toISOString(),
      });
    }
    if (rows.length >= 500) {
      const { error: insErr } = await supabase.from('resource_assignments').insert(rows);
      if (insErr) { log.error(insErr.message); return; }
      inserted += rows.length; rows = [];
    }
  }
  if (rows.length) {
    const { error: insErr } = await supabase.from('resource_assignments').insert(rows);
    if (insErr) { log.error(insErr.message); return; }
    inserted += rows.length;
  }
  log.success(`Inserted ${inserted} resource_assignments across ${(tasks ?? []).length} tasks.`);
}

main().catch((e) => { log.error(String(e)); process.exit(1); });
