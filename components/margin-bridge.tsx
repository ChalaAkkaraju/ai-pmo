/**
 * Margin bridge — a waterfall from the margin we SOLD to the margin we now
 * FORECAST, decomposed into budget growth, contract change and cost performance.
 * Display only; figures from lib/margin. Answers "are we delivering the margin
 * we sold?"
 */

import type { MarginBridge } from '@/lib/margin';

function money(n: number): string {
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
}

export function MarginBridgeCard({ bridge, syncedAt }: { bridge: MarginBridge; syncedAt: string | null }) {
  if (!bridge.ready) {
    return (
      <section className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm font-medium">Margin reconciliation not available yet.</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Needs the as-sold baseline (frozen at booking) plus the current budget and forecast (EAC). Run the baseline sync.
        </p>
      </section>
    );
  }

  const slipPct = bridge.forecastMarginPct - bridge.soldMarginPct;
  const tone = slipPct < -0.5 ? 'text-red-600' : slipPct > 0.5 ? 'text-emerald-700' : 'text-amber-700';
  const chip = slipPct < -0.5 ? 'bg-red-100 text-red-800' : slipPct > 0.5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
  const verdict = slipPct < -0.5 ? 'below the margin we sold' : slipPct > 0.5 ? 'above the margin we sold' : 'on the margin we sold';

  // Waterfall geometry
  const steps = [
    { label: 'Sold', kind: 'anchor' as const, value: bridge.soldMargin },
    { label: 'Budget', kind: 'delta' as const, value: bridge.dBudget },
    { label: 'Contract', kind: 'delta' as const, value: bridge.dContract },
    { label: 'Cost perf.', kind: 'delta' as const, value: bridge.dExecution },
    { label: 'Forecast', kind: 'anchor' as const, value: bridge.forecastMargin },
  ];
  const running: number[] = [];
  let acc = 0;
  for (const s of steps) {
    if (s.kind === 'anchor') { acc = s.value; running.push(acc); }
    else { running.push(acc + s.value); acc += s.value; }
  }
  const maxV = Math.max(bridge.soldMargin, bridge.plannedMargin, bridge.forecastMargin, ...running, 1);
  const W = 560, H = 190, padT = 14, padB = 30, padL = 8, padR = 8;
  const y1 = H - padB, y0 = padT;
  const yOf = (v: number) => y1 - (v / maxV) * (y1 - y0);
  const n = steps.length;
  const colW = (W - padL - padR) / n;
  const barW = colW * 0.56;

  return (
    <section className="overflow-hidden rounded-lg border bg-gradient-to-br from-sky-50/40 via-card to-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">💰</span>
          <div>
            <p className="text-sm font-semibold">Margin bridge — sold vs forecast</p>
            <p className="text-xs text-muted-foreground">Are we delivering the margin we sold?</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}>{verdict}</span>
          {syncedAt && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">baseline {new Date(syncedAt).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-4 md:grid-cols-[260px_1fr] md:items-center">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Sold" pct={bridge.soldMarginPct} val={bridge.soldMargin} />
          <Stat label="Planned" pct={bridge.plannedMarginPct} val={bridge.plannedMargin} />
          <Stat label="Forecast" pct={bridge.forecastMarginPct} val={bridge.forecastMargin} cls={tone} />
          <div className="col-span-3 rounded-md bg-muted/40 px-3 py-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Margin vs sold</p>
            <p className={`text-base font-semibold tabular-nums ${tone}`}>{slipPct >= 0 ? '+' : ''}{slipPct.toFixed(1)} pts</p>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Margin waterfall from sold to forecast">
          <line x1={padL} y1={y1} x2={W - padR} y2={y1} stroke="currentColor" strokeOpacity="0.15" />
          {steps.map((s, i) => {
            const cx = padL + i * colW + (colW - barW) / 2;
            const isAnchor = s.kind === 'anchor';
            const top = isAnchor ? yOf(s.value) : yOf(Math.max(running[i], running[i] - s.value));
            const bot = isAnchor ? y1 : yOf(Math.min(running[i], running[i] - s.value));
            const fill = isAnchor ? '#378ADD' : s.value >= 0 ? '#639922' : '#E24B4A';
            return (
              <g key={s.label}>
                {!isAnchor && i > 0 && (
                  <line x1={padL + (i - 1) * colW + (colW + barW) / 2} y1={yOf(running[i - 1])} x2={cx} y2={yOf(running[i - 1])} stroke="currentColor" strokeOpacity="0.18" strokeDasharray="2 2" />
                )}
                <rect x={cx} y={top} width={barW} height={Math.max(1.5, bot - top)} rx="1.5" fill={fill} fillOpacity={isAnchor ? 0.9 : 0.85} />
                <text x={cx + barW / 2} y={top - 3} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="currentColor" fillOpacity="0.75">
                  {isAnchor ? money(s.value) : `${s.value >= 0 ? '+' : ''}${money(s.value)}`}
                </text>
                <text x={cx + barW / 2} y={y1 + 12} textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.6">{s.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="border-t px-5 py-2.5 text-[11px] text-muted-foreground">
        Bars: <span className="font-medium" style={{ color: '#378ADD' }}>sold</span> &amp; <span className="font-medium" style={{ color: '#378ADD' }}>forecast</span> margin · steps in between are{' '}
        <span className="font-medium" style={{ color: '#639922' }}>gains</span> / <span className="font-medium" style={{ color: '#E24B4A' }}>erosion</span> from budget growth, contract change and cost performance.
      </p>
    </section>
  );
}

function Stat({ label, pct, val, cls = 'text-foreground' }: { label: string; pct: number; val: number; cls?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{pct.toFixed(1)}%</p>
      <p className="text-[10px] text-muted-foreground tabular-nums">{money(val)}</p>
    </div>
  );
}
