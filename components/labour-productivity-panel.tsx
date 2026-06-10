/**
 * Labour productivity — planned vs actual hours (to date), the productivity
 * index, blended rate, and labour cost. The hours behind the labour cost
 * element, tying the resource view to earned value. Display only.
 */
import type { LabourProductivity } from '@/lib/cost-commitment';
import { toneCard, toneText, type KpiTone } from '@/lib/kpi-tone';

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
  const piTone: KpiTone = pi == null ? 'neutral' : pi >= 1.0 ? 'ok' : pi < 0.95 ? 'bad' : 'warn';
  const varTone: KpiTone = p.hoursVarPct == null ? 'neutral' : p.hoursVarPct > 0 ? 'bad' : 'ok';

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">Labour productivity</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Planned vs actual hours to date, with the labour rate behind the cost. Productivity = planned ÷ actual hours (≥1 is efficient).</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Kpi label="Productivity index" value={pi == null ? '—' : pi.toFixed(2)} tone={piTone} sub="planned ÷ actual hours" />
        <Kpi label="Hours variance" value={pct(p.hoursVarPct, true)} tone={varTone} sub={`${hrs(p.actualHoursToDate)} of ${hrs(p.plannedHoursToDate)}`} />
        <Kpi label="Blended rate" value={p.blendedRate == null ? '—' : `$${Math.round(p.blendedRate)}/h`} sub="actual cost ÷ hours" />
        <Kpi label="Actual hours" value={hrs(p.actualHoursToDate)} sub="to date" />
        <Kpi label="Labour cost" value={money(p.labourCostToDate)} sub="hours × rate" />
        <Kpi label="Total planned" value={hrs(p.totalPlannedHours)} sub="full project" />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub?: string; tone?: KpiTone }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${toneCard(tone)}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${toneText(tone)}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
