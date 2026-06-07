/**
 * Re-point existing issues' linked_wbs to a REAL canonical WBS leaf (1.x.y)
 * from each project's work-package tree, replacing the old synthetic "n.m"
 * codes. Deterministic by issue id, so re-runs are stable. In place — no
 * reseed, so all enrichment is preserved. Guarded to the LOCAL stack only.
 * After this, run generator 15 with --force so risks realign to issue WBS:
 *   node scripts/fix-linked-wbs.mjs
 *   ./node_modules/.bin/tsx scripts/generators/15-enrich-risks-2.ts --force
 */
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
const url = get('NEXT_PUBLIC_SUPABASE_URL'), key = get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) { console.log('Missing local URL/key in .env.local'); process.exit(1); }
if (!/127\.0\.0\.1|localhost/.test(url)) { console.log(`REFUSING: .env.local points at ${url}, not local.`); process.exit(1); }

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

async function getAll(table, cols) {
  let from = 0, all = [];
  for (;;) {
    const r = await fetch(`${url}/rest/v1/${table}?select=${cols}`, { headers: { apikey: key, Authorization: 'Bearer ' + key, Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`${table} read HTTP ${r.status}`);
    const rows = await r.json(); all = all.concat(rows);
    if (rows.length < 1000) break; from += 1000;
  }
  return all;
}

// Leaves per project = wbs_codes never used as a parent.
const wps = await getAll('work_packages', 'project_id,wbs_code,parent_wbs_code');
const parents = new Set();
for (const w of wps) if (w.parent_wbs_code) parents.add(`${w.project_id}:${w.parent_wbs_code}`);
const leavesByProj = new Map();
for (const w of wps) {
  if (parents.has(`${w.project_id}:${w.wbs_code}`)) continue;
  const a = leavesByProj.get(w.project_id) ?? []; a.push(w.wbs_code); leavesByProj.set(w.project_id, a);
}

const issues = await getAll('issues', 'id,project_id,linked_wbs');
let changed = 0;
for (const i of issues) {
  const leaves = (leavesByProj.get(i.project_id) ?? []).slice().sort();
  if (leaves.length === 0) continue;
  const leaf = leaves[hash(i.id) % leaves.length];
  const cur = Array.isArray(i.linked_wbs) ? i.linked_wbs[0] : null;
  if (cur === leaf) continue;
  const r = await fetch(`${url}/rest/v1/issues?id=eq.${i.id}`, {
    method: 'PATCH',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ linked_wbs: [leaf] }),
  });
  if (r.ok) changed++; else console.log(`  issue ${i.id}: HTTP ${r.status}`);
}
console.log(`issues: ${changed} re-pointed to canonical WBS leaves (of ${issues.length}).`);
console.log('Now run: ./node_modules/.bin/tsx scripts/generators/15-enrich-risks-2.ts --force');
