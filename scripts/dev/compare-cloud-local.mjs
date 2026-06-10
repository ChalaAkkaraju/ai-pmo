/**
 * Pre-delete safety check: row counts local vs cloud for every table that
 * could hold non-reproducible data. Run from the repo root:
 *   node scripts/dev/compare-cloud-local.mjs
 * Reads .env.local (local) and .env.local.cloud-backup (cloud).
 */
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
const cloud = loadEnv('.env.local.cloud-backup');

const TABLES = [
  'projects', 'work_packages', 'tasks', 'milestones', 'resource_assignments',
  'cost_actuals', 'risks', 'issues', 'change_orders', 'variance_reports',
  'portfolio_patterns', 'action_items', 'agent_outputs', 'worked_examples',
  'roles', 'project_drafts', 'sync_runs',
];

async function count(env, table) {
  try {
    const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=count`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok && r.status !== 206) return `err ${r.status}`;
    const cr = r.headers.get('content-range');
    return cr ? Number(cr.split('/')[1]) : 'n/a';
  } catch (e) {
    return `unreachable`;
  }
}

console.log('table'.padEnd(24) + 'LOCAL'.padStart(8) + 'CLOUD'.padStart(12) + '   verdict');
let risky = 0;
for (const t of TABLES) {
  const [l, c] = await Promise.all([count(local, t), count(cloud, t)]);
  let verdict = '';
  if (typeof l === 'number' && typeof c === 'number') {
    verdict = c > l ? '<< CLOUD HAS MORE — investigate' : 'ok (local >= cloud)';
    if (c > l) risky++;
  } else {
    verdict = `local=${l} cloud=${c}`;
  }
  console.log(String(t).padEnd(24) + String(l).padStart(8) + String(c).padStart(12) + '   ' + verdict);
}
console.log(risky === 0
  ? '\nVERDICT: nothing unique in cloud — safe to delete.'
  : `\nVERDICT: ${risky} table(s) have more rows in cloud — recover those before deleting.`);
