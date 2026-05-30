'use client';

/**
 * 3×3 Probability × Impact risk heat map.
 *
 *   Y-axis (rows, top → bottom): High → Medium → Low probability
 *   X-axis (cols, left → right): Low  → Medium → High   impact
 *
 * Each cell:
 *   - Background tinted by inherent score (P×I product mapped to colour)
 *   - Header showing P×I label + count
 *   - Small coloured dots, one per risk in that bucket, coloured by status
 *   - Hover any dot → tooltip with risk_id + first line of description
 *
 * Sits ABOVE the existing RisksTable on the project Risks tab; the table
 * stays for detail browsing.
 */

interface Risk {
  risk_id: string;
  description: string;
  probability: string;
  impact: string;
  score: number;
  status: string;
}

type Level = 'H' | 'M' | 'L';

const PROB_ROWS: Level[] = ['H', 'M', 'L'];
const IMPACT_COLS: Level[] = ['L', 'M', 'H'];

function cellTint(p: Level, i: Level): string {
  const product = levelToNum(p) * levelToNum(i);
  if (product >= 9) return 'bg-red-100/80 border-red-300';
  if (product >= 6) return 'bg-orange-100/70 border-orange-300';
  if (product >= 4) return 'bg-amber-50 border-amber-200';
  if (product >= 2) return 'bg-emerald-50 border-emerald-200';
  return 'bg-emerald-50/60 border-emerald-200';
}

function levelToNum(l: Level): number {
  return l === 'H' ? 3 : l === 'M' ? 2 : 1;
}

function levelLabel(l: Level): string {
  return l === 'H' ? 'High' : l === 'M' ? 'Med' : 'Low';
}

function dotClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s.startsWith('realised')) return 'bg-red-500 ring-red-600';
  if (s.includes('not materialised')) return 'bg-gray-400 ring-gray-500';
  if (s.includes('mitigated')) return 'bg-emerald-500 ring-emerald-600';
  if (s.includes('open') || s.includes('active')) return 'bg-amber-500 ring-amber-600';
  return 'bg-slate-400 ring-slate-500';
}

export function RiskHeatmap({ rows }: { rows: Array<Record<string, unknown>> }) {
  const risks = rows as unknown as Risk[];

  if (risks.length === 0) return null;

  const buckets = new Map<string, Risk[]>();
  for (const r of risks) {
    const p = (r.probability ?? '').toString().toUpperCase().charAt(0);
    const i = (r.impact ?? '').toString().toUpperCase().charAt(0);
    if (!isLevel(p) || !isLevel(i)) continue;
    const key = `${p}-${i}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }

  const statusCounts = { realised: 0, open: 0, mitigated: 0, notMaterialised: 0 };
  for (const r of risks) {
    const s = String(r.status ?? '').toLowerCase();
    if (s.startsWith('realised')) statusCounts.realised++;
    else if (s.includes('not materialised')) statusCounts.notMaterialised++;
    else if (s.includes('mitigated')) statusCounts.mitigated++;
    else if (s.includes('open') || s.includes('active')) statusCounts.open++;
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Risk heat map</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {risks.length} risk{risks.length === 1 ? '' : 's'} plotted by probability × impact. Cell tint = inherent score.
          </p>
        </div>
        <Legend counts={statusCounts} />
      </div>

      <div className="flex">
        <div className="flex w-6 items-center justify-center pb-6 pr-1">
          <span className="rotate-180 text-[10px] font-medium uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl]">
            Probability →
          </span>
        </div>

        <div className="flex-1">
          <div className="ml-12 mb-1 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-muted-foreground">
            {IMPACT_COLS.map((c) => (
              <div key={c}>Impact {levelLabel(c)}</div>
            ))}
          </div>

          {PROB_ROWS.map((p) => (
            <div key={p} className="mb-2 flex items-stretch gap-2">
              <div className="flex w-10 items-center justify-end pr-1 text-[11px] font-medium text-muted-foreground">
                {levelLabel(p)}
              </div>
              <div className="grid flex-1 grid-cols-3 gap-2">
                {IMPACT_COLS.map((i) => {
                  const key = `${p}-${i}`;
                  const cellRisks = buckets.get(key) ?? [];
                  return (
                    <Cell
                      key={key}
                      probability={p}
                      impact={i}
                      risks={cellRisks}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="ml-12 mt-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Impact →
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({
  probability,
  impact,
  risks,
}: {
  probability: Level;
  impact: Level;
  risks: Risk[];
}) {
  const tint = cellTint(probability, impact);
  return (
    <div className={`relative flex h-32 flex-col rounded-md border ${tint} p-2`}>
      {/* tiny corner label */}
      <span className="absolute left-2 top-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {probability}×{impact}
      </span>

      {risks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-base text-muted-foreground/40">—</div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          {/* big centered count */}
          <span className="text-3xl font-bold leading-none tabular-nums text-foreground">
            {risks.length}
          </span>
          {/* centered dot cluster, one per risk, coloured by status */}
          <div className="flex max-w-[88%] flex-wrap items-center justify-center gap-1.5">
            {risks.map((r) => (
              <span
                key={r.risk_id}
                className={`inline-block h-3 w-3 rounded-full ring-1 ${dotClass(r.status)}`}
                title={`${r.risk_id} (${r.status}) — ${r.description.slice(0, 100)}${r.description.length > 100 ? '…' : ''}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({
  counts,
}: {
  counts: { realised: number; open: number; mitigated: number; notMaterialised: number };
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      <LegendDot className="bg-amber-500 ring-amber-600" label="Open" count={counts.open} />
      <LegendDot className="bg-red-500 ring-red-600" label="Realised" count={counts.realised} />
      <LegendDot className="bg-emerald-500 ring-emerald-600" label="Mitigated" count={counts.mitigated} />
      <LegendDot className="bg-gray-400 ring-gray-500" label="Not materialised" count={counts.notMaterialised} />
    </div>
  );
}

function LegendDot({ className, label, count }: { className: string; label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ring-1 ${className}`} />
      <span>{label}</span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </span>
  );
}

function isLevel(s: string): s is Level {
  return s === 'H' || s === 'M' || s === 'L';
}
