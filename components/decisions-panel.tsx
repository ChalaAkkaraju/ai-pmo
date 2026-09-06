'use client';

/**
 * Decisions queue — the two-step governance record (proposed → decided) with
 * concurrences. Used on the IT portfolio page (all open decisions) and on an
 * IT project page (that project's decisions). The signed-in role sees action
 * buttons only for the bodies it belongs to.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DecisionBody, DecisionRecord } from '@/lib/types';
import { fmtMoney } from '@/lib/it-portfolio';

export interface GovernanceView {
  bodies: DecisionBody[];
  myBodyKeys: string[];
  myRoleId: string;
  myRoleType: string;
  myName: string;
}

const KIND_LABELS: Record<string, string> = {
  envelope_allocation: 'Envelope allocation', waterline_approval: 'Waterline approval', continuation: 'Continuation', commit_baseline: 'Commit baseline (SG1)',
  change_order: 'Change order', reserve_draw: 'Reserve draw', hold: 'Hold', cancel: 'Cancel',
};

export function bodyLabel(bodies: DecisionBody[], key: string): string {
  return bodies.find((b) => b.key === key)?.name ?? key.replace(/_/g, ' ').replace(':', ' — ');
}

export function DecisionsPanel({ records, gov, projectCodes, projectStatus, title = 'Decisions', showProject = true, emptyText = 'No decisions recorded.' }: {
  records: DecisionRecord[];
  gov: GovernanceView;
  /** project_id → code, for links */
  projectCodes?: Record<string, string>;
  /** project code → current lifecycle, so a decision form can flag rows that moved on since the proposal was drafted */
  projectStatus?: Record<string, string>;
  title?: string;
  showProject?: boolean;
  emptyText?: string;
}) {
  // Things the signed-in role can act on come first: a decision for one of its
  // bodies, or a concurrence it still owes.
  const actionable = (r: DecisionRecord) => gov.myBodyKeys.includes(r.required_body_key)
    || (r.required_concurrences ?? []).some((k) => gov.myBodyKeys.includes(k) && !(r.concurrences ?? []).some((c) => c.body_key === k && c.outcome === 'concur'));
  const open = records.filter((r) => r.status === 'proposed').sort((a, b) => Number(actionable(b)) - Number(actionable(a)));
  const mine = open.filter(actionable).length;
  const closed = records.filter((r) => r.status !== 'proposed').sort((a, b) => ((a.decided_at ?? a.created_at) < (b.decided_at ?? b.created_at) ? 1 : -1));
  const byKind = Object.entries(open.reduce<Record<string, { n: number; amount: number }>>((m, r) => { const k = r.decision_kind; m[k] = { n: (m[k]?.n ?? 0) + 1, amount: (m[k]?.amount ?? 0) + Number(r.amount ?? 0) }; return m; }, {}));
  const openAmount = open.reduce((n, r) => n + Number(r.amount ?? 0), 0);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
      <div className="bg-gradient-to-br from-slate-50 via-white to-teal-50/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{open.length} open · {fmtMoney(openAmount)} awaiting authority · {closed.length} decided</p>
          </div>
          {mine > 0 && <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">{mine} for you</span>}
        </div>
        {byKind.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {byKind.map(([k, v]) => (
              <div key={k} className={`rounded-md px-3 py-2 ${KIND_TILE[k] ?? 'bg-muted'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider">{KIND_LABELS[k] ?? k}</p>
                <p className="text-lg font-semibold tabular-nums leading-tight">{v.n} <span className="text-xs font-normal opacity-80">· {fmtMoney(v.amount)}</span></p>
              </div>
            ))}
          </div>
        )}
      </div>
      {records.length === 0 && <p className="px-5 pb-4 text-sm text-muted-foreground">{emptyText}</p>}
      {open.length > 0 && (
        <div className="border-t">
          {open.map((r) => <DecisionCard key={r.id} r={r} gov={gov} code={projectCodes?.[r.project_id ?? ''] ?? null} showProject={showProject} mine={actionable(r)} projectStatus={projectStatus} />)}
        </div>
      )}
      {closed.length > 0 && (
        <details className="border-t px-5 py-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Decided ({closed.length})</summary>
          <div className="mt-2 overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Title</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Body</th><th className="px-3 py-2">Outcome</th><th className="px-3 py-2">By</th><th className="px-3 py-2">Conditions</th></tr></thead>
              <tbody>
                {closed.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 tabular-nums">{(r.decided_at ?? r.created_at).slice(0, 10)}</td>
                    <td className="px-3 py-2">{KIND_LABELS[r.decision_kind] ?? r.decision_kind}</td>
                    <td className="px-3 py-2">{r.title}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.amount != null ? fmtMoney(r.amount) : '—'}</td>
                    <td className="px-3 py-2">{bodyLabel(gov.bodies, r.decided_body_key ?? r.required_body_key)}</td>
                    <td className="px-3 py-2 font-medium">{r.status}</td>
                    <td className="px-3 py-2">{r.decided_by_name ?? '—'}{r.attendees?.length > 1 ? ` +${r.attendees.length - 1}` : ''}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.conditions ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

const KIND_TILE: Record<string, string> = {
  envelope_allocation: 'bg-slate-100 text-slate-900', waterline_approval: 'bg-teal-100 text-teal-950', continuation: 'bg-sky-100 text-sky-950', commit_baseline: 'bg-indigo-100 text-indigo-950',
  change_order: 'bg-amber-100 text-amber-950', reserve_draw: 'bg-amber-100 text-amber-950', hold: 'bg-orange-100 text-orange-950', cancel: 'bg-red-100 text-red-950',
};
const KIND_BAR: Record<string, string> = {
  envelope_allocation: 'border-l-slate-400', waterline_approval: 'border-l-teal-500', continuation: 'border-l-sky-500', commit_baseline: 'border-l-indigo-500',
  change_order: 'border-l-amber-500', reserve_draw: 'border-l-amber-500', hold: 'border-l-orange-500', cancel: 'border-l-red-500',
};
const KIND_CHIP: Record<string, string> = {
  envelope_allocation: 'bg-slate-100 text-slate-800', waterline_approval: 'bg-teal-100 text-teal-900', continuation: 'bg-sky-100 text-sky-900', commit_baseline: 'bg-indigo-100 text-indigo-900',
  change_order: 'bg-amber-100 text-amber-900', reserve_draw: 'bg-amber-100 text-amber-900', hold: 'bg-orange-100 text-orange-900', cancel: 'bg-red-100 text-red-900',
};

function DecisionCard({ r, gov, code, showProject, mine, projectStatus }: { r: DecisionRecord; gov: GovernanceView; code: string | null; showProject: boolean; mine: boolean; projectStatus?: Record<string, string> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendees, setAttendees] = useState(gov.myName);
  const [conditions, setConditions] = useState('');
  const [minutes, setMinutes] = useState('');
  const [open, setOpen] = useState(false);

  const canDecide = gov.myBodyKeys.includes(r.required_body_key);
  const missing = (r.required_concurrences ?? []).filter((k) => !(r.concurrences ?? []).some((c) => c.body_key === k && c.outcome === 'concur'));
  const objections = (r.required_concurrences ?? []).filter((k) => { const l = [...(r.concurrences ?? [])].filter((c) => c.body_key === k).sort((a, b) => (a.at < b.at ? 1 : -1))[0]; return l?.outcome === 'object'; });
  const myConcurrences = (r.required_concurrences ?? []).filter((k) => gov.myBodyKeys.includes(k));
  const isProposer = r.proposed_by_role_id === gov.myRoleId;
  const body = gov.bodies.find((b) => b.key === r.required_body_key);

  async function act(payload: Record<string, unknown>) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/governance/decisions/${r.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  const concurrenceState = (r.required_concurrences ?? []).map((k) => {
    const latest = [...(r.concurrences ?? [])].filter((c) => c.body_key === k).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
    return { k, latest };
  });

  return (
    <div className={`border-b border-l-4 last:border-b-0 ${KIND_BAR[r.decision_kind] ?? 'border-l-slate-300'} ${mine ? 'bg-teal-50/40' : ''}`}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-5 py-3 md:grid-cols-[9.5rem_minmax(0,1fr)_7rem_13rem_auto] md:items-center">
        <div>
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_CHIP[r.decision_kind] ?? 'bg-muted'}`}>{KIND_LABELS[r.decision_kind] ?? r.decision_kind}</span>
          {r.fiscal_year && <span className="ml-1 text-[10px] text-muted-foreground">FY{r.fiscal_year}</span>}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{showProject && code ? <Link href={`/projects/${encodeURIComponent(code)}`} className="hover:underline">{code}</Link> : null}{showProject && code ? ' · ' : ''}{r.title}</p>
          <p className="text-[11px] text-muted-foreground">Proposed by {r.proposed_by_name ?? '—'} · {r.proposed_at.slice(0, 10)}</p>
        </div>
        <div className="text-base font-semibold tabular-nums md:text-right">{r.amount != null ? fmtMoney(r.amount) : '—'}</div>
        <div className="text-xs">
          <p><span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${canDecide ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{bodyLabel(gov.bodies, r.required_body_key)}</span>{body && body.quorum > 1 ? <span className="ml-1 text-muted-foreground">quorum {body.quorum}</span> : null}</p>
          {concurrenceState.map(({ k, latest }) => (
            <p key={k} className={latest?.outcome === 'concur' ? 'text-emerald-700' : latest?.outcome === 'object' ? 'text-red-700' : 'text-amber-700'}>{bodyLabel(gov.bodies, k)}: {latest ? `${latest.outcome === 'concur' ? 'concurred' : 'objected'} · ${latest.by_name}` : 'concurrence pending'}</p>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
          {myConcurrences.map((k) => {
            const latest = concurrenceState.find((c) => c.k === k)?.latest;
            const mineDone = latest?.outcome === 'concur' && latest.by_role_id === gov.myRoleId;
            const mineObjected = latest?.outcome === 'object' && latest.by_role_id === gov.myRoleId;
            return (
              <span key={k} className="inline-flex items-center gap-1">
                {mineDone ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900">✓ You concurred</span>
                    <button type="button" disabled={busy} onClick={() => { const n = window.prompt('Withdraw your concurrence — state the objection'); if (n) act({ action: 'concur', body_key: k, outcome: 'object', notes: n }); }} className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">Withdraw</button>
                  </>
                ) : mineObjected ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-900">✕ You objected</span>
                    <button type="button" disabled={busy} onClick={() => act({ action: 'concur', body_key: k, outcome: 'concur' })} className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Concur after all</button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={busy} onClick={() => act({ action: 'concur', body_key: k, outcome: 'concur' })} className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Concur as {bodyLabel(gov.bodies, k)}</button>
                    <button type="button" disabled={busy} onClick={() => { const n = window.prompt('Objection — state the reason'); if (n) act({ action: 'concur', body_key: k, outcome: 'object', notes: n }); }} className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Object</button>
                  </>
                )}
              </span>
            );
          })}
          {canDecide && !open && (
            <button type="button" disabled={busy || objections.length > 0} onClick={() => setOpen(true)} className="rounded bg-foreground px-2.5 py-1 text-xs font-medium text-background disabled:opacity-50">
              Decide{missing.length ? ` (${missing.length} concurrence pending)` : ''}
            </button>
          )}
          {isProposer && <button type="button" disabled={busy} onClick={() => act({ action: 'withdraw' })} className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">Withdraw</button>}
          {!canDecide && myConcurrences.length === 0 && !isProposer && <span className="text-[11px] text-muted-foreground">view only</span>}
          {error && <span className="text-xs text-red-700">{error}</span>}
        </div>
      </div>

      {open && canDecide && (
        <div className="mx-5 mb-3 grid gap-2 rounded-md border bg-white p-3 text-xs sm:grid-cols-3">
          <ProposalSummary r={r} projectStatus={projectStatus} />
          <label className="sm:col-span-3">Attendees (comma-separated){body && body.quorum > 1 ? ` — quorum ${body.quorum}` : ''}<input className="mt-1 w-full rounded border px-2 py-1" value={attendees} onChange={(e) => setAttendees(e.target.value)} /></label>
          <label className="sm:col-span-3">Conditions<input className="mt-1 w-full rounded border px-2 py-1" value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="e.g. subject to benefits owner named before Design review" /></label>
          <label className="sm:col-span-3">Minutes<textarea rows={2} className="mt-1 w-full rounded border px-2 py-1" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            {missing.length > 0 && <p className="mb-1 w-full text-[11px] text-amber-800">Approve unlocks once {missing.map((k) => bodyLabel(gov.bodies, k)).join(', ')} {missing.length > 1 ? 'have' : 'has'} concurred; Return and Reject need no concurrence.</p>}
            <button type="button" title={missing.length > 0 ? 'Waiting for concurrence' : undefined} disabled={busy || missing.length > 0} onClick={() => act({ action: 'decide', outcome: 'approved', attendees: attendees.split(',').map((s) => s.trim()).filter(Boolean), conditions, minutes })} className="rounded bg-emerald-600 px-3 py-1.5 font-medium text-white disabled:opacity-50">Approve</button>
            <button type="button" disabled={busy} onClick={() => act({ action: 'decide', outcome: 'returned', attendees: attendees.split(',').map((s) => s.trim()).filter(Boolean), conditions, minutes })} className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 font-medium text-amber-900 disabled:opacity-50">Return for more work</button>
            <button type="button" disabled={busy} onClick={() => act({ action: 'decide', outcome: 'rejected', attendees: attendees.split(',').map((s) => s.trim()).filter(Boolean), conditions, minutes })} className="rounded border border-red-300 bg-red-50 px-3 py-1.5 font-medium text-red-900 disabled:opacity-50">Reject</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-1.5">Cancel</button>
            {missing.length > 0 && <span className="self-center text-muted-foreground">Approval needs concurrence from {missing.map((k) => bodyLabel(gov.bodies, k)).join(', ')} first.</span>}
          </div>
        </div>
      )}
    </div>
  );
}


/** What the decider is being asked to authorise — read from the proposal payload. */
function ProposalSummary({ r, projectStatus }: { r: DecisionRecord; projectStatus?: Record<string, string> }) {
  const p = (r.proposal ?? {}) as Record<string, unknown>;
  const rows = (p.decisions as Array<{ project_code: string; outcome: 'approve' | 'defer'; amount: number; is_continuation?: boolean }> | undefined) ?? [];
  const label = (k: string) => k.replace(/_/g, ' ');
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 sm:col-span-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">You are deciding</p>
      {rows.length > 0 ? (
        <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
          {rows.map((d) => (
            <li key={d.project_code} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1">
              <span><Link href={`/projects/${encodeURIComponent(d.project_code)}`} className="font-medium hover:underline">{d.project_code}</Link>{d.is_continuation ? <span className="ml-1 rounded bg-sky-100 px-1 text-[10px] text-sky-900">continuation</span> : null}{d.outcome === 'approve' && ['deferred', 'cancelled', 'closed'].includes(projectStatus?.[d.project_code] ?? '') ? <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-900">since {projectStatus?.[d.project_code]} — will be skipped</span> : null}</span>
              <span className="inline-flex items-center gap-2 tabular-nums"><span>{fmtMoney(d.amount)}</span><span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${d.outcome === 'approve' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{d.outcome === 'approve' ? 'fund' : 'defer'}</span></span>
            </li>
          ))}
        </ul>
      ) : (
        <dl className="mt-1.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {r.amount != null && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{r.decision_kind === 'commit_baseline' ? 'Baseline to lock' : 'Amount'}</dt><dd className="font-medium tabular-nums">{fmtMoney(r.amount)}</dd></div>}
          {typeof p.capex_share_pct === 'number' && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Capital share</dt><dd className="font-medium tabular-nums">{p.capex_share_pct}% <span className="font-normal text-muted-foreground">({100 - p.capex_share_pct}% expensed)</span></dd></div>}
          {(() => { const cs = (p.criteria_scores as { must_meet?: Array<{ criterion: string; met: boolean }> } | null)?.must_meet; if (!cs?.length) return null; const met = cs.filter((c) => c.met).length; return <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Exit criteria claimed</dt><dd className={`font-medium tabular-nums ${met < cs.length ? 'text-amber-700' : 'text-emerald-700'}`}>{met}/{cs.length}{met < cs.length ? ` — unmet: ${cs.filter((c) => !c.met).map((c) => c.criterion).join(', ')}` : ''}</dd></div>; })()}
          {Object.entries(p).filter(([k, v]) => !['decisions', 'seed_ref', 'bucket', 'change_order_id', 'allocations', 'capex_share_pct', 'stage_seq', 'criteria_scores'].includes(k) && (typeof v === 'string' || typeof v === 'number')).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2"><dt className="text-muted-foreground">{label(k)}</dt><dd className="max-w-[70%] text-right font-medium">{typeof v === 'number' && k.includes('amount') ? fmtMoney(v) : String(v)}</dd></div>
          ))}
          {Array.isArray(p.allocations) && (p.allocations as Array<{ bucket: string; allocated_amount: number; reserve_amount: number }>).map((a) => (
            <div key={a.bucket} className="flex justify-between gap-2"><dt className="text-muted-foreground">{label(a.bucket)}</dt><dd className="font-medium tabular-nums">{fmtMoney(a.allocated_amount)} <span className="text-muted-foreground">(reserve {fmtMoney(a.reserve_amount)})</span></dd></div>
          ))}
        </dl>
      )}
      {typeof p.rationale === 'string' && rows.length > 0 && <p className="mt-2 text-muted-foreground">{p.rationale}</p>}
    </div>
  );
}
