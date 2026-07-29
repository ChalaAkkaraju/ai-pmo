/**
 * One-off backfill: insert the generated projects' change_orders that 03 failed
 * to insert on an env where migration 0037 tightened the status vocabulary.
 * Reads the (now status-corrected) generated-projects.json, matches projects by
 * code in the target DB, and inserts only the missing change_orders. Idempotent
 * (skips any co_id already present). Does NOT touch projects/analytics.
 *   ./node_modules/.bin/tsx scripts/generators/03b-insert-change-orders.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { readFileSync } from 'fs';
import path from 'path';
import { getServiceClient } from '../lib/supabase-admin';

async function main() {
  const admin = getServiceClient();
  const raw = JSON.parse(readFileSync(path.join(__dirname, '..', 'seed-content', 'generated-projects.json'), 'utf8'));
  const generated: any[] = Array.isArray(raw) ? raw : (raw.projects ?? []);
  const withCO = generated.filter((p) => p.change_order);
  const codes = withCO.map((p) => p.code);

  const { data: projs, error } = await admin.from('projects').select('id, code').in('code', codes);
  if (error) throw error;
  const codeToId = new Map((projs ?? []).map((p: any) => [p.code, p.id]));

  const { data: existing } = await admin.from('change_orders').select('project_id, co_id');
  const have = new Set((existing ?? []).map((c: any) => `${c.project_id}|${c.co_id}`));

  const rows = withCO
    .filter((p) => codeToId.has(p.code))
    .map((p) => { const c = p.change_order; return {
      project_id: codeToId.get(p.code), co_id: c.co_id, driver: c.driver, scope_summary: c.scope_summary,
      cost_impact_m: c.cost_impact_m, revenue_impact_m: c.revenue_impact_m, schedule_impact_days: c.schedule_impact_days,
      margin_realized_pct: c.margin_realized_pct, status: c.status, approval_routing: c.approval_routing,
      executed_week: c.executed_week, four_frame_analysis: c.four_frame_analysis };
    })
    .filter((r) => !have.has(`${r.project_id}|${r.co_id}`));

  if (rows.length === 0) { console.log('No change orders to insert (already present or none).'); return; }
  const { error: e2 } = await admin.from('change_orders').insert(rows);
  if (e2) throw e2;
  console.log(`Inserted ${rows.length} change orders.`);
}
main().catch((e) => { console.error('failed:', e?.message ?? e); process.exit(1); });
