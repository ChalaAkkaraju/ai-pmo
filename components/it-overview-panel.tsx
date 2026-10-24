'use client';

/**
 * Overview tab for IT projects — business case, portfolio position, gate
 * position and the registers at a glance. Replaces the revenue OverviewPanel
 * (EV / margin bridge) which has no meaning for an overhead project.
 */

import type { GatesPanelProps } from './gates-panel';
import { commitStage, isCommitted, stageAt } from '@/lib/stage-gates';
import { bucketLabel, bucketStyle, categoryLabel, fmtMoney, lifecycleLabel, rankingScore, recomputeCase, valueTypeLabel } from '@/lib/it-portfolio';
import { BenefitsPanel, ContinuationRequestPanel, DisplacementPanel } from './it-governance-panels';
import { bodyLabel } from './decisions-panel';

export function ItOverviewPanel({ gates, risks, issues, actions, changeOrders, go, projectCode, canWrite }: {
  gates: GatesPanelProps['gates'];
  risks: Array<Record<string, unknown>>;
  issues: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  changeOrders: Array<Record<string, unknown>>;
  go: (tab: string) => void;
  projectCode: string;
  canWrite: boolean;
}) {
  const { project, template, decisions, sanctionEvents } = gates;
  const openRecords = gates.records.filter((r) => r.status === 'proposed');
  const running = project.lifecycle_status === 'active' || project.lifecycle_status === 'on_hold' || project.lifecycle_status === 'approved';
  const latestHold = [...decisions].filter((d) => d.decision === 'hold').sort((a, b) => (a.decided_on < b.decided_on ? 1 : -1))[0] ?? null;
  const bc = project.business_case;
  const current = stageAt(template, project.current_stage ?? 0);
  const commit = commitStage(template);
  const committed = isCommitted(template, decisions);
  const committedBudget = Number(project.approved_budget_current) > 0 ? Number(project.approved_budget_current) : project.requested_budget;
  const derived = recomputeCase(committedBudget, bc?.annual_benefit ?? null);
  const score = rankingScore(bc, project.requested_budget);
  const baseline = sanctionEvents.filter((e) => e.kind === 'sg1_baseline').sort((a, b) => b.version - a.version)[0] ?? null;
  const openIssues = issues.filter((i) => i.status === 'Open' || i.status === 'In progress').length;
  const activeRisks = risks.filter((r) => String(r.status ?? '').startsWith('Active')).length;
  const openActions = actions.filter((a) => a.status !== 'Done').length;
  const openCos = changeOrders.filter((c) => !['Approved', 'Absorbed', 'Withdrawn'].includes(String(c.status))).length;
  const coTotal = changeOrders.filter((c) => c.status === 'Approved').reduce((n, c) => n + (Number(c.cost_impact_m) || 0) * 1_000_000, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${bucketStyle(project.portfolio_bucket).accentBar}`} />
        <h3 className="pl-2 text-base font-semibold">Business case</h3>
        {!bc ? (
          <p className="mt-2 text-sm text-muted-foreground">No business case recorded.</p>
        ) : (
          <>
            <p className="mt-2 text-sm">{bc.benefit_summary}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Value type" value={valueTypeLabel(bc.value_type)} accent={({ hard_savings: '#059669', soft_benefit: '#0284c7', risk_reduction: '#7c3aed', enablement: '#4f46e5', compliance: '#d97706' } as Record<string, string>)[bc.value_type ?? ''] ?? '#64748b'} />
              <Stat label="Requested" value={fmtMoney(project.requested_budget)} sub={project.fiscal_year ? `FY${project.fiscal_year}` : undefined} accent="#4f46e5" />
              <Stat label="Annual benefit" value={bc.annual_benefit != null ? fmtMoney(bc.annual_benefit) : '—'} sub="per year, steady state" accent="#059669" />
              <Stat label="Strategic score" value={bc.strategic_score != null ? `${bc.strategic_score}/100` : '—'} accent="#d97706" />
              <Stat label="3-yr ROI" value={derived.roi_pct != null ? `${derived.roi_pct}%` : '—'} sub={Number(project.approved_budget_current) > 0 ? 'on the locked baseline' : 'on the requested budget'} accent={derived.roi_pct != null && derived.roi_pct < 0 ? '#dc2626' : '#059669'} />
              <Stat label="Payback" value={derived.payback_months != null ? `${derived.payback_months} mo` : '—'} accent="#0284c7" />
              <Stat label="Capital share" value={bc.capex_share_pct != null ? `${bc.capex_share_pct}%` : '—'} sub={bc.capex_share_pct != null ? `${100 - bc.capex_share_pct}% expensed` : undefined} accent="#7c3aed" />
              <Stat label="Ranking score" value={score ? String(score) : '—'} sub="0.5 strategic + 0.5 ROI" accent="#0f766e" />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Benefits owner: {bc.benefits_owner ?? '— not named'} · Sponsor: {project.client}</p>
          </>
        )}
      </section>

      <section className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/60 via-white to-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">Portfolio & gate position</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Bucket" value={bucketLabel(project.portfolio_bucket)} />
          <Row label="Category" value={categoryLabel(project.project_category)} />
          <Row label="Fiscal year" value={project.fiscal_year ? `FY${project.fiscal_year}` : '—'} />
          <Row label="Approved for" value={project.fiscal_years_approved?.length ? project.fiscal_years_approved.map((y) => `FY${y}`).join(', ') : 'not yet'} />
          <Row label="Lifecycle" value={lifecycleLabel(project.lifecycle_status)} />
          <Row label="Stage" value={current ? `${current.seq}. ${current.name} — ${current.gate_name}` : '—'} />
          <Row label="Baseline" value={committed && baseline ? `${fmtMoney(baseline.amount)} at ${commit?.gate_name ?? 'commit'}` : 'not yet locked'} />
          {committed && baseline && Number(project.approved_budget_current) !== Number(baseline.amount) && <Row label="Current budget" value={`${fmtMoney(project.approved_budget_current)} after ${fmtMoney(Number(project.approved_budget_current) - Number(baseline.amount))} of approved changes`} />}
        </dl>
        <button type="button" onClick={() => go('gates')} className="mt-4 w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background shadow-sm transition hover:opacity-90">Open gates →</button>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:col-span-3 sm:grid-cols-5">
        {(() => { const mine = openRecords.filter((r) => gates.gov.myBodyKeys.includes(r.required_body_key) || (r.required_concurrences ?? []).some((k) => gates.gov.myBodyKeys.includes(k) && !(r.concurrences ?? []).some((c) => c.body_key === k && c.outcome === 'concur'))).length;
          return <Tile label={mine > 0 ? 'Awaiting your decision' : 'Awaiting decision'} value={mine > 0 ? mine : openRecords.length} sub={mine > 0 ? `${openRecords.length} open in total` : openRecords[0] ? `with ${bodyLabel(gates.gov.bodies, openRecords[0].required_body_key)}` : undefined} onClick={() => go('gates')} tone={mine > 0 ? 'ok' : 'info'} />; })()}
        <Tile label="Active risks" value={activeRisks} onClick={() => go('risks')} tone="warn" />
        <Tile label="Open issues" value={openIssues} onClick={() => go('risks')} tone="warn" />
        <Tile label="Open change orders" value={openCos} sub={coTotal ? `${fmtMoney(coTotal)} approved · ${fmtMoney(baseline ? Number(project.approved_budget_current) - Number(baseline.amount) : 0)} added to budget` : undefined} onClick={() => go('cos')} tone="warn" />
        <Tile label="Open actions" value={openActions} />
      </section>

      {project.lifecycle_status === 'on_hold' && latestHold && (
        <section className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 text-sm lg:col-span-3">
          <strong>On hold</strong> since {latestHold.decided_on}{latestHold.hold_until ? <> · time box expires <strong>{latestHold.hold_until}</strong>{new Date(latestHold.hold_until) < new Date() ? <span className="ml-1 text-red-700">— expired: re-enter through the continuation gate or cancel</span> : null}</> : null}{latestHold.notes ? <span className="text-muted-foreground"> · {latestHold.notes}</span> : null}
        </section>
      )}

      {running && (
        <div className="lg:col-span-3">
          <ContinuationRequestPanel projectCode={projectCode} currentFy={project.fiscal_year} approvedYears={project.fiscal_years_approved ?? []} requested={project.requested_budget} canWrite={canWrite} />
        </div>
      )}
      <div className="lg:col-span-3">
        <DisplacementPanel projectCode={projectCode} rows={gates.displacements} canWrite={canWrite} />
      </div>
      {(project.lifecycle_status === 'closed' || gates.benefits.length > 0) && (
        <div className="lg:col-span-3">
          <BenefitsPanel projectCode={projectCode} rows={gates.benefits} plannedAnnual={bc?.annual_benefit ?? null} owner={bc?.benefits_owner ?? null} canWrite={canWrite} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-md border bg-white/80 p-2.5" style={accent ? { backgroundColor: `${accent}12`, borderColor: `${accent}55` } : undefined}>
      <dt className="text-[10px] font-medium uppercase tracking-wider" style={accent ? { color: accent } : undefined}>{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-[10px] text-muted-foreground">{sub}</dd>}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed pb-1.5 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
function Tile({ label, value, sub, onClick, tone = 'neutral' }: { label: string; value: number; sub?: string; onClick?: () => void; tone?: 'neutral' | 'warn' | 'info' | 'ok' }) {
  const cls = tone === 'warn' && value > 0 ? 'border-amber-300 bg-amber-50/60' : tone === 'info' && value > 0 ? 'border-sky-200 bg-sky-50/60' : tone === 'ok' ? 'border-emerald-200 bg-emerald-50/50' : 'bg-card';
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border p-4 text-left transition hover:border-foreground/30 hover:shadow-sm ${cls}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </button>
  );
}
