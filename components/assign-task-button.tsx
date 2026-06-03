'use client';

/**
 * Ad-hoc task assignment from the project page.
 *
 * Lets a write-capable role hand a project-related task to a specific role
 * without going through an agent's suggested actions — e.g. "Review the new
 * project and confirm the procurement plan". Posts to /api/actions (the same
 * cross-agent action queue), so it lands in the assignee's dashboard.
 */

import { useState } from 'react';
import { ROLE_TYPES, roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';

type State = 'idle' | 'posting' | 'done' | 'error';

export function AssignTaskButton({ token, projectCode }: { token: string; projectCode: string }) {
  const [open, setOpen] = useState(false);
  const [assignee, setAssignee] = useState<RoleType>('pm');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'L' | 'M' | 'H'>('M');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!description.trim()) {
      setError('Add a short description of the task.');
      return;
    }
    setState('posting');
    setError(null);
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          project_code: projectCode,
          items: [{ description: description.trim(), assigned_to_role: assignee, urgency }],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Could not assign the task.');
        setState('error');
        return;
      }
      setState('done');
    } catch {
      setError('Network error — could not assign the task.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
        <span className="font-medium text-emerald-800">✓ Task assigned to {roleLabel(assignee)}.</span>
        <span className="text-emerald-700/80">It&apos;s now in their action queue.</span>
        <button
          type="button"
          onClick={() => {
            setState('idle');
            setDescription('');
          }}
          className="ml-auto rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
        >
          Assign another
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
        >
          ＋ Assign a task to a colleague
        </button>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20';

  return (
    <div className="mt-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Assign a task on this project</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-xs font-medium">Task</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Review the new project and confirm the procurement plan."
            className={`${inputCls} min-h-[64px] resize-y`}
          />
        </div>
        <div className="flex flex-col gap-3 sm:w-44">
          <div>
            <label className="mb-1 block text-xs font-medium">Assign to</label>
            <select className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value as RoleType)}>
              {ROLE_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {roleLabel(rt)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Urgency</label>
            <select className={inputCls} value={urgency} onChange={(e) => setUrgency(e.target.value as 'L' | 'M' | 'H')}>
              <option value="L">Low</option>
              <option value="M">Medium</option>
              <option value="H">High</option>
            </select>
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={state === 'posting'}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {state === 'posting' ? 'Assigning…' : 'Assign task'}
        </button>
      </div>
    </div>
  );
}
