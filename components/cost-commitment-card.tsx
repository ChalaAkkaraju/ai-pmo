/**
 * Cost & commitment — the SAP PS cost layer beside earned value. Shows open
 * commitment (from POs), cost-to-date (actual + committed), a commitment-aware
 * EAC, and the cost-element (value-category) mix of actuals. Display only.
 */
import type { EvMetrics } from '@/lib/earned-value';
import { commitmentAwareEac, costToDate, type CommitmentSummary } from '@/lib/cost-commitment';

function money(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(2)}M`;
}
function pct(n: number | null): string {
  return n == null ? '—' : `${(n * 100).toFixed(0)}%`;
}

const CAT_COLOR: Record<string, string> = {
  Labour: '#10b981',
  'Materials/Equipment': '#3b82f6',
  Subcontract: '#8b5cf6',
  'Travel & expenses': '#f59e0b',
  Other: '#94a3b8',
};

export function CostCommitmentCard({
  metrics, commitment, elements,
}: {
  metrics: EvMetrics;
  commitment: CommitmentSummary;
  elements: { category: string; actual: number; planned: number }[];
}) {
  const { bac, ev, ac, cpi, eac } = metrics;
  const open = commitment.openCommitment;
  const ctd = costToDate(ac, open);
  const committedPct = bac > 0 ? (ac + open) / bac : 0;
  const eacCommit = commitmentAwareEac(bac, ev, ac, cpi, open);
  const totalActual = elements.reduce((s, e) => s + e.actual, 0) || 1;
  const hasPos = commitment.poCount > 0;

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <div>
          <p className="text-sm font-semibold">Cost &amp; commitment</p>
          <p className="text-xs text-muted-foreground">Budget → commitment → actual · {commitment.poCount} POs, {commitment.openCount} open · cost from SAP PS</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-4">
        <Kpi label="Open commitment" value={money(open)} sub={`${commitment.openCount} open POs`} accent="#8b5cf6" />
        <Kpi label="Cost to date" value={money(ctd)} sub="actual + committed" />
        <Kpi label="Committed of budget" value={pct(committedPct)} sub={`AC ${money(ac)}`} cls={committedPct > 1 ? 'text-red-600' : 'text-foreground'} />
        <Kpi label="EAC (commitment-aware)" value={money(eacCommit)} sub={`vs CPI ${money(eac)}`} cls={eacCommit != null && eacCommit > bac ? 'text-red-600' : 'text-emerald-700'} />
      </div>

      {/* Cost-element mix */}
      <div className="border-t px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actual cost by element</p>
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {elements.map((e) => (
            <div key={e.category} title={`${e.category}: ${money(e.actual)}`} style={{ width: `${(e.actual / totalActual) * 100}%`, backgroundColor: CAT_COLOR[e.category] ?? '#94a3b8' }} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          {elements.map((e) => (
            <span key={e.category} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CAT_COLOR[e.category] ?? '#94a3b8' }} />
              {e.category} <span className="font-mono text-muted-foreground">{money(e.actual)} · {((e.actual / totalActual) * 100).toFixed(0)}%</span>
              {hasPos && commitment.byCategory.find((c) => c.category === e.category && c.open > 0) && (
                <span className="font-mono text-violet-600">+{money(commitment.byCategory.find((c) => c.category === e.category)!.open)} open</span>
              )}
            </span>
          ))}
        </div>
      </div>
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
