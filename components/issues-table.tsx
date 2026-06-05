'use client';

import { severityBadge, issueBadge } from '@/lib/badge-styles';
import { useState } from 'react';

interface Issue {
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
}



export function IssuesTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const issues = rows as unknown as Issue[];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground">No issues recorded.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-center">Sev</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-center">Opened</th>
            <th className="px-4 py-2 text-center">Closed</th>
            <th className="px-4 py-2 text-left">Linked risk</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {issues.map((i) => (
            <IssueRow
              key={i.issue_id}
              issue={i}
              isExpanded={expandedId === i.issue_id}
              onToggle={() =>
                setExpandedId(expandedId === i.issue_id ? null : i.issue_id)
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssueRow({
  issue,
  isExpanded,
  onToggle,
}: {
  issue: Issue;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/30" onClick={onToggle}>
        <td className="px-4 py-3 font-mono text-xs">{issue.issue_id}</td>
        <td className="px-4 py-3">{issue.description}</td>
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-mono ${severityBadge(
              issue.severity,
            )}`}
          >
            {issue.severity}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs ${issueBadge(
              issue.status,
            )}`}
          >
            {issue.status}
          </span>
        </td>
        <td className="px-4 py-3 text-center font-mono text-xs">Wk {issue.opened_week}</td>
        <td className="px-4 py-3 text-center font-mono text-xs">
          {issue.closed_week ? `Wk ${issue.closed_week}` : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{issue.linked_risk ?? '—'}</td>
      </tr>
      {isExpanded && issue.closure_narrative && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 py-4 text-sm">
            <p className="text-xs text-muted-foreground">Closure narrative</p>
            <p className="mt-1">{issue.closure_narrative}</p>
            {issue.linked_wbs && issue.linked_wbs.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Linked WBS: {issue.linked_wbs.join(', ')}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Owner: {issue.owner} · Category: {issue.category}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
