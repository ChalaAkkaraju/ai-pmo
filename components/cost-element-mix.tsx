/**
 * Actual cost by element (SAP value category) — where the money went: Labour,
 * Materials/Equipment, Subcontract, Travel & expenses, Other. Shows the actual
 * split as a bar, with open PO commitment per category annotated. Display only.
 */
import type { CommitmentSummary } from '@/lib/cost-commitment';

function money(n: number): string {
  const m = n / 1_000_000;
  return m >= 0.01 || m <= -0.01 ? `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(2)}M` : `$${Math.round(n / 1000)}k`;
}

const CAT_COLOR: Record<string, string> = {
  Labour: '#10b981', 'Materials/Equipment': '#3b82f6', Subcontract: '#8b5cf6', 'Travel & expenses': '#f59e0b', Other: '#94a3b8',
};

export function CostElementMix({
  elements, commitment,
}: {
  elements: { category: string; actual: number; planned: number }[];
  commitment: CommitmentSummary;
}) {
  const totalActual = elements.reduce((s, e) => s + e.actual, 0) || 1;
  const openByCat = new Map(commitment.byCategory.map((c) => [c.category, c.open]));

  return (
    <section className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold">Actual cost by element</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Where the {money(totalActual)} of actual cost went, by SAP value category · open PO commitment shown alongside.</p>
      <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-muted">
        {elements.map((e) => (
          <div key={e.category} title={`${e.category}: ${money(e.actual)}`} style={{ width: `${(e.actual / totalActual) * 100}%`, backgroundColor: CAT_COLOR[e.category] ?? '#94a3b8' }} />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {elements.map((e) => {
          const open = openByCat.get(e.category) ?? 0;
          return (
            <div key={e.category} className="flex items-center gap-3 text-sm">
              <span className="flex w-48 shrink-0 items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLOR[e.category] ?? '#94a3b8' }} />
                {e.category}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${(e.actual / totalActual) * 100}%`, backgroundColor: CAT_COLOR[e.category] ?? '#94a3b8' }} />
              </div>
              <span className="w-44 shrink-0 text-right font-mono text-xs">
                {money(e.actual)} · {((e.actual / totalActual) * 100).toFixed(0)}%
                {open > 0 && <span className="ml-1 text-violet-600">+{money(open)} open</span>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
