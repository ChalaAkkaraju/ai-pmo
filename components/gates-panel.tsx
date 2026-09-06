'use client';

/**
 * Gates tab — stage-gate progression for non-revenue projects.
 *
 * Reads the project's stage template (chosen by category) and its gate
 * decisions; lets a writing role score the current gate's exit criteria and
 * record a decision through POST /api/gates. At the commit gate a GO locks the
 * baseline (an 'sg1_baseline' sanction event) — the amount and capital share
 * are entered here.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthorityRule, BenefitsReport, DecisionRecord, GateDecision, PortfolioAllocation, Project, ResourceDisplacement, SanctionEvent, StageTemplate } from '@/lib/types';
import { commitStage, gateStatusLabel, isCommitted, latestDecision, stageAt } from '@/lib/stage-gates';
import { fmtMoney, lifecycleLabel } from '@/lib/it-portfolio';
import { DecisionsPanel, bodyLabel, type GovernanceView } from './decisions-panel';

export interface GatesPanelProps {
  projectCode: string;
  canWrite: boolean;
  gates: {
    project: Pick<Project, 'name' | 'code' | 'client' | 'project_category' | 'portfolio_bucket' | 'fiscal_year' | 'fiscal_years_approved' | 'lifecycle_status' | 'current_stage' | 'requested_budget' | 'approved_budget_current' | 'business_case' | 'continuation_of_id'>;
    template: StageTemplate | null;
    decisions: GateDecision[];
    sanctionEvents: SanctionEvent[];
    allocation: PortfolioAllocation | null;
    /** Governance (migration 0046): decision records for this project, the matrix, and what the signed-in role may decide. */
    records: DecisionRecord[];
    matrix: AuthorityRule[];
    gov: GovernanceView;
    displacements: ResourceDisplacement[];
    benefits: BenefitsReport[];
  };
}

type Outcome = 'go' | 'hold' | 'kill' | 'recycle' | 'resume';

export function GatesPanel({ projectCode, canWrite, gates }: GatesPanelProps) {
  const router = useRouter();
  const { project, template, decisions } = gates;
  const currentSeq = project.current_stage ?? 0;
  const current = stageAt(template, currentSeq);
  const commit = commitStage(template);
  const committed = isCommitted(template, decisions);
  const closedOrCancelled = project.lifecycle_status === 'closed' || project.lifecycle_status === 'cancelled';

  const [met, setMet] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [baseline, setBaseline] = useState<string>(String(project.requested_budget ?? ''));
  const [capex, setCapex] = useState<string>(String(project.business_case?.capex_share_pct ?? ''));
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [holdUntil, setHoldUntil] = useState<string>(() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().slice(0, 10); });
  const pendingCommit = gates.records.find((r) => r.status === 'proposed' && r.decision_kind === 'commit_baseline');
  const pendingHold = gates.records.find((r) => r.status === 'proposed' && r.decision_kind === 'hold');
  const pendingCancel = gates.records.find((r) => r.status === 'proposed' && r.decision_kind === 'cancel');
  const pendingHoldOrCancel = gates.records.find((r) => r.status === 'proposed' && (r.decision_kind === 'hold' || r.decision_kind === 'cancel'));
  const commitRule = (amount: number) => {
    const rows = gates.matrix.filter((r) => r.decision_kind === 'commit_baseline' && amount >= Number(r.min_amount) && (r.max_amount == null || amount < Number(r.max_amount)));
    return rows[0] ?? null;
  };

  const criteria = current?.exit_criteria ?? [];
  const metCount = criteria.filter((c) => met[c]).length;
  // A Go needs every exit criterion ticked — the gate is the discipline. Hold,
  // Recycle and Cancel stay available when the package is not ready.
  const allMet = criteria.length === 0 || metCount === criteria.length;
  const atCommit = Boolean(current?.is_commit);
  const envelope = useMemo(() => {
    const ev = gates.sanctionEvents.filter((e) => e.kind === 'waterline_envelope' || e.kind === 'continuation').sort((a, b) => b.version - a.version);
    return ev[0] ?? null;
  }, [gates.sanctionEvents]);
  const baselineNum = Number(baseline || 0);
  const overEnvelope = envelope && baselineNum > Number(envelope.amount) * 1.1;

  async function decide(outcome: Outcome) {
    if (!current) return;
    setBusy(outcome); setError(null); setInfo(null);
    try {
      const res = await fetch('/api/gates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_code: projectCode, stage_seq: current.seq, decision: outcome, notes: notes || null,
          criteria_scores: { must_meet: criteria.map((c) => ({ criterion: c, met: Boolean(met[c]) })) },
          baseline_amount: atCommit && outcome === 'go' ? baselineNum : null,
          capex_share_pct: atCommit && outcome === 'go' && capex !== '' ? Number(capex) : null,
          hold_until: outcome === 'hold' ? holdUntil : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not record decision');
      if (json.applied === false && json.requires) setInfo(`Submitted for decision by ${bodyLabel(gates.gov.bodies, json.requires)} — it appears in the decisions queue below and on the IT portfolio page.`);
      setNotes(''); setMet({});
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!template) {
    return <p className="text-sm text-muted-foreground">This project has no stage template yet — set its category to attach one.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{template.name} · stage template</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${committed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
            {committed ? 'Committed — baseline locked' : 'Pre-commit'}
          </span>
        </div>
        <ol className="mt-4 flex flex-wrap gap-2">
          {template.stages.map((s) => {
            const d = latestDecision(decisions, s.seq);
            const state = closedOrCancelled && s.seq >= currentSeq ? 'stopped' : s.seq < currentSeq ? 'done' : s.seq === currentSeq ? 'current' : 'todo';
            const cls = state === 'done' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : state === 'current' ? 'border-foreground bg-foreground text-background' : state === 'stopped' ? 'border-red-200 bg-red-50 text-red-900' : 'border-dashed text-muted-foreground';
            return (
              <li key={s.seq} className={`min-w-[9.5rem] flex-1 rounded-md border px-3 py-2 text-xs ${cls}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{s.seq}. {s.name}</span>
                  {s.is_commit && <span className="rounded bg-amber-400/90 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-950">commit</span>}
                </div>
                <div className={`mt-0.5 text-[11px] ${state === 'current' ? 'text-background/80' : 'opacity-80'}`}>{s.gate_name}</div>
                {d && <div className="mt-1 text-[11px] font-medium">{gateStatusLabel(d.decision)} · {d.decided_on}</div>}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Current gate */}
      {current && !closedOrCancelled && (
        <section className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Current gate</p>
              <h3 className="text-lg font-semibold">{current.gate_name}</h3>
              <p className="text-xs text-muted-foreground">Stage {current.seq} · {current.name} · attendees: {current.attendees.join(', ')}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Lifecycle: <span className="font-medium text-foreground">{lifecycleLabel(project.lifecycle_status)}</span></div>
              {envelope && <div>Envelope FY{envelope.fiscal_year}: <span className="font-medium text-foreground">{fmtMoney(envelope.amount)}</span></div>}
              {committed && <div>Baseline: <span className="font-medium text-foreground">{fmtMoney(project.approved_budget_current)}</span></div>}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exit criteria · {metCount}/{criteria.length} met{!allMet && canWrite ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium normal-case tracking-normal text-amber-900">tick every criterion to enable Go · otherwise Hold or Recycle</span> : null}</p>
            <ul className="mt-2 space-y-1.5">
              {criteria.map((c) => (
                <li key={c}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5" disabled={!canWrite} checked={Boolean(met[c])} onChange={(e) => setMet((m) => ({ ...m, [c]: e.target.checked }))} />
                    <span>{c}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {atCommit && (
            <div className="mt-4 grid gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-3 sm:grid-cols-3">
              <div className="sm:col-span-3 text-xs text-amber-900">
                A <strong>Go</strong> here locks scope and budget: the amount becomes the SG1 baseline (a sanction event) and later changes are change orders.
                {(() => { const r = commitRule(baselineNum); return r ? <span className="ml-1">At {fmtMoney(baselineNum)} this is decided by <strong>{bodyLabel(gates.gov.bodies, r.required_body_key === 'bucket_owner:*' ? `bucket_owner:${project.portfolio_bucket ?? 'unassigned'}` : r.required_body_key)}</strong>{r.required_concurrences.length ? ` with concurrence from ${r.required_concurrences.map((k) => bodyLabel(gates.gov.bodies, k)).join(', ')}` : ''}.</span> : null; })()}
                {overEnvelope && <span className="ml-1 font-semibold text-red-700">Baseline exceeds the fiscal-year envelope by more than 10% — return to portfolio rather than Go.</span>}
              </div>
              <label className="text-xs">
                <span className="block font-medium">Baseline amount</span>
                <input type="number" className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm" value={baseline} disabled={!canWrite} onChange={(e) => setBaseline(e.target.value)} />
              </label>
              <label className="text-xs">
                <span className="block font-medium">Capital share %</span>
                <input type="number" min={0} max={100} className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm" value={capex} disabled={!canWrite} onChange={(e) => setCapex(e.target.value)} />
              </label>
              <div className="text-xs text-muted-foreground sm:pt-5">Requested at intake: {fmtMoney(project.requested_budget)}</div>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="font-medium">Hold until (time box)</span>
              <input type="date" className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm" value={holdUntil} disabled={!canWrite} onChange={(e) => setHoldUntil(e.target.value)} />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2 sm:pt-5">A hold names its trigger in the notes and expires on this date — then the project re-enters through the continuation gate or is cancelled. {committed ? 'Post-commit: bucket owner decides; cancellation goes to the investment board with Finance.' : 'Pre-commit: the sponsor decides; cancellation is the bucket owner\u2019s.'}</p>
          </div>
          <label className="mt-4 block text-xs">
            <span className="font-medium">Decision notes</span>
            <textarea className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm" rows={2} value={notes} disabled={!canWrite} onChange={(e) => setNotes(e.target.value)} placeholder="Conditions, hold trigger and time box, or why the gate was recycled" />
          </label>

          {pendingCommit && <p className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">Commit baseline of {fmtMoney(pendingCommit.amount)} is awaiting decision by <strong>{bodyLabel(gates.gov.bodies, pendingCommit.required_body_key)}</strong> — see the decisions queue below.</p>}
          {pendingHoldOrCancel && <p className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">A {pendingHoldOrCancel.decision_kind} request is awaiting <strong>{bodyLabel(gates.gov.bodies, pendingHoldOrCancel.required_body_key)}</strong>.</p>}
          {info && <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{info}</p>}
          {canWrite ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" title={!allMet ? `${criteria.length - metCount} exit criteria not yet met` : undefined} disabled={busy !== null || !allMet || (atCommit && (Boolean(overEnvelope) || Boolean(pendingCommit)))} onClick={() => decide('go')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
                {busy === 'go' ? 'Recording…' : atCommit ? 'Go — submit baseline for decision' : current.seq === template.stages.length - 1 ? 'Go — close project' : 'Go'}
              </button>
              {project.lifecycle_status === 'on_hold' && (
                <button type="button" disabled={busy !== null} onClick={() => decide('resume')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">{busy === 'resume' ? 'Lifting…' : 'Lift hold — resume'}</button>
              )}
              <button type="button" title={pendingHold ? 'A hold request is already awaiting decision' : !notes.trim() ? 'Name the trigger in the decision notes first' : undefined} disabled={busy !== null || Boolean(pendingHold) || !notes.trim() || project.lifecycle_status === 'on_hold'} onClick={() => decide('hold')} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50">Hold</button>
              <button type="button" disabled={busy !== null} onClick={() => decide('recycle')} className="rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50">Recycle</button>
              <button type="button" title={pendingCancel ? 'A cancellation is already awaiting decision' : !notes.trim() ? 'State the reason in the decision notes first' : undefined} disabled={busy !== null || Boolean(pendingCancel) || !notes.trim()} onClick={() => decide('kill')} className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-900 transition hover:bg-red-100 disabled:opacity-50">Cancel project</button>
              {error && <span className="self-center text-xs text-red-700">{error}</span>}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">Your role can view gates but not record decisions.</p>
          )}
        </section>
      )}

      {closedOrCancelled && (
        <section className="rounded-lg border bg-muted/30 p-4 text-sm">
          This project is <strong>{lifecycleLabel(project.lifecycle_status)}</strong>. {project.lifecycle_status === 'cancelled' ? 'Settle the AuC (capitalise what is usable, write off the rest) and close the SAP project.' : 'AuC settled and handed over; benefits tracking runs from here.'}
        </section>
      )}

      {/* Governance decisions for this project */}
      <DecisionsPanel records={gates.records} gov={gates.gov} title="Funding & governance decisions" showProject={false} emptyText="No governed decisions yet — the waterline, the commit gate, holds, cancellations and change orders create them." />

      {/* History */}
      <section>
        <h3 className="text-sm font-semibold">Gate history</h3>
        {decisions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No gate decisions recorded yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left">
                <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Gate</th><th className="px-3 py-2">Decision</th><th className="px-3 py-2">By</th><th className="px-3 py-2">Criteria met</th><th className="px-3 py-2">Hold until</th><th className="px-3 py-2">Notes</th></tr>
              </thead>
              <tbody>
                {[...decisions].sort((a, b) => (a.decided_on < b.decided_on ? 1 : -1)).map((d) => {
                  const mm = d.criteria_scores?.must_meet ?? [];
                  return (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2 tabular-nums">{d.decided_on}</td>
                      <td className="px-3 py-2">{d.gate_name}</td>
                      <td className="px-3 py-2 font-medium">{gateStatusLabel(d.decision)}</td>
                      <td className="px-3 py-2">{d.decided_by ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{mm.length ? `${mm.filter((m) => m.met).length}/${mm.length}` : '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{d.hold_until ?? ''}</td>
                      <td className="px-3 py-2 text-muted-foreground">{d.notes ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sanction events */}
      <section>
        <h3 className="text-sm font-semibold">Authorisations (sanction events)</h3>
        {gates.sanctionEvents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing authorised yet — the waterline grants the fiscal-year envelope; {commit ? commit.gate_name : 'the commit gate'} locks the baseline.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left">
                <tr><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Version</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">FY</th><th className="px-3 py-2">Body</th><th className="px-3 py-2">By</th><th className="px-3 py-2">On</th><th className="px-3 py-2">Notes</th></tr>
              </thead>
              <tbody>
                {[...gates.sanctionEvents].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{e.kind.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 tabular-nums">v{e.version}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtMoney(e.amount)}</td>
                    <td className="px-3 py-2 tabular-nums">{e.fiscal_year ?? '—'}</td>
                    <td className="px-3 py-2">{e.authorised_by_body ? bodyLabel(gates.gov.bodies, e.authorised_by_body) : '—'}</td>
                    <td className="px-3 py-2">{e.authorised_by ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{e.authorised_on ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
