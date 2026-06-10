'use client';

import { actionBadge } from '@/lib/badge-styles';
import { useState } from 'react';
import { canonicalRiskStatus, riskStatusBadgeClass } from '@/lib/risk-status';
import { fmtUsd } from '@/lib/risk-emv';

interface Risk {
  risk_id: string;
  category: string;
  description: string;
  probability: string;
  impact: string;
  score: number;
  status: string;
  cross_cutting_class: string;
  pattern_link: string | null;
  response: string;
  owner: string;
  trigger: string;
  // 0024 enrichment
  risk_type?: string | null;
  response_strategy?: string | null;
  probability_pct?: number | null;
  cost_impact_usd?: number | null;
  schedule_impact_days?: number | null;
  emv_usd?: number | null;
  residual_probability?: string | null;
  residual_impact?: string | null;
  residual_score?: number | null;
  residual_probability_pct?: number | null;
  residual_emv_usd?: number | null;
  score_trend?: Array<{ w: number; s: number }> | null;
  // 0025 lifecycle/structure
  wbs_code?: string | null;
  realised_cost_usd?: number | null;
  proximity_weeks?: number | null;
  velocity?: string | null;
  created_via?: string | null;
}

interface ActionItemLite { id: string; source_ref: string | null; description: string; assigned_to_role_type: string; status: string; urgency: string; }
interface IssueLite { issue_id: string; description: string; status: string; linked_risk: string | null; }

const ROLE_LABELS: Record<string, string> = {
  pm: 'Senior PM', procurement: 'Procurement Strategist', risk: 'Risk Analyst', sponsor: 'VP Sponsor',
  commercial: 'Commercial Manager', project_controls: 'Project Controls', program_manager: 'Program Manager',
  engineering_manager: 'Engineering Manager', construction_manager: 'Construction Manager', hse_manager: 'HSE Manager',
};
function roleLabel(rt: string): string { return ROLE_LABELS[rt] ?? rt; }
function isOpportunity(r: Risk): boolean { return (r.risk_type ?? 'threat') === 'opportunity'; }
function isLiveStatus(s: string): boolean { const c = canonicalRiskStatus(s); return c === 'Open' || c === 'Active' || c === 'Mitigated'; }

function TypeBadge({ risk }: { risk: Risk }) {
  const opp = isOpportunity(risk);
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${opp ? 'text-emerald-600' : 'text-rose-600'}`} title={opp ? 'Opportunity (upside risk)' : 'Threat (downside risk)'}><span>{opp ? '◆' : '▲'}</span>{opp ? 'Opp' : 'Threat'}</span>;
}
function StrategyBadge({ s }: { s: string | null | undefined }) {
  if (!s) return <span className="text-muted-foreground">—</span>;
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{s}</span>;
}
function VelocityBadge({ v }: { v: string | null | undefined }) {
  if (!v) return null;
  const c = v === 'Fast' ? 'text-rose-600' : v === 'Medium' ? 'text-amber-600' : 'text-muted-foreground';
  return <span className={`text-[11px] font-medium ${c}`} title="Escalation velocity once triggered">{v} escalation</span>;
}
function Sparkline({ points }: { points: Array<{ w: number; s: number }> }) {
  if (!points || points.length < 2) return <span className="text-muted-foreground">—</span>;
  const W = 64, H = 18, max = 9, min = 0, step = W / (points.length - 1);
  const y = (s: number) => H - ((s - min) / (max - min)) * H;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(p.s).toFixed(1)}`).join(' ');
  const rising = points[points.length - 1].s > points[0].s;
  return <svg width={W} height={H} className="overflow-visible" aria-label="score trend"><path d={d} fill="none" stroke={rising ? '#e11d48' : '#10b981'} strokeWidth="1.5" /><circle cx={(points.length - 1) * step} cy={y(points[points.length - 1].s)} r="2" fill={rising ? '#e11d48' : '#10b981'} /></svg>;
}

export function RisksTable({
  rows, actions = [], issues = [],
}: {
  rows: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
  issues?: Array<Record<string, unknown>>;
}) {
  const risks = rows as unknown as Risk[];
  const actionItems = actions as unknown as ActionItemLite[];
  const issueItems = issues as unknown as IssueLite[];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<'default' | 'soonest'>('default');

  const actionsByRef = new Map<string, ActionItemLite[]>();
  for (const a of actionItems) { if (!a.source_ref) continue; (actionsByRef.get(a.source_ref) ?? actionsByRef.set(a.source_ref, []).get(a.source_ref)!).push(a); }
  const issuesByRisk = new Map<string, IssueLite[]>();
  for (const i of issueItems) { if (!i.linked_risk) continue; (issuesByRisk.get(i.linked_risk) ?? issuesByRisk.set(i.linked_risk, []).get(i.linked_risk)!).push(i); }

  if (risks.length === 0) return <p className="text-sm text-muted-foreground">No risks recorded.</p>;

  const ordered = sort === 'default' ? risks : [...risks].sort((a, b) => prox(a) - prox(b));

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1.5 text-xs">
        <span className="text-muted-foreground">Sort:</span>
        {(['default', 'soonest'] as const).map((s) => (
          <button key={s} onClick={() => setSort(s)} className={`rounded px-2 py-0.5 font-medium transition ${sort === s ? 'bg-rose-600 text-white shadow-sm' : 'border text-muted-foreground hover:text-foreground'}`}>
            {s === 'default' ? 'Register order' : 'Soonest to hit'}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">WBS</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-center" title="Inherent → residual score (P×I)">Score</th>
              <th className="px-3 py-2 text-right" title="Expected Monetary Value">EMV</th>
              <th className="px-3 py-2 text-left">Strategy</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y [&>tr:nth-child(even)]:bg-muted/50">
            {ordered.map((r) => (
              <RiskRow key={r.risk_id} risk={r} spawnedActions={actionsByRef.get(r.risk_id) ?? []} linkedIssues={issuesByRisk.get(r.risk_id) ?? []} isExpanded={expandedId === r.risk_id} onToggle={() => setExpandedId(expandedId === r.risk_id ? null : r.risk_id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Sort key for "soonest to hit": live risks by proximity asc; realised/not-materialised last. */
function prox(r: Risk): number {
  if (!isLiveStatus(r.status)) return 9999;
  return r.proximity_weeks == null ? 9998 : r.proximity_weeks;
}

function RiskRow({ risk, spawnedActions, linkedIssues, isExpanded, onToggle }: { risk: Risk; spawnedActions: ActionItemLite[]; linkedIssues: IssueLite[]; isExpanded: boolean; onToggle: () => void }) {
  const canonStatus = canonicalRiskStatus(risk.status);
  const inh = risk.score ?? 0;
  const res = risk.residual_score ?? inh;
  const eased = res < inh;
  const near = isLiveStatus(risk.status) && risk.proximity_weeks != null && risk.proximity_weeks <= 8;
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/70" onClick={onToggle}>
        <td className="px-3 py-3 font-mono text-xs">{risk.risk_id}</td>
        <td className="px-3 py-3">
          {risk.description}
          {risk.created_via === 'agent' && <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700" title="Raised in-app through the AI PMO agent">agent-raised</span>}
          {near && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title="Time to potential impact">⏱ {risk.proximity_weeks}w</span>}
          {spawnedActions.length > 0 && <span className="ml-2 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground">{spawnedActions.length} action{spawnedActions.length === 1 ? '' : 's'}</span>}
          {linkedIssues.length > 0 && <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">{linkedIssues.length} issue{linkedIssues.length === 1 ? '' : 's'}</span>}
        </td>
        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{risk.wbs_code ?? '—'}</td>
        <td className="px-3 py-3"><TypeBadge risk={risk} /></td>
        <td className="px-3 py-3 text-center font-mono">{inh}{res !== inh && <span className={eased ? 'text-emerald-600' : 'text-rose-600'}> → {res}</span>}</td>
        <td className="px-3 py-3 text-right font-mono">{risk.emv_usd != null ? <span title={`Inherent ${fmtUsd(Number(risk.emv_usd))} → residual ${fmtUsd(Number(risk.residual_emv_usd ?? risk.emv_usd))}`}>{fmtUsd(Number(risk.emv_usd))}</span> : '—'}</td>
        <td className="px-3 py-3"><StrategyBadge s={risk.response_strategy} /></td>
        <td className="px-3 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-xs ${riskStatusBadgeClass(canonStatus)}`}>{canonStatus}</span></td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={8} className="px-4 py-4 text-sm">
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Inherent P × I" value={`${risk.probability}×${risk.impact} (${inh})`} sub={risk.probability_pct != null ? `${risk.probability_pct}% likely` : undefined} />
              <Metric label="Residual P × I" value={risk.residual_probability ? `${risk.residual_probability}×${risk.residual_impact} (${res})` : '—'} sub={risk.residual_probability_pct != null ? `${risk.residual_probability_pct}% likely` : undefined} accent={eased ? 'emerald' : undefined} />
              <Metric label="Cost / schedule impact" value={risk.cost_impact_usd != null ? fmtUsd(Number(risk.cost_impact_usd)) : '—'} sub={risk.schedule_impact_days != null ? `${risk.schedule_impact_days} days` : undefined} />
              <Metric label="EMV (inherent → residual)" value={risk.emv_usd != null ? `${fmtUsd(Number(risk.emv_usd))} → ${fmtUsd(Number(risk.residual_emv_usd ?? risk.emv_usd))}` : '—'} sub="trend" spark={risk.score_trend ?? undefined} />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="WBS element" value={risk.wbs_code ?? '—'} sub="threatened" />
              <Metric label="Proximity" value={risk.proximity_weeks != null ? `${risk.proximity_weeks} wk` : '—'} sub={risk.velocity ? `${risk.velocity} escalation` : undefined} />
              <Metric label="Velocity" value={risk.velocity ?? '—'} />
              {canonStatus === 'Realised'
                ? <Metric label="Realised vs predicted" value={risk.realised_cost_usd != null ? fmtUsd(Number(risk.realised_cost_usd)) : '—'} sub={risk.cost_impact_usd != null ? `predicted ${fmtUsd(Number(risk.cost_impact_usd))}` : undefined} accent={risk.realised_cost_usd != null && risk.cost_impact_usd != null && Number(risk.realised_cost_usd) <= Number(risk.cost_impact_usd) ? 'emerald' : undefined} />
                : <Metric label="Cross-cutting class" value={risk.cross_cutting_class} sub={risk.pattern_link ?? undefined} />}
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Response — {risk.response_strategy ?? 'n/a'}</dt><dd className="mt-0.5">{risk.response}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Trigger</dt><dd className="mt-0.5">{risk.trigger}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="mt-0.5">{risk.owner}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Cross-cutting class</dt><dd className="mt-0.5">{risk.cross_cutting_class}{risk.pattern_link ? ` · ${risk.pattern_link}` : ''}</dd></div>
            </dl>
            {linkedIssues.length > 0 && (
              <div className="mt-4">
                <dt className="text-xs text-muted-foreground">Materialised as issue{linkedIssues.length === 1 ? '' : 's'}</dt>
                <ul className="mt-1.5 space-y-1.5">
                  {linkedIssues.map((i) => (
                    <li key={i.issue_id} className="flex items-start justify-between gap-3 rounded-md border bg-background p-2.5">
                      <span className="min-w-0"><span className="font-mono text-xs text-muted-foreground">{i.issue_id}</span> · {i.description}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{i.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {spawnedActions.length > 0 && (
              <div className="mt-4">
                <dt className="text-xs text-muted-foreground">Mitigation actions</dt>
                <ul className="mt-1.5 space-y-1.5">
                  {spawnedActions.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 rounded-md border bg-background p-2.5">
                      <span className="min-w-0">{a.description}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[11px]"><span className="rounded-full bg-muted px-2 py-0.5 font-medium">→ {roleLabel(a.assigned_to_role_type)}</span><span className={`rounded-full px-2 py-0.5 font-medium ${actionBadge(a.status)}`}>{a.status}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Metric({ label, value, sub, accent, spark }: { label: string; value: string; sub?: string; accent?: string; spark?: Array<{ w: number; s: number }> }) {
  return (
    <div className="rounded-md border bg-background p-2.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 font-mono text-sm ${accent === 'emerald' ? 'text-emerald-600' : ''}`}>{value}</dd>
      {spark ? <Sparkline points={spark} /> : sub ? <div className="text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
