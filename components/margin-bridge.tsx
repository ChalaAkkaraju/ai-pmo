/**
 * Margin reconciliation — the three states (as-sold → as-planned → as-built)
 * as a compact table, PLUS a waterfall that decomposes the move from sold to
 * forecast margin (budget growth, contract change, cost performance).
 * Display only; figures from lib/margin.
 */

import { CHART } from '@/lib/chart-palette';
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

  return (
    <section className="overflow-hidden rounded-lg border bg-gradient-to-br from-sky-50/40 via-card to-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">💰</span>
          <div>
            <p className="text-sm font-semibold">Margin reconciliation — sold vs forecast</p>
            <p className="text-xs text-muted-foreground">Are we delivering the margin we sold?</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}>{verdict}</span>
          {syncedAt && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">baseline {new Date(syncedAt).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Table — the three states */}
      <div className="px-5 pt-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-1.5 pr-3 text-left font-medium">State</th>
                <th className="px-3 py-1.5 text-right font-medium">Contract</th>
                <th className="px-3 py-1.5 text-right font-medium">Cost</th>
                <th className="px-3 py-1.5 text-right font-medium">Margin</th>
                <th className="px-3 py-1.5 text-right font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <Row label="As-sold" sub="frozen at booking" contract={bridge.soldContract} cost={bridge.soldBudget} margin={bridge.soldMargin} pct={bridge.soldMarginPct} />
              <Row label="As-planned" sub="current WBS budget" contract={bridge.currentContract} cost={bridge.plannedBudget} margin={bridge.plannedMargin} pct={bridge.plannedMarginPct} />
              <Row label="As-built" sub="forecast at completion (EAC)" contract={bridge.currentContract} cost={bridge.eac} margin={bridge.forecastMargin} pct={bridge.forecastMarginPct} pctCls={tone} emphasize />
            </tbody>
          </table>
        </div>
      </div>

      {/* Waterfall — what moved the margin from sold to forecast */}
      <div className="px-5 pb-1 pt-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What moved it · sold → forecast</p>
        <Waterfall bridge={bridge} />
      </div>

      <p className="border-t px-5 py-2.5 text-[11px] text-muted-foreground">
        Bars: <span className="font-medium" style={{ color: CHART.planned }}>sold</span> &amp; <span className="font-medium" style={{ color: CHART.planned }}>forecast</span> margin · steps between are{' '}
        <span className="font-medium" style={{ color: CHART.earned }}>gains</span> / <span className="font-medium" style={{ color: CHART.erosion }}>erosion</span> from budget growth, contract change and cost performance.
      </p>
    </section>
  );
}

function Waterfall({ bridge }: { bridge: MarginBridge }) {
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
  const maxV = Math.max(bridge.soldMargin, bridge.forecastMargin, ...running, 1);
  const W = 760, H = 210, padT = 24, padB = 32, padL = 10, padR = 10;
  const y1 = H - padB, y0 = padT;
  const yOf = (v: number) => y1 - (v / maxV) * (y1 - y0);
  const n = steps.length;
  const colW = (W - padL - padR) / n;
  const barW = colW * 0.54;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Margin waterfall from sold to forecast">
      <line x1={padL} y1={y1} x2={W - padR} y2={y1} stroke="currentColor" strokeOpacity="0.15" />
      {steps.map((s, i) => {
        const cx = padL + i * colW + (colW - barW) / 2;
        const isAnchor = s.kind === 'anchor';
        const top = isAnchor ? yOf(s.value) : yOf(Math.max(running[i], running[i] - s.value));
        const bot = isAnchor ? y1 : yOf(Math.min(running[i], running[i] - s.value));
        const fill = isAnchor ? CHART.planned : s.value >= 0 ? CHART.earned : CHART.erosion;
        return (
          <g key={s.label}>
            {!isAnchor && i > 0 && (
              <line x1={padL + (i - 1) * colW + (colW + barW) / 2} y1={yOf(running[i - 1])} x2={cx} y2={yOf(running[i - 1])} stroke="currentColor" strokeOpacity="0.18" strokeDasharray="2 2" />
            )}
            <rect x={cx} y={top} width={barW} height={Math.max(2, bot - top)} rx="2" fill={fill} fillOpacity={isAnchor ? 0.9 : 0.85} />
            <text x={cx + barW / 2} y={top - 4} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="currentColor" fillOpacity="0.8">
              {isAnchor ? money(s.value) : `${s.value >= 0 ? '+' : ''}${money(s.value)}`}
            </text>
            <text x={cx + barW / 2} y={y1 + 14} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.6">{s.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Row({
  label,
  sub,
  contract,
  cost,
  margin,
  pct,
  pctCls = 'text-foreground',
  emphasize = false,
}: {
  label: string;
  sub: string;
  contract: number;
  cost: number;
  margin: number;
  pct: number;
  pctCls?: string;
  emphasize?: boolean;
}) {
  return (
    <tr className={emphasize ? 'bg-emerald-50/40' : ''}>
      <td className="py-2 pr-3">
        <p className="font-medium leading-tight">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </td>
      <td className="px-3 text-right tabular-nums">{money(contract)}</td>
      <td className="px-3 text-right tabular-nums">{money(cost)}</td>
      <td className="px-3 text-right tabular-nums">{money(margin)}</td>
      <td className={`px-3 text-right font-semibold tabular-nums ${pctCls}`}>{pct.toFixed(1)}%</td>
    </tr>
  );
}
