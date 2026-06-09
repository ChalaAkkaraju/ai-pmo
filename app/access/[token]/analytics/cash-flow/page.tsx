/**
 * Analytics → Cash flow. Portfolio funding exposure (cumulative cash in vs out)
 * with drill-down: portfolio → segment → project. Derived from the forecast
 * snapshots + each project's contract finish (no new data).
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { selectAll } from '@/lib/select-all';
import { parseForecast } from '@/lib/forecast';
import { deriveCashFlow, aggregateCashFlow, type CashAgg, type CashPoint } from '@/lib/cash-flow';
import { CashFlowExplorer, type SegEntry } from '@/components/cash-flow-explorer';

export const dynamic = 'force-dynamic';
const SEGMENTS = ['renewables', 'water', 'industrial', 'power'];

export default async function CashFlowAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  type Snap = Record<string, unknown> & { project_id: string };
  const [snaps, projects] = await Promise.all([
    selectAll<Snap>(supabase, 'forecast_snapshots', 'project_id, period, bac, ev, ac, eac, etc, vac, cpi, spi, contract_value, poc_pct, recognised_revenue, billed, forecast_margin'),
    selectAll<{ id: string; code: string; name: string; segment: string; status: string; contract_finish: string | null }>(supabase, 'projects', 'id, code, name, segment, status, contract_finish'),
  ]);

  const byProj = new Map<string, Snap[]>();
  for (const s of snaps) { const a = byProj.get(s.project_id) ?? []; a.push(s); byProj.set(s.project_id, a); }

  const perProject: Array<{ code: string; name: string; segment: string; series: CashPoint[] }> = [];
  for (const p of projects) {
    if (p.status !== 'Active') continue;
    const cf = deriveCashFlow(parseForecast(byProj.get(p.id) ?? []), p.contract_finish ?? null);
    if (cf) perProject.push({ code: p.code, name: p.name, segment: p.segment, series: cf.series });
  }

  const portfolio = aggregateCashFlow(perProject);
  const segments: SegEntry[] = SEGMENTS.map((seg) => {
    const inSeg = perProject.filter((x) => x.segment === seg);
    const agg = aggregateCashFlow(inSeg);
    if (!agg) return null;
    const projs = inSeg
      .map((x) => { const a = aggregateCashFlow([x]); return a ? { code: x.code, name: x.name, agg: a } : null; })
      .filter((x): x is { code: string; name: string; agg: CashAgg } => !!x);
    return { segment: seg, agg, projects: projs };
  }).filter((x): x is SegEntry => !!x);

  return (
    <div className="container mx-auto max-w-screen-xl px-8 py-6 space-y-4">
      <section>
        <Link href={`/access/${token}`} className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Portfolio cash flow — funding exposure and working capital. Drill from portfolio to segment to project.</p>
      </section>

      <AnalyticsNav token={token} />

      {portfolio ? (
        <CashFlowExplorer portfolio={portfolio} segments={segments} />
      ) : (
        <p className="text-sm text-muted-foreground">No forecast snapshots yet — run generator 22 to populate the monthly closes.</p>
      )}
    </div>
  );
}
