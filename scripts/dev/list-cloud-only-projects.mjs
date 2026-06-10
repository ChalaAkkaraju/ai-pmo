/**
 * Lists projects that exist in CLOUD but not LOCAL (uses CLOUD_DB_URL, same as
 * the compare script). Shows enough detail to judge keep-vs-junk.
 *   node scripts/dev/list-cloud-only-projects.mjs
 */
import pg from 'pg';
import { readFileSync } from 'node:fs';

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const local = loadEnv('.env.local');

const r = await fetch(`${local.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/projects?select=code`, {
  headers: { apikey: local.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${local.SUPABASE_SERVICE_ROLE_KEY}`, Range: '0-299' },
});
const localCodes = new Set((await r.json()).map((p) => p.code));

const client = new pg.Client({ connectionString: process.env.CLOUD_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query('select * from public.projects order by created_at');
const extra = rows.filter((p) => !localCodes.has(p.code));
for (const p of extra) {
  console.log('—'.repeat(60));
  for (const k of ['code', 'name', 'client_name', 'segment', 'status', 'contract_value', 'created_at']) {
    if (k in p) console.log(`${k.padEnd(16)} ${p[k]}`);
  }
  const counts = await client.query(
    `select
       (select count(*)::int from work_packages w where w.project_id = $1) as wbs,
       (select count(*)::int from tasks t where t.project_id = $1) as tasks,
       (select count(*)::int from agent_outputs a where a.project_id = $1) as agent_outputs`,
    [p.id]
  );
  console.log('counts          ', JSON.stringify(counts.rows[0]));
}
console.log('—'.repeat(60));
console.log(`${extra.length} cloud-only project(s): ${extra.map((p) => p.code).join(', ') || 'none'}`);
await client.end();
