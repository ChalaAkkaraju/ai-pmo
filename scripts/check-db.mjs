// Standalone Supabase connectivity check — bypasses Next.js entirely.
// Run from the project folder:  node scripts/check-db.mjs
import fs from 'node:fs';

function readEnv(key) {
  const txt = fs.readFileSync('.env.local', 'utf8');
  const m = txt.match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = readEnv('SUPABASE_SERVICE_ROLE_KEY');

console.log('URL present:        ', url ? 'yes  (' + url + ')' : 'NO — missing!');
console.log('Service key present:', key ? 'yes  (' + key.slice(0, 8) + '…, length ' + key.length + ')' : 'NO — missing!');
if (!url || !key) { console.log('\n>>> Credentials missing in .env.local. That alone would 404 every page.'); process.exit(1); }

async function timed(label, fullUrl, withAuth) {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(fullUrl, {
      headers: withAuth ? { apikey: key, Authorization: 'Bearer ' + key } : {},
      signal: ctrl.signal,
    });
    const ms = Date.now() - start;
    const body = await res.text();
    console.log(`\n${label}: HTTP ${res.status} in ${ms} ms`);
    console.log('   ', body.slice(0, 200));
  } catch (e) {
    const ms = Date.now() - start;
    const cause = e.cause ? ` | cause: ${e.cause.code || ''} ${e.cause.message || e.cause}` : '';
    console.log(`\n${label}: FAILED in ${ms} ms — ${e.name}: ${e.message}${cause}`);
  } finally {
    clearTimeout(t);
  }
}

console.log('\n— Is the whole network down, or just this project? —');
await timed('Control: supabase.com', 'https://supabase.com/favicon.ico', false);

console.log('\n— Can we reach THIS project? —');
await timed('roles (any 1 row)', url + '/rest/v1/roles?select=token,role_type&limit=1', true);
await timed('projects count', url + '/rest/v1/projects?select=count', true);
console.log('\nDone.');
