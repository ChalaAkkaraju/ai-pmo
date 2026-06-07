// Export every table to data-export/<table>.json via the Supabase REST API.
// Needs only your service key — no Postgres tools. Works ONLY when the project
// is reachable. Run from the project folder:  node scripts/export-data.mjs
import fs from 'node:fs';
import path from 'node:path';

function readEnv(key) {
  const txt = fs.readFileSync('.env.local', 'utf8');
  const m = txt.match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = readEnv('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) { console.log('Missing URL or service key in .env.local'); process.exit(1); }

const TABLES = [
  'roles', 'projects', 'work_packages', 'tasks', 'milestones', 'cost_actuals',
  'resource_assignments', 'change_orders', 'risks', 'issues', 'variance_reports',
  'agent_outputs', 'action_items', 'project_drafts', 'portfolio_patterns',
  'worked_examples', 'sync_runs', 'sync_exceptions',
];

const OUT = 'data-export';
fs.mkdirSync(OUT, { recursive: true });
const PAGE = 1000;

async function dump(table) {
  let from = 0, all = [];
  for (;;) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: key, Authorization: 'Bearer ' + key, Range: `${from}-${from + PAGE - 1}`, Prefer: 'count=exact' },
    });
    if (!res.ok) { console.log(`  ${table}: HTTP ${res.status} — ${(await res.text()).slice(0, 120)}`); return; }
    const rows = await res.json();
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  fs.writeFileSync(path.join(OUT, `${table}.json`), JSON.stringify(all, null, 2));
  console.log(`  ${table}: ${all.length} rows -> ${OUT}/${table}.json`);
}

console.log(`Exporting ${TABLES.length} tables from ${url} ...`);
let ok = true;
for (const t of TABLES) {
  try { await dump(t); } catch (e) { ok = false; console.log(`  ${t}: FAILED — ${e.cause?.code || e.message}`); }
}
console.log(ok ? '\nDone. Files in ./data-export/' : '\nFinished with errors — project may be down or still warming up.');
