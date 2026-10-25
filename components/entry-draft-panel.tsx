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

const KIND_LABEL: Record<ProposedEntry['type'], string> = { risk: 'risk', issue: 'issue', change: 'change / trend entry', continuation_request: 'continuation request', displacement: 'resource displacement', benefit_report: 'benefits report' };
const IT_KINDS = new Set(['continuation_request', 'displacement', 'benefit_report']);
const inputCls = 'w-full rounded-md border px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-foreground/30';
const labelCls = 'mb-0.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground';

export function EntryDraftPanel({ entry, projectCode, alreadySubmittedCode, onSubmitted }: { entry: ProposedEntry; projectCode: string | null; alreadySubmittedCode?: string | null; onSubmitted?: (code: string) => void }) {
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
        body: JSON.stringify({ project_code: projectCode, entry: form }),
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
        {IT_KINDS.has(form.type)
          ? <>✓ Recorded the {KIND_LABEL[form.type]} <span className="font-mono font-semibold">{doneCode}</span> — <span className="font-medium">assistant-raised</span>{form.type === 'continuation_request' ? '; it now competes at that year\u2019s waterline.' : form.type === 'displacement' ? '; the slip is attributed here, not to the case.' : '; visible on the benefits track.'}</>
          : <>✓ Added <span className="font-mono font-semibold">{doneCode}</span> to the {KIND_LABEL[form.type]} register — <span className="font-medium">agent-raised</span>{form.type === 'change' ? ', provisional until booked into SAP PS.' : ' in AI PMO.'}</>}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-sky-200 bg-sky-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">{IT_KINDS.has(form.type) ? 'Record' : 'Raise'} {KIND_LABEL[form.type]} — review &amp; confirm</p>
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
            <div className="col-span-2"><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}><option>Identified</option><option>Quantified</option><option>Submitted to client</option><option>In negotiation</option><option>Approved</option><option>Absorbed</option><option>Withdrawn</option></select></div>
          </>
        )}
        {form.type === 'change' && form.funding_source !== undefined && (
          <div className="col-span-2"><label className={labelCls}>Funding source (IT — routes the approval)</label><select className={inputCls} value={form.funding_source ?? ''} onChange={(e) => set('funding_source', e.target.value || null)}><option value="">— not an IT change —</option><option value="project_contingency">Project contingency (sponsor decides)</option><option value="bucket_reserve">Bucket reserve (bucket owner / CIO)</option><option value="displacement">Displaces another project (board)</option></select></div>
        )}
        {form.type === 'continuation_request' && (
          <>
            <div><label className={labelCls}>Fiscal year</label><input className={inputCls} type="number" value={form.fiscal_year} onChange={(e) => set('fiscal_year', Number(e.target.value))} /></div>
            <div><label className={labelCls}>Next-year slice (cost-to-complete)</label><input className={inputCls} type="number" value={form.requested_budget} onChange={(e) => set('requested_budget', Number(e.target.value))} /></div>
            <div className="col-span-2"><label className={labelCls}>Note for the reviewer</label><textarea className={`${inputCls} min-h-[44px] resize-y`} value={form.note} onChange={(e) => set('note', e.target.value)} /></div>
          </>
        )}
        {form.type === 'displacement' && (
          <>
            <div><label className={labelCls}>Person / role displaced</label><input className={inputCls} value={form.resource_name} onChange={(e) => set('resource_name', e.target.value)} /></div>
            <div><label className={labelCls}>Skill</label><input className={inputCls} value={form.skill} onChange={(e) => set('skill', e.target.value)} /></div>
            <div><label className={labelCls}>Moved to (project code, blank for run / incident)</label><input className={inputCls} value={form.to_project_code} onChange={(e) => set('to_project_code', e.target.value)} /></div>
            <div><label className={labelCls}>Reason</label><select className={inputCls} value={form.reason} onChange={(e) => set('reason', e.target.value)}><option value="incident_run">Incident / run &amp; maintenance</option><option value="higher_priority_project">Higher-priority project</option><option value="audit_compliance">Audit / compliance demand</option><option value="revenue_priority">Revenue project priority</option><option value="other">Other</option></select></div>
            <div><label className={labelCls}>From date</label><input className={inputCls} type="date" value={form.from_date} onChange={(e) => set('from_date', e.target.value)} /></div>
            <div><label className={labelCls}>To date (blank = still displaced)</label><input className={inputCls} type="date" value={form.to_date ?? ''} onChange={(e) => set('to_date', e.target.value || null)} /></div>
            <div><label className={labelCls}>FTE</label><input className={inputCls} type="number" step="0.1" value={form.fte} onChange={(e) => set('fte', Number(e.target.value))} /></div>
            <div><label className={labelCls}>Schedule impact (days)</label><input className={inputCls} type="number" value={form.schedule_impact_days} onChange={(e) => set('schedule_impact_days', Number(e.target.value))} /></div>
            <div className="col-span-2"><label className={labelCls}>Notes</label><textarea className={`${inputCls} min-h-[44px] resize-y`} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          </>
        )}
        {form.type === 'benefit_report' && (
          <>
            <div><label className={labelCls}>Period (e.g. 2027-Q1)</label><input className={inputCls} value={form.period} onChange={(e) => set('period', e.target.value)} /></div>
            <div />
            <div><label className={labelCls}>Planned benefit</label><input className={inputCls} type="number" value={form.planned_benefit} onChange={(e) => set('planned_benefit', Number(e.target.value))} /></div>
            <div><label className={labelCls}>Realised benefit</label><input className={inputCls} type="number" value={form.realised_benefit} onChange={(e) => set('realised_benefit', Number(e.target.value))} /></div>
            <div className="col-span-2"><label className={labelCls}>Commentary</label><textarea className={`${inputCls} min-h-[44px] resize-y`} value={form.commentary} onChange={(e) => set('commentary', e.target.value)} /></div>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
      {!projectCode && <p className="mt-2 text-[11px] text-amber-700">Open a project to raise this entry against it.</p>}
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={submit} disabled={state === 'posting'} className="rounded-md bg-sky-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
          {state === 'posting' ? 'Saving…' : IT_KINDS.has(form.type) ? 'Confirm and record' : 'Add to register'}
        </button>
      </div>
    </div>
  );
}
