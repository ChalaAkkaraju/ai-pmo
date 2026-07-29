/**
 * Free copy of LLM-generated agent_outputs — STEP 2 (import).
 * Run against the TARGET env (usually QA). Reads agent-outputs-export.json, remaps
 * project_id (by project.code) and invoked_by_role_id (by roles.role_type) to the
 * TARGET's UUIDs, and inserts. Idempotent (skips rows whose id already exists).
 *   ./node_modules/.bin/tsx scripts/generators/copy-agent-outputs-import.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { readFileSync } from 'fs';
import { getServiceClient } from '../lib/supabase-admin';

async function main() {
  const db = getServiceClient();
  const rows: any[] = JSON.parse(readFileSync('agent-outputs-export.json', 'utf8'));

  const { data: projs } = await db.from('projects').select('id, code');
  const { data: roles } = await db.from('roles').select('id, role_type');
  const idByCode = new Map((projs ?? []).map((p: any) => [p.code, p.id]));
  const idByRole = new Map((roles ?? []).map((r: any) => [r.role_type, r.id]));

  const { data: existing } = await db.from('agent_outputs').select('id');
  const have = new Set((existing ?? []).map((e: any) => e.id));

  let skippedRole = 0;
  const toInsert = rows
    .filter((r) => !have.has(r.id))
    .map((r) => {
      const { _project_code, _role_type, ...rest } = r;
      const invoked_by_role_id = idByRole.get(_role_type);
      const project_id = _project_code ? idByCode.get(_project_code) ?? null : null;
      return { ...rest, project_id, invoked_by_role_id };
    })
    .filter((r) => { if (!r.invoked_by_role_id) { skippedRole++; return false; } return true; });

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200);
    const { error } = await db.from('agent_outputs').insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }
  console.log(`Inserted ${inserted} agent_outputs (skipped ${have.size} already present, ${skippedRole} with unmapped role).`);
}
main().catch((e) => { console.error('import failed:', e?.message ?? e); process.exit(1); });
