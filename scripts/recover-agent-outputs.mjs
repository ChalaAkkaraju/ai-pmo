/**
 * One-time recovery: pull agent_outputs (the LLM-written narratives) from the
 * old cloud project and merge them into the LOCAL database.
 *
 * Why a remap: local was re-seeded with the generators, so its projects and
 * roles have NEW uuids. agent_outputs references projects.id and roles.id, so
 * we translate each row through the STABLE keys — project `code` and
 * `role_type` — to the matching local ids. Portfolio-level rows (project_id
 * null) carry across as-is. Idempotent: upsert on id, no deletes.
 *
 * Run from the project root on your machine (it needs to reach BOTH the cloud
 * and your local stack):   node scripts/recover-agent-outputs.mjs
 * Add --dry to preview counts without writing.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

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

const cloudEnv = loadEnv('.env.local.cloud-backup');
const localEnv = loadEnv('.env.local');
const cloud = createClient(cloudEnv.NEXT_PUBLIC_SUPABASE_URL, cloudEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const local = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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

console.log(`Connecting to cloud: ${cloudEnv.NEXT_PUBLIC_SUPABASE_URL}`);
const cloudOutputs = await all(cloud, 'agent_outputs', '*');
console.log(`Cloud agent_outputs found: ${cloudOutputs.length}`);
if (cloudOutputs.length === 0) {
  console.log('Nothing to recover — exiting.');
  process.exit(0);
}

const [cloudProjects, cloudRoles, localProjects, localRoles] = await Promise.all([
  all(cloud, 'projects', 'id, code'),
  all(cloud, 'roles', 'id, role_type'),
  all(local, 'projects', 'id, code'),
  all(local, 'roles', 'id, role_type'),
]);
const codeByOldProj = new Map(cloudProjects.map((p) => [p.id, p.code]));
const roleTypeByOldRole = new Map(cloudRoles.map((r) => [r.id, r.role_type]));
const localProjByCode = new Map(localProjects.map((p) => [p.code, p.id]));
const localRoleByType = new Map(localRoles.map((r) => [r.role_type, r.id]));

let skippedProj = 0, skippedRole = 0;
const toInsert = [];
for (const o of cloudOutputs) {
  const row = { ...o };
  if (o.project_id) {
    const code = codeByOldProj.get(o.project_id);
    const localId = code ? localProjByCode.get(code) : null;
    if (!localId) { skippedProj++; continue; }
    row.project_id = localId;
  }
  const rt = roleTypeByOldRole.get(o.invoked_by_role_id);
  const localRoleId = rt ? localRoleByType.get(rt) : null;
  if (!localRoleId) { skippedRole++; continue; }
  row.invoked_by_role_id = localRoleId;
  toInsert.push(row);
}
const portfolio = toInsert.filter((r) => !r.project_id).length;
console.log(`Remappable: ${toInsert.length} (of which ${portfolio} portfolio-level) · skipped ${skippedProj} (project gone) + ${skippedRole} (role gone)`);

if (DRY) { console.log('DRY run — nothing written.'); process.exit(0); }

const batch = 200;
let done = 0;
for (let i = 0; i < toInsert.length; i += batch) {
  const chunk = toInsert.slice(i, i + batch);
  const { error } = await local.from('agent_outputs').upsert(chunk, { onConflict: 'id' });
  if (error) throw new Error(`upsert: ${error.message}`);
  done += chunk.length;
  console.log(`  upserted ${done}/${toInsert.length}`);
}
console.log('DONE — narratives recovered into local agent_outputs.');
