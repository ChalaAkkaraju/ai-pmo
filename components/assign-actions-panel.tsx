'use client';

/**
 * Shared "Recommended actions to assign" panel.
 *
 * Renders the proposed actions parsed from an agent's ```actions block and
 * lets the user commit each one (or all) to the owning role's queue via
 * POST /api/actions. Used by the floating agent widget
 * (components/floating-agent-widget).
 *
 * projectCode may be null (portfolio-level invocations from the widget); the
 * action is still assignable, it just won't link to a specific project's risk.
 */

import { useState } from 'react';
import type { AgentType } from '@/lib/types';
import { roleLabel } from '@/lib/roles';
import type { ProposedAction } from '@/lib/action-parser';

type AssignState = 'idle' | 'posting' | 'done' | 'error';

export function AssignActionsPanel({
  actions,
  token,
  projectCode,
  agentOutputId,
  agentType,
}: {
  actions: ProposedAction[];
  token: string;
  projectCode: string | null;
  agentOutputId?: string;
  agentType?: AgentType;
}) {
  const [states, setStates] = useState<AssignState[]>(() => actions.map(() => 'idle'));
  const [bulkPosting, setBulkPosting] = useState(false);

  async function assign(indices: number[]) {
    const toAssign = indices.filter((i) => states[i] === 'idle' || states[i] === 'error');
    if (toAssign.length === 0) return;
    setStates((prev) => prev.map((s, i) => (toAssign.includes(i) ? 'posting' : s)));
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          project_code: projectCode ?? undefined,
          source_type: 'risk',
          raised_by_agent_type: agentType ?? null,
          created_from_output_id: agentOutputId ?? undefined,
          items: toAssign.map((i) => ({
            description: actions[i].description,
            assigned_to_role: actions[i].assigned_to_role,
            urgency: actions[i].urgency,
            source_ref: actions[i].source_ref,
            flagged: actions[i].flagged,
          })),
        }),
      });
      const ok = res.ok;
      setStates((prev) => prev.map((s, i) => (toAssign.includes(i) ? (ok ? 'done' : 'error') : s)));
    } catch {
      setStates((prev) => prev.map((s, i) => (toAssign.includes(i) ? 'error' : s)));
    }
  }

  const anyUnassigned = states.some((s) => s === 'idle' || s === 'error');

  return (
    <div className="mt-4 rounded-lg border border-dashed bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recommended actions to assign
        </p>
        {actions.length > 1 && anyUnassigned && (
          <button
            type="button"
            disabled={bulkPosting}
            onClick={async () => {
              setBulkPosting(true);
              await assign(actions.map((_, i) => i));
              setBulkPosting(false);
            }}
            className="rounded-md border bg-background px-2.5 py-1 text-[11px] font-medium transition hover:bg-muted disabled:opacity-40"
          >
            {bulkPosting ? 'Assigning…' : 'Assign all'}
          </button>
        )}
      </div>

      <ul className="mt-2.5 space-y-2">
        {actions.map((a, i) => {
          const state = states[i];
          return (
            <li
              key={i}
              className="flex items-start justify-between gap-2.5 rounded-md border bg-background p-2.5"
            >
              <div className="min-w-0">
                <p className="text-[12px]">{a.description}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-foreground">
                    → {roleLabel(a.assigned_to_role)}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 font-medium ${
                    a.urgency === 'H'
                      ? 'bg-red-100 text-red-800'
                      : a.urgency === 'L'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {a.urgency === 'H' ? 'High' : a.urgency === 'L' ? 'Low' : 'Med'}
                  </span>
                  {a.source_ref && <span className="font-mono">{a.source_ref}</span>}
                  {a.flagged && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                      role unclear → PM
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={state === 'posting' || state === 'done'}
                onClick={() => assign([i])}
                className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-60 ${
                  state === 'done'
                    ? 'bg-emerald-100 text-emerald-800'
                    : state === 'error'
                      ? 'border border-red-300 bg-red-50 text-red-700'
                      : 'bg-foreground text-background hover:opacity-90'
                }`}
              >
                {state === 'done'
                  ? '✓ Assigned'
                  : state === 'posting'
                    ? 'Assigning…'
                    : state === 'error'
                      ? 'Retry'
                      : 'Assign'}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Assigned actions appear in the owning role&apos;s dashboard queue.
      </p>
    </div>
  );
}
