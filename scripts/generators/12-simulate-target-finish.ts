/**
 * Set top-down target-finish envelopes on WBS leaves — Phase 5.
 *
 * Pure data, NO LLM. A target_finish is a MANAGEMENT (top-down) boundary date
 * per WBS, independent of the bottom-up task schedule. We set each leaf's
 * target_finish = its tasks' latest finish + a per-project buffer (−45…+75 days).
 * A negative buffer puts the target BEFORE the bottom-up forecast → a breach the
 * synthesis layer can flag (forecast exceeds the envelope).
 *
 * Requires migration 0017 + generators 07 (WBS) and 08 (tasks). Idempotent:
 * skips if target_finish is already set unless --force.
 *
 * Run from pmo-llm-demo/:
 *   ./node_modules/.bin/tsx scripts/generators/12-simulate-target-finish.ts
 *   ./node_modules/.bin/tsx scripts/generators/12-simulate-target-finish.ts --force
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
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function main() {
  const force = process.argv.includes('--force');
  log.header('Set top-down target-finish envelopes (Phase 5)');
  const supabase = getServiceClient();

  const { data: existing } = await supabase.from('work_packages').select('id').not('target_finish', 'is', null).limit(1);
  if (existing && existing.length > 0 && !force) {
    log.warn('target_finish already set on some work packages — pass --force to rebuild. Skipping.');
    return;
  }

  const { data: tasks } = await supabase.from('tasks').select('project_id, wbs_code, finish_date');
  const maxFinish = new Map<string, number>(); // `${project_id}|${wbs_code}` -> ms
  for (const t of tasks ?? []) {
    if (!t.wbs_code || !t.finish_date) continue;
    const k = `${t.project_id}|${t.wbs_code}`;
    const ms = Date.parse(String(t.finish_date));
    if (Number.isNaN(ms)) continue;
    if (!maxFinish.has(k) || ms > (maxFinish.get(k) as number)) maxFinish.set(k, ms);
  }

  const { data: leaves } = await supabase
    .from('work_packages')
    .select('id, project_id, wbs_code, parent_wbs_code')
    .not('parent_wbs_code', 'is', null);

  let updated = 0;
  for (const w of leaves ?? []) {
    const k = `${w.project_id}|${w.wbs_code}`;
    const mf = maxFinish.get(k);
    if (!mf) continue;
    const bufferDays = (hash(String(w.project_id)) % 121) - 45; // -45 … +75
    const target = isoDate(mf + bufferDays * 86400000);
    const { error } = await supabase.from('work_packages').update({ target_finish: target }).eq('id', w.id);
    if (error) { log.error(error.message); return; }
    updated++;
  }

  log.success(`target_finish set on ${updated} WBS leaves.`);
}

main().catch((e) => { log.error(String(e)); process.exit(1); });
