/**
 * Diagnose why only ~32 projects appear in the portfolio Earned Value.
 * A project is "EV-ready" when sum(leaf budget_bac) > 0 AND sum(actual_cost) > 0.
 * Reports, per status, how many are ready and what the not-ready ones are missing.
 * Read-only. Run: node scripts/diagnose-ev.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv(p) {
  const o = {};
  for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const i = l.indexOf('='); if (i < 0) continue;
    const k = l.slice(0, i).trim(); if (!k || k.startsWith('#')) continue;
    o[k] = l.slice(i + 1).trim();
  }
  return o;
}
const env = loadEnv('.env.local');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function all(table, cols) {
  const out = []; let from = 0;
  for (;;) {
    const { data, error } = await db.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data); if (data.length < 1000) break; from += 1000;
  }
  return out;
}

const [projects, wps, cost] = await Promise.all([
  all('projects', 'id, code, status, approved_budget_current'),
  all('work_packages', 'project_id, parent_wbs_code, budget_bac'),
  all('cost_actuals', 'project_id, actual_cost'),
]);

const leafBac = new Map(), acByP = new Map(), nLeaves = new Map();
for (const w of wps) {
  if (w.parent_wbs_code) {
    leafBac.set(w.project_id, (leafBac.get(w.project_id) || 0) + (Number(w.budget_bac) || 0));
    nLeaves.set(w.project_id, (nLeaves.get(w.project_id) || 0) + 1);
  }
}
for (const c of cost) acByP.set(c.project_id, (acByP.get(c.project_id) || 0) + (Number(c.actual_cost) || 0));

const byStatus = {};
let ready = 0, noLeaves = 0, zeroBac = 0, zeroAc = 0;
const examples = [];
for (const p of projects) {
  const bac = leafBac.get(p.id) || 0, ac = acByP.get(p.id) || 0, nl = nLeaves.get(p.id) || 0;
  byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  const isReady = bac > 0 && ac > 0;
  if (isReady) { ready++; continue; }
  if (nl === 0) noLeaves++;
  else if (bac === 0) zeroBac++;
  if (ac === 0) zeroAc++;
  if (p.status === 'Active' && examples.length < 8)
    examples.push(`${p.code} [${p.status}] leaves=${nl} leafBAC=${(bac/1e6).toFixed(1)}M AC=${(ac/1e6).toFixed(1)}M approvedBudget=${(Number(p.approved_budget_current||0)/1e6).toFixed(1)}M`);
}

console.log(`Projects: ${projects.length} · by status:`, byStatus);
console.log(`EV-ready (leafBAC>0 AND AC>0): ${ready}`);
console.log(`NOT ready — no leaf work packages: ${noLeaves} · leaves but zero BAC: ${zeroBac} · zero actual cost: ${zeroAc}`);
console.log('Example NOT-ready ACTIVE projects:');
for (const e of examples) console.log('  ' + e);
