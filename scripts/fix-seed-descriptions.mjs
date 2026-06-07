/**
 * Clean leaked-placeholder artifacts ("weeks weeks", "n turbines", "wind
 * threshold m/s", etc.) out of risk/issue text IN PLACE — no reseed, so all
 * EMV/EV enrichment is preserved. Same transforms as the committed seed JSON.
 * Guarded to the LOCAL stack only.
 *
 *   node scripts/fix-seed-descriptions.mjs
 */
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
const url = get('NEXT_PUBLIC_SUPABASE_URL'), key = get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) { console.log('Missing local URL/key in .env.local'); process.exit(1); }
if (!/127\.0\.0\.1|localhost/.test(url)) { console.log(`REFUSING: .env.local points at ${url}, not local.`); process.exit(1); }

function clean(t) {
  if (!t) return t;
  return t
    .replace(/\bn (turbines|workers|joints|crossings|strings|boxes|circuits|loops|pallets|anchors|days)\b/g, 'several')
    .replace(/\b(weeks|days|months|month) \1\b/g, 'several $1')
    .replace(/\b(?:weeks|days|months)-(week|day|month)\b/g, 'multi-$1')
    .replace(/\bwind threshold m\/s\b/g, '40 m/s')
    .replace(/\bwind threshold\b/g, 'the design wind threshold')
    .replace(/\btech pkg\b/g, 'the technology package')
    .replace(/\butility type\b/g, 'the interconnecting utility')
    .replace(/\bptc value\b/g, 'the PTC value')
    .replace(/\bblock id\b/g, 'the block')
    .replace(/\brow id\b/g, 'the row')
    .replace(/\blocal n\b/g, 'local')
    .replace(/\bseveral several\b/g, 'several');
}

async function getAll(table, cols) {
  let from = 0, all = [];
  for (;;) {
    const r = await fetch(`${url}/rest/v1/${table}?select=${cols}`, { headers: { apikey: key, Authorization: 'Bearer ' + key, Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`${table} read HTTP ${r.status}`);
    const rows = await r.json(); all = all.concat(rows);
    if (rows.length < 1000) break; from += 1000;
  }
  return all;
}

async function fixTable(table, fields) {
  const rows = await getAll(table, ['id', ...fields].join(','));
  let changed = 0;
  for (const row of rows) {
    const patch = {};
    for (const f of fields) { const c = clean(row[f]); if (c !== row[f]) patch[f] = c; }
    if (Object.keys(patch).length === 0) continue;
    const r = await fetch(`${url}/rest/v1/${table}?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });
    if (r.ok) changed++; else console.log(`  ${table} ${row.id}: HTTP ${r.status}`);
  }
  console.log(`${table}: ${changed} rows cleaned (of ${rows.length}).`);
}

await fixTable('risks', ['description', 'response', 'trigger']);
await fixTable('issues', ['description', 'closure_narrative']);
console.log('Done.');
