'use client';

import { useState } from 'react';

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

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s.startsWith('realised')) return 'bg-amber-100 text-amber-900';
  if (s.includes('not materialised')) return 'bg-gray-100 text-gray-700';
  if (s.includes('mitigated')) return 'bg-green-100 text-green-900';
  if (s.includes('active')) return 'bg-blue-100 text-blue-900';
  return 'bg-muted text-muted-foreground';
}

export function RisksTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const risks = rows as unknown as Risk[];
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
  isExpanded,
  onToggle,
}: {
  risk: Risk;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/30" onClick={onToggle}>
        <td className="px-4 py-3 font-mono text-xs">{risk.risk_id}</td>
        <td className="px-4 py-3">{risk.description}</td>
        <td className="px-4 py-3 text-center font-mono">{risk.probability}</td>
        <td className="px-4 py-3 text-center font-mono">{risk.impact}</td>
        <td className="px-4 py-3 text-center font-mono">{risk.score}</td>
        <td className="px-4 py-3">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(
              risk.status,
            )}`}
          >
            {risk.status}
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
          </td>
        </tr>
      )}
    </>
  );
}
