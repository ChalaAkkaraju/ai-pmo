/**
 * Analytics → Changes. Portfolio-wide change-order breakdowns (charts) plus a
 * sortable/filterable register of every change order on an ACTIVE project.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { Kpis, rowsFrom, tally, cap } from '@/components/analytics-shared';
import { DonutPanel, RankedBarPanel } from '@/components/analytics-charts';
import { PortfolioChangeOrdersTable, type PortfolioChangeOrderRow } from '@/components/portfolio-tables';
import { categorizeDriver, CO_STAGES } from '@/lib/change-orders';
import { selectAll } from '@/lib/select-all';

export const dynamic = 'force-dynamic';

const num = (v: unknown) => Number(v) || 0;
const m = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(1)}M`;

export default async function ChangesAnalyticsPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  type Co = { co_id: string; project_id: string; driver: string; scope_summary: string; cost_impact_m: number; revenue_impact_m: number; margin_realized_pct: number | null; schedule_impact_days: number; status: string; recovery_confidence: number | null };
  const [cos, projects] = await Promise.all([
    selectAll<Co>(supabase, 'change_orders', 'co_id, project_id, driver, scope_summary, cost_impact_m, revenue_impact_m, margin_realized_pct, schedule_impact_days, status, recovery_confidence'),
    selectAll<{ id: string; code: string; name: string; segment: string; status: string }>(supabase, 'projects', 'id, code, name, segment, status'),
  ]);
  const projById = new Map(projects.map((p) => [p.id, p]));

  const active = cos.filter((c) => c.status !== 'Withdrawn');
  const total = cos.length;
  const executed = cos.filter((c) => c.status === 'Approved').length;
  const pending = cos.filter((c) => ['Identified', 'Quantified', 'Submitted to client', 'In negotiation'].includes(c.status)).length;
  const cumRevM = active.reduce((s, c) => s + num(c.revenue_impact_m), 0);
  const netMarginM = active.reduce((s, c) => s + (num(c.revenue_impact_m) - num(c.cost_impact_m)), 0);
  const scheduleDays = active.reduce((s, c) => s + num(c.schedule_impact_days), 0);
  const absorbedCostM = cos.filter((c) => c.status === 'Absorbed').reduce((s, c) => s + num(c.cost_impact_m), 0);
  const openCos = cos.filter((c) => ['Identified', 'Quantified', 'Submitted to client', 'In negotiation'].includes(c.status));
  const openRevM = openCos.reduce((s, c) => s + num(c.revenue_impact_m), 0);
  const expRecM = openCos.reduce((s, c) => s + num(c.revenue_impact_m) * (num(c.recovery_confidence) / 100), 0);
  const revAtRiskM = openRevM - expRecM;

  const byStatus = rowsFrom(tally(cos, (c) => c.status), [...CO_STAGES, 'Withdrawn']);
  const byDriver = rowsFrom(tally(active, (c) => categorizeDriver(c.driver)));
  const bySegment = rowsFrom(tally(active, (c) => cap(projById.get(c.project_id)?.segment ?? '')));

  const rows: PortfolioChangeOrderRow[] = cos
    .filter((c) => projById.get(c.project_id)?.status === 'Active')
    .map((c) => {
      const p = projById.get(c.project_id)!;
      return {
        co_id: c.co_id,
        project_code: p.code,
        project_name: p.name,
        segment: p.segment,
        driver: categorizeDriver(c.driver),
        scope: c.scope_summary,
        status: c.status,
        cost_impact_m: num(c.cost_impact_m),
        revenue_impact_m: num(c.revenue_impact_m),
        margin_pct: c.margin_realized_pct == null ? null : num(c.margin_realized_pct),
        schedule_days: num(c.schedule_impact_days),
      };
    });

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-6 space-y-4">
      <section>
        <Link href={`/dashboard`} className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <h1 className="text-lg font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Change orders across the portfolio — commercial exposure and margin impact.</p>
        </div>
      </section>

      <AnalyticsNav />

      <Kpis
        items={[
          { label: 'Total change orders', value: total },
          { label: 'Approved', value: executed, tone: 'ok' },
          { label: 'In pipeline', value: pending, tone: pending > 0 ? 'warn' : undefined },
          { label: 'Cumulative revenue', value: m(cumRevM) },
          { label: 'Net margin add', value: m(netMarginM), tone: netMarginM >= 0 ? 'ok' : 'warn' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Change orders</div><div className="mt-0.5 font-mono text-lg font-semibold">{total}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cumulative cost</div><div className="mt-0.5 font-mono text-lg font-semibold">{m(active.reduce((s, c) => s + num(c.cost_impact_m), 0))}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Net margin add</div><div className={`mt-0.5 font-mono text-lg font-semibold ${netMarginM >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m(netMarginM)}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Absorbed · unfunded</div><div className="mt-0.5 font-mono text-lg font-semibold text-orange-600">−{m(absorbedCostM)}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Revenue at risk</div><div className="mt-0.5 font-mono text-lg font-semibold text-amber-600">{m(revAtRiskM)}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Schedule added</div><div className="mt-0.5 font-mono text-lg font-semibold">{scheduleDays > 0 ? `+${scheduleDays}` : scheduleDays} days</div></div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DonutPanel title="By status" rows={byStatus} centerLabel="change orders" />
        <DonutPanel title="By segment" rows={bySegment} centerLabel="change orders" />
        <RankedBarPanel title="By driver" rows={byDriver} />
      </div>

      <section className="space-y-2 pt-2">
        <h2 className="text-base font-semibold">All change orders on active projects ({rows.length})</h2>
        <p className="text-xs text-muted-foreground">
          Every change order on an active project. Search, filter by segment / status / driver, sort any column, and click a project to open it.
        </p>
        <PortfolioChangeOrdersTable rows={rows} />
      </section>
    </div>
  );
}
