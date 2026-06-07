import { fmtUsd } from '@/lib/risk-emv';
import type { WorkPackage } from './wbs-canonical-tree';

/**
 * Risk concentration across the WBS — groups enriched risks by their top-level
 * WBS branch and shows count + total EMV, so you can see where in the structure
 * the exposure sits. Risk meets the canonical join key.
 */
export function RiskByWbs({
  risks, workPackages,
}: {
  risks: Array<Record<string, unknown>>;
  workPackages: WorkPackage[];
}) {
  const nameByCode = new Map(workPackages.map((w) => [w.wbs_code, w.name]));
  const branches = new Map<string, { count: number; emv: number }>();
  for (const r of risks) {
    const wbs = r.wbs_code ? String(r.wbs_code) : null;
    if (!wbs) continue;
    const branch = wbs.split('.')[0];
    const b = branches.get(branch) ?? { count: 0, emv: 0 };
    b.count++;
    b.emv += Number(r.emv_usd) || 0;
    branches.set(branch, b);
  }
  if (branches.size === 0) return null;

  const rows = [...branches.entries()].sort((a, b) => b[1].emv - a[1].emv);
  const maxEmv = Math.max(...rows.map(([, v]) => v.emv), 1);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">Risk concentration by WBS branch</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Where the risk EMV sits across the work breakdown structure.</p>
      <div className="mt-3 space-y-1.5">
        {rows.map(([branch, v]) => (
          <div key={branch} className="flex items-center gap-3 text-sm">
            <div className="w-48 shrink-0 truncate" title={nameByCode.get(branch) ?? `WBS ${branch}`}>
              <span className="font-mono text-xs text-muted-foreground">{branch}</span> {nameByCode.get(branch) ?? ''}
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-rose-400" style={{ width: `${(v.emv / maxEmv) * 100}%` }} />
            </div>
            <div className="w-32 shrink-0 text-right font-mono text-xs">{fmtUsd(v.emv)} · {v.count} risk{v.count === 1 ? '' : 's'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
