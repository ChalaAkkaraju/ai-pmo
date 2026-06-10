/**
 * Push agent_outputs (LLM-written narratives + human edits) from LOCAL → CLOUD.
 * Reverse of recover-agent-outputs.mjs, same code/role_type remap (the cloud
 * was re-seeded, so its project/role uuids differ from local).
 *
 * Safe while .env.local is swapped to the cloud (runbook B1): the LOCAL end is
 * read from .env.local.local-backup when present, and both ends are sanity-
 * checked (source must be 127.0.0.1, target must be *.supabase.co).
 *
 * Run:  node scripts/push-agent-outputs-to-cloud.mjs --dry   # preview
 *       node scripts/push-agent-outputs-to-cloud.mjs         # write
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
const DRY = process.argv.includes('--dry');

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!k || k.startsWith('#')) continue;
    out[k] = line.slice(i + 1).trim();
  }
  return out;
}

const localPath = existsSync('.env.local.local-backup') ? '.env.local.local-backup' : '.env.local';
const localEnv = loadEnv(localPath);
const cloudEnv = loadEnv('.env.local.cloud-backup');

if (!/127\.0\.0\.1|localhost/.test(localEnv.NEXT_PUBLIC_SUPABASE_URL)) {
  console.error(`ABORT: source (${localPath}) does not point at the local stack: ${localEnv.NEXT_PUBLIC_SUPABASE_URL}`);
  process.exit(1);
}
if (!/\.supabase\.co/.test(cloudEnv.NEXT_PUBLIC_SUPABASE_URL)) {
  console.error(`ABORT: target (.env.local.cloud-backup) does not point at the cloud: ${cloudEnv.NEXT_PUBLIC_SUPABASE_URL}`);
  process.exit(1);
}

const local = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cloud = createClient(cloudEnv.NEXT_PUBLIC_SUPABASE_URL, cloudEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function all(client, table, cols) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await client.from(table).select(cols).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

console.log(`Source (local): ${localEnv.NEXT_PUBLIC_SUPABASE_URL}  [${localPath}]`);
console.log(`Target (cloud): ${cloudEnv.NEXT_PUBLIC_SUPABASE_URL}`);

const localOutputs = await all(local, 'agent_outputs', '*');
console.log(`Local agent_outputs: ${localOutputs.length}`);
if (localOutputs.length === 0) { console.log('Nothing to push — exiting.'); process.exit(0); }

const [localProjects, localRoles, cloudProjects, cloudRoles] = await Promise.all([
  all(local, 'projects', 'id, code'),
  all(local, 'roles', 'id, role_type'),
  all(cloud, 'projects', 'id, code'),
  all(cloud, 'roles', 'id, role_type'),
]);
if (cloudProjects.length === 0) {
  console.error('ABORT: cloud has no projects yet — run the seed first (runbook B3).');
  process.exit(1);
}
const codeByLocalProj = new Map(localProjects.map((p) => [p.id, p.code]));
const roleTypeByLocalRole = new Map(localRoles.map((r) => [r.id, r.role_type]));
const cloudProjByCode = new Map(cloudProjects.map((p) => [p.code, p.id]));
const cloudRoleByType = new Map(cloudRoles.map((r) => [r.role_type, r.id]));

let skippedProj = 0, skippedRole = 0;
const toInsert = [];
for (const o of localOutputs) {
  const row = { ...o };
  if (o.project_id) {
    const code = codeByLocalProj.get(o.project_id);
    const cloudId = code ? cloudProjByCode.get(code) : null;
    if (!cloudId) { skippedProj++; continue; }
    row.project_id = cloudId;
  }
  const rt = roleTypeByLocalRole.get(o.invoked_by_role_id);
  const cloudRoleId = rt ? cloudRoleByType.get(rt) : null;
  if (!cloudRoleId) { skippedRole++; continue; }
  row.invoked_by_role_id = cloudRoleId;
  toInsert.push(row);
}
const portfolio = toInsert.filter((r) => !r.project_id).length;
console.log(`Remappable: ${toInsert.length} (of which ${portfolio} portfolio-level) · skipped ${skippedProj} (project not in cloud) + ${skippedRole} (role not in cloud)`);
if (DRY) { console.log('DRY run — nothing written.'); process.exit(0); }

const batch = 200;
let done = 0;
for (let i = 0; i < toInsert.length; i += batch) {
  const chunk = toInsert.slice(i, i + batch);
  const { error } = await cloud.from('agent_outputs').upsert(chunk, { onConflict: 'id' });
  if (error) throw new Error(`upsert: ${error.message}`);
  done += chunk.length;
  console.log(`  upserted ${done}/${toInsert.length}`);
}
console.log('Done.');
