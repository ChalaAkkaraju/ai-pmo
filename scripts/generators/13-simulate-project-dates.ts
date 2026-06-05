/**
 * Set the contractual project window — Phase 5.
 *
 * Pure data, NO LLM. Backfills projects.start_date and projects.contract_finish
 * (migration 0021) — the top-down, whole-project commitment the Schedule Reasoner
 * validates scheduler task dates against.
 *
 *   start_date      = today − current_week×7, pulled back to just before the
 *                     earliest scheduler task start so no task starts pre-window
 *                     under normal conditions.
 *   contract_finish = top-down target envelope (max leaf target_finish) + a
 *                     per-project buffer in [−30 … +120] days. A NEGATIVE buffer
 *                     puts the contractual finish BEFORE the latest task finish →
 *                     a contract-finish breach the synthesis layer flags. Most
 *                     projects land inside the window; a minority breach.
 *
 * Requires migration 0021 + generators 07 (WBS), 08 (tasks), 12 (target_finish).
 * Idempotent: skips if start_date is already set unless --force.
 *
 * Run from pmo-llm-demo/:
 *   ./node_modules/.bin/tsx scripts/generators/13-simulate-project-dates.ts
 *   ./node_modules/.bin/tsx scripts/generators/13-simulate-project-dates.ts --force
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
const DAY = 86400000;
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const parse = (v: unknown): number | null => {
  const n = Date.parse(String(v));
  return Number.isNaN(n) ? null : n;
};

async function main() {
  const force = process.argv.includes('--force');
  log.header('Set contractual project window (start_date / contract_finish) — Phase 5');
  const supabase = getServiceClient();

  const { data: existing } = await supabase.from('projects').select('id').not('start_date', 'is', null).limit(1);
  if (existing && existing.length > 0 && !force) {
    log.warn('start_date already set on some projects — pass --force to rebuild. Skipping.');
    return;
  }

  const { data: projects, error } = await supabase.from('projects').select('id, code, current_week');
  if (error || !projects) { log.error(`Could not load projects: ${error?.message}`); return; }

  const today = Date.now();
  let updated = 0;
  let breaches = 0;

  for (const p of projects as Array<{ id: string; code: string; current_week: number | null }>) {
    const [{ data: tasks }, { data: wps }] = await Promise.all([
      supabase.from('tasks').select('start_date, finish_date').eq('project_id', p.id),
      supabase.from('work_packages').select('parent_wbs_code, target_finish').eq('project_id', p.id),
    ]);

    const taskStarts = (tasks ?? []).map((t) => parse((t as { start_date: unknown }).start_date)).filter((n): n is number => n != null);
    const taskFinishes = (tasks ?? []).map((t) => parse((t as { finish_date: unknown }).finish_date)).filter((n): n is number => n != null);
    const targets = (wps ?? [])
      .filter((w) => (w as { parent_wbs_code: string | null }).parent_wbs_code)
      .map((w) => parse((w as { target_finish: unknown }).target_finish))
      .filter((n): n is number => n != null);

    // --- start_date: cursor-derived, never after the earliest task start ---
    const week = Number(p.current_week ?? 0);
    let start = today - week * 7 * DAY;
    if (taskStarts.length) start = Math.min(start, Math.min(...taskStarts) - 3 * DAY);

    // --- contract_finish: target envelope + per-project buffer ---
    const envelope = targets.length ? Math.max(...targets)
      : taskFinishes.length ? Math.max(...taskFinishes)
      : start + 180 * DAY;
    // Buffer in [-30 … +120] days, deterministic per project.
    const buffer = (hash(p.code) % 151) - 30;
    const finish = envelope + buffer * DAY;

    const latestTask = taskFinishes.length ? Math.max(...taskFinishes) : null;
    if (latestTask != null && latestTask > finish) breaches++;

    const { error: upErr } = await supabase
      .from('projects')
      .update({ start_date: isoDate(start), contract_finish: isoDate(finish) })
      .eq('id', p.id);
    if (upErr) { log.warn(`${p.code}: ${upErr.message}`); continue; }
    updated++;
  }

  log.success(`Set window on ${updated} project(s); ${breaches} have a contract-finish breach (latest task finishes past the contractual finish).`);
}

main().catch((e) => { log.error(String(e)); process.exit(1); });
