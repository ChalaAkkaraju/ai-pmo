/** List current project codes (and check one). Run:
 *   node --env-file=.env.local scripts/dev/list-projects.mjs [CODE-TO-CHECK]
 */
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient(url, key);
const { data, error } = await s.from('projects').select('code,name').order('code');
if (error) { console.error('DB error:', error.message); process.exit(1); }
console.log(`DB: ${url}`);
console.log(`${data.length} projects. First 25 codes:`);
console.log(data.slice(0, 25).map((p) => p.code).join('\n'));
const target = process.argv[2];
if (target) {
  const hit = data.find((p) => p.code === target);
  console.log(`\n"${target}" exists: ${hit ? 'YES — ' + hit.name : 'NO'}`);
  if (!hit) {
    const seg = target.split('-').slice(0, 2).join('-');
    console.log(`Same-segment codes (${seg}-…):`, data.filter((p) => p.code.startsWith(seg)).map((p) => p.code).join(', '));
  }
}
