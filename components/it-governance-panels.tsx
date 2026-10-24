'use client';

/**
 * IT project governance panels: change-order routing by funding source,
 * the resource-displacement log, benefits realisation after close, and the
 * continuation request for the next fiscal year.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthorityRule, BenefitsReport, DecisionBody, DecisionRecord, ResourceDisplacement } from '@/lib/types';
import { fmtMoney } from '@/lib/it-portfolio';
import { bodyLabel } from './decisions-panel';

const input = 'mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm';


// ---------------------------------------------------------------------------
// Change orders — routed by consequence
// ---------------------------------------------------------------------------
export function ItChangeOrdersPanel({ projectCode, bucket, changeOrders, matrix, bodies, canWrite, records = [], myRoleId }: {
  projectCode: string;
  bucket: string | null;
  changeOrders: Array<Record<string, unknown>>;
  matrix: AuthorityRule[];
  bodies: DecisionBody[];
  canWrite: boolean;
  /** This project's decision records — an open change_order record locks its row as "awaiting". */
  records?: DecisionRecord[];
  /** Signed-in role id — only the proposer may withdraw a pending request. */
  myRoleId?: string;
}) {
  async function withdraw(recordId: string) {
    setBusy(recordId); setError(null);
    try {
      const res = await fetch(`/api/governance/decisions/${recordId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'withdraw' }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed');
      setNotice('Withdrawn — the change order is back with you; edit the funding source and resubmit when ready.');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }
  const pendingFor = (coId: string) => records.find((r) => r.status === 'proposed' && r.decision_kind === 'change_order' && (r.proposal as { change_order_id?: string } | null)?.change_order_id === coId) ?? null;
  const lastOutcome = (coId: string) => records.filter((r) => r.status !== 'proposed' && r.decision_kind === 'change_order' && (r.proposal as { change_order_id?: string } | null)?.change_order_id === coId).sort((a, b) => ((a.decided_at ?? a.created_at) < (b.decided_at ?? b.created_at) ? 1 : -1))[0] ?? null;
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fs, setFs] = useState<Record<string, string>>({});

  function requiredBody(amount: number, source: string): string {
    const rows = matrix.filter((r) => r.decision_kind === 'change_order' && r.funding_source === source && amount >= Number(r.min_amount) && (r.max_amount == null || amount < Number(r.max_amount)));
    const key = rows[0]?.required_body_key ?? '—';
    return key === 'bucket_owner:*' ? `bucket_owner:${bucket ?? 'unassigned'}` : key;
  }

  const [raising, setRaising] = useState(false);
  const [draft, setDraft] = useState({ scope_summary: '', driver: 'Scope clarification', cost: '', days: '0', funding_source: 'project_contingency', displaces: '' });
  const [notice, setNotice] = useState<string | null>(null);
  const setD = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  async function submit(co: Record<string, unknown>, sourceOverride?: string, displaces?: string) {
    const source = sourceOverride ?? fs[String(co.id)] ?? (co.funding_source as string | null) ?? 'project_contingency';
    setBusy(String(co.id)); setError(null);
    try {
      const res = await fetch('/api/governance/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'change_order', project_code: projectCode, change_order_id: co.id, funding_source: source, displaces: displaces || null }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed');
      setNotice(j.applied ? 'Approved and applied — you hold the authority for this change.' : `Submitted — awaiting ${bodyLabel(bodies, j.requires ?? requiredBody(Number(co.cost_impact_m ?? 0) * 1_000_000, source))}.`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  /** Raise a change order (plain entry) and put it straight in front of the body the funding source points to. */
  async function raise(e: React.FormEvent) {
    e.preventDefault(); setBusy('new'); setError(null); setNotice(null);
    try {
      const res = await fetch('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_code: projectCode, entry: {
        type: 'change', scope_summary: draft.scope_summary, driver: draft.driver, cost_impact_m: Number(draft.cost || 0) / 1_000_000, revenue_impact_m: 0,
        schedule_impact_days: Number(draft.days || 0), status: 'Quantified', funding_source: draft.funding_source,
      } }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Could not raise the change order');
      setRaising(false);
      const { cost, funding_source, displaces } = draft;
      setDraft({ scope_summary: '', driver: 'Scope clarification', cost: '', days: '0', funding_source: 'project_contingency', displaces: '' });
      if (j.id) await submit({ id: j.id, cost_impact_m: Number(cost || 0) / 1_000_000 }, funding_source, displaces);
      else { setNotice(`Raised ${j.code} — click "Submit for decision" on its row to route it.`); router.refresh(); }
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  return (
    <section className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/40 via-white to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Change orders — routed by where the money comes from</h3>
        {canWrite && !raising && <button type="button" onClick={() => setRaising(true)} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">+ Raise a change order</button>}
      </div>
      {raising && (
        <form onSubmit={raise} className="mt-3 grid gap-2 rounded-md border bg-white p-3 text-xs sm:grid-cols-6">
          <label className="sm:col-span-6">What changes *<textarea required rows={2} className={input} value={draft.scope_summary} onChange={setD('scope_summary')} placeholder="Scope added or removed, and why" /></label>
          <label className="sm:col-span-2">Driver<select className={input} value={draft.driver} onChange={setD('driver')}><option>Scope clarification</option><option>Business request</option><option>Regulatory / compliance</option><option>Technical constraint</option><option>Vendor / supplier</option><option>Estimate error</option></select></label>
          <label>Cost impact ($) *<input type="number" required min={0} step={1000} className={input} value={draft.cost} onChange={setD('cost')} /></label>
          <label>Schedule impact (days)<input type="number" className={input} value={draft.days} onChange={setD('days')} /></label>
          <label className="sm:col-span-2">Funded from *<select className={input} value={draft.funding_source} onChange={setD('funding_source')}><option value="project_contingency">Project contingency — sponsor decides</option><option value="bucket_reserve">Bucket reserve — bucket owner / CIO</option><option value="displacement">Displaces another project — board</option></select></label>
          {draft.funding_source === 'displacement' && <label className="sm:col-span-2">Project it displaces (code)<input className={input} value={draft.displaces} onChange={setD('displaces')} placeholder="NW-IT-0009" /></label>}
          <p className="sm:col-span-4 self-end text-[11px] text-muted-foreground">At {fmtMoney(Number(draft.cost || 0))} from {draft.funding_source.replace(/_/g, ' ')} this is decided by <strong>{bodyLabel(bodies, requiredBody(Number(draft.cost || 0), draft.funding_source))}</strong>.</p>
          <div className="flex items-end gap-2 sm:col-span-6">
            <button type="submit" disabled={busy !== null} className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background disabled:opacity-50">{busy === 'new' ? 'Raising…' : 'Raise and submit for decision'}</button>
            <button type="button" onClick={() => setRaising(false)} className="rounded-md border px-3 py-1.5">Cancel</button>
          </div>
        </form>
      )}
      {notice && <p className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">{notice}</p>}
      <p className="mt-1 text-xs text-muted-foreground">After the commit gate the baseline is fixed. A change inside project contingency is the sponsor&rsquo;s call; a draw on the bucket reserve goes to the bucket owner (or the CIO above the delegation); a change that displaces another project goes to the investment board.</p>
      {changeOrders.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No change orders.</p> : (
        <div className="mt-3 overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">CO</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Days</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Funding source</th><th className="px-3 py-2">Decides</th>{canWrite && <th className="px-3 py-2"></th>}</tr></thead>
            <tbody>
              {changeOrders.map((co) => {
                const amount = Number(co.cost_impact_m ?? 0) * 1_000_000;
                const source = fs[String(co.id)] ?? (co.funding_source as string | null) ?? 'project_contingency';
                const approved = co.status === 'Approved';
                const pending = pendingFor(String(co.id));
                const last = lastOutcome(String(co.id));
                const locked = approved || Boolean(pending);
                return (
                  <tr key={String(co.id)} className="border-t">
                    <td className="px-3 py-2 font-medium">{String(co.co_id)}</td>
                    <td className="px-3 py-2">{String(co.scope_summary)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(amount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{String(co.schedule_impact_days ?? 0)}</td>
                    <td className="px-3 py-2">{approved ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">Approved</span> : pending ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900">Awaiting {bodyLabel(bodies, pending.required_body_key)}</span> : last && (last.status === 'rejected' || last.status === 'returned') ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">{last.status === 'rejected' ? 'Rejected' : 'Returned'} by {bodyLabel(bodies, last.decided_body_key ?? last.required_body_key)}</span> : String(co.status)}</td>
                    <td className="px-3 py-2">
                      {locked || !canWrite ? source.replace(/_/g, ' ') : (
                        <select className="rounded border px-1.5 py-1 text-xs" value={source} onChange={(e) => setFs((m) => ({ ...m, [String(co.id)]: e.target.value }))}>
                          <option value="project_contingency">project contingency</option>
                          <option value="bucket_reserve">bucket reserve</option>
                          <option value="displacement">displaces another project</option>
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2">{bodyLabel(bodies, requiredBody(amount, source))}</td>
                    {canWrite && <td className="px-3 py-2 text-right">{pending && myRoleId && pending.proposed_by_role_id === myRoleId && <button type="button" disabled={busy !== null} onClick={() => withdraw(pending.id)} className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">{busy === pending.id ? '…' : 'Withdraw'}</button>}{!locked && <button type="button" disabled={busy !== null} onClick={() => submit(co)} className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">{busy === String(co.id) ? '…' : 'Submit for decision'}</button>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Resource displacement log
// ---------------------------------------------------------------------------
const REASONS: Record<string, string> = { incident_run: 'Incident / run & maintenance', higher_priority_project: 'Higher-priority project', audit_compliance: 'Audit / compliance demand', revenue_priority: 'Revenue project priority', revenue_ld_exposure: 'Revenue project — LD exposure', incident: 'Incident', other: 'Other' };

export function DisplacementPanel({ projectCode, rows, canWrite, compact = false }: { projectCode: string; rows: ResourceDisplacement[]; canWrite: boolean; compact?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ resource_name: '', skill: '', to_project_code: '', from_date: new Date().toISOString().slice(0, 10), to_date: '', fte: '1', schedule_impact_days: '', reason: 'incident_run', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await fetch('/api/displacements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_code: projectCode, resource_name: f.resource_name, skill: f.skill || null, to_project_code: f.to_project_code || null, from_date: f.from_date, to_date: f.to_date || null, fte: Number(f.fte || 1), schedule_impact_days: f.schedule_impact_days ? Number(f.schedule_impact_days) : null, reason: f.reason, notes: f.notes || null }) });
      const j = await res.json(); if (!res.ok) throw new Error(j.error ?? 'Failed');
      setAdding(false); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }
  async function close(id: string) {
    const d = window.prompt('Returned on (YYYY-MM-DD)', new Date().toISOString().slice(0, 10)); if (!d) return;
    await fetch('/api/displacements', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, to_date: d }) });
    router.refresh();
  }
  const openRows = rows.filter((r) => !r.to_date);
  const days = rows.reduce((n, r) => n + (r.schedule_impact_days ?? 0), 0);

  return (
    <section className={`rounded-xl border p-5 shadow-sm ${openRows.length > 0 ? 'border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-white' : 'bg-card'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-semibold">Resource displacement</h3>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-900">{openRows.length} open</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800">{days} schedule days attributed</span>
        </div>
        {canWrite && !adding && <button type="button" onClick={() => setAdding(true)} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">+ Log a displacement</button>}
      </div>
      {!compact && <p className="mt-1 text-xs text-muted-foreground">When someone is pulled off this project — to an incident, run work, a higher-priority project or an audit — record it with dates and impact. The call may be right; the slip is then attributed to the cause, not to this project&rsquo;s case.</p>}
      {adding && (
        <form onSubmit={add} className="mt-3 grid gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-4">
          <label>Person *<input required className={input} value={f.resource_name} onChange={set('resource_name')} /></label>
          <label>Skill<input className={input} value={f.skill} onChange={set('skill')} placeholder="SAP basis" /></label>
          <label>To project code<input className={input} value={f.to_project_code} onChange={set('to_project_code')} placeholder="NW-IT-0003 or blank for run / incident" /></label>
          <label>Reason<select className={input} value={f.reason} onChange={set('reason')}>{Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>From *<input type="date" required className={input} value={f.from_date} onChange={set('from_date')} /></label>
          <label>To<input type="date" className={input} value={f.to_date} onChange={set('to_date')} /></label>
          <label>FTE<input type="number" step="0.05" min="0.05" max="1" className={input} value={f.fte} onChange={set('fte')} /></label>
          <label>Schedule impact (days)<input type="number" className={input} value={f.schedule_impact_days} onChange={set('schedule_impact_days')} /></label>
          <label className="sm:col-span-4">Notes<input className={input} value={f.notes} onChange={set('notes')} /></label>
          <div className="flex gap-2 sm:col-span-4"><button type="submit" disabled={busy} className="rounded bg-foreground px-3 py-1.5 font-medium text-background disabled:opacity-50">Log</button><button type="button" onClick={() => setAdding(false)} className="rounded border px-3 py-1.5">Cancel</button>{error && <span className="self-center text-red-700">{error}</span>}</div>
        </form>
      )}
      {rows.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">None recorded.</p> : (
        <table className="mt-3 w-full text-xs">
          <thead className="text-left text-muted-foreground"><tr><th className="py-1.5">Person</th><th className="py-1.5">Skill</th><th className="py-1.5">To</th><th className="py-1.5">Reason</th><th className="py-1.5">From</th><th className="py-1.5">To</th><th className="py-1.5 text-right">FTE</th><th className="py-1.5 text-right">Days</th>{canWrite && <th></th>}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1.5 font-medium">{r.resource_name}</td><td className="py-1.5">{r.skill ?? '—'}</td><td className="py-1.5">{r.to_project_code ?? '—'}</td>
                <td className="py-1.5">{REASONS[r.reason] ?? r.reason}</td><td className="py-1.5 tabular-nums">{r.from_date}</td><td className="py-1.5 tabular-nums">{r.to_date ?? <span className="text-amber-800">still displaced</span>}</td>
                <td className="py-1.5 text-right tabular-nums">{r.fte}</td><td className="py-1.5 text-right tabular-nums">{r.schedule_impact_days ?? '—'}</td>
                {canWrite && <td className="py-1.5 text-right">{!r.to_date && <button type="button" onClick={() => close(r.id)} className="rounded border px-2 py-0.5 text-[11px] hover:bg-muted">returned</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Benefits realisation
// ---------------------------------------------------------------------------
export function BenefitsPanel({ projectCode, rows, plannedAnnual, owner, canWrite }: { projectCode: string; rows: BenefitsReport[]; plannedAnnual: number | null; owner: string | null; canWrite: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ period: '', planned: plannedAnnual ? String(Math.round(plannedAnnual / 4)) : '', realised: '', commentary: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await fetch('/api/benefits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_code: projectCode, period: f.period, planned_benefit: Number(f.planned || 0), realised_benefit: Number(f.realised || 0), commentary: f.commentary || null }) });
      const j = await res.json(); if (!res.ok) throw new Error(j.error ?? 'Failed');
      setF((s) => ({ ...s, period: '', realised: '', commentary: '' })); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }
  const planned = rows.reduce((n, r) => n + Number(r.planned_benefit), 0), realised = rows.reduce((n, r) => n + Number(r.realised_benefit), 0);
  return (
    <section className={`rounded-xl border p-5 shadow-sm ${rows.length && realised < planned ? 'border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-white' : 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-white'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-semibold">Benefits realisation</h3>
          {rows.length > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${realised < planned ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{fmtMoney(realised)} realised of {fmtMoney(planned)} planned · {planned ? Math.round((realised / planned) * 100) : 0}%</span>}
          {rows.length === 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800">not yet reported</span>}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Reported per period by the benefits owner ({owner ?? 'not named'}) for 12–24 months after close. This record feeds the credibility of future cases from the same area.</p>
      {rows.length > 0 && (
        <table className="mt-3 w-full text-xs">
          <thead className="text-left text-muted-foreground"><tr><th className="py-1.5">Period</th><th className="py-1.5 text-right">Planned</th><th className="py-1.5 text-right">Realised</th><th className="py-1.5">Commentary</th><th className="py-1.5">By</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-t"><td className="py-1.5 tabular-nums">{r.period}</td><td className="py-1.5 text-right tabular-nums">{fmtMoney(r.planned_benefit)}</td><td className={`py-1.5 text-right tabular-nums ${Number(r.realised_benefit) < Number(r.planned_benefit) ? 'text-amber-800' : 'text-emerald-700'}`}>{fmtMoney(r.realised_benefit)}</td><td className="py-1.5 text-muted-foreground">{r.commentary ?? ''}</td><td className="py-1.5">{r.reported_by ?? '—'}</td></tr>)}</tbody>
        </table>
      )}
      {canWrite && (
        <form onSubmit={add} className="mt-3 grid gap-2 text-xs sm:grid-cols-5">
          <label>Period *<input required className={input} value={f.period} onChange={(e) => setF((s) => ({ ...s, period: e.target.value }))} placeholder="2027-Q1" /></label>
          <label>Planned<input type="number" className={input} value={f.planned} onChange={(e) => setF((s) => ({ ...s, planned: e.target.value }))} /></label>
          <label>Realised<input type="number" className={input} value={f.realised} onChange={(e) => setF((s) => ({ ...s, realised: e.target.value }))} /></label>
          <label className="sm:col-span-2">Commentary<input className={input} value={f.commentary} onChange={(e) => setF((s) => ({ ...s, commentary: e.target.value }))} /></label>
          <div className="flex gap-2 sm:col-span-5"><button type="submit" disabled={busy} className="rounded bg-foreground px-3 py-1.5 font-medium text-background disabled:opacity-50">Report period</button>{error && <span className="self-center text-red-700">{error}</span>}</div>
        </form>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Continuation request — next fiscal-year slice
// ---------------------------------------------------------------------------
export function ContinuationRequestPanel({ projectCode, currentFy, approvedYears, requested, canWrite }: { projectCode: string; currentFy: number | null; approvedYears: number[]; requested: number | null; canWrite: boolean }) {
  const router = useRouter();
  const nextFy = (approvedYears.length ? Math.max(...approvedYears) : (currentFy ?? new Date().getFullYear())) + 1;
  const alreadyAsking = currentFy === nextFy && !approvedYears.includes(nextFy);
  const [amount, setAmount] = useState(alreadyAsking && requested ? String(requested) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await fetch('/api/projects/it', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_code: projectCode, fiscal_year: nextFy, requested_budget: Number(amount || 0), note: note || null }) });
      const j = await res.json(); if (!res.ok) throw new Error(j.error ?? 'Failed');
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }
  return (
    <section className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-semibold">Continuation · FY{nextFy}</h3>
          {alreadyAsking ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900">asking {fmtMoney(requested)} · at the FY{nextFy} waterline</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">FY{nextFy} slice not yet requested</span>}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Budgets are approved by year. {alreadyAsking ? `This project is asking for ${fmtMoney(requested)} for FY${nextFy}; it is ranked at that year's waterline on cost-to-complete against benefit still achievable.` : `Approved for ${approvedYears.map((y) => `FY${y}`).join(', ') || 'no year yet'}. Request the FY${nextFy} slice to be ranked at that year's waterline.`}</p>
      {canWrite && (
        <form onSubmit={submit} className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
          <label>FY{nextFy} slice (cost-to-complete for the year)<input type="number" required min={0} className={input} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <label className="sm:col-span-2">Note for the reviewer<input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="remaining scope, benefit still achievable" /></label>
          <div className="flex items-end gap-2"><button type="submit" disabled={busy} className="rounded bg-foreground px-3 py-1.5 font-medium text-background disabled:opacity-50">{alreadyAsking ? 'Update request' : 'Request slice'}</button>{error && <span className="self-center text-red-700">{error}</span>}</div>
        </form>
      )}
    </section>
  );
}
