/**
 * Resource-load panel — Phase 4 visibility, as time-vs-FTE line/area charts.
 *   project  : a stacked-area "total staffing over time" overview + one
 *              line/area chart per discipline across the project timeline.
 *   portfolio: one line/area chart per discipline vs a dashed capacity line;
 *              months over capacity are marked red.
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
  mode: 'portfolio' | 'project' | 'demand';
  title: string;
  subtitle?: string;
}) {
  if (!load.ready || load.roles.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm font-medium">No resource assignments yet.</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Resource demand is mirrored from the scheduler (Microsoft Project / P6). Run the resource sync to populate it.
        </p>
      </section>
    );
  }

  const months = load.months;
  const range = months.length ? `${fmtMonth(months[0])} – ${fmtMonth(months[months.length - 1])}` : '';
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
          <StackedArea months={months} roles={roles} />
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

function xAt(i: number, n: number, x0: number, x1: number) {
  return n <= 1 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0);
}

/* Stacked area — the combined staffing curve (project view). */
function StackedArea({ months, roles }: { months: string[]; roles: LoadResult['roles'] }) {
  const W = 860, H = 230, padL = 30, padR = 8, padT = 10, padB = 30;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const n = months.length;
  const totals = months.map((_, i) => roles.reduce((a, r) => a + (r.series[i] ?? 0), 0));
  const ymax = niceMax(Math.max(1, ...totals));
  const yOf = (v: number) => y1 - (v / ymax) * (y1 - y0);
  const step = Math.max(1, Math.ceil(n / 9));
  const peakIdx = totals.length ? totals.indexOf(Math.max(...totals)) : -1;

  const lower = new Array(n).fill(0);
  const bands = roles.map((r) => {
    const upper = lower.map((lo, i) => lo + (r.series[i] ?? 0));
    const top = upper.map((v, i) => `${xAt(i, n, x0, x1).toFixed(1)},${yOf(v).toFixed(1)}`);
    const bot = lower.map((v, i) => `${xAt(i, n, x0, x1).toFixed(1)},${yOf(v).toFixed(1)}`).reverse();
    const path = `M ${top.join(' L ')} L ${bot.join(' L ')} Z`;
    for (let i = 0; i < n; i++) lower[i] = upper[i];
    return { role: r.role, path };
  });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[680px]" role="img" aria-label="Stacked FTE demand by discipline over time">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={x0} y1={yOf(ymax * f)} x2={x1} y2={yOf(ymax * f)} stroke="currentColor" strokeOpacity="0.12" />
            <text x={x0 - 4} y={yOf(ymax * f) + 3} textAnchor="end" fontSize="8" fill="currentColor" fillOpacity="0.5">{Math.round(ymax * f)}</text>
          </g>
        ))}
        <text x={x0 - 22} y={(y0 + y1) / 2} fontSize="8" fill="currentColor" fillOpacity="0.5" transform={`rotate(-90 ${x0 - 22} ${(y0 + y1) / 2})`} textAnchor="middle">FTE</text>
        {bands.map((b) => (
          <path key={b.role} d={b.path} fill={colorOf(b.role)} fillOpacity="0.82" stroke="#fff" strokeWidth="0.4" />
        ))}
        {months.map((m, i) => (i % step === 0 ? (
          <text key={m} x={xAt(i, n, x0, x1)} y={y1 + 12} textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.55">{fmtMonth(m)}</text>
        ) : null))}
      </svg>
      {peakIdx >= 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Peak staffing ≈ <span className="font-medium tabular-nums">{totals[peakIdx].toFixed(1)} FTE</span> in {fmtMonth(months[peakIdx])}.
        </p>
      )}
    </div>
  );
}

/* One discipline's FTE demand over time as a line + area. */
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
  const W = 320, H = 134, padL = 26, padR = 8, padT = 10, padB = 22;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const ymax = niceMax(Math.max(1, peak, capacity ?? 0));
  const n = months.length;
  const yOf = (v: number) => y1 - (v / ymax) * (y1 - y0);
  const step = Math.max(1, Math.ceil(n / 5));
  const c = colorOf(role);
  const hasCap = capacity != null;

  const pts = series.map((v, i) => [xAt(i, n, x0, x1), yOf(v)] as const);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `M ${xAt(0, n, x0, x1).toFixed(1)},${y1} L ${line} L ${xAt(n - 1, n, x0, x1).toFixed(1)},${y1} Z`;

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
        {hasCap && (peak <= (capacity as number)
          ? <span className="text-emerald-700"> · ≥{((capacity as number) - peak).toFixed(0)} free</span>
          : <span className="text-red-600"> · short {(peak - (capacity as number)).toFixed(0)} at peak</span>)}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 w-full" role="img" aria-label={`${role} FTE demand over time`}>
        <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="currentColor" strokeOpacity="0.15" />
        <text x={x0 - 4} y={y0 + 4} textAnchor="end" fontSize="7" fill="currentColor" fillOpacity="0.5">{ymax}</text>
        <text x={x0 - 4} y={y1 + 1} textAnchor="end" fontSize="7" fill="currentColor" fillOpacity="0.4">0</text>
        {hasCap && (() => {
          const cap = capacity as number;
          const bottom = series.map((v, i) => `${xAt(i, n, x0, x1).toFixed(1)},${yOf(Math.min(v, cap)).toFixed(1)}`);
          const d = `M ${bottom.join(' L ')} L ${xAt(n - 1, n, x0, x1).toFixed(1)},${yOf(cap).toFixed(1)} L ${xAt(0, n, x0, x1).toFixed(1)},${yOf(cap).toFixed(1)} Z`;
          return <path d={d} fill="#94A3B8" fillOpacity="0.18" />;
        })()}
        <path d={area} fill={c} fillOpacity="0.16" />
        <polyline points={line} fill="none" stroke={c} strokeWidth="1.7" />
        {hasCap && series.map((v, i) => (v > (capacity as number) ? (
          <circle key={i} cx={xAt(i, n, x0, x1)} cy={yOf(v)} r="2" fill="#E24B4A" />
        ) : null))}
        {months.map((m, i) => (i % step === 0 ? (
          <text key={m} x={xAt(i, n, x0, x1)} y={y1 + 11} textAnchor="middle" fontSize="6.5" fill="currentColor" fillOpacity="0.5">{fmtMonth(m)}</text>
        ) : null))}
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
