/**
 * Purchase orders by WBS — the commitment detail behind the cost card. Grouped
 * by WBS Level-2 phase, open commitment first. Open = po_value − received.
 */
import type { PoRow } from '@/lib/cost-commitment';
import type { WorkPackage } from './wbs-canonical-tree';

function money(n: number): string {
  const m = n / 1_000_000;
  return m >= 0.01 || m <= -0.01 ? `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(2)}M` : `$${Math.round(n / 1000)}k`;
}

const STATUS_CLS: Record<string, string> = {
  Open: 'bg-violet-100 text-violet-700',
  'Partially received': 'bg-amber-100 text-amber-700',
  Closed: 'bg-emerald-100 text-emerald-700',
};

export function PoTable({ pos, workPackages }: { pos: PoRow[]; workPackages: WorkPackage[] }) {
  if (!pos || pos.length === 0) return null;
  const nameByCode = new Map(workPackages.map((w) => [w.wbs_code, w.name]));
  const branchOf = (wbs: string | null | undefined) => { const p = String(wbs ?? '').split('.'); return p.length >= 2 ? `${p[0]}.${p[1]}` : String(wbs ?? ''); };
  const open = (po: PoRow) => (String(po.status) === 'Closed' ? 0 : Math.max(0, Number(po.po_value) - Number(po.received_value)));

  const rows = [...pos].sort((a, b) => open(b) - open(a));

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Purchase orders by WBS</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Commitment detail — open commitment leads. Received value has been goods-receipted into actual cost.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">PO</th>
              <th className="px-3 py-2 text-left">Vendor</th>
              <th className="px-3 py-2 text-left">WBS phase</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="px-3 py-2 text-right">Received</th>
              <th className="px-3 py-2 text-right">Open</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((po, i) => {
              const br = branchOf(po.wbs_code);
              return (
                <tr key={`${po.po_number}-${i}`} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{po.po_number}</td>
                  <td className="px-3 py-2">{po.vendor}</td>
                  <td className="px-3 py-2"><span className="font-mono text-xs text-muted-foreground">{br}</span> {nameByCode.get(br) ?? ''}</td>
                  <td className="px-3 py-2 text-xs">{po.value_category}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{money(Number(po.po_value))}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{money(Number(po.received_value))}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-violet-600">{money(open(po))}</td>
                  <td className="px-3 py-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[String(po.status)] ?? 'bg-muted'}`}>{po.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
