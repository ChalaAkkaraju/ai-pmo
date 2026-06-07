/**
 * Labour productivity — planned vs actual hours (to date), the productivity
 * index, blended rate, and labour cost. The hours behind the labour cost
 * element, tying the resource view to earned value. Display only.
 */
import type { LabourProductivity } from '@/lib/cost-commitment';

const hrs = (n: number) => `${Math.round(n).toLocaleString()} h`;
function pct(n: number | null, signed = false): string {
  if (n == null) return '—';
  const v = n * 100;
  return `${signed && v >= 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
}
function money(n: number): string {
  const m = n / 1_000_000;
  return m >= 0.01 ? `$${m.toFixed(2)}M` : `$${Math.round(n / 1000)}k`;
}

export function LabourProductivityPanel({ p }: { p: LabourProductivity }) {
  if (!p.ready) return null;
  const pi = p.productivityIndex;
  const piTone = pi == null ? 'text-foreground' : pi >= 1.0 ? 'text-emerald-700' : pi < 0.95 ? 'text-red-600' : 'text-amber-700';
  const varTone = p.hoursVarPct == null ? 'text-foreground' : p.hoursVarPct > 0 ? 'text-red-600' : 'text-emerald-700';

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">Labour productivity</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Planned vs actual hours to date, with the labour rate behind the cost. Productivity = planned ÷ actual hours (≥1 is efficient).</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Kpi label="Productivity index" value={pi == null ? '—' : pi.toFixed(2)} cls={piTone} sub="planned ÷ actual hours" />
        <Kpi label="Hours variance" value={pct(p.hoursVarPct, true)} cls={varTone} sub={`${hrs(p.actualHoursToDate)} of ${hrs(p.plannedHoursToDate)}`} />
        <Kpi label="Blended rate" value={p.blendedRate == null ? '—' : `$${Math.round(p.blendedRate)}/h`} sub="actual cost ÷ hours" />
        <Kpi label="Actual hours" value={hrs(p.actualHoursToDate)} sub="to date" />
        <Kpi label="Labour cost" value={money(p.labourCostToDate)} sub="hours × rate" />
        <Kpi label="Total planned" value={hrs(p.totalPlannedHours)} sub="full project" />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, cls = 'text-foreground' }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
