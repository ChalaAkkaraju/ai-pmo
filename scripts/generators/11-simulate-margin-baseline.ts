/**
 * Freeze the AS-SOLD baseline — Phase: three-state margin reconciliation.
 *
 * Pure data, NO LLM. For each project with a WBS:
 *   work_packages.baseline_bac = budget_bac × (1 − erosion)   (as-sold < as-planned,
 *                                so the plan eroded margin before execution began)
 *   projects.sold_contract_value = contract_value_current × (1 − coGrowth)
 *                                (contract grew via change orders since booking)
 *   projects.sold_margin_pct = (sold_contract − sold_budget) / sold_contract
 *   projects.baseline_captured_at = a date before today
 *
 * Per-project erosion/coGrowth come from a hash so the portfolio shows a spread.
 * Requires migration 0019 + generator 07 (WBS). Idempotent: skips projects whose
 * baseline is already set unless --force.
 *
 * Run from pmo-llm-demo/:
 *   ./node_modules/.bin/tsx scripts/generators/11-simulate-margin-baseline.ts
 *   ./node_modules/.bin/tsx scripts/generators/11-simulate-margin-baseline.ts --force
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

async function main() {
  const force = process.argv.includes('--force');
  log.header('Freeze as-sold baseline (three-state margin reconciliation)');
  const supabase = getServiceClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, code, contract_value_current, sold_contract_value');
  if (error) { log.error(error.message); return; }

  let done = 0, skipped = 0;
  for (const p of projects ?? []) {
    if (p.sold_contract_value != null && !force) { skipped++; continue; }

    const { data: wps } = await supabase
      .from('work_packages')
      .select('id, parent_wbs_code, budget_bac')
      .eq('project_id', p.id);
    if (!wps || wps.length === 0) { skipped++; continue; }

    const h = hash(String(p.id));
    const erosion = ((h % 9) / 100); // 0–8% budget growth from sold to planned
    const coGrowth = (((h >>> 4) % 7) / 100); // 0–6% contract growth via change orders

    let soldBudget = 0;
    for (const w of wps) {
      const planned = Number(w.budget_bac) || 0;
      const baseline = r2(planned * (1 - erosion));
      if (w.parent_wbs_code) soldBudget += baseline; // sum leaves only
      const { error: uErr } = await supabase.from('work_packages').update({ baseline_bac: baseline }).eq('id', w.id);
      if (uErr) { log.error(uErr.message); return; }
    }

    const currentContract = Number(p.contract_value_current) || 0;
    const soldContract = r2(currentContract * (1 - coGrowth));
    const soldMarginPct = soldContract > 0 ? r2(((soldContract - soldBudget) / soldContract) * 100) : 0;
    const capturedAt = new Date(Date.now() - (180 + (h % 200)) * 86400000).toISOString();

    const { error: pErr } = await supabase
      .from('projects')
      .update({ sold_contract_value: soldContract, sold_margin_pct: soldMarginPct, baseline_captured_at: capturedAt })
      .eq('id', p.id);
    if (pErr) { log.error(pErr.message); return; }
    done++;
  }

  log.success(`Baseline frozen for ${done} projects (${skipped} skipped).`);
}

main().catch((e) => { log.error(String(e)); process.exit(1); });
