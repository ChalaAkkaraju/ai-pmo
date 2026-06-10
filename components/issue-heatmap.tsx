import { isOpenIssue, issueAge, sevKey, type IssueRow } from '@/lib/issue-metrics';
import { fmtUsd } from '@/lib/risk-emv';

/**
 * Severity × Age heat map for OPEN issues — the issue analog of the risk P×I
 * heatmap. Rows = severity (H→L), columns = age buckets; cell shows count +
 * cost, tinted redder for high-severity, older issues.
 */
interface Issue extends IssueRow { issue_id: string; description: string; }
const SEV_ROWS = ['H', 'M', 'L'] as const;
const AGE_COLS: { key: string; label: string; lo: number; hi: number }[] = [
  { key: 'a', label: '0–4 wk', lo: 0, hi: 4 },
  { key: 'b', label: '5–12 wk', lo: 5, hi: 12 },
  { key: 'c', label: '13+ wk', lo: 13, hi: Infinity },
];
const sevNum = (s: string) => (s === 'H' ? 3 : s === 'M' ? 2 : 1);
const sevLabel = (s: string) => (s === 'H' ? 'High' : s === 'M' ? 'Med' : 'Low');

function tint(sev: string, colIdx: number): string {
  const heat = sevNum(sev) + colIdx; // 1..5
  if (heat >= 5) return 'bg-red-100/80 border-red-300';
  if (heat >= 4) return 'bg-orange-100/70 border-orange-300';
  if (heat >= 3) return 'bg-amber-50 border-amber-200';
  return 'bg-emerald-50 border-emerald-200';
}

export function IssueHeatmap({ rows, currentWeek }: { rows: Array<Record<string, unknown>>; currentWeek: number }) {
  const issues = (rows as unknown as Issue[]).filter((i) => isOpenIssue(i.status));
  if (issues.length === 0) return null;

  const cell = new Map<string, { count: number; cost: number }>();
  for (const i of issues) {
    const sev = sevKey(i);
    const age = issueAge(i, currentWeek);
    const col = AGE_COLS.find((c) => age >= c.lo && age <= c.hi) ?? AGE_COLS[AGE_COLS.length - 1];
    const key = `${sev}-${col.key}`;
    const c = cell.get(key) ?? { count: 0, cost: 0 };
    c.count++; c.cost += Number(i.cost_impact_usd) || 0;
    cell.set(key, c);
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold">Open issues — severity × age</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{issues.length} open issue{issues.length === 1 ? '' : 's'}; cell shows count + cost. Top-right = severe and ageing.</p>
      <div className="mt-3 flex">
        <div className="flex w-10 items-center justify-center pb-6 pr-1"><span className="rotate-180 text-[10px] font-medium uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl]">Severity →</span></div>
        <div className="flex-1">
          <div className="ml-9 mb-1 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-muted-foreground">
            {AGE_COLS.map((c) => <div key={c.key}>{c.label}</div>)}
          </div>
          {SEV_ROWS.map((sev) => (
            <div key={sev} className="mb-1.5 flex items-stretch gap-1.5">
              <div className="flex w-10 items-center justify-end pr-1 text-[11px] font-medium text-muted-foreground">{sevLabel(sev)}</div>
              <div className="grid flex-1 grid-cols-3 gap-2">
                {AGE_COLS.map((col, ci) => {
                  const c = cell.get(`${sev}-${col.key}`);
                  return (
                    <div key={col.key} className={`relative flex h-12 flex-col items-center justify-center rounded-md border ${tint(sev, ci)} p-1.5`}>
                      {c ? (
                        <>
                          <span className="text-lg font-bold leading-none tabular-nums text-foreground">{c.count}</span>
                          {c.cost > 0 && <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">{fmtUsd(c.cost)}</span>}
                        </>
                      ) : <span className="text-base text-muted-foreground/40">—</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="ml-9 mt-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Age →</div>
        </div>
      </div>
    </div>
  );
}
