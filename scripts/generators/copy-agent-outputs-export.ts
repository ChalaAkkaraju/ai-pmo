/**
 * Free copy of LLM-generated agent_outputs from one env to another — STEP 1 (export).
 * Run against the SOURCE env (usually prod). Reads all agent_outputs and tags each
 * with its project.code and role.role_type (stable keys that survive across envs,
 * since project/role UUIDs are regenerated per env). Writes agent-outputs-export.json.
 * Read-only on the source DB.
 *   ./node_modules/.bin/tsx scripts/generators/copy-agent-outputs-export.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { writeFileSync } from 'fs';
import { getServiceClient } from '../lib/supabase-admin';

async function main() {
  const db = getServiceClient();
  const all: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('agent_outputs').select('*').range(from, from + 999);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const { data: projs } = await db.from('projects').select('id, code');
  const { data: roles } = await db.from('roles').select('id, role_type');
  const codeOf = new Map((projs ?? []).map((p: any) => [p.id, p.code]));
  const roleOf = new Map((roles ?? []).map((r: any) => [r.id, r.role_type]));
  const out = all.map((a) => ({
    ...a,
    _project_code: a.project_id ? codeOf.get(a.project_id) ?? null : null,
    _role_type: roleOf.get(a.invoked_by_role_id) ?? null,
  }));
  writeFileSync('agent-outputs-export.json', JSON.stringify(out, null, 2));
  console.log(`Exported ${out.length} agent_outputs to agent-outputs-export.json`);
}
main().catch((e) => { console.error('export failed:', e?.message ?? e); process.exit(1); });
