/**
 * Deletes CLOUD agent_outputs rows whose id does not exist in LOCAL — i.e. the
 * audit-log rows the cloud's own base seed created with fresh ids, which became
 * duplicates once the local set was pushed. Local is the source of truth.
 *   node scripts/dev/prune-duplicate-seed-outputs.mjs --dry   # preview
 *   node scripts/dev/prune-duplicate-seed-outputs.mjs         # delete
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
const localPath = existsSync('.env.local.local-backup') && /supabase\.co/.test(loadEnv('.env.local').NEXT_PUBLIC_SUPABASE_URL ?? '')
  ? '.env.local.local-backup' : '.env.local';
const localEnv = loadEnv(localPath);
const cloudEnv = loadEnv('.env.local.cloud-backup');
if (!/127\.0\.0\.1|localhost/.test(localEnv.NEXT_PUBLIC_SUPABASE_URL)) { console.error('ABORT: local env not local'); process.exit(1); }
if (!/\.supabase\.co/.test(cloudEnv.NEXT_PUBLIC_SUPABASE_URL)) { console.error('ABORT: cloud env not cloud'); process.exit(1); }

const local = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cloud = createClient(cloudEnv.NEXT_PUBLIC_SUPABASE_URL, cloudEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function allIds(client) {
  const ids = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('agent_outputs').select('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    ids.push(...data.map((r) => r.id));
    if (data.length < 1000) break;
  }
  return ids;
}
const [localIds, cloudIds] = await Promise.all([allIds(local), allIds(cloud)]);
const keep = new Set(localIds);
const orphans = cloudIds.filter((id) => !keep.has(id));
console.log(`Local: ${localIds.length} · Cloud: ${cloudIds.length} · cloud-only (to delete): ${orphans.length}`);
if (DRY || orphans.length === 0) { console.log(DRY ? 'DRY run — nothing deleted.' : 'Nothing to do.'); process.exit(0); }
for (let i = 0; i < orphans.length; i += 100) {
  const { error } = await cloud.from('agent_outputs').delete().in('id', orphans.slice(i, i + 100));
  if (error) throw new Error(error.message);
}
console.log(`Deleted ${orphans.length} duplicate seed rows from cloud.`);
