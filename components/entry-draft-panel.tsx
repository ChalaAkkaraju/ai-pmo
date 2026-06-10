'use client';

/**
 * Entry confirm card — rendered inside the agent chat when the agent drafts a
 * ```pmo-entry block (parsed by lib/entry-parser). Mirrors AssignActionsPanel:
 * the agent proposes, the human reviews + edits a few fields, and only on
 * "Add to register" does it POST /api/entries (app-raised, provisional).
 */
import { useState } from 'react';
import type { ProposedEntry } from '@/lib/entry-parser';
import { CROSS_CUTTING_CLASSES } from '@/lib/entry-parser';

type State = 'idle' | 'posting' | 'done' | 'error';

const KIND_LABEL: Record<ProposedEntry['type'], string> = { risk: 'risk', issue: 'issue', change: 'change / trend entry' };
const inputCls = 'w-full rounded-md border px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-foreground/30';
const labelCls = 'mb-0.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground';

export function EntryDraftPanel({ entry, token, projectCode, alreadySubmittedCode, onSubmitted }: { entry: ProposedEntry; token: string; projectCode: string | null; alreadySubmittedCode?: string | null; onSubmitted?: (code: string) => void }) {
  const [form, setForm] = useState<ProposedEntry>(entry);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  function set(k: string, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }) as ProposedEntry);
  }

  async function submit() {
    if (!projectCode) { setError('Open a project first — entries are raised against a project.'); setState('error'); return; }
    setState('posting'); setError(null);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, project_code: projectCode, entry: form }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? 'Could not add the entry.'); setState('error'); return; }
      setCode(json.code); setState('done'); onSubmitted?.(json.code);
    } catch { setError('Network error — could not add the entry.'); setState('error'); }
  }

  const doneCode = code ?? alreadySubmittedCode;
  if (state === 'done' || alreadySubmittedCode) {
    return (
      <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
        ✓ Added <span className="font-mono font-semibold">{doneCode}</span> to the {KIND_LABEL[form.type]} register — <span className="font-medium">agent-raised</span>{form.type === 'change' ? ', provisional until booked into SAP PS.' : ' in AI PMO.'}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-sky-200 bg-sky-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">Raise {KIND_LABEL[form.type]} — review &amp; confirm</p>
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium text-sky-700">agent-raised</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {form.type === 'risk' && (
          <>
            <div className="col-span-2"><label className={labelCls}>Description</label><textarea className={`${inputCls} min-h-[44px] resize-y`} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
            <div><label className={labelCls}>Category</label><input className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
            <div><label className={labelCls}>Owner</label><input className={inputCls} value={form.owner} onChange={(e) => set('owner', e.target.value)} /></div>
            <div><label className={labelCls}>Probability</label><select className={inputCls} value={form.probability} onChange={(e) => set('probability', e.target.value)}><option>L</option><option>M</option><option>H</option></select></div>
            <div><label className={labelCls}>Impact</label><select className={inputCls} value={form.impact} onChange={(e) => set('impact', e.target.value)}><option>L</option><option>M</option><option>H</option></select></div>
            <div className="col-span-2"><label className={labelCls}>Cross-cutting class</label><select className={inputCls} value={form.cross_cutting_class} onChange={(e) => set('cross_cutting_class', e.target.value)}>{CROSS_CUTTING_CLASSES.map((c) => <option key={c}>{c}</option>)}</select></div>
          </>
        )}
        {form.type === 'issue' && (
          <>
            <div className="col-span-2"><label className={labelCls}>Description</label><textarea className={`${inputCls} min-h-[44px] resize-y`} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
            <div><label className={labelCls}>Category</label><input className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
            <div><label className={labelCls}>Owner</label><input className={inputCls} value={form.owner} onChange={(e) => set('owner', e.target.value)} /></div>
            <div><label className={labelCls}>Severity</label><select className={inputCls} value={form.severity} onChange={(e) => set('severity', e.target.value)}><option>L</option><option>M</option><option>H</option></select></div>
            <div><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}><option>Open</option><option>In progress</option><option>Resolved</option><option>Closed</option></select></div>
          </>
        )}
        {form.type === 'change' && (
          <>
            <div className="col-span-2"><label className={labelCls}>Scope summary</label><textarea className={`${inputCls} min-h-[44px] resize-y`} value={form.scope_summary} onChange={(e) => set('scope_summary', e.target.value)} /></div>
            <div className="col-span-2"><label className={labelCls}>Driver</label><input className={inputCls} value={form.driver} onChange={(e) => set('driver', e.target.value)} /></div>
            <div><label className={labelCls}>Cost impact ($M)</label><input className={inputCls} type="number" step="0.1" value={form.cost_impact_m} onChange={(e) => set('cost_impact_m', Number(e.target.value))} /></div>
            <div><label className={labelCls}>Revenue impact ($M)</label><input className={inputCls} type="number" step="0.1" value={form.revenue_impact_m} onChange={(e) => set('revenue_impact_m', Number(e.target.value))} /></div>
            <div className="col-span-2"><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}><option>Anticipated</option><option>Under analysis</option><option>Priced</option><option>Executed</option><option>Complete</option><option>Rejected</option></select></div>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
      {!projectCode && <p className="mt-2 text-[11px] text-amber-700">Open a project to raise this entry against it.</p>}
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={submit} disabled={state === 'posting'} className="rounded-md bg-sky-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
          {state === 'posting' ? 'Adding…' : 'Add to register'}
        </button>
      </div>
    </div>
  );
}
