/**
 * Change-order analytics panels rendered above the CO card list on the Changes
 * tab: a summary rollup, the status pipeline, margin impact (accretive vs
 * dilutive), and a by-driver breakdown. All derived (lib/change-orders).
 */
import { summarizeChangeOrders, pipelineStages, marginImpact, byDriver } from '@/lib/change-orders';

const fM = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(1)}M`;
const fPct = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);

function Cell({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'bad' }) {
  const t = tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-foreground';
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${t}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ChangeOrdersPanel({ rows, soldContract, baseMarginPct }: { rows: Array<Record<string, unknown>>; soldContract: number; baseMarginPct: number }) {
  if (!rows.length) return null;
  const sum = summarizeChangeOrders(rows, soldContract);
  const stages = pipelineStages(rows);
  const mi = marginImpact(rows, baseMarginPct);
  const drivers = byDriver(rows);
  const maxStage = Math.max(1, ...stages.map((s) => s.revenueM));
  const maxDrv = Math.max(1, ...drivers.map((d) => d.revenueM));
  const STAGE_COLOR: Record<string, string> = {
    Anticipated: 'bg-slate-300', 'Under analysis': 'bg-sky-300', Priced: 'bg-amber-300', Executed: 'bg-emerald-400', Complete: 'bg-emerald-600',
  };

  return (
    <div className="mb-5 space-y-4">
      {/* KPI strip — summary rollup + funding outcome read as one block */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Cell label="Change orders" value={String(sum.count)} sub={`${sum.executed} executed · ${sum.pending} in pipeline`} />
        <Cell label="Net margin add" value={fM(sum.netMarginM)} tone={sum.netMarginM >= 0 ? 'ok' : 'bad'} sub={`blended ${fPct(sum.blendedMarginPct)}`} />
        <Cell label="Cost / revenue" value={`${fM(sum.totalCostM)} / ${fM(sum.totalRevenueM)}`} sub="change book" />
        <Cell label="Schedule added" value={`${sum.scheduleDays > 0 ? '+' : ''}${sum.scheduleDays} days`} tone={sum.scheduleDays > 0 ? 'warn' : undefined} />
        <Cell label="Revised contract" value={fM(sum.revisedContractM)} sub={`${sum.contractGrowthPct != null && sum.contractGrowthPct >= 0 ? '+' : ''}${fPct(sum.contractGrowthPct)} vs sold`} />
        <div className="rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-emerald-800">Funded · recoverable</p>
          <p className="text-base font-semibold tabular-nums text-emerald-700">{fM(sum.fundedRevenueM)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{sum.fundedCount} change order{sum.fundedCount === 1 ? '' : 's'} · customer-funded</p>
        </div>
        <div className="rounded-md border border-orange-200 bg-orange-50/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-orange-800">Absorbed · unfunded</p>
          <p className="text-base font-semibold tabular-nums text-orange-700">−{fM(sum.absorbedCostM)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{sum.absorbedCount} change{sum.absorbedCount === 1 ? '' : 's'} · straight margin hit</p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-amber-800">At risk · in negotiation</p>
          <p className="text-base font-semibold tabular-nums text-amber-700">{fM(sum.revenueAtRiskM)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{sum.openCount} trend{sum.openCount === 1 ? '' : 's'} · {sum.avgRecoveryPct == null ? '—' : `${sum.avgRecoveryPct.toFixed(0)}% avg recovery`}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* Status pipeline */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status pipeline</h4>
          <div className="mt-3 space-y-2">
            {stages.map((s) => (
              <div key={s.stage} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">{s.stage}</span>
                <div className="flex h-4 flex-1 items-center rounded bg-muted/40">
                  <div className={`h-4 rounded ${STAGE_COLOR[s.stage] ?? 'bg-slate-300'}`} style={{ width: `${Math.max(s.revenueM > 0 ? 6 : 0, (s.revenueM / maxStage) * 100)}%` }} />
                </div>
                <span className="shrink-0 text-right tabular-nums text-muted-foreground">{s.count} · {fM(s.revenueM)}</span>
              </div>
            ))}
            {sum.absorbedCount > 0 && (
              <div className="flex items-center gap-2 border-t pt-2 text-xs">
                <span className="w-24 shrink-0 font-medium text-orange-800">Absorbed</span>
                <div className="flex h-4 flex-1 items-center rounded bg-muted/40">
                  <div className="h-4 rounded bg-orange-400" style={{ width: `${Math.max(6, (sum.absorbedCostM / Math.max(maxStage, sum.absorbedCostM)) * 100)}%` }} />
                </div>
                <span className="shrink-0 text-right tabular-nums text-muted-foreground">{sum.absorbedCount} · −{fM(sum.absorbedCostM)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Margin impact */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin impact</h4>
          <p className={`mt-3 text-sm font-semibold ${mi.accretive ? 'text-emerald-700' : 'text-amber-600'}`}>
            Changes are {mi.accretive ? 'accretive' : 'dilutive'} to margin
          </p>
          <div className="mt-2 flex items-end gap-4 text-sm">
            <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Base margin</span><p className="font-mono font-semibold tabular-nums">{fPct(mi.baseMarginPct)}</p></div>
            <span className="pb-1 text-muted-foreground">{mi.accretive ? '→' : '→'}</span>
            <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Blended change margin</span><p className={`font-mono font-semibold tabular-nums ${mi.accretive ? 'text-emerald-700' : 'text-amber-600'}`}>{fPct(mi.blendedChangeMarginPct)}</p></div>
            <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Delta</span><p className={`font-mono font-semibold tabular-nums ${(mi.deltaPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{mi.deltaPct == null ? '—' : `${mi.deltaPct >= 0 ? '+' : ''}${mi.deltaPct.toFixed(1)} pts`}</p></div>
          </div>
          {mi.dilutive.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <p className="text-[11px] text-muted-foreground">{mi.dilutive.length} CO{mi.dilutive.length > 1 ? 's' : ''} below base margin:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {mi.dilutive.slice(0, 6).map((d) => (
                  <span key={d.co_id} className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[11px] text-amber-900">{d.co_id} · {(d.marginPct ?? 0).toFixed(0)}%</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* By driver */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">By driver</h4>
          <div className="mt-3 space-y-2">
            {drivers.map((d) => (
              <div key={d.category} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground/80">{d.category}</span>
                  <span className="shrink-0 text-right tabular-nums text-muted-foreground">{d.count} · {fM(d.revenueM)}{d.scheduleDays > 0 ? ` · +${d.scheduleDays}d` : ''}</span>
                </div>
                <div className="mt-1 flex h-4 w-full items-center rounded bg-muted/40">
                  <div className="h-4 rounded bg-sky-400" style={{ width: `${Math.max(6, (d.revenueM / maxDrv) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
