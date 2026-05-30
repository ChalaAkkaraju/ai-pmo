'use client';

import { useState } from 'react';
import { canonicalRiskStatus, riskStatusBadgeClass } from '@/lib/risk-status';

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
}

interface ActionItemLite {
  id: string;
  source_ref: string | null;
  description: string;
  assigned_to_role_type: string;
  status: string;
  urgency: string;
}

const ROLE_LABELS: Record<string, string> = {
  pm: 'Senior PM',
  procurement: 'Procurement Strategist',
  risk: 'Risk Analyst',
  sponsor: 'VP Sponsor',
  commercial: 'Commercial Manager',
  project_controls: 'Project Controls',
  program_manager: 'Program Manager',
  engineering_manager: 'Engineering Manager',
  construction_manager: 'Construction Manager',
  hse_manager: 'HSE Manager',
};

function roleLabel(rt: string): string {
  return ROLE_LABELS[rt] ?? rt;
}

function actionStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'done') return 'bg-emerald-100 text-emerald-800';
  if (s === 'in progress') return 'bg-blue-100 text-blue-900';
  if (s === 'acknowledged') return 'bg-indigo-100 text-indigo-900';
  return 'bg-amber-100 text-amber-800';
}

export function RisksTable({
  rows,
  actions = [],
}: {
  rows: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
}) {
  const risks = rows as unknown as Risk[];
  const actionItems = actions as unknown as ActionItemLite[];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group assigned actions by the risk ref they were raised against.
  const actionsByRef = new Map<string, ActionItemLite[]>();
  for (const a of actionItems) {
    if (!a.source_ref) continue;
    const list = actionsByRef.get(a.source_ref) ?? [];
    list.push(a);
    actionsByRef.set(a.source_ref, list);
  }

  if (risks.length === 0) {
    return <p className="text-sm text-muted-foreground">No risks recorded.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-center">P</th>
            <th className="px-4 py-2 text-center">I</th>
            <th className="px-4 py-2 text-center">Score</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Cross-cutting class</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {risks.map((r) => (
            <RiskRow
              key={r.risk_id}
              risk={r}
              spawnedActions={actionsByRef.get(r.risk_id) ?? []}
              isExpanded={expandedId === r.risk_id}
              onToggle={() =>
                setExpandedId(expandedId === r.risk_id ? null : r.risk_id)
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskRow({
  risk,
  spawnedActions,
  isExpanded,
  onToggle,
}: {
  risk: Risk;
  spawnedActions: ActionItemLite[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const canonStatus = canonicalRiskStatus(risk.status);
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/30" onClick={onToggle}>
        <td className="px-4 py-3 font-mono text-xs">{risk.risk_id}</td>
        <td className="px-4 py-3">
          {risk.description}
          {spawnedActions.length > 0 && (
            <span className="ml-2 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              {spawnedActions.length} action{spawnedActions.length === 1 ? '' : 's'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-center font-mono">{risk.probability}</td>
        <td className="px-4 py-3 text-center font-mono">{risk.impact}</td>
        <td className="px-4 py-3 text-center font-mono">{risk.score}</td>
        <td className="px-4 py-3">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${riskStatusBadgeClass(canonStatus)}`}>
            {canonStatus}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {risk.cross_cutting_class}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 py-4 text-sm">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Response</dt>
                <dd className="mt-0.5">{risk.response}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Trigger</dt>
                <dd className="mt-0.5">{risk.trigger}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Owner</dt>
                <dd className="mt-0.5">{risk.owner}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pattern link</dt>
                <dd className="mt-0.5">{risk.pattern_link ?? '—'}</dd>
              </div>
            </dl>
            {spawnedActions.length > 0 && (
              <div className="mt-4">
                <dt className="text-xs text-muted-foreground">Assigned actions</dt>
                <ul className="mt-1.5 space-y-1.5">
                  {spawnedActions.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-3 rounded-md border bg-background p-2.5"
                    >
                      <span className="min-w-0">{a.description}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[11px]">
                        <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                          → {roleLabel(a.assigned_to_role_type)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 font-medium ${actionStatusClass(a.status)}`}>
                          {a.status}
                        </span>
                      </span>
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
