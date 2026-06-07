import { computeIssueHealth, type IssueRow } from '@/lib/issue-metrics';
import { fmtUsd } from '@/lib/risk-emv';

/**
 * Issue health for a project: open count by severity, aging distribution
 * (on-track / at-risk / overdue), oldest open, mean-time-to-resolve, open-issue
 * cost exposure, and escalation count. The issue analog of the risk exposure panel.
 */
export function IssueHealthPanel({ issues, currentWeek }: { issues: Array<Record<string, unknown>>; currentWeek: number }) {
  const h = computeIssueHealth(issues as unknown as IssueRow[], currentWeek);
  if (h.open === 0 && h.mttr == null) return null;
  const total = h.onTrack + h.atRisk + h.overdue || 1;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Issue health</h3>
        {h.needsEscalation > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">{h.needsEscalation} need escalation</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open issues" value={String(h.open)} sub={`${h.openH}H · ${h.openM}M · ${h.openL}L`} />
        <Stat label="Overdue" value={String(h.overdue)} accent={h.overdue > 0 ? 'rose' : undefined} sub={`${h.atRisk} at risk`} />
        <Stat label="Oldest open" value={`${h.oldestOpenAge}w`} />
        <Stat label="Mean time to resolve" value={h.mttr != null ? `${h.mttr.toFixed(1)}w` : '—'} />
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Open-issue aging</span>
          <span>{h.onTrack} on track · {h.atRisk} at risk · {h.overdue} overdue</span>
        </div>
        <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-500" style={{ width: `${(h.onTrack / total) * 100}%` }} />
          <div className="h-full bg-amber-500" style={{ width: `${(h.atRisk / total) * 100}%` }} />
          <div className="h-full bg-rose-500" style={{ width: `${(h.overdue / total) * 100}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Open-issue cost exposure {fmtUsd(h.openCostExposure)}{h.escalated > 0 ? ` · ${h.escalated} escalated` : ''}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-md border bg-background p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-semibold ${accent === 'rose' ? 'text-rose-600' : ''}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
