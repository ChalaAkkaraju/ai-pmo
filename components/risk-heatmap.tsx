import { riskDot } from '@/lib/badge-styles';
import { fmtUsd } from '@/lib/risk-emv';

/**
 * Probability × impact risk heat map. When residual data exists, the inherent
 * (pre-mitigation) and residual (post-mitigation) 3×3 grids are shown side by
 * side so the mitigation effect — risks moving down-left — reads at a glance.
 * Each cell shows its risk count, status dots, and the EMV sitting in it.
 */
interface Risk {
  risk_id: string;
  description: string;
  probability: string;
  impact: string;
  score: number;
  status: string;
  residual_probability?: string | null;
  residual_impact?: string | null;
  emv_usd?: number | null;
  residual_emv_usd?: number | null;
}

type Level = 'H' | 'M' | 'L';
type View = 'inherent' | 'residual';

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
function levelToNum(l: Level): number { return l === 'H' ? 3 : l === 'M' ? 2 : 1; }
function levelLabel(l: Level): string { return l === 'H' ? 'High' : l === 'M' ? 'Med' : 'Low'; }
function isLevel(s: string): s is Level { return s === 'H' || s === 'M' || s === 'L'; }

function cellOf(r: Risk, view: View): string | null {
  const p = ((view === 'residual' ? r.residual_probability : r.probability) ?? r.probability ?? '').toString().toUpperCase().charAt(0);
  const i = ((view === 'residual' ? r.residual_impact : r.impact) ?? r.impact ?? '').toString().toUpperCase().charAt(0);
  if (!isLevel(p) || !isLevel(i)) return null;
  return `${p}-${i}`;
}
function emvOf(r: Risk, view: View): number {
  const v = view === 'residual' ? r.residual_emv_usd ?? r.emv_usd : r.emv_usd;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function RiskHeatmap({ rows }: { rows: Array<Record<string, unknown>> }) {
  const risks = rows as unknown as Risk[];
  if (risks.length === 0) return null;

  const hasResidual = risks.some((r) => r.residual_probability);

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
            {risks.length} risk{risks.length === 1 ? '' : 's'} by probability × impact ·{' '}
            {hasResidual ? 'inherent vs residual (post-mitigation)' : 'inherent position'}. Cell shows count + EMV.
          </p>
        </div>
        <Legend counts={statusCounts} />
      </div>

      {hasResidual ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inherent · pre-mitigation</p>
            <HeatGrid risks={risks} view="inherent" />
          </div>
          <div className="lg:border-l lg:pl-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Residual · post-mitigation</p>
            <HeatGrid risks={risks} view="residual" />
          </div>
        </div>
      ) : (
        <HeatGrid risks={risks} view="inherent" />
      )}
    </div>
  );
}

function HeatGrid({ risks, view }: { risks: Risk[]; view: View }) {
  const buckets = new Map<string, Risk[]>();
  for (const r of risks) {
    const key = cellOf(r, view);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }
  return (
    <div className="flex">
      <div className="flex w-5 items-center justify-center pb-6 pr-1">
        <span className="rotate-180 text-[10px] font-medium uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl]">Probability →</span>
      </div>
      <div className="flex-1">
        <div className="ml-9 mb-1 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-muted-foreground">
          {IMPACT_COLS.map((c) => (<div key={c}>Impact {levelLabel(c)}</div>))}
        </div>
        {PROB_ROWS.map((p) => (
          <div key={p} className="mb-2 flex items-stretch gap-2">
            <div className="flex w-8 items-center justify-end pr-1 text-[11px] font-medium text-muted-foreground">{levelLabel(p)}</div>
            <div className="grid flex-1 grid-cols-3 gap-2">
              {IMPACT_COLS.map((i) => (
                <Cell key={`${p}-${i}`} probability={p} impact={i} risks={buckets.get(`${p}-${i}`) ?? []} view={view} />
              ))}
            </div>
          </div>
        ))}
        <div className="ml-9 mt-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Impact →</div>
      </div>
    </div>
  );
}

function Cell({ probability, impact, risks, view }: { probability: Level; impact: Level; risks: Risk[]; view: View }) {
  const tint = cellTint(probability, impact);
  const emvTotal = risks.reduce((a, r) => a + emvOf(r, view), 0);
  return (
    <div className={`relative flex h-24 flex-col rounded-md border ${tint} p-2`}>
      <span className="absolute left-2 top-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{probability}×{impact}</span>
      {risks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-base text-muted-foreground/40">—</div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1">
          <span className="text-2xl font-bold leading-none tabular-nums text-foreground">{risks.length}</span>
          {emvTotal > 0 && <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{fmtUsd(emvTotal)} EMV</span>}
          <div className="flex max-w-[88%] flex-wrap items-center justify-center gap-1">
            {risks.map((r) => (
              <span
                key={r.risk_id}
                className={`inline-block h-2.5 w-2.5 rounded-full ring-1 ${riskDot(r.status)}`}
                title={`${r.risk_id} (${r.status}) — ${r.description.slice(0, 100)}${r.description.length > 100 ? '…' : ''}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ counts }: { counts: { realised: number; open: number; mitigated: number; notMaterialised: number } }) {
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
