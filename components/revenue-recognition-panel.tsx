/**
 * Revenue recognition — the EXTERNAL / financial view from Results Analysis,
 * deliberately separate from the managerial earned value on the EV tab.
 * Recognised (calculated) revenue is RA's own posted figure; reconciled against
 * billing it yields WIP (contract asset) or deferred revenue (contract
 * liability). Per WBS phase. Display only.
 */
import type { RaSummary } from '@/lib/results-analysis';
import type { BillingSummary } from '@/lib/billing';
import type { WorkPackage } from './wbs-canonical-tree';

function money(n: number): string {
  const m = n / 1_000_000;
  return m >= 0.01 || m <= -0.01 ? `${m < 0 ? '−' : ''}$${Math.abs(m).toFixed(2)}M` : `$${Math.round(n / 1000)}k`;
}
const pct = (n: number | null) => (n == null ? '—' : `${(n * 100).toFixed(0)}%`);

export function RevenueRecognitionPanel({ ra, billing, workPackages }: { ra: RaSummary; billing: BillingSummary; workPackages: WorkPackage[] }) {
  const nameByCode = new Map(workPackages.map((w) => [w.wbs_code, w.name]));
  if (!ra.ready) {
    return (
      <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        Results Analysis not available yet — needs the RA posting (recognised revenue) from SAP PS.
      </section>
    );
  }
  const wipPositive = ra.wip > 0;

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <div>
          <p className="text-sm font-semibold">Revenue recognition · Results Analysis</p>
          <p className="text-xs text-muted-foreground">{ra.method} · external / audited (IFRS 15) — independent of the managerial earned value on the EV tab</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">Financial view</span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-5">
        <Kpi label="Recognised revenue" value={money(ra.recognisedRevenue)} sub="RA · POC × plan" accent="#0ea5e9" />
        <Kpi label="Cost of sales" value={money(ra.costOfSales)} />
        <Kpi label="Recognised margin" value={money(ra.recognisedMargin)} sub={pct(ra.marginPct)} cls={ra.recognisedMargin < 0 ? 'text-red-600' : 'text-emerald-700'} accent="#10b981" />
        <Kpi label="Billed" value={money(ra.billed)} sub={`${money(billing.paid)} paid`} accent="#3b82f6" />
        <Kpi
          label={wipPositive ? 'Unbilled WIP' : 'Deferred revenue'}
          value={money(wipPositive ? ra.wip : ra.deferred)}
          sub={wipPositive ? 'contract asset' : 'contract liability'}
          cls={wipPositive ? 'text-amber-700' : 'text-red-600'}
        />
      </div>

      {/* Per-phase RA */}
      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Phase</th>
              <th className="px-3 py-2 text-center">POC</th>
              <th className="px-3 py-2 text-right">Recognised</th>
              <th className="px-3 py-2 text-right">Cost of sales</th>
              <th className="px-3 py-2 text-right">Margin</th>
              <th className="px-3 py-2 text-right">Billed</th>
              <th className="px-3 py-2 text-right">WIP / deferred</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ra.byPhase.map((p) => (
              <tr key={p.phase} className="hover:bg-muted/30">
                <td className="px-4 py-2.5"><span className="font-mono text-xs text-muted-foreground">{p.phase}</span> {nameByCode.get(p.phase) ?? ''}</td>
                <td className="px-3 py-2.5 text-center font-mono text-xs">{p.poc.toFixed(0)}%</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{money(p.recognised)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">{money(p.costOfSales)}</td>
                <td className={`px-3 py-2.5 text-right font-mono text-xs ${p.margin < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{money(p.margin)} · {pct(p.marginPct)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-blue-600">{p.billed > 0 ? money(p.billed) : '—'}</td>
                <td className={`px-3 py-2.5 text-right font-mono text-xs ${p.net >= 0 ? 'text-amber-700' : 'text-red-600'}`}>{p.net >= 0 ? money(p.net) : `(${money(-p.net)})`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-[11px] text-muted-foreground">
        WIP = recognised revenue in excess of billings (contract asset); a bracketed figure is deferred revenue / billings in excess (contract liability). RA uses its own cost-based POC, not the earned-value %.
      </p>
    </section>
  );
}

function Kpi({ label, value, sub, cls = 'text-foreground', accent }: { label: string; value: string; sub?: string; cls?: string; accent?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2" style={accent ? { backgroundColor: `${accent}14` } : undefined}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
