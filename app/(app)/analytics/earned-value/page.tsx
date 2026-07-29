/**
 * Analytics → Earned value. Portfolio-wide earned value: the CPI×SPI
 * performance quadrant (one bubble per project, sized by BAC), portfolio
 * variance and forecast KPIs, and a worst-performers table. The honest roll-up
 * sums the dollar quantities per project and recomputes the indices from the
 * totals (see lib/earned-value rollUpEv) — never averages CPI/SPI.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { Kpis } from '@/components/analytics-shared';
import { computeEv, rollUpEv, type EvMetrics } from '@/lib/earned-value';
import { selectAll } from '@/lib/select-all';
import { PortfolioEvTable } from '@/components/portfolio-tables';

export const dynamic = 'force-dynamic';

function money(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
}
function signed(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${n < 0 ? '−' : '+'}$${Math.abs(m).toFixed(1)}M`;
}
function idx(n: number | null): string {
  return n == null ? '—' : n.toFixed(2);
}

interface ProjEv extends EvMetrics {
  code: string;
  name: string;
  segment: string;
}

export default async function EarnedValueAnalyticsPage() {
  const token = 'session';
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const [wps, tks, cst, projects] = await Promise.all([
    selectAll<{ project_id: string; wbs_code: string; parent_wbs_code: string | null; budget_bac: number | null }>(supabase, 'work_packages', 'project_id, wbs_code, parent_wbs_code, budget_bac'),
    selectAll<{ project_id: string; wbs_code: string | null; percent_complete: number | null }>(supabase, 'tasks', 'project_id, wbs_code, percent_complete'),
    selectAll<{ project_id: string; actual_cost: number | null; planned_value: number | null }>(supabase, 'cost_actuals', 'project_id, actual_cost, planned_value'),
    selectAll<{ id: string; code: string; name: string; segment: string; status: string }>(supabase, 'projects', 'id, code, name, segment, status'),
  ]);
  const metaById = new Map(projects.map((p) => [p.id, p]));

  const byProj = <T extends { project_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) { const a = m.get(r.project_id) ?? []; a.push(r); m.set(r.project_id, a); }
    return m;
  };
  const wpByP = byProj(wps), tkByP = byProj(tks), cstByP = byProj(cst);

  const perProject: EvMetrics[] = [];
  const rows: ProjEv[] = [];
  for (const [pid, wpRows] of wpByP.entries()) {
    const leaves = wpRows.filter((w) => w.parent_wbs_code).map((w) => ({ wbs_code: w.wbs_code, budget_bac: w.budget_bac }));
    const tasksForP = (tkByP.get(pid) ?? []).map((t) => ({ wbs_code: t.wbs_code, percent_complete: t.percent_complete }));
    const costForP = (cstByP.get(pid) ?? []).map((c) => ({ actual_cost: c.actual_cost, planned_value: c.planned_value }));
    const m = computeEv(leaves, tasksForP, costForP);
    perProject.push(m);
    const meta = metaById.get(pid);
    if (m.ready && meta && meta.status === 'Active') rows.push({ ...m, code: meta.code, name: meta.name, segment: meta.segment });
  }
  const portfolio = rollUpEv(perProject);

  const overCost = rows.filter((r) => r.cpi != null && r.cpi < 0.97).length;
  const behind = rows.filter((r) => r.spi != null && r.spi < 0.97).length;
  const evRows = rows.map((r) => ({ code: r.code, name: r.name, segment: r.segment, cpi: r.cpi, spi: r.spi, cv: r.cv, vac: r.vac, bac: r.bac }));

  // CPI × SPI quadrant geometry. Window 0.8–1.2, clamp outliers to the edge.
  const W = 480, H = 360, M = 44;
  const lo = 0.8, hi = 1.2;
  const sx = (v: number) => M + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W - 2 * M);
  const sy = (v: number) => (H - M) - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - 2 * M);
  const maxBac = Math.max(1, ...rows.map((r) => r.bac));
  const rad = (bac: number) => 4 + Math.sqrt(bac / maxBac) * 16;
  const bubble = (r: ProjEv) =>
    r.cpi != null && r.spi != null && r.cpi >= 1 && r.spi >= 1 ? '#10b981'
      : r.cpi != null && r.spi != null && r.cpi < 0.97 && r.spi < 0.97 ? '#ef4444'
        : '#f59e0b';

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-6 space-y-4">
      <section>
        <Link href={`/dashboard`} className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <h1 className="text-lg font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Earned value across the portfolio — cost from SAP PS, progress from the scheduler.</p>
        </div>
      </section>

      <AnalyticsNav token={token} />

      <Kpis
        items={[
          { label: 'Portfolio CPI', value: idx(portfolio.cpi), tone: portfolio.cpi != null && portfolio.cpi < 0.97 ? 'warn' : portfolio.cpi != null && portfolio.cpi >= 1 ? 'ok' : undefined },
          { label: 'Portfolio SPI', value: idx(portfolio.spi), tone: portfolio.spi != null && portfolio.spi < 0.97 ? 'warn' : portfolio.spi != null && portfolio.spi >= 1 ? 'ok' : undefined },
          { label: 'Cost variance', value: signed(portfolio.cv), tone: portfolio.cv < 0 ? 'warn' : 'ok' },
          { label: 'Schedule variance', value: signed(portfolio.sv), tone: portfolio.sv < 0 ? 'warn' : 'ok' },
          { label: 'Forecast variance (VAC)', value: signed(portfolio.vac), tone: portfolio.vac != null && portfolio.vac < 0 ? 'warn' : 'ok' },
        ]}
      />

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Portfolio forecast</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md bg-muted/40 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget (BAC)</p><p className="text-base font-semibold tabular-nums">{money(portfolio.bac)}</p></div>
          <div className="rounded-md bg-muted/40 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Earned (EV)</p><p className="text-base font-semibold tabular-nums">{money(portfolio.ev)}</p></div>
          <div className="rounded-md bg-muted/40 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Forecast (EAC)</p><p className="text-base font-semibold tabular-nums">{money(portfolio.eac)}</p></div>
          <div className="rounded-md bg-muted/40 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projects in EV</p><p className="text-base font-semibold tabular-nums">{portfolio.projects_in}</p></div>
        </div>
      </section>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Cost vs schedule performance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {rows.length} active projects · bubble size = budget (BAC). Top-right is on or under budget and on or ahead of schedule; bottom-left is both over and behind.
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Scatter of projects by CPI and SPI">
            {/* quadrant tints */}
            <rect x={sx(1)} y={M} width={W - M - sx(1)} height={sy(1) - M} fill="#10b981" opacity="0.06" />
            <rect x={M} y={sy(1)} width={sx(1) - M} height={H - M - sy(1)} fill="#ef4444" opacity="0.06" />
            <rect x={M} y={M} width={sx(1) - M} height={sy(1) - M} fill="#f59e0b" opacity="0.05" />
            <rect x={sx(1)} y={sy(1)} width={W - M - sx(1)} height={H - M - sy(1)} fill="#f59e0b" opacity="0.05" />
            {/* axes */}
            <line x1={M} y1={H - M} x2={W - M} y2={H - M} stroke="currentColor" strokeOpacity="0.2" />
            <line x1={M} y1={M} x2={M} y2={H - M} stroke="currentColor" strokeOpacity="0.2" />
            <line x1={sx(1)} y1={M} x2={sx(1)} y2={H - M} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
            <line x1={M} y1={sy(1)} x2={W - M} y2={sy(1)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
            {[0.8, 1.0, 1.2].map((t) => (
              <g key={`x${t}`}>
                <text x={sx(t)} y={H - M + 14} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="middle">{t.toFixed(1)}</text>
                <text x={M - 6} y={sy(t) + 3} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="end">{t.toFixed(1)}</text>
              </g>
            ))}
            <text x={(W) / 2} y={H - 6} fontSize="10" fill="currentColor" fillOpacity="0.7" textAnchor="middle">SPI · schedule →</text>
            <text x={12} y={H / 2} fontSize="10" fill="currentColor" fillOpacity="0.7" textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`}>CPI · cost →</text>
            {/* bubbles */}
            {rows.map((r) => (
              <circle key={r.code} cx={sx(r.spi ?? 1)} cy={sy(r.cpi ?? 1)} r={rad(r.bac)} fill={bubble(r)} fillOpacity="0.55" stroke={bubble(r)} strokeWidth="1">
                <title>{`${r.code} — ${r.name}\nCPI ${idx(r.cpi)} · SPI ${idx(r.spi)} · BAC ${money(r.bac)}`}</title>
              </circle>
            ))}
          </svg>
        </div>

      <section className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Active projects · earned value ({rows.length})</h2>
          <span className="text-xs text-muted-foreground">{overCost} over cost · {behind} behind</span>
        </div>
        <PortfolioEvTable token={token} rows={evRows} />
      </section>
    </div>
  );
}
