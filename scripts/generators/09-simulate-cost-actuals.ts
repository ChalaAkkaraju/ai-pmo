/**
 * Simulate SAP PS cost actuals — Phase 3 (earned value).
 *
 * Pure data, NO LLM. For each leaf work package it writes one cost_actuals row:
 *   planned_value = time-elapsed fraction of the task (today vs start/finish) × BAC
 *   actual_cost   = earned value (task % × BAC) ÷ project CPI factor
 *                   (CPI < 1 → over cost; > 1 → under)
 * EV itself is NOT stored — it is computed at read time from task % × BAC.
 * Together these drive CPI/SPI/EAC/VAC. A per-project CPI factor gives a
 * realistic spread of cost performance across the portfolio.
 *
 * Requires migrations 0017 + generators 07 (WBS) and 08 (tasks). Idempotent:
 * skips projects that already have cost actuals unless --force.
 *
 * Run from pmo-llm-demo/:
 *   ./node_modules/.bin/tsx scripts/generators/09-simulate-cost-actuals.ts
 *   ./node_modules/.bin/tsx scripts/generators/09-simulate-cost-actuals.ts --force
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

function hash(code: string): number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const force = process.argv.includes('--force');
  log.header('Simulate SAP PS cost actuals (earned value inputs)');
  if (force) log.warn('FORCE — rebuilding cost actuals');

  const supabase = getServiceClient();
  const { data: pdata, error } = await supabase.from('projects').select('id, code').order('code', { ascending: true });
  if (error) {
    log.error(`Could not load projects: ${error.message}`);
    process.exit(1);
  }
  const projects = (pdata ?? []) as Array<{ id: string; code: string }>;
  const todayMs = Date.now();
  const period = new Date();
  const periodStr = new Date(period.getFullYear(), period.getMonth(), 1).toISOString().slice(0, 10);

  let rowCount = 0;
  let processed = 0;
  let skipped = 0;

  for (const p of projects) {
    const { data: leaves } = await supabase
      .from('work_packages')
      .select('wbs_code, budget_bac')
      .eq('project_id', p.id)
      .not('parent_wbs_code', 'is', null);
    if (!leaves || leaves.length === 0) continue;

    const { data: existing } = await supabase.from('cost_actuals').select('id').eq('project_id', p.id).limit(1);
    if (existing && existing.length > 0) {
      if (!force) {
        skipped++;
        continue;
      }
      await supabase.from('cost_actuals').delete().eq('project_id', p.id);
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('wbs_code, percent_complete, start_date, finish_date')
      .eq('project_id', p.id);
    const taskByWbs = new Map((tasks ?? []).map((t) => [(t as { wbs_code: string }).wbs_code, t]));

    const cpf = 0.85 + ((hash(p.code) >>> 7) % 28) / 100; // 0.85 .. 1.12 (CPI)

    const rows = (leaves as Array<{ wbs_code: string; budget_bac: number | null }>).map((w) => {
      const bac = Number(w.budget_bac) || 0;
      const t = taskByWbs.get(w.wbs_code) as { percent_complete: number; start_date: string; finish_date: string } | undefined;
      const pct = t ? Number(t.percent_complete) || 0 : 0;
      const ev = (pct / 100) * bac;
      // planned % = how far through the task we should be by today
      let plannedFrac = 0;
      if (t?.start_date && t?.finish_date) {
        const s = new Date(t.start_date).getTime();
        const f = new Date(t.finish_date).getTime();
        plannedFrac = f > s ? clamp((todayMs - s) / (f - s), 0, 1) : todayMs >= f ? 1 : 0;
      }
      const pv = plannedFrac * bac;
      const ac = cpf > 0 ? ev / cpf : ev;
      return {
        project_id: p.id,
        wbs_code: w.wbs_code,
        period: periodStr,
        actual_cost: r2(ac),
        commitment: r2(Math.max(0, bac - ac) * 0.15),
        planned_value: r2(pv),
        source_system: 'SAP_PS',
        external_id: `${p.code}-AC-${w.wbs_code}`,
        synced_at: new Date().toISOString(),
      };
    });

    const { error: insErr } = await supabase.from('cost_actuals').insert(rows);
    if (insErr) {
      log.error(`${p.code}: ${insErr.message}`);
      continue;
    }
    rowCount += rows.length;
    processed++;
    if (processed % 20 === 0) log.info(`… ${processed} projects costed`);
  }

  section('Summary');
  log.success(`${rowCount} cost-actual rows across ${processed} projects; ${skipped} skipped (already costed)`);
}

main().catch((e) => {
  log.error(String(e));
  process.exit(1);
});
