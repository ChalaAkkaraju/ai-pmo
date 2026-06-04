/**
 * Margin reconciliation — the three states (as-sold → as-planned → as-built)
 * as a compact table, with a one-line "what moved it" driver summary.
 * Display only; figures from lib/margin. Answers "are we delivering the margin
 * we sold?"
 */

import type { MarginBridge } from '@/lib/margin';

function money(n: number): string {
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
}
function signed(n: number): string {
  return `${n >= 0 ? '+' : ''}${money(n)}`;
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
  const net = bridge.forecastMargin - bridge.soldMargin;
  const tone = slipPct < -0.5 ? 'text-red-600' : slipPct > 0.5 ? 'text-emerald-700' : 'text-amber-700';
  const chip = slipPct < -0.5 ? 'bg-red-100 text-red-800' : slipPct > 0.5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
  const verdict = slipPct < -0.5 ? 'below the margin we sold' : slipPct > 0.5 ? 'above the margin we sold' : 'on the margin we sold';
  const driverCls = (v: number) => (v >= 0 ? 'text-emerald-700' : 'text-red-600');

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

      <div className="px-5 py-4">
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

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">What moved it (sold → forecast):</span>{' '}
          budget growth <span className={`font-medium ${driverCls(bridge.dBudget)}`}>{signed(bridge.dBudget)}</span>,{' '}
          contract change <span className={`font-medium ${driverCls(bridge.dContract)}`}>{signed(bridge.dContract)}</span>,{' '}
          cost performance <span className={`font-medium ${driverCls(bridge.dExecution)}`}>{signed(bridge.dExecution)}</span>{' '}
          → net <span className={`font-medium ${driverCls(net)}`}>{signed(net)}</span>{' '}
          (<span className={`font-medium ${tone}`}>{slipPct >= 0 ? '+' : ''}{slipPct.toFixed(1)} pts</span> vs sold).
        </p>
      </div>
    </section>
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
