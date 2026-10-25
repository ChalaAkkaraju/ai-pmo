/**
 * Capital project overview — the project page's Overview tab for a capital
 * project. The front-end-loading track, the AFE and its supplementaries, the
 * asset chain, settlement readiness by WBS, the fixed assets, the decisions,
 * and (for the roles that raise them) the actions that open a decision.
 */

import Link from 'next/link';
import { CapitalChain } from './capital-chain';
import { CapitalActions } from './capital-actions';
import { DecisionsPanel, type GovernanceView } from './decisions-panel';
import {
  SUPPLEMENTARY_TOLERANCE_PCT, asCapitalCase, capexVerdict, fmtDate, fmtMoneyCap,
  type CapitalProjectData, type CapitalProjectView,
} from '@/lib/capital';
import type { DecisionRecord } from '@/lib/types';

const SEV = {
  block: { chip: 'bg-red-600 text-white', box: 'border-red-300 bg-red-50/60', label: 'Blocking' },
  warn: { chip: 'bg-amber-500 text-white', box: 'border-amber-300 bg-amber-50/60', label: 'Warning' },
  info: { chip: 'bg-sky-600 text-white', box: 'border-sky-200 bg-sky-50/60', label: 'Info' },
} as const;

const SANCTION_LABEL: Record<string, string> = { gate_budget: 'FEL study budget', afe: 'AFE', supplementary_afe: 'Supplementary AFE' };

export function CapitalProjectPanel({ project, d, v, records, gov, canPropose }: {
  project: { code: string; name: string; lifecycle_status: string | null; requested_budget: number | null; approved_budget_current: number | null; business_case: unknown; current_stage: number | null };
  d: CapitalProjectData;
  v: CapitalProjectView;
  records: DecisionRecord[];
  gov: GovernanceView;
  canPropose: boolean;
}) {
  const bc = asCapitalCase(project.business_case);
  const verdict = capexVerdict(bc.capex_test);
  const costBy = new Map<string, number>();
  for (const c of d.costs) costBy.set(c.wbs_code, (costBy.get(c.wbs_code) ?? 0) + Number(c.actual_cost));
  const settledBy = new Map<string, number>();
  for (const s of d.settlements) settledBy.set(s.wbs_code, (settledBy.get(s.wbs_code) ?? 0) + Number(s.settled_to_auc) + Number(s.expensed));
  const leaves = d.wbs.filter((w) => w.parent_wbs_code);
  const stages = d.template?.stages ?? [];
  const closed = ['closed', 'cancelled'].includes(project.lifecycle_status ?? '');

  return (
    <div className="space-y-6">
      {v.findings.length > 0 && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Settlement readiness <span className="text-xs font-normal text-muted-foreground">· {v.findings.filter((f) => f.severity === 'block').length} blocking · {v.findings.filter((f) => f.severity === 'warn').length} warnings</span></h2>
          <ul className="mt-3 space-y-2">
            {v.findings.map((f) => (
              <li key={f.key} className={`rounded-lg border px-3 py-2 text-sm ${SEV[f.severity].box}`}>
                <p className="font-medium"><span className={`mr-2 rounded px-1.5 py-px text-[10px] font-semibold uppercase ${SEV[f.severity].chip}`}>{SEV[f.severity].label}</span>{f.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{f.detail}</p>
                {f.wbs?.length ? <p className="mt-0.5 font-mono text-[11px]">{f.wbs.join(' · ')}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Front-end loading</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Study money is released stage by stage; the AFE is sanctioned at the commit gate.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stages.map((st) => {
            const dec = d.decisions.filter((x) => x.stage_seq === st.seq).slice(-1)[0] ?? null;
            const current = st.seq === (project.current_stage ?? 0) && !closed;
            const tone = dec?.decision === 'kill' ? 'border-rose-300 bg-rose-50 text-rose-800' : dec?.decision === 'go' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : dec?.decision === 'hold' ? 'border-amber-300 bg-amber-50 text-amber-800' : current ? 'border-blue-300 bg-blue-50 text-blue-800' : 'bg-muted/50 text-muted-foreground';
            return (
              <div key={st.seq} className={`min-w-[150px] rounded-md border px-2.5 py-1.5 text-[11px] ${tone}`}>
                <p className="font-medium">{st.name}{st.is_commit && <span className="ml-1 rounded bg-indigo-600 px-1 text-[9px] font-semibold text-white">AFE</span>}</p>
                <p>{dec ? `${dec.decision.toUpperCase()} · ${fmtDate(dec.decided_on)}` : current ? 'in progress' : 'not started'}</p>
                {dec?.decided_by && <p className="text-[10px] opacity-80">{dec.decided_by}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {v.committed && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">The asset chain</h2>
            <p className={`text-xs ${v.trigger.needed ? 'font-semibold text-red-700' : 'text-muted-foreground'}`}>
              EAC {fmtMoneyCap(bc.eac)} vs {fmtMoneyCap(v.chain.appropriated)} appropriated{v.trigger.over_pct !== null ? ` (${v.trigger.over_pct > 0 ? '+' : ''}${v.trigger.over_pct}%, tolerance ${SUPPLEMENTARY_TOLERANCE_PCT}%)` : ''}
            </p>
          </div>
          <div className="mt-3"><CapitalChain chain={v.chain} eac={bc.eac ?? null} /></div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">What was authorised</h2>
          {d.sanctions.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing released yet. A major project's first FEL gate releases a study budget; a minor project goes straight to its AFE.</p> : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-1">Sanction</th><th className="py-1 text-right">Amount</th><th className="py-1">By</th><th className="py-1">On</th></tr></thead>
              <tbody>
                {d.sanctions.map((s) => (
                  <tr key={s.id} className="border-t align-top">
                    <td className="py-1.5">{SANCTION_LABEL[s.kind] ?? s.kind} v{s.version}{s.notes && <span className="block text-[11px] text-muted-foreground">{s.notes}</span>}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmtMoneyCap(s.amount)}</td>
                    <td className="py-1.5 text-xs">{s.authorised_by ?? '—'}</td>
                    <td className="py-1.5 text-xs tabular-nums">{fmtDate(s.authorised_on)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">The case</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Capex test</dt><dd className={verdict.verdict === 'capex' ? 'text-emerald-700' : verdict.verdict === 'mixed' ? 'text-amber-700' : 'text-red-700'}>{verdict.verdict.toUpperCase()}</dd>
            <dt className="text-muted-foreground">Estimate</dt><dd className="tabular-nums">{fmtMoneyCap(project.requested_budget)} · class {bc.estimate_class ?? '—'}</dd>
            <dt className="text-muted-foreground">NPV · IRR</dt><dd className="tabular-nums">{fmtMoneyCap(bc.npv)} · {bc.irr_pct ?? '—'}%</dd>
            <dt className="text-muted-foreground">Payback</dt><dd className="tabular-nums">{bc.payback_months ?? '—'} months</dd>
            <dt className="text-muted-foreground">Asset</dt><dd>{bc.asset_class ?? '—'} · {bc.useful_life_years ?? '—'} yrs</dd>
            <dt className="text-muted-foreground">Expected expensed</dt><dd className="tabular-nums">{bc.expected_expense_pct ?? 10}%</dd>
            <dt className="text-muted-foreground">In service</dt><dd>{fmtDate(bc.in_service_date)}{bc.planned_in_service_date && bc.planned_in_service_date !== bc.in_service_date ? <span className="text-amber-700"> (AFE: {fmtDate(bc.planned_in_service_date)})</span> : null}</dd>
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">{verdict.reason}</p>
        </section>
      </div>

      {leaves.length > 0 && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Settlement by WBS element <span className="text-xs font-normal text-muted-foreground">· rules and postings read from SAP PS</span></h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-1">WBS</th><th className="py-1">Element</th><th className="py-1 text-right">Budget</th><th className="py-1 text-right">Actual</th><th className="py-1 text-right">Settled</th><th className="py-1">Settlement rule</th></tr></thead>
              <tbody>
                {leaves.map((w) => {
                  const rules = d.rules.filter((r) => r.wbs_code === w.wbs_code);
                  const sum = rules.reduce((n, r) => n + Number(r.percent), 0);
                  const actual = costBy.get(w.wbs_code) ?? 0;
                  const missing = actual > 0 && rules.length === 0 && v.committed;
                  return (
                    <tr key={w.wbs_code} className={`border-t ${missing ? 'bg-red-50/60' : ''}`}>
                      <td className="py-1.5 font-mono text-xs">{w.wbs_code}</td>
                      <td className="py-1.5">{w.name}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtMoneyCap(w.budget_bac)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtMoneyCap(actual)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtMoneyCap(settledBy.get(w.wbs_code) ?? 0)}</td>
                      <td className="py-1.5 text-xs">
                        {rules.length === 0 ? <span className={missing ? 'font-semibold text-red-700' : 'text-muted-foreground'}>{missing ? 'No rule — cost cannot settle' : '—'}</span>
                          : <>{rules.map((r) => `${r.percent}% → ${r.receiver_type === 'auc' ? 'AuC' : r.receiver_type === 'fixed_asset' ? 'asset' : 'cost centre'} ${r.receiver_id}`).join(' · ')}{Math.abs(sum - 100) > 0.01 && <span className="ml-1 font-semibold text-amber-700">({sum}%)</span>}</>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {d.assets.length > 0 && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Fixed assets <span className="text-xs font-normal text-muted-foreground">· from the asset register</span></h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1">Asset</th><th className="py-1">Description</th><th className="py-1">Class</th><th className="py-1 text-right">Life</th><th className="py-1 text-right">Value</th><th className="py-1">Status</th></tr></thead>
            <tbody>{d.assets.map((a) => (
              <tr key={a.asset_number} className="border-t"><td className="py-1.5 font-mono text-xs">{a.asset_number}</td><td className="py-1.5">{a.description}</td><td className="py-1.5 text-xs">{a.asset_class ?? '—'}</td><td className="py-1.5 text-right tabular-nums">{a.useful_life_years ?? '—'} yrs</td><td className="py-1.5 text-right tabular-nums">{fmtMoneyCap(a.acquisition_value)}</td><td className="py-1.5 text-xs">{a.status === 'capitalised' ? `capitalised ${fmtDate(a.capitalisation_date)}` : a.status === 'auc' ? 'under construction' : 'retired'}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}

      {canPropose && !closed && (
        <CapitalActions
          projectCode={project.code}
          stageName={v.stageName}
          isCommitStage={v.isCommitStage}
          committed={v.committed}
          estimate={Number(project.requested_budget ?? 0)}
          appropriated={v.chain.appropriated}
          eac={bc.eac ?? null}
          triggerNeeded={v.trigger.needed}
          onHold={project.lifecycle_status === 'on_hold'}
          openKinds={records.filter((r) => r.status === 'proposed').map((r) => r.decision_kind)}
        />
      )}

      <section id="decisions">
        <DecisionsPanel records={records} gov={gov} showProject={false} title="Decisions on this project" emptyText="No decisions recorded yet." />
      </section>
      <p className="text-[11px] text-muted-foreground">Open the <Link href="/portfolio/capital" className="underline">capital portfolio</Link> for the envelope, the whole chain and every open decision.</p>
    </div>
  );
}
