/**
 * Cost by WBS phase — the cost tab reconciled to the structure. Per WBS
 * Level-2 phase: budget, actual cost, open commitment, cost-to-date (actual +
 * committed) and billed revenue. The WBS code is the join key across cost,
 * commitment and billing. Display only.
 */
import type { EvBranch } from '@/lib/earned-value';
import type { CommitmentSummary } from '@/lib/cost-commitment';
import type { BillingSummary } from '@/lib/billing';

function money(n: number): string {
  const m = n / 1_000_000;
  return m >= 0.01 || m <= -0.01 ? `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(2)}M` : `$${Math.round(n / 1000)}k`;
}

export function CostByWbs({
  branches, commitment, billing,
}: {
  branches: EvBranch[];
  commitment: CommitmentSummary;
  billing: BillingSummary;
}) {
  const rows = branches.filter((b) => b.bac > 0);
  if (rows.length === 0) return null;
  const openByBranch = new Map(commitment.byBranch.map((b) => [b.branch, b.open]));
  const billedByPhase = new Map(billing.byPhase.map((b) => [b.phase, b.amount]));

  const data = rows.map((b) => {
    const open = openByBranch.get(b.branch) ?? 0;
    return { ...b, open, ctd: b.ac + open, billed: billedByPhase.get(b.branch) ?? 0 };
  }).sort((a, b) => a.branch.localeCompare(b.branch));

  const tot = data.reduce((t, d) => ({
    bac: t.bac + d.bac, ac: t.ac + d.ac, open: t.open + d.open, ctd: t.ctd + d.ctd, billed: t.billed + d.billed,
  }), { bac: 0, ac: 0, open: 0, ctd: 0, billed: 0 });

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Cost by WBS phase</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Budget, actual, commitment and billing reconciled to the structure · cost-to-date = actual + open commitment.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Phase</th>
              <th className="px-3 py-2 text-right">Budget</th>
              <th className="px-3 py-2 text-right">Actual</th>
              <th className="px-3 py-2 text-right">Open commit.</th>
              <th className="px-3 py-2 text-right">Cost to date</th>
              <th className="px-3 py-2 text-right">Billed</th>
            </tr>
          </thead>
          <tbody className="divide-y [&>tr:nth-child(even)]:bg-muted/50">
            {data.map((d) => (
              <tr key={d.branch} className="hover:bg-muted/70">
                <td className="px-4 py-2.5"><span className="font-mono text-xs text-muted-foreground">{d.branch}</span> {d.name}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{money(d.bac)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{money(d.ac)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-violet-600">{d.open > 0 ? money(d.open) : '—'}</td>
                <td className={`px-3 py-2.5 text-right font-mono text-xs ${d.ctd > d.bac ? 'text-red-600' : 'text-foreground'}`}>{money(d.ctd)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-blue-600">{d.billed > 0 ? money(d.billed) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="px-4 py-2.5">Total</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">{money(tot.bac)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">{money(tot.ac)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs text-violet-600">{money(tot.open)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">{money(tot.ctd)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs text-blue-600">{money(tot.billed)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
