/**
 * Recovery via a DIRECT Postgres connection (bypasses the broken REST gateway).
 *
 * The cloud project's external REST/PostgREST gateway is wedged (fetch failed),
 * but the database itself is healthy. This reads agent_outputs straight from
 * Postgres over the pooler connection, then writes into LOCAL via supabase-js
 * (the local stack's REST works fine). Same project-code / role-type remap and
 * idempotent upsert as the REST version. No deletes.
 *
 * Setup (one time):
 *   pnpm add pg
 *   Get the cloud connection string: Supabase dashboard -> Settings -> Database
 *     -> Connection string -> "Session pooler" (reset the DB password if needed),
 *     then set it as an env var for the run.
 *
 * Run (PowerShell):
 *   $env:CLOUD_DB_URL="postgresql://postgres.<ref>:<password>@<host>:5432/postgres"
 *   node scripts/recover-agent-outputs-direct.mjs --dry      # preview counts
 *   node scripts/recover-agent-outputs-direct.mjs            # write into local
 */
import pg from 'pg';
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

const CLOUD_DB_URL = process.env.CLOUD_DB_URL;
if (!CLOUD_DB_URL) {
  console.error('Set CLOUD_DB_URL first (Settings -> Database -> Connection string -> Session pooler).');
  process.exit(1);
}

const localEnv = loadEnv('.env.local');
const local = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log('Connecting to cloud Postgres (direct, bypassing REST gateway)...');
const client = new pg.Client({ connectionString: CLOUD_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const cloudOutputs = (await client.query('select * from agent_outputs')).rows;
const cloudProjects = (await client.query('select id, code from projects')).rows;
const cloudRoles = (await client.query('select id, role_type from roles')).rows;
await client.end();
console.log(`Cloud agent_outputs found: ${cloudOutputs.length}`);
if (cloudOutputs.length === 0) { console.log('Nothing to recover.'); process.exit(0); }

async function allLocal(table, cols) {
  const { data, error } = await local.from(table).select(cols);
  if (error) throw new Error(`local ${table}: ${error.message}`);
  return data;
}
const localProjects = await allLocal('projects', 'id, code');
const localRoles = await allLocal('roles', 'id, role_type');

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
