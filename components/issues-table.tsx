'use client';

import { severityBadge, issueBadge } from '@/lib/badge-styles';
import { useState } from 'react';
import { fmtUsd } from '@/lib/risk-emv';
import {
  isOpenIssue, issueAge, slaWeeks, isOverdue, agingBand, priorityScore,
  needsEscalation, resolveWeeks, type IssueRow as IM, type AgingBand,
} from '@/lib/issue-metrics';

interface Issue extends IM {
  issue_id: string;
  description: string;
  category: string;
  severity: 'L' | 'M' | 'H';
  owner: string;
  status: string;
  linked_wbs: string[];
  linked_risk: string | null;
  opened_week: number;
  closed_week: number | null;
  closure_narrative: string | null;
  // 0026 enrichment
  sla_weeks?: number | null;
  cost_impact_usd?: number | null;
  schedule_impact_days?: number | null;
  escalated?: boolean | null;
  root_cause?: string | null;
  recurrence?: string | null;
}

const BAND_BADGE: Record<AgingBand, string> = {
  'On track': 'bg-emerald-100 text-emerald-700',
  'At risk': 'bg-amber-100 text-amber-700',
  Overdue: 'bg-rose-100 text-rose-700',
};

export function IssuesTable({ rows, currentWeek = 0 }: { rows: Array<Record<string, unknown>>; currentWeek?: number }) {
  const issues = rows as unknown as Issue[];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<'default' | 'overdue'>('default');

  if (issues.length === 0) return <p className="text-sm text-muted-foreground">No issues recorded.</p>;

  const ordered = sort === 'default'
    ? issues
    : [...issues].sort((a, b) => sortKey(b, currentWeek) - sortKey(a, currentWeek));

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1.5 text-xs">
        <span className="text-muted-foreground">Sort:</span>
        {(['default', 'overdue'] as const).map((s) => (
          <button key={s} onClick={() => setSort(s)} className={`rounded px-2 py-0.5 font-medium transition ${sort === s ? 'bg-foreground text-background' : 'border text-muted-foreground hover:text-foreground'}`}>
            {s === 'default' ? 'Register order' : 'Most overdue'}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-center">Sev</th>
              <th className="px-3 py-2 text-left" title="Weeks open vs SLA target">Age</th>
              <th className="px-3 py-2 text-center" title="Severity × age">Pri</th>
              <th className="px-3 py-2 text-right">Cost</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ordered.map((i) => (
              <IssueRow key={i.issue_id} issue={i} currentWeek={currentWeek} isExpanded={expandedId === i.issue_id} onToggle={() => setExpandedId(expandedId === i.issue_id ? null : i.issue_id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sortKey(i: Issue, cw: number): number {
  return isOpenIssue(i.status) ? priorityScore(i, cw) : -1;
}

function IssueRow({ issue, currentWeek, isExpanded, onToggle }: { issue: Issue; currentWeek: number; isExpanded: boolean; onToggle: () => void }) {
  const open = isOpenIssue(issue.status);
  const age = issueAge(issue, currentWeek);
  const sla = slaWeeks(issue);
  const band = agingBand(issue, currentWeek);
  const overdue = isOverdue(issue, currentWeek);
  const escalate = needsEscalation(issue, currentWeek);
  const resolved = resolveWeeks(issue);
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/30" onClick={onToggle}>
        <td className="px-3 py-3 font-mono text-xs">{issue.issue_id}</td>
        <td className="px-3 py-3">
          {issue.description}
          {(escalate || issue.escalated) && <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700" title="Escalation">⚑ {issue.escalated ? 'Escalated' : 'Escalate'}</span>}
          {issue.recurrence === 'Recurring' && <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">↻ Recurring</span>}
        </td>
        <td className="px-3 py-3 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-mono ${severityBadge(issue.severity)}`}>{issue.severity}</span></td>
        <td className="px-3 py-3">
          {open ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${BAND_BADGE[band]}`} title={`Open ${age}w · SLA ${sla}w`}>
              {age}w{overdue ? ` · +${age - sla}w over` : ''}
            </span>
          ) : <span className="text-xs text-muted-foreground">{resolved != null ? `closed in ${resolved}w` : 'closed'}</span>}
        </td>
        <td className="px-3 py-3 text-center font-mono">{open ? priorityScore(issue, currentWeek) : '—'}</td>
        <td className="px-3 py-3 text-right font-mono">{issue.cost_impact_usd != null ? fmtUsd(Number(issue.cost_impact_usd)) : '—'}</td>
        <td className="px-3 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-xs ${issueBadge(issue.status)}`}>{issue.status}</span></td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 py-4 text-sm">
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Age vs SLA" value={open ? `${age}w / ${sla}w` : `resolved ${resolved ?? '—'}w`} sub={open ? band : undefined} accent={overdue ? 'rose' : band === 'At risk' ? 'amber' : undefined} />
              <Metric label="Priority" value={open ? String(priorityScore(issue, currentWeek)) : '—'} sub="severity × age" />
              <Metric label="Cost / schedule impact" value={issue.cost_impact_usd != null ? fmtUsd(Number(issue.cost_impact_usd)) : '—'} sub={issue.schedule_impact_days != null ? `${issue.schedule_impact_days} days` : undefined} />
              <Metric label="Root cause" value={issue.root_cause ?? '—'} sub={issue.recurrence ?? undefined} />
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Owner · Category</dt><dd className="mt-0.5">{issue.owner || '—'} · {issue.category}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Opened · Closed</dt><dd className="mt-0.5">Wk {issue.opened_week}{issue.closed_week ? ` → Wk ${issue.closed_week}` : ' · open'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Linked WBS</dt><dd className="mt-0.5 font-mono text-xs">{issue.linked_wbs && issue.linked_wbs.length ? issue.linked_wbs.join(', ') : '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Materialised from risk</dt><dd className="mt-0.5 font-mono text-xs">{issue.linked_risk ?? '—'}</dd></div>
            </dl>
            {issue.closure_narrative && (
              <div className="mt-3"><dt className="text-xs text-muted-foreground">Closure narrative</dt><dd className="mt-0.5 text-sm">{issue.closure_narrative}</dd></div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  const color = accent === 'rose' ? 'text-rose-600' : accent === 'amber' ? 'text-amber-600' : '';
  return (
    <div className="rounded-md border bg-background p-2.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 font-mono text-sm ${color}`}>{value}</dd>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
