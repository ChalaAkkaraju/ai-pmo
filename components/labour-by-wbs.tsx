/**
 * Labour hours & cost by WBS phase — which phase is burning hours against plan.
 * Resource assignments link to tasks, tasks to the WBS, so hours and labour cost
 * roll up to the WBS Level-2 phase. Display only.
 */
import type { LabourByWbsRow } from '@/lib/cost-commitment';
import type { WorkPackage } from './wbs-canonical-tree';

const hrs = (n: number) => `${Math.round(n).toLocaleString()} h`;
function money(n: number): string {
  const m = n / 1_000_000;
  return m >= 0.01 ? `$${m.toFixed(2)}M` : `$${Math.round(n / 1000)}k`;
}

export function LabourByWbs({ rows, workPackages }: { rows: LabourByWbsRow[]; workPackages: WorkPackage[] }) {
  const data = rows.filter((r) => r.plannedHours > 0 || r.actualHours > 0);
  if (data.length === 0) return null;
  const nameByCode = new Map(workPackages.map((w) => [w.wbs_code, w.name]));
  const tot = data.reduce((t, d) => ({ planned: t.planned + d.plannedHours, actual: t.actual + d.actualHours, cost: t.cost + d.cost }), { planned: 0, actual: 0, cost: 0 });

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Labour hours &amp; cost by WBS phase</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Planned vs actual hours and labour cost per phase · productivity = planned ÷ actual hours to date.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Phase</th>
              <th className="px-3 py-2 text-right">Planned</th>
              <th className="px-3 py-2 text-right">Actual</th>
              <th className="px-3 py-2 text-right">Labour cost</th>
              <th className="px-3 py-2 text-center">Productivity</th>
            </tr>
          </thead>
          <tbody className="divide-y [&>tr:nth-child(even)]:bg-muted/50">
            {data.map((d) => {
              const pi = d.productivity;
              const piTone = pi == null ? 'text-muted-foreground' : pi >= 1.0 ? 'text-emerald-700' : pi < 0.95 ? 'text-red-600' : 'text-amber-700';
              return (
                <tr key={d.phase} className="hover:bg-muted/70">
                  <td className="px-4 py-2.5"><span className="font-mono text-xs text-muted-foreground">{d.phase}</span> {nameByCode.get(d.phase) ?? ''}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{hrs(d.plannedHours)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{d.actualHours > 0 ? hrs(d.actualHours) : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{d.cost > 0 ? money(d.cost) : '—'}</td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs ${piTone}`}>{pi == null ? '—' : pi.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="px-4 py-2.5">Total</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">{hrs(tot.planned)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">{hrs(tot.actual)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">{money(tot.cost)}</td>
              <td className="px-3 py-2.5 text-center font-mono text-xs text-muted-foreground">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
