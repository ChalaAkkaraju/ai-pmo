/**
 * Pre-delete safety check v2 — cloud via DIRECT Postgres (session pooler),
 * since the cloud REST gateway is wedged. Local via REST as before.
 *
 * Run (PowerShell, from repo root):
 *   $env:CLOUD_DB_URL="postgresql://postgres.icmqcesrwgbucpkwbory:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
 *   node scripts/dev/compare-cloud-local-pooler.mjs
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
if (!process.env.CLOUD_DB_URL) {
  console.error('Set CLOUD_DB_URL first (see header comment).');
  process.exit(1);
}

const TABLES = [
  'projects', 'work_packages', 'tasks', 'milestones', 'resource_assignments',
  'cost_actuals', 'risks', 'issues', 'change_orders', 'variance_reports',
  'portfolio_patterns', 'action_items', 'agent_outputs', 'worked_examples',
  'roles', 'project_drafts',
];

async function localCount(table) {
  try {
    const r = await fetch(`${local.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=count`, {
      headers: {
        apikey: local.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${local.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'count=exact', Range: '0-0',
      },
      signal: AbortSignal.timeout(15000),
    });
    const cr = r.headers.get('content-range');
    return cr ? Number(cr.split('/')[1]) : `err ${r.status}`;
  } catch { return 'unreachable'; }
}

const client = new pg.Client({ connectionString: process.env.CLOUD_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

let inconclusive = 0, risky = [];
console.log('table'.padEnd(24) + 'LOCAL'.padStart(8) + 'CLOUD'.padStart(10) + '   verdict');
for (const t of TABLES) {
  let c;
  try {
    const res = await client.query(`select count(*)::int as n from public.${t}`);
    c = res.rows[0].n;
  } catch (e) {
    c = /does not exist/.test(String(e.message)) ? 'absent' : `err`;
  }
  const l = await localCount(t);
  let verdict;
  if (typeof l === 'number' && typeof c === 'number') {
    if (c > l) { verdict = '<< CLOUD HAS MORE'; risky.push(t); }
    else verdict = 'ok';
  } else if (c === 'absent') { verdict = 'table never existed in cloud — ok'; }
  else { verdict = 'INCONCLUSIVE'; inconclusive++; }
  console.log(String(t).padEnd(24) + String(l).padStart(8) + String(c).padStart(10) + '   ' + verdict);
}
await client.end();

if (risky.length) console.log(`\nVERDICT: recover before deleting: ${risky.join(', ')}`);
else if (inconclusive) console.log(`\nVERDICT: ${inconclusive} table(s) could not be compared — NOT safe to call it yet.`);
else console.log('\nVERDICT: cloud holds nothing local lacks — safe to delete.');
