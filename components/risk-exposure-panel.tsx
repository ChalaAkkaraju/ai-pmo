import { computeExposure, contingencyAdequacy, contingencyEstimate, forecastAccuracy, fmtUsd, type RiskRow } from '@/lib/risk-emv';

/**
 * Quantitative risk exposure for a project: live EMV (inherent → residual),
 * mitigation burndown, opportunity upside, residual exposure vs contingency,
 * a risk-based P50/P80 contingency size, and EMV forecast accuracy on realised
 * risks. Pure render from the enriched risk rows.
 */
export function RiskExposurePanel({
  risks, contingency, consumed,
}: {
  risks: Array<Record<string, unknown>>;
  contingency: number;
  consumed: number;
}) {
  const rows = risks as unknown as RiskRow[];
  const exp = computeExposure(rows);
  if (exp.liveThreats === 0 && exp.opportunityUpside === 0 && exp.realisedCost === 0) return null;

  const adq = contingencyAdequacy(exp.residualEmv, contingency, consumed);
  const sizing = contingencyEstimate(rows);
  const fa = forecastAccuracy(rows);
  const bandColor = adq.band === 'Adequate' ? 'text-emerald-600' : adq.band === 'Tight' ? 'text-amber-600' : 'text-rose-600';
  const barColor = adq.band === 'Adequate' ? 'bg-emerald-500' : adq.band === 'Tight' ? 'bg-amber-500' : 'bg-rose-500';
  const covPct = adq.remaining > 0 ? Math.min(100, (adq.residualExposure / adq.remaining) * 100) : 100;
  const burndownPct = exp.inherentEmv > 0 ? Math.round((exp.residualEmv / exp.inherentEmv) * 100) : 0;
  const reduction = Math.round(exp.reductionPct * 100);
  const p80Covered = contingency >= sizing.p80;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Risk exposure — Expected Monetary Value</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bandColor}`}>Contingency cover: {adq.band}</span>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* KPIs — 3 across (two rows) */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Live threats" value={String(exp.liveThreats)} />
          <Stat label="Inherent EMV" value={fmtUsd(exp.inherentEmv)} />
          <Stat label="Residual EMV" value={fmtUsd(exp.residualEmv)} accent="emerald" sub={`${reduction}% bought down`} />
          <Stat label="Opportunity upside" value={fmtUsd(exp.opportunityUpside)} accent="emerald" />
          <Stat label="P50 reserve (expected)" value={fmtUsd(sizing.p50)} sub="Σ EMV of live threats" />
          <Stat label="P80 reserve (recommended)" value={fmtUsd(sizing.p80)} accent={p80Covered ? 'emerald' : 'rose'} sub={p80Covered ? 'held contingency covers P80' : `held ${fmtUsd(contingency)} < P80`} />
          {fa.n > 0 && (
            <Stat label="EMV forecast accuracy" value={`${Math.round(fa.ratio * 100)}%`} accent={fa.ratio <= 1.1 ? 'emerald' : 'rose'} sub={`${fmtUsd(fa.actual)} actual vs ${fmtUsd(fa.predicted)} predicted (${fa.n})`} />
          )}
        </div>

        {/* Bars — second half */}
        <div className="space-y-4 lg:border-l lg:pl-4">
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Mitigation burndown (inherent → residual)</span>
              <span>{fmtUsd(exp.residualEmv)} of {fmtUsd(exp.inherentEmv)}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-rose-200" title="green = exposure already mitigated away">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${100 - burndownPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Residual exposure vs contingency remaining</span>
              <span>{fmtUsd(adq.residualExposure)} vs {fmtUsd(adq.remaining)} left</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${covPct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Contingency ${(contingency / 1_000_000).toFixed(2)}M · drawn {fmtUsd(consumed)}
              {exp.realisedCost > 0 ? ` · realised risk cost ${fmtUsd(exp.realisedCost)}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  const color = accent === 'emerald' ? 'text-emerald-600' : accent === 'rose' ? 'text-rose-600' : '';
  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
