/**
 * Resource-load panel — Phase 4 visibility, as time-vs-FTE histograms.
 * Both views are small multiples: ONE chart per discipline, FTE demand spread
 * across the months.
 *   project  : demand over the project timeline (no capacity — single project).
 *   portfolio: demand vs a dashed capacity line; months over capacity are red.
 * Display only; figures from lib/resource-load. No levelling.
 */

import { roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';
import type { LoadResult } from '@/lib/resource-load';

const DISCIPLINE_COLOR: Record<string, string> = {
  engineering_manager: '#378ADD',
  construction_manager: '#BA7517',
  procurement: '#639922',
  pm: '#534AB7',
  project_controls: '#1D9E75',
  commercial: '#D4537E',
  hse_manager: '#E24B4A',
  program_manager: '#888780',
  risk: '#EF9F27',
};
const colorOf = (role: string) => DISCIPLINE_COLOR[role] ?? '#888780';

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short' }) + " '" + y.slice(2);
}
function niceMax(v: number): number {
  if (v <= 5) return Math.max(1, Math.ceil(v));
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / (pow / 2)) * (pow / 2);
}

export function ResourceLoadPanel({
  load,
  mode,
  title,
  subtitle,
}: {
  load: LoadResult;
  mode: 'portfolio' | 'project';
  title: string;
  subtitle?: string;
}) {
  if (!load.ready || load.roles.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm font-medium">No resource assignments yet.</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Resource demand is mirrored from the scheduler (Dataverse / P6). Run the resource sync to populate it.
        </p>
      </section>
    );
  }

  const months = load.months;
  const range = months.length ? `${fmtMonth(months[0])} – ${fmtMonth(months[months.length - 1])}` : '';
  // Project: order by total effort so the heaviest disciplines lead. Portfolio: keep peak order.
  const roles = mode === 'project' ? [...load.roles].sort((a, b) => b.totalFteMonths - a.totalFteMonths) : load.roles;

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">👷</span>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {range && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">{range}</span>}
      </div>

      {mode === 'project' && (
        <div className="border-b px-5 py-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total staffing over time</p>
          <StackedColumns months={months} roles={roles} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {roles.map((r) => (
              <span key={r.role} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorOf(r.role) }} />
                {roleLabel(r.role as RoleType)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="p-5">
        {mode === 'project' && (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">By discipline</p>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <DisciplineChart
              key={r.role}
              months={months}
              role={r.role}
              series={r.series}
              capacity={mode === 'portfolio' ? r.capacityFte : null}
              peak={r.peakFte}
              over={r.overMonths}
              total={r.totalFteMonths}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* Stacked FTE-by-month histogram — the combined staffing curve (project view). */
function StackedColumns({ months, roles }: { months: string[]; roles: LoadResult['roles'] }) {
  const W = 860, H = 230, padL = 30, padR = 8, padT = 10, padB = 30;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const totals = months.map((_, i) => roles.reduce((a, r) => a + (r.series[i] ?? 0), 0));
  const ymax = niceMax(Math.max(1, ...totals));
  const n = months.length;
  const colW = (x1 - x0) / Math.max(1, n);
  const barW = Math.min(26, colW * 0.72);
  const yOf = (v: number) => y1 - (v / ymax) * (y1 - y0);
  const step = Math.max(1, Math.ceil(n / 9));
  const peakIdx = totals.length ? totals.indexOf(Math.max(...totals)) : -1;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[680px]" role="img" aria-label="Stacked FTE demand by discipline per month">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={x0} y1={yOf(ymax * f)} x2={x1} y2={yOf(ymax * f)} stroke="currentColor" strokeOpacity="0.12" />
            <text x={x0 - 4} y={yOf(ymax * f) + 3} textAnchor="end" fontSize="8" fill="currentColor" fillOpacity="0.5">{Math.round(ymax * f)}</text>
          </g>
        ))}
        <text x={x0 - 22} y={(y0 + y1) / 2} fontSize="8" fill="currentColor" fillOpacity="0.5" transform={`rotate(-90 ${x0 - 22} ${(y0 + y1) / 2})`} textAnchor="middle">FTE</text>
        {months.map((m, i) => {
          const cx = x0 + i * colW + (colW - barW) / 2;
          let acc = 0;
          return (
            <g key={m}>
              {roles.map((r) => {
                const v = r.series[i] ?? 0;
                if (v <= 0) return null;
                const yTop = yOf(acc + v);
                const h = yOf(acc) - yTop;
                acc += v;
                return <rect key={r.role} x={cx} y={yTop} width={barW} height={Math.max(0, h)} fill={colorOf(r.role)} />;
              })}
              {i % step === 0 && (
                <text x={cx + barW / 2} y={y1 + 12} textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.55">{fmtMonth(m)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {peakIdx >= 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Peak staffing ≈ <span className="font-medium tabular-nums">{totals[peakIdx].toFixed(1)} FTE</span> in {fmtMonth(months[peakIdx])}.
        </p>
      )}
    </div>
  );
}

/* One discipline's FTE demand over time. Capacity line + red over-months in
 * portfolio mode; plain demand over the project timeline when capacity is null. */
function DisciplineChart({
  months,
  role,
  series,
  capacity,
  peak,
  over,
  total,
}: {
  months: string[];
  role: string;
  series: number[];
  capacity: number | null;
  peak: number;
  over: number;
  total: number;
}) {
  const W = 320, H = 134, padL = 26, padR = 6, padT = 8, padB = 22;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const ymax = niceMax(Math.max(1, peak, capacity ?? 0));
  const n = months.length;
  const colW = (x1 - x0) / Math.max(1, n);
  const barW = Math.max(1.5, colW * 0.82);
  const yOf = (v: number) => y1 - (v / ymax) * (y1 - y0);
  const step = Math.max(1, Math.ceil(n / 5));
  const c = colorOf(role);
  const hasCap = capacity != null;

  return (
    <div className={`rounded-lg border p-3 ${hasCap && over > 0 ? 'border-red-200 bg-red-50/30' : 'bg-card'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold">{roleLabel(role as RoleType)}</p>
        {hasCap ? (
          over > 0 ? (
            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">over {over} mo</span>
          ) : (
            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">within</span>
          )
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">{total} FTE-mo</span>
        )}
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
        peak {peak.toFixed(1)}{hasCap ? ` / cap ${capacity}` : ''} FTE
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 w-full" role="img" aria-label={`${role} FTE demand over time`}>
        <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="currentColor" strokeOpacity="0.15" />
        <text x={x0 - 4} y={y0 + 4} textAnchor="end" fontSize="7" fill="currentColor" fillOpacity="0.5">{ymax}</text>
        <text x={x0 - 4} y={y1 + 1} textAnchor="end" fontSize="7" fill="currentColor" fillOpacity="0.4">0</text>
        {months.map((m, i) => {
          const v = series[i] ?? 0;
          const cx = x0 + i * colW + (colW - barW) / 2;
          const yt = yOf(v);
          const isOver = hasCap && v > (capacity as number);
          return (
            <g key={m}>
              <rect x={cx} y={yt} width={barW} height={Math.max(0, y1 - yt)} fill={isOver ? '#E24B4A' : c} fillOpacity={isOver ? 0.95 : 0.7} />
              {i % step === 0 && <text x={cx + barW / 2} y={y1 + 11} textAnchor="middle" fontSize="6.5" fill="currentColor" fillOpacity="0.5">{fmtMonth(m)}</text>}
            </g>
          );
        })}
        {hasCap && (
          <>
            <line x1={x0} y1={yOf(capacity as number)} x2={x1} y2={yOf(capacity as number)} stroke="#475569" strokeWidth="1" strokeDasharray="4 2" />
            <text x={x1} y={yOf(capacity as number) - 2} textAnchor="end" fontSize="7" fill="#475569">capacity</text>
          </>
        )}
      </svg>
    </div>
  );
}
