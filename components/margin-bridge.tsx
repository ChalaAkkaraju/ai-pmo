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

  const impacts = [
    { label: 'Budget growth', v: bridge.dBudget },
    { label: 'Contract change', v: bridge.dContract },
    { label: 'Cost performance', v: bridge.dExecution },
  ];
  const maxAbs = Math.max(...impacts.map((x) => Math.abs(x.v)), 1);
  const net = bridge.forecastMargin - bridge.soldMargin;

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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What moved the margin · sold → forecast</p>
            <p className="text-[11px] text-muted-foreground">erosion ◀ &nbsp; ▶ gain</p>
          </div>
          <div className="space-y-2">
            {impacts.map((im) => {
              const w = (Math.abs(im.v) / maxAbs) * 50;
              const pos = im.v >= 0;
              return (
                <div key={im.label} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-muted-foreground">{im.label}</span>
                  <div className="relative h-5 flex-1 rounded bg-muted/30">
                    <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-300" />
                    <span
                      className={`absolute inset-y-0 rounded ${pos ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={pos ? { left: '50%', width: `${w}%` } : { left: `${50 - w}%`, width: `${w}%` }}
                    />
                  </div>
                  <span className={`w-16 shrink-0 text-right text-xs font-semibold tabular-nums ${pos ? 'text-emerald-700' : 'text-red-600'}`}>
                    {im.v >= 0 ? '+' : ''}{money(im.v)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t pt-2">
            <span className="text-xs font-medium">Net change vs sold</span>
            <span className={`text-sm font-semibold tabular-nums ${net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {net >= 0 ? '+' : ''}{money(net)}
            </span>
          </div>
        </div>
      </div>

      <p className="border-t px-5 py-2.5 text-[11px] text-muted-foreground">
        Each bar is a driver moving margin from <span className="font-medium" style={{ color: '#378ADD' }}>sold</span> to <span className="font-medium" style={{ color: '#378ADD' }}>forecast</span> — <span className="font-medium" style={{ color: '#639922' }}>right = gain</span>, <span className="font-medium" style={{ color: '#E24B4A' }}>left = erosion</span>.
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
