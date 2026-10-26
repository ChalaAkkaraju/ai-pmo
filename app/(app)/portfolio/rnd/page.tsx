/**
 * R&D / NPI workspace — portfolio home.
 *
 * Deliberately NOT a copy of the IT portfolio page with different words. The
 * two PMOs ask different questions, so the tabs differ:
 *
 *   Pipeline  — ranked on expected commercial value, not ROI, and the
 *               research programmes that carry no NPV are shown apart rather
 *               than scored as zero.
 *   Gates     — every programme's gate position AND its cycle time against
 *               the stage benchmark, because in NPI lateness usually costs
 *               more than overspend.
 *   Cases     — drift since the commit gate. The question nobody's system
 *               asks today, asked between gates instead of at one.
 *   Outcomes  — terminations, graded. A kill rate of zero is a finding here,
 *               not a clean sheet.
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { roleSees, homePathFor } from '@/lib/workspace';
import { canRoleCreateProjectType } from '@/lib/roles';
import { bodiesFor, loadGovernance } from '@/lib/governance';
import { ItPortfolioTabs } from '@/components/it-portfolio-tabs';
import { DecisionsPanel } from '@/components/decisions-panel';
import {
  caseDrift, cycleTimes, ecv, fmtMoneyRnd, gateToGateBurn, killQuality,
  pipelineHealth, rankPipelineByEcv, rndBucketLabel, rndBucketStyle,
  rndCategoryLabel, RND_BUCKETS, type SpendRow,
} from '@/lib/rnd';
import { commitStage, stageAt } from '@/lib/stage-gates';
import type {
  BusinessCaseVersion, DecisionRecord, GateDecision, PortfolioAllocation,
  Project, StageTemplate,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

function bodyColour(key: string): string {
  return ({
    portfolio_board: '#0f172a', gate_board: '#0284c7', rnd_head: '#7c3aed',
    sponsor: '#059669', finance: '#d97706', technical_review: '#0891b2',
  } as Record<string, string>)[key] ?? '#64748b';
}

type RndProject = Pick<Project,
  'id' | 'code' | 'name' | 'client' | 'project_category' | 'portfolio_bucket' | 'fiscal_year' |
  'fiscal_years_approved' | 'lifecycle_status' | 'requested_budget' | 'business_case' |
  'current_stage' | 'approved_budget_current' | 'hard_deadline_description'>;

export default async function RndPortfolioPage({ searchParams }: { searchParams: Promise<{ fy?: string }> }) {
  const resolved = await getSessionRole();
  if (!resolved) notFound();
  // A role that can't see this workspace goes to its own home instead of a 404.
  if (!roleSees(resolved.role, 'rnd')) redirect(homePathFor(resolved.role));
  const { fy } = await searchParams;

  const supabase = createSupabaseServiceClient();
  const { data: projData } = await supabase
    .from('projects')
    .select('id, code, name, client, project_category, portfolio_bucket, fiscal_year, fiscal_years_approved, lifecycle_status, requested_budget, business_case, current_stage, approved_budget_current, hard_deadline_description')
    .eq('project_type', 'rnd')
    .order('code');
  const projects = (projData ?? []) as RndProject[];
  const ids = projects.map((p) => p.id);

  const [allocRes, tplRes, gateRes, caseRes, costRes, recRes, governance] = await Promise.all([
    supabase.from('portfolio_allocations').select('*').eq('project_type', 'rnd').order('fiscal_year'),
    supabase.from('stage_templates').select('*').eq('project_type', 'rnd'),
    ids.length ? supabase.from('gate_decisions').select('*').in('project_id', ids).order('decided_on') : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('business_case_versions').select('*').in('project_id', ids).order('version') : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('cost_actuals').select('project_id, period, actual_cost').in('project_id', ids) : Promise.resolve({ data: [] }),
    supabase.from('decision_records').select('*').eq('project_type', 'rnd').order('proposed_at', { ascending: false }).limit(200),
    loadGovernance(supabase, 'rnd'),
  ]);

  const allocations = (allocRes.data ?? []) as PortfolioAllocation[];
  const templates = (tplRes.data ?? []) as StageTemplate[];
  const gates = (gateRes.data ?? []) as GateDecision[];
  const cases = (caseRes.data ?? []) as BusinessCaseVersion[];
  const costs = (costRes.data ?? []) as Array<{ project_id: string; period: string; actual_cost: number }>;
  const records = (recRes.data ?? []) as DecisionRecord[];

  const tplByCat = new Map(templates.map((t) => [t.category, t]));
  const byProject = <T extends { project_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) (m.get(r.project_id) ?? m.set(r.project_id, []).get(r.project_id)!).push(r);
    return m;
  };
  const gatesBy = byProject(gates);
  const casesBy = byProject(cases);
  const costsBy = byProject(costs);

  // ---- per-programme derived view -----------------------------------------
  const view = projects.map((p) => {
    const tpl = p.project_category ? tplByCat.get(p.project_category) ?? null : null;
    const g = gatesBy.get(p.id) ?? [];
    const cv = (casesBy.get(p.id) ?? []).slice().sort((a, b) => a.version - b.version);
    const spend: SpendRow[] = (costsBy.get(p.id) ?? []).map((c) => ({ posting_date: c.period, amount: Number(c.actual_cost) }));
    const spentTotal = spend.reduce((s, r) => s + r.amount, 0);
    const commit = commitStage(tpl);
    const current = cv.find((c) => c.is_current) ?? cv[cv.length - 1] ?? null;
    const lastGo = g.filter((d) => d.decision === 'go').slice(-1)[0] ?? null;
    return {
      p, tpl, gates: g, cases: cv, current,
      spend, spentTotal,
      burn: gateToGateBurn(g, [], spend),
      cycles: tpl ? cycleTimes(tpl, g, cv[0]?.authored_on ?? null) : [],
      drift: caseDrift(cv, commit?.seq ?? null),
      kill: killQuality(tpl, g, [], spend),
      ecv: ecv(current),
      stage: stageAt(tpl, p.current_stage ?? null),
      lastGo,
      committed: Boolean(commit && g.some((d) => d.stage_seq === commit.seq && d.decision === 'go')),
    };
  });

  // Gate budgets live on sanction_events; fetch and fold in so burn is real.
  const { data: seData } = ids.length
    ? await supabase.from('sanction_events').select('*').in('project_id', ids).eq('kind', 'gate_budget')
    : { data: [] };
  const sanctionsBy = byProject((seData ?? []) as Array<{ project_id: string } & Record<string, unknown>>);
  for (const v of view) {
    const ev = (sanctionsBy.get(v.p.id) ?? []) as never[];
    v.burn = gateToGateBurn(v.gates, ev, v.spend);
    v.kill = killQuality(v.tpl, v.gates, ev, v.spend);
  }

  const yearSet = new Set<number>([...allocations.map((a) => a.fiscal_year), ...projects.map((p) => p.fiscal_year).filter((y): y is number => typeof y === 'number')]);
  if (yearSet.size === 0) yearSet.add(new Date().getFullYear() + 1);
  const years = Array.from(yearSet).sort();
  const fiscalYear = fy && years.includes(Number(fy)) ? Number(fy) : years[years.length - 1];
  const canCreate = canRoleCreateProjectType(resolved.role.role_type, 'rnd');

  const gov = { bodies: governance.bodies, myBodyKeys: bodiesFor(governance, resolved.role), myRoleId: resolved.role.id, myRoleType: resolved.role.role_type, myName: resolved.role.name };
  const projectCodes = Object.fromEntries(projects.map((p) => [p.id, p.code]));
  const openRecords = records.filter((r) => r.status === 'proposed');
  const awaitingMe = openRecords.filter((r) => gov.myBodyKeys.includes(r.required_body_key) || (r.required_concurrences ?? []).some((c) => gov.myBodyKeys.includes(c) && !(r.concurrences ?? []).some((x) => x.body_key === c)));

  const health = pipelineHealth(view.map((v) => ({ lifecycle_status: v.p.lifecycle_status, kill: v.kill })));
  const live = view.filter((v) => !['terminated', 'cancelled', 'closed'].includes(v.p.lifecycle_status ?? ''));
  const driftAdverse = live.filter((v) => v.drift.commit_version && v.drift.current_version && v.drift.commit_version.id !== v.drift.current_version.id && v.drift.lines.some((l) => l.adverse));
  const underwater = live.filter((v) => v.drift.underwater);
  const staleCase = live.filter((v) => v.committed && v.drift.commit_version && v.drift.current_version?.id === v.drift.commit_version.id);
  const slowStages = live.filter((v) => v.cycles.some((c) => c.in_progress && c.delta_days !== null && c.delta_days > 0));
  const overBurn = live.filter((v) => v.burn.over);

  // ---- envelope by bucket for the selected year ---------------------------
  const buckets = RND_BUCKETS.map((b) => {
    const alloc = allocations.find((a) => a.fiscal_year === fiscalYear && a.bucket === b) ?? null;
    const rows = view.filter((v) => v.p.portfolio_bucket === b && v.p.fiscal_year === fiscalYear && !['terminated', 'cancelled', 'closed'].includes(v.p.lifecycle_status ?? ''));
    const fundable = alloc ? Number(alloc.allocated_amount) - Number(alloc.reserve_amount) : 0;
    const requested = rows.reduce((s, v) => s + Number(v.p.requested_budget ?? 0), 0);
    const ranked = rankPipelineByEcv(rows.map((v) => ({ v, case_version: v.current, requested_budget: v.p.requested_budget })));
    let cum = 0;
    const withLine = ranked.map((r) => { cum += Number(r.requested_budget ?? 0); return { ...r, cumulative: cum, funded: cum <= fundable }; });
    return { bucket: b, alloc, fundable, requested, rows: withLine, mandatory: alloc?.is_mandatory_lane ?? b === 'regulatory' };
  });

  const tile = (label: string, value: string, sub: string, tone: 'ok' | 'warn' | 'info' | 'neutral') => (
    <div key={label} className={`rounded-lg border p-4 ${tone === 'warn' ? 'border-amber-200 bg-amber-50/50' : tone === 'ok' ? 'border-emerald-200 bg-emerald-50/50' : tone === 'info' ? 'border-sky-200 bg-sky-50/50' : 'bg-card'}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );

  return (
    <div className="container mx-auto max-w-screen-2xl space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">R&amp;D / NPI workspace</p>
          <h1 className="text-2xl font-bold tracking-tight">R&amp;D portfolio</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Money released gate by gate, the case re-underwritten at each one. Ranked on expected commercial value, measured on gate-to-gate burn and cycle time — not on a baseline that resets every gate.
          </p>
        </div>
        {canCreate && <Link href="/intake/rnd" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">+ Submit R&amp;D programme</Link>}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Fiscal year</span>
        {years.map((y) => (
          <Link key={y} href={`/portfolio/rnd?fy=${y}`} className={`rounded-full px-3 py-1 font-medium ${y === fiscalYear ? 'bg-foreground text-background' : 'border bg-card hover:bg-muted'}`}>FY{y}</Link>
        ))}
      </div>

      <ItPortfolioTabs tabs={[
        // ------------------------------------------------------------ overview
        { key: 'overview', label: 'Overview', content: (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {buckets.map((b) => {
                const st = rndBucketStyle(b.bucket);
                const pctUsed = b.fundable ? Math.round((b.requested / b.fundable) * 100) : 0;
                return (
                  <div key={b.bucket} className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
                    <span className={`absolute left-0 top-0 h-full w-1.5 ${st.accentBar}`} />
                    <p className={`pl-2 text-sm font-semibold ${st.text}`}>{st.label}{b.mandatory && <span className="ml-2 rounded bg-amber-600 px-1.5 py-px text-[10px] font-medium text-white">mandatory lane</span>}</p>
                    <p className="mt-2 pl-2 text-2xl font-semibold tabular-nums">{fmtMoneyRnd(b.fundable)}</p>
                    <p className="pl-2 text-[11px] text-muted-foreground">fundable after reserve · {fmtMoneyRnd(Number(b.alloc?.reserve_amount ?? 0))} held back</p>
                    <div className="mt-2 pl-2">
                      <div className="h-1.5 w-full rounded-full bg-muted"><div className={`h-1.5 rounded-full ${pctUsed > 100 ? 'bg-rose-500' : st.accentBar}`} style={{ width: `${Math.min(100, pctUsed)}%` }} /></div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{fmtMoneyRnd(b.requested)} requested by {b.rows.length} programme{b.rows.length === 1 ? '' : 's'} ({pctUsed}%)</p>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className={`rounded-xl border p-5 shadow-sm ${health.terminated === 0 ? 'border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-white' : 'bg-card'}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h2 className="text-base font-semibold">Pipeline health</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    A kill rate of zero is a finding, not a clean sheet. Terminations are graded on two facts only — did it happen before commit, and did it stay inside the money released — because whether it &ldquo;would have succeeded&rdquo; is unknowable and asking invites the rate to be argued down.
                  </p>
                  <p className="mt-2 text-sm font-medium">{health.note}</p>
                </div>
                <div className="flex gap-6 text-right">
                  <div><p className="text-3xl font-semibold tabular-nums">{health.kill_rate_pct}%</p><p className="text-[11px] text-muted-foreground">kill rate</p></div>
                  <div><p className="text-3xl font-semibold tabular-nums text-emerald-700">{health.early_kills}</p><p className="text-[11px] text-muted-foreground">early</p></div>
                  <div><p className="text-3xl font-semibold tabular-nums text-rose-700">{health.late_kills}</p><p className="text-[11px] text-muted-foreground">late / over</p></div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {tile('Awaiting your decision', String(awaitingMe.length), `${openRecords.length} open in total`, awaitingMe.length > 0 ? 'ok' : 'neutral')}
              {tile('Case underwater', String(underwater.length), 'ECV negative since commit', underwater.length > 0 ? 'warn' : 'neutral')}
              {tile('Adverse case drift', String(driftAdverse.length), 'moved against us since commit', driftAdverse.length > 0 ? 'warn' : 'neutral')}
              {tile('Stale case', String(staleCase.length), 'not re-underwritten since commit', staleCase.length > 0 ? 'info' : 'neutral')}
              {tile('Stage running long', String(slowStages.length), 'past the stage benchmark', slowStages.length > 0 ? 'warn' : 'neutral')}
              {tile('Over gate budget', String(overBurn.length), 'spend exceeds the last release', overBurn.length > 0 ? 'warn' : 'ok')}
            </section>
          </div>
        ) },

        // ------------------------------------------------------------ pipeline
        { key: 'pipeline', label: 'Pipeline', content: (
          <div className="space-y-6">
            <p className="max-w-3xl text-xs text-muted-foreground">
              Ranked on expected commercial value — [(NPV × P(commercial)) − launch cost] × P(technical) − development cost. The two probabilities apply at different points on purpose: commercial risk discounts the income, technical risk discounts the income and the launch spend, because a programme that fails technically never spends the launch money. Research programmes carry no NPV by construction and are listed apart rather than ranked at zero.
            </p>
            {buckets.map((b) => {
              const st = rndBucketStyle(b.bucket);
              const scored = b.rows.filter((r) => r.ecv !== null);
              const unscored = b.rows.filter((r) => r.ecv === null);
              return (
                <section key={b.bucket} id={`rank-${b.bucket}`} className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className={`text-base font-semibold ${st.text}`}>{st.label}</h2>
                    <p className="text-xs text-muted-foreground">{fmtMoneyRnd(b.fundable)} fundable · {fmtMoneyRnd(b.requested)} requested</p>
                  </div>
                  {b.rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing submitted for FY{fiscalYear} in this bucket.</p> : (
                    <table className="mt-3 w-full text-sm">
                      <thead className="text-left text-muted-foreground"><tr>
                        <th className="py-1.5">#</th><th className="py-1.5">Programme</th><th className="py-1.5">Category</th>
                        <th className="py-1.5 text-right">Ask</th><th className="py-1.5 text-right">ECV</th>
                        <th className="py-1.5 text-right">P(tech)</th><th className="py-1.5 text-right">P(comm)</th><th className="py-1.5 text-right">Cumulative</th>
                      </tr></thead>
                      <tbody>
                        {scored.map((r) => (
                          <tr key={r.v.p.id} className={`border-t ${!r.funded ? 'opacity-60' : ''}`}>
                            <td className="py-1.5 tabular-nums">{r.rank}</td>
                            <td className="py-1.5"><Link href={`/projects/${encodeURIComponent(r.v.p.code)}`} className="font-medium hover:underline">{r.v.p.code}</Link> <span className="text-muted-foreground">{r.v.p.name}</span></td>
                            <td className="py-1.5 text-xs text-muted-foreground">{rndCategoryLabel(r.v.p.project_category)}</td>
                            <td className="py-1.5 text-right tabular-nums">{fmtMoneyRnd(r.requested_budget)}</td>
                            <td className={`py-1.5 text-right font-medium tabular-nums ${(r.ecv ?? 0) < 0 ? 'text-rose-700' : ''}`}>{fmtMoneyRnd(r.ecv)}</td>
                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r.v.current?.technical_success_pct ?? '—'}%</td>
                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r.v.current?.commercial_success_pct ?? '—'}%</td>
                            <td className="py-1.5 text-right tabular-nums">{fmtMoneyRnd(r.cumulative)}</td>
                          </tr>
                        ))}
                        {unscored.length > 0 && (
                          <tr className="border-t bg-muted/40"><td colSpan={8} className="py-1.5 text-[11px] font-medium text-muted-foreground">Not scored on ECV — no income estimate by construction. Judged on feasibility, strategic fit or cost-to-comply.</td></tr>
                        )}
                        {unscored.map((r) => (
                          <tr key={r.v.p.id} className="border-t">
                            <td className="py-1.5 text-muted-foreground">—</td>
                            <td className="py-1.5"><Link href={`/projects/${encodeURIComponent(r.v.p.code)}`} className="font-medium hover:underline">{r.v.p.code}</Link> <span className="text-muted-foreground">{r.v.p.name}</span></td>
                            <td className="py-1.5 text-xs text-muted-foreground">{rndCategoryLabel(r.v.p.project_category)}</td>
                            <td className="py-1.5 text-right tabular-nums">{fmtMoneyRnd(r.requested_budget)}</td>
                            <td className="py-1.5 text-right text-xs text-muted-foreground" colSpan={4}>{r.v.p.hard_deadline_description ?? r.v.current?.notes ?? 'No NPV claimed'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })}
          </div>
        ) },

        // --------------------------------------------------------------- gates
        { key: 'gates', label: 'Gates', badge: slowStages.length, badgeTone: 'amber', content: (
          <div className="space-y-4">
            <p className="max-w-3xl text-xs text-muted-foreground">
              Where each programme sits, and how long it has taken to get there. The benchmark is the stage template&rsquo;s declared target, not an observed median — collapsing the two is how benchmarks quietly drift to match whatever the organisation already does. A stage still running is measured to today, because a stage running long is only visible while it is still running.
            </p>
            {live.map((v) => {
              const st = rndBucketStyle(v.p.portfolio_bucket);
              const currentCycle = v.cycles.find((c) => c.in_progress) ?? null;
              return (
                <section key={v.p.id} className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold"><Link href={`/projects/${encodeURIComponent(v.p.code)}`} className="hover:underline">{v.p.code}</Link> <span className="font-normal text-muted-foreground">{v.p.name}</span></p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        <span className={st.text}>{rndBucketLabel(v.p.portfolio_bucket)}</span> · {rndCategoryLabel(v.p.project_category)} · {v.committed ? 'past commit' : 'pre-commit'}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">Burn since {v.burn.since_gate ?? 'start'}</p>
                      <p className={`text-lg font-semibold tabular-nums ${v.burn.over ? 'text-rose-700' : ''}`}>
                        {fmtMoneyRnd(v.burn.spent)} <span className="text-xs font-normal text-muted-foreground">of {fmtMoneyRnd(v.burn.released)}</span>
                      </p>
                      {v.burn.pct !== null && <p className="text-[11px] text-muted-foreground">{v.burn.pct}% of the budget that gate released</p>}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {v.cycles.map((c) => {
                      const d = v.gates.filter((x) => x.stage_seq === c.seq).slice(-1)[0] ?? null;
                      const tone = d?.decision === 'kill' ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : d?.decision === 'go' ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : c.in_progress ? 'border-sky-300 bg-sky-50 text-sky-800' : 'bg-muted/50 text-muted-foreground';
                      const late = c.delta_days !== null && c.delta_days > 0;
                      return (
                        <div key={c.seq} className={`rounded-md border px-2.5 py-1.5 text-[11px] ${tone}`}>
                          <p className="font-medium">{c.name}{c.in_progress && ' · in progress'}</p>
                          <p className="tabular-nums">
                            {c.actual_days === null ? 'not started' : `${c.actual_days}d`}
                            {c.benchmark_days ? <span className={late ? 'font-semibold text-rose-700' : 'text-muted-foreground'}> / {c.benchmark_days}d{late ? ` (+${c.delta_days})` : ''}</span> : null}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {currentCycle && currentCycle.delta_days !== null && currentCycle.delta_days > 0 && (
                    <p className="mt-2 text-[11px] text-rose-700">{currentCycle.name} is {currentCycle.delta_days} days past its {currentCycle.benchmark_days}-day target and still running.</p>
                  )}
                  {v.lastGo?.notes && <p className="mt-2 border-l-2 pl-2 text-[11px] text-muted-foreground">{v.lastGo.notes}</p>}
                </section>
              );
            })}
          </div>
        ) },

        // --------------------------------------------------------------- cases
        { key: 'cases', label: 'Cases', badge: underwater.length + driftAdverse.length, badgeTone: 'amber', content: (
          <div className="space-y-4">
            <p className="max-w-3xl text-xs text-muted-foreground">
              Drift is measured against the case approved at the <strong>commit gate</strong> — the version the money was actually released against — not against the first sketch. Movement before commitment is the early stages working as designed; movement after it is the thing nobody currently watches.
            </p>
            {live.filter((v) => v.committed).map((v) => {
              const d = v.drift;
              return (
                <section key={v.p.id} className={`rounded-xl border p-5 shadow-sm ${d.underwater ? 'border-rose-300 bg-rose-50/40' : 'bg-card'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold"><Link href={`/projects/${encodeURIComponent(v.p.code)}`} className="hover:underline">{v.p.code}</Link> <span className="font-normal text-muted-foreground">{v.p.name}</span></p>
                      <p className={`mt-1 text-sm ${d.underwater ? 'font-medium text-rose-800' : ''}`}>{d.summary}</p>
                    </div>
                    <div className="flex gap-5 text-right text-xs">
                      <div><p className="text-muted-foreground">ECV at commit</p><p className="text-lg font-semibold tabular-nums">{fmtMoneyRnd(d.ecv_at_commit)}</p></div>
                      <div><p className="text-muted-foreground">ECV now</p><p className={`text-lg font-semibold tabular-nums ${(d.ecv_current ?? 0) < 0 ? 'text-rose-700' : ''}`}>{fmtMoneyRnd(d.ecv_current)}</p></div>
                    </div>
                  </div>
                  {d.lines.length > 0 && (
                    <table className="mt-3 w-full text-sm">
                      <thead className="text-left text-muted-foreground"><tr><th className="py-1">Line</th><th className="py-1 text-right">At commit</th><th className="py-1 text-right">Now</th><th className="py-1 text-right">Move</th></tr></thead>
                      <tbody>
                        {d.lines.map((l) => (
                          <tr key={l.metric} className="border-t">
                            <td className="py-1">{l.metric}</td>
                            <td className="py-1 text-right tabular-nums text-muted-foreground">{typeof l.at_commit === 'number' ? (l.metric.includes('%') ? `${l.at_commit}%` : fmtMoneyRnd(l.at_commit)) : (l.at_commit ?? '—')}</td>
                            <td className="py-1 text-right tabular-nums">{typeof l.current === 'number' ? (l.metric.includes('%') ? `${l.current}%` : fmtMoneyRnd(l.current)) : (l.current ?? '—')}</td>
                            <td className={`py-1 text-right tabular-nums ${l.adverse ? 'font-medium text-rose-700' : l.delta === 0 || l.delta === null ? 'text-muted-foreground' : 'text-emerald-700'}`}>
                              {l.delta === null ? 'unchanged' : l.metric === 'Launch date' ? `${l.delta > 0 ? '+' : ''}${l.delta}d` : l.delta_pct !== null ? `${l.delta_pct > 0 ? '+' : ''}${l.delta_pct}%` : String(l.delta)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {v.current?.notes && <p className="mt-2 border-l-2 pl-2 text-[11px] text-muted-foreground">{v.current.notes}</p>}
                </section>
              );
            })}
            {live.filter((v) => v.committed).length === 0 && <p className="text-sm text-muted-foreground">No programme has passed its commit gate yet, so there is nothing to drift from.</p>}
          </div>
        ) },

        // ------------------------------------------------------------ outcomes
        { key: 'outcomes', label: 'Outcomes', badge: health.terminated, content: (
          <div className="space-y-4">
            <p className="max-w-3xl text-xs text-muted-foreground">
              Terminated programmes, graded. The grade is derived from two facts — before or after commit, inside or outside the money released — and never entered by hand, so nobody grades their own kill.
            </p>
            {view.filter((v) => v.kill).map((v) => {
              const k = v.kill!;
              const tone = k.grade === 'early' ? 'border-emerald-300 bg-emerald-50/50' : k.grade === 'on_case' ? 'border-sky-300 bg-sky-50/50' : 'border-rose-300 bg-rose-50/50';
              const chip = k.grade === 'early' ? 'bg-emerald-600' : k.grade === 'on_case' ? 'bg-sky-600' : 'bg-rose-600';
              return (
                <section key={v.p.id} className={`rounded-xl border p-5 shadow-sm ${tone}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold">
                        <Link href={`/projects/${encodeURIComponent(v.p.code)}`} className="hover:underline">{v.p.code}</Link> <span className="font-normal text-muted-foreground">{v.p.name}</span>
                        <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${chip}`}>{k.label}</span>
                      </p>
                      <p className="mt-1 text-sm">{k.rationale}</p>
                    </div>
                    <div className="flex gap-5 text-right text-xs">
                      <div><p className="text-muted-foreground">Spent</p><p className="text-lg font-semibold tabular-nums">{fmtMoneyRnd(k.spend)}</p></div>
                      <div><p className="text-muted-foreground">Released</p><p className="text-lg font-semibold tabular-nums">{fmtMoneyRnd(k.released)}</p></div>
                    </div>
                  </div>
                  {v.gates.filter((g) => g.decision === 'kill')[0]?.notes && (
                    <p className="mt-2 border-l-2 pl-2 text-[11px] text-muted-foreground">{v.gates.filter((g) => g.decision === 'kill')[0].notes}</p>
                  )}
                </section>
              );
            })}
            {health.terminated === 0 && <p className="text-sm text-muted-foreground">Nothing terminated. In an R&amp;D portfolio that is a question, not a result — the early screens may not be screening.</p>}
          </div>
        ) },

        // ----------------------------------------------------------- decisions
        { key: 'decisions', label: 'Decisions', badge: awaitingMe.length, content: (
          <section id="decisions">
            <DecisionsPanel records={records} gov={gov} projectCodes={projectCodes}
              projectStatus={Object.fromEntries(projects.map((p) => [p.code, p.lifecycle_status ?? '']))}
              title="Proposed by the PMO, decided by the gate board or the portfolio board"
              emptyText="Nothing awaiting decision. Gate releases, commit baselines, continuations, holds, terminations and change orders all arrive here." />
          </section>
        ) },

        // ---------------------------------------------------------- governance
        { key: 'governance', label: 'Who decides what', content: (
          <details open className="rounded-lg border bg-card p-5">
            <summary className="cursor-pointer text-sm font-semibold">Who decides what · delegation of authority <span className="ml-2 text-xs font-normal text-muted-foreground">{governance.bodies.length} bodies · {governance.matrix.length} rules</span></summary>
            <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
              Thresholds sit an order of magnitude below IT&rsquo;s because R&amp;D money is released in small slices early and large ones late. Cancelling before commit is deliberately the lightest authority in the matrix: making an early kill a board event is the surest way to stop it happening.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {governance.bodies.map((b) => (
                <div key={b.id} className={`relative overflow-hidden rounded-lg border p-4 text-xs shadow-sm ${gov.myBodyKeys.includes(b.key) ? 'ring-2 ring-violet-400' : ''}`}>
                  <span className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: bodyColour(b.key) }} />
                  <p className="pl-2 text-sm font-semibold" style={{ color: bodyColour(b.key) }}>{b.name}{gov.myBodyKeys.includes(b.key) && <span className="ml-2 rounded bg-violet-600 px-1.5 py-px text-[10px] font-medium text-white">you</span>}</p>
                  <p className="mt-0.5 pl-2 text-muted-foreground">{b.description}</p>
                  <p className="mt-1 pl-2 text-[11px]">Quorum {b.quorum}{b.member_role_type ? ` · any ${b.member_role_type.replace(/_/g, ' ')}` : ` · ${governance.members.filter((m) => m.body_id === b.id).length} member(s)`}</p>
                </div>
              ))}
            </div>
            <details className="mt-3 text-xs"><summary className="cursor-pointer font-medium text-muted-foreground">Authority matrix ({governance.matrix.length} rules)</summary>
              <table className="mt-2 w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="py-1">Decision</th><th className="py-1">Funding / phase</th><th className="py-1 text-right">From</th><th className="py-1 text-right">To</th><th className="py-1">Decides</th><th className="py-1">Concurrence</th></tr></thead>
                <tbody>{governance.matrix.map((r) => <tr key={r.id} className="border-t"><td className="py-1">{r.decision_kind.replace(/_/g, ' ')}</td><td className="py-1">{r.funding_source?.replace(/_/g, ' ') ?? (r.post_commit == null ? '—' : r.post_commit ? 'post-commit' : 'pre-commit')}</td><td className="py-1 text-right tabular-nums">{Number(r.min_amount).toLocaleString()}</td><td className="py-1 text-right tabular-nums">{r.max_amount == null ? '∞' : Number(r.max_amount).toLocaleString()}</td><td className="py-1"><span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: bodyColour(r.required_body_key) }}>{r.required_body_key.replace(/_/g, ' ')}</span></td><td className="py-1">{r.required_concurrences.join(', ') || '—'}</td></tr>)}</tbody></table>
            </details>
          </details>
        ) },
      ]} />
    </div>
  );
}
