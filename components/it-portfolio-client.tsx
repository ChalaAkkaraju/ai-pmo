'use client';

/**
 * IT portfolio workspace — the annual cycle in one place.
 *
 *   • Envelope: allocation and reserve per bucket for the fiscal year
 *     (editable by the IT Portfolio Manager).
 *   • Ranking: projects ranked within each bucket, the waterline drawn by
 *     money, continuations flagged, the first project below the line and its
 *     shortfall shown.
 *   • Decisions: approve (grant envelope) or defer, recorded through
 *     POST /api/portfolio/it — the case is kept either way.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AuthorityRule, DecisionBody, PortfolioAllocation, Project } from '@/lib/types';
import { bodyLabel } from './decisions-panel';
import { IT_BUCKETS, bucketLabel, bucketStyle, categoryLabel, fmtMoney, lifecycleLabel, rankFiscalYear, valueTypeLabel, type RankedProject } from '@/lib/it-portfolio';

type P = RankedProject['project'] & Pick<Project, 'client' | 'current_stage' | 'approved_budget_current'>;

export function ItPortfolioClient({ part, fiscalYear, projects, allocations, canManage, bodies, matrix, myRoleType }: {
  /** 'buckets' renders the envelope cards (editable); 'ranking' the waterline tables and running projects. */
  part: 'buckets' | 'ranking' | 'running';
  fiscalYear: number;
  projects: P[];
  allocations: PortfolioAllocation[];
  canManage: boolean;
  bodies: DecisionBody[];
  matrix: AuthorityRule[];
  myRoleType: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const envelopeStatus = allocations.filter((a) => a.fiscal_year === fiscalYear).some((a) => (a.status ?? 'approved') !== 'approved') ? 'proposed' : 'approved';
  const bodyFor = (kind: 'waterline_approval' | 'continuation', amount: number, bucket: string) => {
    const r = matrix.filter((x) => x.decision_kind === kind && amount >= Number(x.min_amount) && (x.max_amount == null || amount < Number(x.max_amount)))[0];
    return r ? bodyLabel(bodies, r.required_body_key === 'bucket_owner:*' ? `bucket_owner:${bucket}` : r.required_body_key) : '—';
  };
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [alloc, setAlloc] = useState<Record<string, { allocated: string; reserve: string; mandatory: boolean }>>(() => {
    const m: Record<string, { allocated: string; reserve: string; mandatory: boolean }> = {};
    for (const b of IT_BUCKETS) {
      const a = allocations.find((x) => x.fiscal_year === fiscalYear && x.bucket === b);
      m[b] = { allocated: String(a?.allocated_amount ?? ''), reserve: String(a?.reserve_amount ?? ''), mandatory: a?.is_mandatory_lane ?? b === 'compliance' };
    }
    return m;
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ranking = useMemo(() => rankFiscalYear(projects, allocations, fiscalYear), [projects, allocations, fiscalYear]);
  const totals = ranking.reduce((t, b) => ({ allocated: t.allocated + Number(b.allocation?.allocated_amount ?? 0), reserve: t.reserve + Number(b.allocation?.reserve_amount ?? 0), requested: t.requested + b.requested, funded: t.funded + b.funded_amount, deferred: t.deferred + b.rows.filter((r) => !r.funded).length, n: t.n + b.rows.length }), { allocated: 0, reserve: 0, requested: 0, funded: 0, deferred: 0, n: 0 });
  const inYear = projects.filter((p) => p.fiscal_year === fiscalYear);
  const running = projects.filter((p) => p.lifecycle_status === 'active' || p.lifecycle_status === 'on_hold');
  const continuationsNeeded = running.filter((p) => (p.fiscal_years_approved ?? []).length > 0 && !(p.fiscal_years_approved ?? []).includes(fiscalYear) && p.fiscal_year !== fiscalYear);

  async function saveAllocations() {
    setBusy('alloc'); setError(null);
    try {
      const res = await fetch('/api/portfolio/it', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscal_year: fiscalYear, allocations: IT_BUCKETS.map((b) => ({ bucket: b, allocated_amount: Number(alloc[b].allocated || 0), reserve_amount: Number(alloc[b].reserve || 0), is_mandatory_lane: alloc[b].mandatory })) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Could not save');
      setNotice(j.applied ? 'Envelope approved and applied.' : `Envelope proposed — awaiting ${bodyLabel(bodies, j.requires)}.`);
      setEditing(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  async function decide(codes: string[], outcome: 'approve' | 'defer', also: Array<{ project_code: string; outcome: 'approve' | 'defer' }> = []) {
    setBusy(outcome); setError(null);
    try {
      const res = await fetch('/api/portfolio/it', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscal_year: fiscalYear, decisions: [...codes.map((c) => ({ project_code: c, outcome })), ...also] }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? (j.results ?? []).find((r: { error?: string }) => r.error)?.error ?? 'Some decisions failed');
      const pending = (j.results ?? []).filter((r: { applied: boolean }) => !r.applied);
      setNotice(pending.length ? `${pending.length} decision(s) proposed — awaiting ${Array.from(new Set(pending.map((r: { requires: string | null }) => bodyLabel(bodies, r.requires ?? '')))).join(', ')}. See the decisions queue.` : 'Applied — you hold the authority for these.');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  // A row needs a decision this year if it is a new submission, or a running
  // project's next-year slice that has not been re-approved yet (continuation).
  const needsDecision = (r: RankedProject) => r.project.lifecycle_status === 'proposed'
    || ((r.project.lifecycle_status === 'active' || r.project.lifecycle_status === 'on_hold') && r.is_continuation && !(r.project.fiscal_years_approved ?? []).includes(fiscalYear));
  const pendingAbove = ranking.flatMap((b) => b.rows.filter((r) => r.funded && needsDecision(r)).map((r) => r.project.code));
  const pendingBelow = ranking.flatMap((b) => b.rows.filter((r) => !r.funded && r.project.lifecycle_status !== 'deferred' && needsDecision(r)).map((r) => r.project.code));

  if (part === 'buckets') {
    return (
      <section id="buckets">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">
            Buckets · FY{fiscalYear} envelope
            <span className={`ml-2 rounded px-1.5 py-px text-[10px] font-medium normal-case tracking-normal ${envelopeStatus === 'approved' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{envelopeStatus === 'approved' ? 'approved by the board' : 'proposed — awaiting the board'}</span>
          </h2>
          {canManage && (editing ? (
            <div className="flex gap-2">
              <button type="button" onClick={saveAllocations} disabled={busy !== null} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50">{busy === 'alloc' ? 'Saving…' : envelopeStatus === 'approved' ? 'Propose envelope' : 'Approve envelope'}</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-md border px-3 py-1.5 text-xs font-medium">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">{envelopeStatus === 'approved' ? 'Propose a change' : 'Edit proposal'}</button>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
        {notice && <p className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">{notice}</p>}
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {IT_BUCKETS.map((b) => {
            const r = ranking.find((x) => x.bucket === b);
            const st = bucketStyle(b);
            const a = alloc[b];
            const allocated = Number(r?.allocation?.allocated_amount ?? 0), reserve = Number(r?.allocation?.reserve_amount ?? 0);
            const fundable = Math.max(0, allocated - reserve);
            const funded = r?.funded_amount ?? 0;
            const belowAmt = (r?.rows ?? []).filter((x) => !x.funded).reduce((n, x) => n + x.amount, 0);
            const unalloc = Math.max(0, fundable - funded);
            const scale = Math.max(1, fundable + belowAmt);
            const above = r?.rows.filter((x) => x.funded).length ?? 0;
            const belowN = (r?.rows.length ?? 0) - above;
            const decidedBy = r ? bodyFor('waterline_approval', funded, b) : '—';
            return (
              <a key={b} id={`bucket-${b}`} href={`#rank-${b}`} className="relative overflow-hidden rounded-lg border bg-card p-4 text-left transition hover:border-foreground/30 hover:shadow-sm">
                <span className={`absolute left-0 top-0 h-full w-1.5 ${st.accentBar}`} />
                <div className="pl-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{st.label}</span>
                    {r?.allocation?.is_mandatory_lane ? <span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-900">mandatory lane</span> : <span className="text-base text-muted-foreground/50">▸</span>}
                  </div>
                  {editing ? (
                    <div className="mt-2 space-y-1.5 text-xs" onClick={(e) => e.preventDefault()}>
                      <label className="block">Allocated<input type="number" className="mt-0.5 w-full rounded border px-2 py-1" value={a.allocated} onChange={(e) => setAlloc((m) => ({ ...m, [b]: { ...m[b], allocated: e.target.value } }))} /></label>
                      <label className="block">Reserve<input type="number" className="mt-0.5 w-full rounded border px-2 py-1" value={a.reserve} onChange={(e) => setAlloc((m) => ({ ...m, [b]: { ...m[b], reserve: e.target.value } }))} /></label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={a.mandatory} onChange={(e) => setAlloc((m) => ({ ...m, [b]: { ...m[b], mandatory: e.target.checked } }))} />Mandatory lane</label>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 text-4xl font-semibold tabular-nums">{r?.rows.length ?? 0}</p>
                      <p className="text-sm text-muted-foreground">submitted · {fmtMoney(r?.requested ?? 0)} requested</p>
                      <div className="mt-4">
                        <div className="flex h-6 w-full overflow-hidden rounded-md bg-muted">
                          {funded > 0 && <div className="flex items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${(funded / scale) * 100}%`, backgroundColor: st.hex }}>{above}</div>}
                          {unalloc > 0 && <div className="flex items-center justify-center bg-emerald-200 text-[11px] font-semibold text-emerald-900" style={{ width: `${(unalloc / scale) * 100}%` }} />}
                          {belowAmt > 0 && <div className="flex items-center justify-center bg-amber-300 text-[11px] font-semibold text-amber-950" style={{ width: `${(belowAmt / scale) * 100}%` }}>{belowN}</div>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.hex }} />Above the line</span>
                          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Unallocated</span>
                          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />Below</span>
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                        <div><dt className="text-muted-foreground">Envelope</dt><dd className="font-medium tabular-nums">{fmtMoney(allocated)}</dd></div>
                        <div><dt className="text-muted-foreground">Reserve</dt><dd className="font-medium tabular-nums">{fmtMoney(reserve)}</dd></div>
                        <div><dt className="text-muted-foreground">{r?.first_below ? 'Short by' : 'Headroom'}</dt><dd className={`font-medium tabular-nums ${r?.first_below ? 'text-amber-700' : 'text-emerald-700'}`}>{fmtMoney(r?.first_below ? r.shortfall : unalloc)}</dd></div>
                      </dl>
                      <p className="mt-2 text-[11px] text-muted-foreground">Waterline decided by {decidedBy}</p>
                    </>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {/* Ranking */}
      {part === 'ranking' && <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Ranking within bucket · waterline by money</h2>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy !== null || pendingAbove.length === 0} onClick={() => decide(pendingAbove, 'approve', pendingBelow.map((c) => ({ project_code: c, outcome: 'defer' as const })))} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{busy === 'approve' ? 'Submitting…' : `Submit waterline — fund ${pendingAbove.length} above, defer ${pendingBelow.length} below`}</button>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
        {notice && <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">{notice}</p>}
        {inYear.length === 0 && <p className="text-sm text-muted-foreground">No submissions for FY{fiscalYear} yet. <Link href="/intake/it" className="underline">Submit one</Link>.</p>}
        {ranking.filter((b) => b.rows.length > 0).map((b) => (
          <details key={b.bucket} id={`rank-${b.bucket}`} open className="relative overflow-hidden rounded-lg border bg-card shadow-sm">
            <span className={`absolute left-0 top-0 h-full w-1.5 ${bucketStyle(b.bucket).accentBar}`} />
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-3 [&::-webkit-details-marker]:hidden" style={{ backgroundColor: `${bucketStyle(b.bucket).hex}12` }}>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bucketStyle(b.bucket).hex }} />
                <p className="text-base font-semibold" style={{ color: bucketStyle(b.bucket).hex }}>{b.label}</p>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-foreground">{b.rows.filter((r) => r.funded).length} above · {b.rows.filter((r) => !r.funded && r.project.lifecycle_status !== 'deferred').length} below{b.rows.some((r) => r.project.lifecycle_status === 'deferred') ? ` · ${b.rows.filter((r) => r.project.lifecycle_status === 'deferred').length} parked` : ''}</span>
                <span className="text-xs text-muted-foreground">fundable <strong className="text-foreground">{fmtMoney(b.fundable)}</strong> · requested <strong className="text-foreground">{fmtMoney(b.requested)}</strong></span>
              </div>
              <div className="text-right text-xs">
                {b.first_below ? (
                  <p className="text-amber-800">First below the line: <strong>{b.first_below.project.code}</strong> — short by {fmtMoney(b.shortfall)}</p>
                ) : (
                  <p className="text-emerald-800">Everything submitted fits under the line · {fmtMoney(b.remaining)} left</p>
                )}
                <p className="text-muted-foreground">Decided by {bodyFor('waterline_approval', b.rows.filter((r) => r.funded && !r.is_continuation).reduce((n, r) => n + r.amount, 0), b.bucket)}{b.rows.some((r) => r.is_continuation) ? ` · continuations by ${bodyFor('continuation', b.rows.filter((r) => r.funded && r.is_continuation).reduce((n, r) => n + r.amount, 0), b.bucket)} with Finance` : ''}</p>
              </div>
            </summary>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="px-4 py-2">#</th><th className="px-2 py-2">Project</th><th className="px-2 py-2">Category</th><th className="px-2 py-2">Value</th><th className="px-2 py-2 text-right">Score</th><th className="px-2 py-2 text-right">Requested</th><th className="px-2 py-2 text-right">Cumulative</th><th className="px-2 py-2">Lifecycle</th><th className="px-2 py-2">Line</th>{canManage && <th className="px-2 py-2"></th>}</tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => {
                  const parked = r.project.lifecycle_status === 'deferred';
                  const waterlineHere = !r.funded && !parked && (i === 0 || b.rows[i - 1].funded);
                  return (
                    <tr key={r.project.code} className={`border-t ${waterlineHere ? 'border-t-2 border-t-amber-500' : ''} ${r.funded ? '' : 'bg-amber-50/30 text-muted-foreground'}`}>
                      <td className="px-4 py-2 tabular-nums">{r.rank}</td>
                      <td className="px-2 py-2"><Link href={`/projects/${encodeURIComponent(r.project.code)}`} className="font-medium text-foreground hover:underline">{r.project.code}</Link> · {r.project.name}{r.is_continuation && <span className="ml-1.5 rounded bg-sky-100 px-1.5 py-px text-[10px] font-medium text-sky-900">continuation</span>}</td>
                      <td className="px-2 py-2">{categoryLabel(r.project.project_category)}</td>
                      <td className="px-2 py-2"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: VALUE_DOT[r.project.business_case?.value_type ?? ''] ?? '#94a3b8' }} />{valueTypeLabel(r.project.business_case?.value_type)}</span></td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.is_mandatory ? (r.project.business_case?.payback_months != null ? `${r.project.business_case.payback_months} mo` : '—') : (
                        <span className="inline-flex items-center justify-end gap-2"><span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, r.score)}%`, backgroundColor: bucketStyle(b.bucket).hex }} /></span><span className="w-8 text-right">{r.score}</span></span>
                      )}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtMoney(r.amount)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{parked ? '—' : fmtMoney(r.cumulative)}</td>
                      <td className="px-2 py-2"><LifecyclePill status={r.project.lifecycle_status} /></td>
                      <td className="px-2 py-2">{parked ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">parked</span> : r.funded ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">above</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">below</span>}</td>
                      {canManage && (
                        <td className="px-2 py-2 text-right">
                          {r.project.lifecycle_status === 'proposed' || r.project.lifecycle_status === 'deferred' ? (
                            <span className="inline-flex gap-1">
                              <button type="button" disabled={busy !== null} onClick={() => decide([r.project.code], 'approve')} className="rounded border border-emerald-300 px-1.5 py-0.5 text-[11px] text-emerald-800 hover:bg-emerald-50">fund</button>
                              {r.project.lifecycle_status === 'proposed' && <button type="button" disabled={busy !== null} onClick={() => decide([r.project.code], 'defer')} className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-muted">defer</button>}
                            </span>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        ))}
      </section>}

      {/* Running projects */}
      {part === 'running' && <section id="running" className="overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Running projects · gate position</h2>
            <p className="text-xs text-muted-foreground">Committed baselines in delivery — where each one sits in its stage template and whether next year's slice is approved.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-900">{running.filter((p) => p.lifecycle_status === 'active').length} active</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">{running.filter((p) => p.lifecycle_status === 'on_hold').length} on hold</span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-sky-900">{fmtMoney(running.reduce((n, p) => n + Number(p.approved_budget_current ?? 0), 0))} committed</span>
            {continuationsNeeded.length > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-900">{continuationsNeeded.length} continuation due</span>}
          </div>
        </div>
        {running.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No IT projects in delivery.</p> : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1.5">Project</th><th className="py-1.5">Bucket</th><th className="py-1.5">Category</th><th className="py-1.5">Approved for</th><th className="py-1.5 text-right">Baseline</th><th className="py-1.5">Lifecycle</th><th className="py-1.5">Continuation</th></tr></thead>
            <tbody>
              {running.map((p) => {
                const due = continuationsNeeded.includes(p);
                return (
                  <tr key={p.code} className="border-t">
                    <td className="py-1.5"><Link href={`/projects/${encodeURIComponent(p.code)}`} className="font-medium hover:underline">{p.code}</Link> · {p.name}</td>
                    <td className="py-1.5"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: bucketStyle(p.portfolio_bucket).hex }} />{bucketLabel(p.portfolio_bucket)}</span></td>
                    <td className="py-1.5">{categoryLabel(p.project_category)}</td>
                    <td className="py-1.5">{(p.fiscal_years_approved ?? []).map((y) => `FY${y}`).join(', ') || '—'}</td>
                    <td className="py-1.5 text-right tabular-nums">{Number(p.approved_budget_current) > 0 ? fmtMoney(p.approved_budget_current) : 'not locked'}</td>
                    <td className="py-1.5"><LifecyclePill status={p.lifecycle_status} /></td>
                    <td className="py-1.5">{(p.fiscal_years_approved ?? []).includes(fiscalYear)
                      ? <span className="rounded bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-900">FY{fiscalYear} slice approved</span>
                      : p.fiscal_year === fiscalYear
                        ? <span className="rounded bg-sky-100 px-1.5 py-px text-[10px] font-medium text-sky-900">FY{fiscalYear} slice requested · at the waterline</span>
                        : due ? <span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-900">FY{fiscalYear} slice not yet requested</span> : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>}
    </div>
  );
}

const LIFECYCLE_PILL: Record<string, string> = {
  proposed: 'bg-slate-100 text-slate-800', approved: 'bg-blue-100 text-blue-900', deferred: 'bg-slate-100 text-slate-500', active: 'bg-emerald-100 text-emerald-900',
  on_hold: 'bg-amber-100 text-amber-900', cancelled: 'bg-red-100 text-red-900', closed: 'bg-slate-200 text-slate-700',
};
function LifecyclePill({ status }: { status: string | null | undefined }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${LIFECYCLE_PILL[status ?? ''] ?? 'bg-muted'}`}>{lifecycleLabel(status as never)}</span>;
}
const VALUE_DOT: Record<string, string> = { hard_savings: '#059669', soft_benefit: '#0284c7', risk_reduction: '#7c3aed', enablement: '#4f46e5', compliance: '#d97706' };
