/**
 * Cloud watcher + auto-export. Runs on a schedule (Windows Task Scheduler).
 * Each run: checks if the CLOUD Supabase project is reachable + healthy; if it
 * is, exports every table to data-export-cloud/ and drops a marker on the
 * Desktop so you notice — then future runs no-op. If the cloud is still down,
 * it exits quietly and tries again next time.
 *
 * Reads cloud creds from .env.local.cloud-backup (so it targets cloud even
 * though .env.local now points at the local stack). Self-locating: works no
 * matter the working directory.
 *
 *   node scripts/watch-and-export.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKUP = path.join(ROOT, '.env.local.cloud-backup');
const OUT = path.join(ROOT, 'data-export-cloud');
const DONE = path.join(OUT, '_RECOVERED.txt');
const LOG = path.join(ROOT, 'cloud-watch.log');

const log = (m) => {
  const line = `[${new Date().toISOString()}] ${m}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch {}
};

// Already recovered on a previous run? Do nothing.
if (fs.existsSync(DONE)) { log('Already exported (data-export-cloud/_RECOVERED.txt exists). Nothing to do.'); process.exit(0); }

if (!fs.existsSync(BACKUP)) { log(`No ${BACKUP} — cannot find cloud creds. Exiting.`); process.exit(1); }
const env = fs.readFileSync(BACKUP, 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
const url = get('NEXT_PUBLIC_SUPABASE_URL');
const key = get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) { log('Cloud URL or service key missing in backup. Exiting.'); process.exit(1); }

const TABLES = ['roles', 'projects', 'work_packages', 'tasks', 'milestones', 'cost_actuals',
  'resource_assignments', 'change_orders', 'risks', 'issues', 'variance_reports',
  'agent_outputs', 'action_items', 'project_drafts', 'portfolio_patterns',
  'worked_examples', 'sync_runs', 'sync_exceptions'];

async function reachable() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`${url}/rest/v1/roles?select=token&limit=1`,
      { headers: { apikey: key, Authorization: 'Bearer ' + key }, signal: ctrl.signal });
    return r.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

async function dump(table) {
  let from = 0, all = [];
  for (;;) {
    const r = await fetch(`${url}/rest/v1/${table}?select=*`,
      { headers: { apikey: key, Authorization: 'Bearer ' + key, Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`${table}: HTTP ${r.status}`);
    const rows = await r.json();
    all = all.concat(rows);
    if (rows.length < 1000) break;
    from += 1000;
  }
  fs.writeFileSync(path.join(OUT, `${table}.json`), JSON.stringify(all, null, 2));
  return all.length;
}

(async () => {
  if (!(await reachable())) { log('Cloud still unreachable. Will retry next run.'); process.exit(0); }
  log('Cloud is REACHABLE — starting export...');
  fs.mkdirSync(OUT, { recursive: true });
  const counts = {};
  for (const t of TABLES) {
    try { counts[t] = await dump(t); log(`  ${t}: ${counts[t]} rows`); }
    catch (e) { log(`  ${t}: FAILED — ${e.message}`); }
  }
  const summary = Object.entries(counts).map(([t, n]) => `${t}=${n}`).join(', ');
  fs.writeFileSync(DONE, `Cloud recovered + exported ${new Date().toISOString()}\n${summary}\n`);
  log('EXPORT COMPLETE -> data-export-cloud/');

  // Desktop marker so you notice without checking.
  try {
    const desktop = path.join(os.homedir(), 'Desktop');
    const target = fs.existsSync(desktop) ? desktop : ROOT;
    fs.writeFileSync(path.join(target, 'AI-PMO-CLOUD-RECOVERED.txt'),
      `Your cloud Supabase project is back and its data was exported to:\n${OUT}\n\n${summary}\n\nNext: tell Claude to load it into local, or run the loader.\n`);
  } catch {}
  process.exit(0);
})();
