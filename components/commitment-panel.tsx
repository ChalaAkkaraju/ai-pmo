/**
 * Commitment summary — the open-PO commitment layer of the SAP PS cost cycle
 * (Budget → Commitment → Actual). Open commitment, cost-to-date (actual +
 * committed), committed share of budget, and a commitment-aware EAC. Sits on
 * the Commitment tab above the PO detail table. Display only.
 */
import type { EvMetrics } from '@/lib/earned-value';
import { commitmentAwareEac, costToDate, type CommitmentSummary } from '@/lib/cost-commitment';

function money(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(2)}M`;
}
const pct = (n: number | null) => (n == null ? '—' : `${(n * 100).toFixed(0)}%`);

const CAT_COLOR: Record<string, string> = {
  'Materials/Equipment': '#3b82f6', Subcontract: '#8b5cf6', 'Travel & expenses': '#f59e0b', Other: '#94a3b8', Labour: '#10b981',
};

export function CommitmentPanel({ metrics, commitment }: { metrics: EvMetrics; commitment: CommitmentSummary }) {
  const { bac, ev, ac, cpi, eac } = metrics;
  const open = commitment.openCommitment;
  const ctd = costToDate(ac, open);
  const committedPct = bac > 0 ? (ac + open) / bac : 0;
  const eacCommit = commitmentAwareEac(bac, ev, ac, cpi, open);
  const maxOpen = Math.max(1, ...commitment.byCategory.map((c) => c.open));

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-5 py-3">
        <p className="text-sm font-semibold">Commitment</p>
        <p className="text-xs text-muted-foreground">Budget → commitment → actual · {commitment.poCount} POs, {commitment.openCount} open · open = ordered − received · cost from SAP PS</p>
      </div>
      <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-4">
        <Kpi label="Open commitment" value={money(open)} sub={`${commitment.openCount} open POs`} accent="#8b5cf6" />
        <Kpi label="Cost to date" value={money(ctd)} sub="actual + committed" />
        <Kpi label="Committed of budget" value={pct(committedPct)} sub={`AC ${money(ac)}`} cls={committedPct > 1 ? 'text-red-600' : 'text-foreground'} />
        <Kpi label="EAC (commitment-aware)" value={money(eacCommit)} sub={`vs CPI ${money(eac)}`} cls={eacCommit != null && eacCommit > bac ? 'text-red-600' : 'text-emerald-700'} />
      </div>
      {commitment.byCategory.some((c) => c.open > 0) && (
        <div className="border-t px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Open commitment by category</p>
          <div className="mt-2 space-y-1.5">
            {commitment.byCategory.filter((c) => c.open > 0).map((c) => (
              <div key={c.category} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate">{c.category}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${(c.open / maxOpen) * 100}%`, backgroundColor: CAT_COLOR[c.category] ?? '#8b5cf6' }} />
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-xs text-violet-600">{money(c.open)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
