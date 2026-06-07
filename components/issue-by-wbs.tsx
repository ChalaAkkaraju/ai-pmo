import { fmtUsd } from '@/lib/risk-emv';
import { isOpenIssue } from '@/lib/issue-metrics';
import type { WorkPackage } from './wbs-canonical-tree';

/**
 * Issue concentration across the WBS — groups issues by their top-level WBS
 * branch (from linked_wbs) and shows total / open count + open cost impact, so
 * you can see where in the structure problems are landing. Each issue is
 * attributed to its primary (first) linked work package.
 */
export function IssueByWbs({
  issues, workPackages,
}: {
  issues: Array<Record<string, unknown>>;
  workPackages: WorkPackage[];
}) {
  const nameByCode = new Map(workPackages.map((w) => [w.wbs_code, w.name]));
  const branches = new Map<string, { count: number; open: number; cost: number }>();
  for (const i of issues) {
    const linked = Array.isArray(i.linked_wbs) ? (i.linked_wbs as unknown[]) : [];
    const wbs = linked.length ? String(linked[0]) : null;
    if (!wbs) continue;
    const branch = wbs.split('.')[0];
    const b = branches.get(branch) ?? { count: 0, open: 0, cost: 0 };
    b.count++;
    if (isOpenIssue(i.status as string | null | undefined)) {
      b.open++;
      b.cost += Number(i.cost_impact_usd) || 0;
    }
    branches.set(branch, b);
  }
  if (branches.size === 0) return null;

  const rows = [...branches.entries()].sort((a, b) => (b[1].open - a[1].open) || (b[1].cost - a[1].cost));
  const maxOpen = Math.max(...rows.map(([, v]) => v.open), 1);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">Issue concentration by WBS branch</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Where open issues — and their cost impact — sit across the work breakdown structure.</p>
      <div className="mt-3 space-y-1.5">
        {rows.map(([branch, v]) => (
          <div key={branch} className="flex items-center gap-3 text-sm">
            <div className="w-48 shrink-0 truncate" title={nameByCode.get(branch) ?? `WBS ${branch}`}>
              <span className="font-mono text-xs text-muted-foreground">{branch}</span> {nameByCode.get(branch) ?? ''}
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-orange-400" style={{ width: `${(v.open / maxOpen) * 100}%` }} />
            </div>
            <div className="w-40 shrink-0 text-right font-mono text-xs">
              {v.open} open{v.cost > 0 ? ` · ${fmtUsd(v.cost)}` : ''} <span className="text-muted-foreground">/ {v.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
