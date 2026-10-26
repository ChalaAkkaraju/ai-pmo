/**
 * Capital workspace — portfolio home.
 *
 * Not a copy of the IT or R&D page with different words. Capital asks its own
 * questions, so the tabs differ:
 *
 *   Pipeline & AFEs     — where every request stands in front-end loading, what
 *                         was appropriated, the forecast against it, and who
 *                         has to sanction it at its size.
 *   Asset chain         — Appropriated -> Committed -> Actual -> Settled to AuC
 *                         -> Capitalised, portfolio-wide and per project. Every
 *                         capital control failure lives in a gap between links.
 *   Settlement readiness — the checks Finance otherwise runs by hand in
 *                         December, run continuously ahead of each in-service
 *                         date.
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
import { CapitalChain } from '@/components/capital-chain';
import {
  CAPITAL_BUCKETS, SUPPLEMENTARY_TOLERANCE_PCT, afeAuthority, asCapitalCase, capitalBodyColour, capitalBucketLabel,
  capitalBucketStyle, capitalCategoryLabel, capitalProjectView, fmtDate, fmtMoneyCap, loadCapitalPortfolioData, sumChains,
} from '@/lib/capital';
import { lifecycleLabel } from '@/lib/it-portfolio';
import type { DecisionRecord, PortfolioAllocation, Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

type CapProject = Pick<Project, 'id' | 'code' | 'name' | 'client' | 'project_category' | 'portfolio_bucket' | 'fiscal_year' |
  'lifecycle_status' | 'requested_budget' | 'business_case' | 'current_stage' | 'approved_budget_current' | 'stage_template_id'>;

const SEV = {
  block: { chip: 'bg-red-600 text-white', box: 'border-red-300 bg-red-50/60', label: 'Blocking' },
  warn: { chip: 'bg-amber-500 text-white', box: 'border-amber-300 bg-amber-50/60', label: 'Warning' },
  info: { chip: 'bg-sky-600 text-white', box: 'border-sky-200 bg-sky-50/60', label: 'Info' },
} as const;

export default async function CapitalPortfolioPage({ searchParams }: { searchParams: Promise<{ fy?: string }> }) {
  const resolved = await getSessionRole();
  if (!resolved) notFound();
  // A role that can't see this workspace goes to its own home instead of a 404.
  if (!roleSees(resolved.role, 'capital')) redirect(homePathFor(resolved.role));
  const { fy } = await searchParams;

  const sb = createSupabaseServiceClient();
  const { data: projData } = await sb.from('projects')
    .select('id, code, name, client, project_category, portfolio_bucket, fiscal_year, lifecycle_status, requested_budget, business_case, current_stage, approved_budget_current, stage_template_id')
    .eq('project_type', 'capital').order('code');
  const projects = (projData ?? []) as CapProject[];

  const [allocRes, recRes, governance, data] = await Promise.all([
    sb.from('portfolio_allocations').select('*').eq('project_type', 'capital').order('fiscal_year'),
    sb.from('decision_records').select('*').eq('project_type', 'capital').order('proposed_at', { ascending: false }).limit(200),
    loadGovernance(sb, 'capital'),
    loadCapitalPortfolioData(sb, projects),
  ]);
  const allocations = (allocRes.data ?? []) as PortfolioAllocation[];
  const records = (recRes.data ?? []) as DecisionRecord[];

  const today = new Date();
  const view = projects.map((p) => {
    const d = data.get(p.id)!;
    const v = capitalProjectView(p, d, today);
    const bc = asCapitalCase(p.business_case);
    const daysToService = bc.in_service_date ? Math.round((new Date(`${bc.in_service_date}T00:00:00Z`).getTime() - today.getTime()) / 86_400_000) : null;
    return { p, d, v, bc, daysToService };
  });

  const yearSet = new Set<number>([...allocations.map((a) => a.fiscal_year), ...projects.map((p) => p.fiscal_year).filter((y): y is number => typeof y === 'number')]);
  if (yearSet.size === 0) yearSet.add(today.getFullYear());
  const years = Array.from(yearSet).sort();
  const fiscalYear = fy && years.includes(Number(fy)) ? Number(fy) : (years.includes(today.getFullYear()) ? today.getFullYear() : years[years.length - 1]);
  const canCreate = canRoleCreateProjectType(resolved.role.role_type, 'capital');

  const gov = { bodies: governance.bodies, myBodyKeys: bodiesFor(governance, resolved.role), myRoleId: resolved.role.id, myRoleType: resolved.role.role_type, myName: resolved.role.name };
  const projectCodes = Object.fromEntries(projects.map((p) => [p.id, p.code]));
  const openRecords = records.filter((r) => r.status === 'proposed');
  const awaitingMe = openRecords.filter((r) => gov.myBodyKeys.includes(r.required_body_key) || (r.required_concurrences ?? []).some((c) => gov.myBodyKeys.includes(c) && !(r.concurrences ?? []).some((x) => x.body_key === c && x.outcome === 'concur')));

  const live = view.filter((x) => !['cancelled', 'closed'].includes(x.p.lifecycle_status ?? ''));
  const fel = live.filter((x) => !x.v.committed);
  const sanctioned = live.filter((x) => x.v.committed);
  const overTol = sanctioned.filter((x) => x.v.trigger.needed);
  const blocks = live.filter((x) => x.v.findings.some((f) => f.severity === 'block'));
  const soon = sanctioned.filter((x) => x.daysToService !== null && x.daysToService >= 0 && x.daysToService <= 90);
  const aucAgeing = view.filter((x) => x.v.findings.some((f) => f.key === 'auc_ageing'));
  const total = sumChains(view.map((x) => x.v.chain));

  // ---- envelope by category for the selected year ----------------------------
  const buckets = CAPITAL_BUCKETS.map((b) => {
    const alloc = allocations.find((a) => a.fiscal_year === fiscalYear && a.bucket === b) ?? null;
    const rows = view.filter((x) => x.p.portfolio_bucket === b && x.p.fiscal_year === fiscalYear && x.p.lifecycle_status !== 'cancelled');
    const appropriated = rows.filter((x) => x.v.committed).reduce((n, x) => n + x.v.chain.appropriated, 0);
    const pipeline = rows.filter((x) => !x.v.committed).reduce((n, x) => n + Number(x.p.requested_budget ?? 0), 0);
    const fundable = alloc ? Number(alloc.allocated_amount) - Number(alloc.reserve_amount) : 0;
    return { bucket: b, alloc, rows, appropriated, pipeline, fundable };
  });
  const envelopeTotal = buckets.reduce((n, b) => n + Number(b.alloc?.allocated_amount ?? 0), 0);

  const tile = (label: string, value: string, sub: string, tone: 'ok' | 'warn' | 'bad' | 'info' | 'neutral') => (
    <div key={label} className={`rounded-lg border p-4 ${tone === 'bad' ? 'border-red-200 bg-red-50/50' : tone === 'warn' ? 'border-amber-200 bg-amber-50/50' : tone === 'ok' ? 'border-emerald-200 bg-emerald-50/50' : tone === 'info' ? 'border-sky-200 bg-sky-50/50' : 'bg-card'}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
  const link = (code: string, tab?: string) => `/projects/${encodeURIComponent(code)}${tab ? `?tab=${tab}` : ''}`;

  return (
    <div className="container mx-auto max-w-screen-2xl space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">Capital workspace</p>
          <h1 className="text-2xl font-bold tracking-tight">Capital portfolio</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Study money released through front-end loading, the AFE sanctioned at FEL3, and the spend followed until it is an asset on the register. Measured on the chain from appropriation to capitalisation, not on margin.
          </p>
        </div>
        {canCreate && <Link href="/intake/capital" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">+ Submit capital project</Link>}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Capital plan</span>
        {years.map((y) => (
          <Link key={y} href={`/portfolio/capital?fy=${y}`} className={`rounded-full px-3 py-1 font-medium ${y === fiscalYear ? 'bg-foreground text-background' : 'border bg-card hover:bg-muted'}`}>FY{y}</Link>
        ))}
      </div>

      <ItPortfolioTabs tabs={[
        // ------------------------------------------------------------ overview
        { key: 'overview', label: 'Overview', content: (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {buckets.map((b) => {
                const st = capitalBucketStyle(b.bucket);
                const used = b.fundable ? Math.round((b.appropriated / b.fundable) * 100) : 0;
                const withPipe = b.fundable ? Math.round(((b.appropriated + b.pipeline) / b.fundable) * 100) : 0;
                return (
                  <div key={b.bucket} className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
                    <span className={`absolute left-0 top-0 h-full w-1.5 ${st.accentBar}`} />
                    <p className={`pl-2 text-sm font-semibold ${st.text}`}>{st.label}{b.alloc?.is_mandatory_lane && <span className="ml-2 rounded bg-amber-600 px-1.5 py-px text-[10px] font-medium text-white">mandatory lane</span>}</p>
                    <p className="mt-2 pl-2 text-2xl font-semibold tabular-nums">{fmtMoneyCap(b.fundable)}</p>
                    <p className="pl-2 text-[11px] text-muted-foreground">FY{fiscalYear} envelope after a {fmtMoneyCap(Number(b.alloc?.reserve_amount ?? 0))} reserve</p>
                    <div className="mt-2 pl-2">
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={`absolute h-1.5 opacity-30 ${withPipe > 100 ? 'bg-rose-500' : st.accentBar}`} style={{ width: `${Math.min(100, withPipe)}%` }} />
                        <div className={`absolute h-1.5 ${used > 100 ? 'bg-rose-500' : st.accentBar}`} style={{ width: `${Math.min(100, used)}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{fmtMoneyCap(b.appropriated)} appropriated ({used}%) · {fmtMoneyCap(b.pipeline)} still in FEL</p>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {tile('Awaiting your decision', String(awaitingMe.length), `${openRecords.length} open in total`, awaitingMe.length > 0 ? 'ok' : 'neutral')}
              {tile(`Over AFE by >${SUPPLEMENTARY_TOLERANCE_PCT}%`, String(overTol.length), 'forecast breaks the supplementary tolerance', overTol.length > 0 ? 'bad' : 'neutral')}
              {tile('Settlement blocked', String(blocks.length), 'a blocking readiness finding', blocks.length > 0 ? 'bad' : 'ok')}
              {tile('In service ≤ 90 days', String(soon.length), 'handover and final settlement due', soon.length > 0 ? 'info' : 'neutral')}
              {tile('Running, not capitalised', String(aucAgeing.length), 'in service with an AuC balance', aucAgeing.length > 0 ? 'warn' : 'neutral')}
              {tile('In front-end loading', String(fel.length), `${fmtMoneyCap(fel.reduce((n, x) => n + Number(x.p.requested_budget ?? 0), 0))} of requests before AFE`, 'neutral')}
            </section>

            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">The asset chain — whole portfolio</h2>
                <p className="text-xs text-muted-foreground">FY envelope {fmtMoneyCap(envelopeTotal)} · {view.length} projects · read from SAP PS and the fixed-asset register</p>
              </div>
              <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">Each link should follow the one before it. A gap between two links is where a capital control is failing: committed past what was appropriated, spend not settling, or AuC that never reaches the register.</p>
              <div className="mt-4"><CapitalChain chain={total} /></div>
            </section>
          </div>
        ) },

        // ------------------------------------------------------------ pipeline
        { key: 'pipeline', label: 'Pipeline & AFEs', badge: overTol.length, badgeTone: 'amber', content: (
          <div className="space-y-6">
            <p className="max-w-3xl text-xs text-muted-foreground">
              Requests in FEL carry an estimate, not an appropriation. Once the AFE is sanctioned the forecast is tested against it: more than {SUPPLEMENTARY_TOLERANCE_PCT}% over and a supplementary AFE is required — routed on the revised total, so a supplementary that crosses a threshold goes to the higher authority.
            </p>
            {CAPITAL_BUCKETS.map((b) => {
              const st = capitalBucketStyle(b);
              const rows = view.filter((x) => x.p.portfolio_bucket === b);
              return (
                <section key={b} className="rounded-xl border bg-card p-5 shadow-sm">
                  <h2 className={`text-base font-semibold ${st.text}`}>{st.label} <span className="text-xs font-normal text-muted-foreground">· {rows.length} project{rows.length === 1 ? '' : 's'}</span></h2>
                  {rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing in this category.</p> : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground"><tr>
                          <th className="py-1.5">Project</th><th className="py-1.5">Size</th><th className="py-1.5">Stage</th><th className="py-1.5">Status</th>
                          <th className="py-1.5 text-right">Estimate / AFE</th><th className="py-1.5 text-right">EAC</th><th className="py-1.5 text-right">vs AFE</th><th className="py-1.5">Sanctioned by</th><th className="py-1.5">In service</th>
                        </tr></thead>
                        <tbody>
                          {rows.map((x) => {
                            const amt = x.v.committed ? x.v.chain.appropriated : Number(x.p.requested_budget ?? 0);
                            const over = x.v.trigger.over_pct;
                            return (
                              <tr key={x.p.id} className="border-t align-top">
                                <td className="py-1.5"><Link href={link(x.p.code)} className="font-medium hover:underline">{x.p.code}</Link> <span className="text-muted-foreground">{x.p.name}</span><span className="block text-[11px] text-muted-foreground">{x.bc.site ?? x.p.client}</span></td>
                                <td className="py-1.5 text-xs text-muted-foreground">{capitalCategoryLabel(x.p.project_category).replace(' project', '')}</td>
                                <td className="py-1.5 text-xs">{x.v.stageName ?? '—'}</td>
                                <td className="py-1.5 text-xs">{lifecycleLabel(x.p.lifecycle_status)}</td>
                                <td className="py-1.5 text-right tabular-nums">{fmtMoneyCap(amt)}<span className="block text-[10px] text-muted-foreground">{x.v.committed ? (x.v.chain.supplementary > 0 ? `incl. ${fmtMoneyCap(x.v.chain.supplementary)} supplementary` : 'AFE') : 'estimate'}</span></td>
                                <td className="py-1.5 text-right tabular-nums">{x.v.committed ? fmtMoneyCap(x.bc.eac) : '—'}</td>
                                <td className={`py-1.5 text-right tabular-nums ${over !== null && over > SUPPLEMENTARY_TOLERANCE_PCT ? 'font-semibold text-red-700' : over !== null && over > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>{x.v.committed && over !== null ? `${over > 0 ? '+' : ''}${over}%` : '—'}</td>
                                <td className="py-1.5"><span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: capitalBodyColour(afeAuthority(Math.max(amt, x.v.committed ? Number(x.bc.eac ?? 0) : 0)).body) }}>{afeAuthority(Math.max(amt, x.v.committed ? Number(x.bc.eac ?? 0) : 0)).label}</span></td>
                                <td className="py-1.5 text-xs tabular-nums">{fmtDate(x.bc.in_service_date)}{x.bc.planned_in_service_date && x.bc.in_service_date && x.bc.planned_in_service_date !== x.bc.in_service_date ? <span className="block text-[10px] text-amber-700">was {fmtDate(x.bc.planned_in_service_date)}</span> : null}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) },

        // --------------------------------------------------------- asset chain
        { key: 'chain', label: 'Asset chain', content: (
          <div className="space-y-4">
            <p className="max-w-3xl text-xs text-muted-foreground">Per project, the five links side by side. Settled and capitalised come from SAP — the app never re-derives a posting, it only shows where the chain has stopped moving.</p>
            {view.filter((x) => x.v.committed).map((x) => (
              <section key={x.p.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold"><Link href={link(x.p.code)} className="hover:underline">{x.p.code}</Link> <span className="font-normal text-muted-foreground">{x.p.name}</span></p>
                  <p className="text-xs text-muted-foreground">{capitalBucketLabel(x.p.portfolio_bucket)} · {x.v.stageName} · in service {fmtDate(x.bc.in_service_date)}</p>
                </div>
                <div className="mt-3"><CapitalChain chain={x.v.chain} eac={x.bc.eac ?? null} compact /></div>
              </section>
            ))}
            {view.filter((x) => x.v.committed).length === 0 && <p className="text-sm text-muted-foreground">No AFE has been sanctioned yet, so nothing is appropriated.</p>}
          </div>
        ) },

        // --------------------------------------------------------- readiness
        { key: 'readiness', label: 'Settlement readiness', badge: blocks.length, badgeTone: 'amber', content: (
          <div className="space-y-4">
            <p className="max-w-3xl text-xs text-muted-foreground">
              A settlement rule found missing at year end moves depreciation into the next fiscal year and leaves the asset off the register. These checks run continuously instead: cost on a WBS with no rule, rules that do not add to 100%, in-service slipping across a year end, AuC ageing, expensed share above the AFE assumption, and a forecast past tolerance with no supplementary raised.
            </p>
            {view.filter((x) => x.v.findings.length > 0).map((x) => (
              <section key={x.p.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold"><Link href={link(x.p.code)} className="hover:underline">{x.p.code}</Link> <span className="font-normal text-muted-foreground">{x.p.name}</span></p>
                  <p className="text-xs text-muted-foreground">in service {fmtDate(x.bc.in_service_date)}{x.daysToService !== null ? ` (${x.daysToService >= 0 ? `in ${x.daysToService} days` : `${-x.daysToService} days ago`})` : ''}</p>
                </div>
                <ul className="mt-3 space-y-2">
                  {x.v.findings.map((f) => (
                    <li key={f.key} className={`rounded-lg border px-3 py-2 text-sm ${SEV[f.severity].box}`}>
                      <p className="font-medium"><span className={`mr-2 rounded px-1.5 py-px text-[10px] font-semibold uppercase ${SEV[f.severity].chip}`}>{SEV[f.severity].label}</span>{f.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{f.detail}</p>
                      {f.wbs?.length ? <p className="mt-0.5 font-mono text-[11px]">{f.wbs.join(' · ')}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {view.every((x) => x.v.findings.length === 0) && <p className="text-sm text-muted-foreground">Nothing to settle or fix — every chain is clean.</p>}
          </div>
        ) },

        // ----------------------------------------------------------- decisions
        { key: 'decisions', label: 'Decisions', badge: awaitingMe.length, content: (
          <section id="decisions">
            <DecisionsPanel records={records} gov={gov} projectCodes={projectCodes}
              projectStatus={Object.fromEntries(projects.map((p) => [p.code, p.lifecycle_status ?? '']))}
              title="Raised by the project, sanctioned by the body the amount requires"
              emptyText="Nothing awaiting decision. FEL study releases, AFEs, supplementaries, holds and cancellations all arrive here." />
          </section>
        ) },

        // ---------------------------------------------------------- governance
        { key: 'governance', label: 'Who decides what', content: (
          <details open className="rounded-lg border bg-card p-5">
            <summary className="cursor-pointer text-sm font-semibold">Who decides what · delegation of authority <span className="ml-2 text-xs font-normal text-muted-foreground">{governance.bodies.length} bodies · {governance.matrix.length} rules</span></summary>
            <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
              AFE authority is set by size: up to $1M the plant manager, $1M–$10M the business-unit head, above $10M the capital committee. Finance concurs on every AFE and supplementary — on the classification and the settlement basis, not on whether to spend. A supplementary is routed on the revised total, which is what stops a large project being approved in small pieces.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {governance.bodies.map((b) => (
                <div key={b.id} className={`relative overflow-hidden rounded-lg border p-4 text-xs shadow-sm ${gov.myBodyKeys.includes(b.key) ? 'ring-2 ring-blue-400' : ''}`}>
                  <span className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: capitalBodyColour(b.key) }} />
                  <p className="pl-2 text-sm font-semibold" style={{ color: capitalBodyColour(b.key) }}>{b.name}{gov.myBodyKeys.includes(b.key) && <span className="ml-2 rounded bg-blue-600 px-1.5 py-px text-[10px] font-medium text-white">you</span>}</p>
                  <p className="mt-0.5 pl-2 text-muted-foreground">{b.description}</p>
                  <p className="mt-1 pl-2 text-[11px]">Quorum {b.quorum}{b.member_role_type ? ` · any ${b.member_role_type.replace(/_/g, ' ')}` : ` · ${governance.members.filter((m) => m.body_id === b.id).length} member(s)`}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="py-1">Decision</th><th className="py-1">Phase</th><th className="py-1 text-right">From</th><th className="py-1 text-right">To</th><th className="py-1">Decides</th><th className="py-1">Concurrence</th><th className="py-1">Note</th></tr></thead>
                <tbody>{governance.matrix.map((r) => <tr key={r.id} className="border-t"><td className="py-1">{r.decision_kind === 'gate_decision' ? 'FEL study budget' : r.decision_kind.replace(/_/g, ' ').replace('afe', 'AFE')}</td><td className="py-1">{r.post_commit == null ? '—' : r.post_commit ? 'after AFE' : 'in FEL'}</td><td className="py-1 text-right tabular-nums">{fmtMoneyCap(Number(r.min_amount))}</td><td className="py-1 text-right tabular-nums">{r.max_amount == null ? '∞' : fmtMoneyCap(Number(r.max_amount))}</td><td className="py-1"><span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: capitalBodyColour(r.required_body_key) }}>{governance.bodies.find((b) => b.key === r.required_body_key)?.name ?? r.required_body_key}</span></td><td className="py-1">{r.required_concurrences.map((k) => governance.bodies.find((b) => b.key === k)?.name ?? k).join(', ') || '—'}</td><td className="py-1 text-xs text-muted-foreground">{r.notes ?? ''}</td></tr>)}</tbody></table>
            </div>
          </details>
        ) },
      ]} />
    </div>
  );
}
