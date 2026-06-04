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

  // Line trajectory: margin moves Sold → (−budget) → (+contract) → (−cost perf.) → Forecast.
  const nodes = [
    { label: 'Sold', v: bridge.soldMargin },
    { label: 'Budget', v: bridge.soldMargin + bridge.dBudget },
    { label: 'Contract', v: bridge.soldMargin + bridge.dBudget + bridge.dContract },
    { label: 'Forecast', v: bridge.forecastMargin },
  ];
  const drivers = ['', 'budget', 'contract', 'cost perf.'];
  const maxV = Math.max(...nodes.map((x) => x.v), 1);
  const W = 560, H = 200, padT = 28, padB = 28, padL = 16, padR = 16;
  const y1 = H - padB, y0 = padT;
  const yOf = (v: number) => y1 - (v / maxV) * (y1 - y0);
  const n = nodes.length;
  const px = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));

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

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Margin trajectory from sold to forecast">
          <line x1={padL} y1={y1} x2={W - padR} y2={y1} stroke="currentColor" strokeOpacity="0.15" />
          {nodes.map((nd, i) => {
            if (i === n - 1) return null;
            const x1s = px(i), y1s = yOf(nd.v), x2s = px(i + 1), y2s = yOf(nodes[i + 1].v);
            const delta = nodes[i + 1].v - nd.v;
            const up = delta >= 0;
            const midX = (x1s + x2s) / 2, midY = (y1s + y2s) / 2;
            return (
              <g key={`seg${i}`}>
                <line x1={x1s} y1={y1s} x2={x2s} y2={y2s} stroke={up ? '#639922' : '#E24B4A'} strokeWidth="2.4" />
                <text x={midX} y={up ? midY + 14 : midY - 7} textAnchor="middle" fontSize="8.5" fontWeight="600" fill={up ? '#3B6D11' : '#A32D2D'}>
                  {delta >= 0 ? '+' : ''}{money(delta)} {drivers[i + 1]}
                </text>
              </g>
            );
          })}
          {nodes.map((nd, i) => {
            const isAnchor = i === 0 || i === n - 1;
            return (
              <g key={`pt${i}`}>
                <circle cx={px(i)} cy={yOf(nd.v)} r={isAnchor ? 4 : 2.8} fill={isAnchor ? '#378ADD' : '#64748B'} />
                <text x={px(i)} y={yOf(nd.v) - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" fillOpacity="0.8">{money(nd.v)}</text>
                <text x={px(i)} y={y1 + 14} textAnchor="middle" fontSize="8.5" fill="currentColor" fillOpacity="0.6">{nd.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="border-t px-5 py-2.5 text-[11px] text-muted-foreground">
        Line: margin trajectory from <span className="font-medium" style={{ color: '#378ADD' }}>sold</span> to <span className="font-medium" style={{ color: '#378ADD' }}>forecast</span> · segments are{' '}
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
