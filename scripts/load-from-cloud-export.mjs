/**
 * Load recovered cloud data into the LOCAL database.
 * Runs after watch-and-export.mjs. Merges the paid LLM planning narratives
 * (agent_outputs) onto the fresh local rebuild, remapping cloud project IDs to
 * local ones by project `code`. Self-guarding + idempotent:
 *   - does nothing until an export exists (_RECOVERED.txt)
 *   - does nothing if already loaded (_LOADED.txt)
 *   - refuses to run unless .env.local points at the LOCAL stack (safety)
 *   - skips projects that already have outputs locally (no duplicates)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPORT = path.join(ROOT, 'data-export-cloud');
const RECOVERED = path.join(EXPORT, '_RECOVERED.txt');
const LOADED = path.join(EXPORT, '_LOADED.txt');
const LOG = path.join(ROOT, 'cloud-watch.log');
const log = (m) => { const l = `[${new Date().toISOString()}] LOADER: ${m}`; console.log(l); try { fs.appendFileSync(LOG, l + '\n'); } catch {} };

if (!fs.existsSync(RECOVERED)) { log('No export yet — nothing to load.'); process.exit(0); }
if (fs.existsSync(LOADED)) { log('Already loaded.'); process.exit(0); }

const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
const url = get('NEXT_PUBLIC_SUPABASE_URL'), key = get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) { log('Local URL/key missing in .env.local.'); process.exit(1); }
if (!/127\.0\.0\.1|localhost/.test(url)) { log(`REFUSING: .env.local points at ${url}, not local. Aborting so we never write to cloud.`); process.exit(1); }

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(EXPORT, f), 'utf8'));
async function getAll(table, select) {
  let from = 0, all = [];
  for (;;) {
    const r = await fetch(`${url}/rest/v1/${table}?select=${select}`, { headers: { apikey: key, Authorization: 'Bearer ' + key, Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`${table} read HTTP ${r.status}`);
    const rows = await r.json(); all = all.concat(rows);
    if (rows.length < 1000) break; from += 1000;
  }
  return all;
}

(async () => {
  const cloudProjects = readJson('projects.json');
  const cloudIdToCode = {}; for (const p of cloudProjects) cloudIdToCode[p.id] = p.code;

  const localProjects = await getAll('projects', 'id,code');
  const codeToLocalId = {}; for (const p of localProjects) codeToLocalId[p.code] = p.id;
  const existing = await getAll('agent_outputs', 'project_id');
  const haveOutputs = new Set(existing.map((r) => r.project_id));
  const haveNullOutputs = existing.some((r) => r.project_id == null);

  const cloudOutputs = readJson('agent_outputs.json');
  const toInsert = []; let skipPop = 0, skipNoLocal = 0, skipNoCode = 0;
  for (const row of cloudOutputs) {
    if (row.project_id == null) { if (!haveNullOutputs) toInsert.push(row); continue; }
    const code = cloudIdToCode[row.project_id];
    if (!code) { skipNoCode++; continue; }
    const localId = codeToLocalId[code];
    if (!localId) { skipNoLocal++; continue; }
    if (haveOutputs.has(localId)) { skipPop++; continue; }
    toInsert.push({ ...row, project_id: localId });
  }
  log(`agent_outputs: ${cloudOutputs.length} exported -> ${toInsert.length} to load (skipped ${skipPop} already-populated, ${skipNoLocal} no-local-project, ${skipNoCode} no-code).`);

  let inserted = 0, failed = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const r = await fetch(`${url}/rest/v1/agent_outputs`, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(batch) });
    if (r.ok) inserted += batch.length;
    else { failed += batch.length; log(`  batch@${i} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`); }
  }
  log(`Inserted ${inserted} agent_outputs (failed ${failed}).`);
  fs.writeFileSync(LOADED, `Loaded ${inserted} agent_outputs into local ${new Date().toISOString()} (failed ${failed})\n`);
  log('LOAD COMPLETE -> the paid planning narratives are now in local.');
})().catch((e) => { log('ERROR ' + (e.stack || e.message)); process.exit(1); });
