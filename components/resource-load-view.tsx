/**
 * Resource-load panel — Phase 4 visibility. Renders FTE demand per discipline,
 * a monthly demand sparkline, and (portfolio mode) a capacity marker with an
 * over-allocation flag. Display only; figures come from lib/resource-load.
 */

import { roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';
import type { LoadResult } from '@/lib/resource-load';

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short' }) + " '" + y.slice(2);
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
  const scale = Math.max(
    1,
    ...load.roles.map((r) => (mode === 'portfolio' ? Math.max(r.peakFte, r.capacityFte) : r.peakFte)),
  );
  const range = months.length ? `${fmtMonth(months[0])} – ${fmtMonth(months[months.length - 1])}` : '';

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
        <div className="flex items-center gap-2">
          {range && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">{range}</span>}
          {mode === 'portfolio' && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">demand vs capacity · FTE</span>
          )}
        </div>
      </div>

      <div className="divide-y">
        {load.roles.map((r) => {
          const over = mode === 'portfolio' && r.peakFte > r.capacityFte;
          const barPct = Math.min(100, (r.peakFte / scale) * 100);
          const capPct = mode === 'portfolio' ? Math.min(100, (r.capacityFte / scale) * 100) : 0;
          return (
            <div key={r.role} className="grid grid-cols-1 gap-2 px-5 py-3 md:grid-cols-[150px_1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{roleLabel(r.role as RoleType)}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  peak {r.peakFte.toFixed(1)} FTE{mode === 'portfolio' ? ` / cap ${r.capacityFte}` : ''}
                </p>
              </div>

              {/* Peak bar with capacity marker */}
              <div className="relative h-5 w-full overflow-hidden rounded bg-muted/50">
                <div
                  className={`h-full rounded ${over ? 'bg-red-400' : 'bg-emerald-400'}`}
                  style={{ width: `${barPct}%` }}
                />
                {mode === 'portfolio' && (
                  <span
                    className="absolute top-0 h-full w-0.5 bg-slate-700/70"
                    style={{ left: `${capPct}%` }}
                    title={`capacity ${r.capacityFte} FTE`}
                  />
                )}
              </div>

              {/* Sparkline + flag */}
              <div className="flex items-center gap-3">
                <Sparkline series={r.series} cap={mode === 'portfolio' ? r.capacityFte : null} scale={scale} />
                {over ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                    over {r.overMonths} mo
                  </span>
                ) : mode === 'portfolio' ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    within
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground tabular-nums">{r.totalFteMonths} FTE-mo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Sparkline({ series, cap, scale }: { series: number[]; cap: number | null; scale: number }) {
  if (series.length === 0) return <div className="hidden md:block md:w-[120px]" />;
  const W = 120;
  const H = 28;
  const n = series.length;
  const px = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - 4) + 2);
  const py = (v: number) => H - 3 - (v / scale) * (H - 6);
  const pts = series.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const capY = cap != null ? py(cap) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[120px] shrink-0" role="img" aria-label="Monthly FTE demand">
      {capY != null && <line x1="0" y1={capY} x2={W} y2={capY} stroke="#475569" strokeOpacity="0.5" strokeDasharray="3 2" strokeWidth="1" />}
      <polyline points={pts} fill="none" stroke="#639922" strokeWidth="1.6" />
    </svg>
  );
}
