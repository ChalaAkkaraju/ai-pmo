/**
 * Diagnostic: prints which database the app is pointed at (from .env.local)
 * and the access tokens currently in its roles table.
 *
 *   node --env-file=.env.local scripts/show-tokens.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('\nApp database URL :', url || '(NOT SET)');

if (!url || !key) {
  console.error('Missing SUPABASE env vars in .env.local'); process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase.from('roles').select('role_type, token').order('token');
if (error) { console.error('Query error:', error.message); process.exit(1); }

console.log(`Roles in this DB: ${data.length}\n`);
for (const r of data) console.log('  ' + r.token.padEnd(34) + '· ' + r.role_type);
console.log('');
