/**
 * Change & trend register — seed unfunded (absorbed) changes + open trends so
 * the funded / absorbed / at-risk split is real. Pure data, NO LLM.
 *
 * Per active project: one OPEN trend (in negotiation — cost forecast now,
 * revenue a claim at risk, carries recovery_confidence) and one ABSORBED change
 * (work done under the proceed obligation, customer won't pay — revenue 0, full
 * cost a margin hit: estimating error / rework / productivity). Also backfills
 * recovery_confidence=100 on already-funded (Executed/Complete) COs.
 *
 * Requires migration 0031. Idempotent: skips projects that already have an
 * Absorbed CO unless --force (which rebuilds the two seeded rows CO-T01/CO-U01).
 *   ./node_modules/.bin/tsx scripts/generators/21-enrich-change-orders.ts
 *   ./node_modules/.bin/tsx scripts/generators/21-enrich-change-orders.ts --force
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const r2 = (n: number) => Math.round(n * 100) / 100;

const TRENDS: Array<{ driver: string; scope: string }> = [
  { driver: 'Owner-directed scope addition', scope: 'Additional grid connection bay added at owner request; proceeding under notice-and-proceed while the claim is priced.' },
  { driver: 'Differing site condition', scope: 'Unforeseen ground conditions on civil works; works continuing under the proceed obligation while the claim is negotiated.' },
  { driver: 'Design development', scope: 'Client-requested design enhancement during detailed engineering; pricing under negotiation, work not stopped.' },
  { driver: 'Regulatory change', scope: 'Revised permit conditions require added monitoring scope; proceeding to protect schedule while recovery is agreed.' },
  { driver: 'Client acceleration directive', scope: 'Acceleration directive to recover schedule; added shifts and resequencing in progress, claim pending.' },
  { driver: 'Third-party interface change', scope: 'Interface change forced rework of tie-ins; claim submitted, commercial position still open.' },
];
const ABSORBED: Array<{ driver: string; scope: string }> = [
  { driver: 'Estimating error — civil works underestimated', scope: 'Civil quantities under-measured at tender; the extra cost is absorbed — no customer fault and no recovery.' },
  { driver: 'Rework — failed QA on welds', scope: 'Weld QA failures required re-execution; rework cost absorbed against project margin.' },
  { driver: 'Contractor design error — interface clash', scope: 'Internal design clash resolved at contractor cost; non-recoverable, absorbed.' },
  { driver: 'Productivity loss — labour underperformance', scope: 'Labour productivity below plan; the resulting cost growth is absorbed, not claimable.' },
];

async function main() {
  const force = process.argv.includes('--force');
  log.header('Change & trend register — seed open trends + absorbed changes (migration 0031)');
  const db = getServiceClient();

  const { data: projects, error } = await db.from('projects').select('id, code, approved_budget_current, current_week').eq('status', 'Active').order('code');
  if (error) throw error;

  let total = 0, processed = 0, skipped = 0, backfilled = 0;
  for (const p of (projects ?? []) as Array<{ id: string; code: string; approved_budget_current: number | string; current_week: number | string }>) {
    // Backfill recovery on funded COs (they're fully recovered).
    const bf = await db.from('change_orders').update({ recovery_confidence: 100 }).eq('project_id', p.id).in('status', ['Executed', 'Complete']).is('recovery_confidence', null).select('id');
    backfilled += bf.data?.length ?? 0;

    const has = await db.from('change_orders').select('id').eq('project_id', p.id).eq('status', 'Absorbed').limit(1);
    if ((has.data?.length ?? 0) > 0) {
      if (!force) { skipped++; continue; }
      await db.from('change_orders').delete().eq('project_id', p.id).in('co_id', ['CO-T01', 'CO-U01']);
    }

    const bud = Number(p.approved_budget_current) || 50_000_000;
    const wk = Number(p.current_week) || 40;
    const r = rng(`${p.id}:trend`);

    const tCost = r2((bud * (0.005 + r() * 0.012)) / 1_000_000);
    const tMargin = 0.08 + r() * 0.06;
    const tRev = r2(tCost / (1 - tMargin));
    const uCost = r2((bud * (0.003 + r() * 0.006)) / 1_000_000);

    const t = pick(r, TRENDS);
    const u = pick(r, ABSORBED);
    const rows = [
      {
        project_id: p.id, co_id: 'CO-T01', driver: t.driver,
        scope_summary: t.scope,
        cost_impact_m: tCost, revenue_impact_m: tRev, schedule_impact_days: Math.floor(r() * 22),
        margin_realized_pct: r2(((tRev - tCost) / tRev) * 100), status: pick(r, ['Under analysis', 'Priced']),
        approval_routing: 'Client variation request — awaiting agreement', executed_week: null,
        recovery_confidence: 40 + Math.floor(r() * 45), source_system: 'SAP_PS',
      },
      {
        project_id: p.id, co_id: 'CO-U01', driver: u.driver,
        scope_summary: u.scope,
        cost_impact_m: uCost, revenue_impact_m: 0, schedule_impact_days: Math.floor(r() * 8),
        margin_realized_pct: 0, status: 'Absorbed',
        approval_routing: 'Absorbed — non-recoverable cost growth', executed_week: Math.max(1, Math.round(wk * (0.4 + r() * 0.4))),
        recovery_confidence: 0, source_system: 'SAP_PS',
      },
    ];
    const { error: insErr } = await db.from('change_orders').insert(rows);
    if (insErr) { log.error(`${p.code}: ${insErr.message}`); continue; }
    total += rows.length; processed++;
    if (processed % 20 === 0) log.info(`… ${processed} projects`);
  }

  section('Summary');
  log.success(`${total} trend/absorbed rows across ${processed} projects (${backfilled} funded COs back-filled to 100% recovery); ${skipped} skipped.`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
