/**
 * IT PMO workspace — portfolio home: the fiscal-year envelope by bucket,
 * within-bucket ranking and waterline, running projects and their gate
 * position. Visible to roles scoped to the 'it' project type.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { roleSees } from '@/lib/workspace';
import { bucketStyle, fmtMoney } from '@/lib/it-portfolio';
import { canRoleCreateProjectType } from '@/lib/roles';
import { ItPortfolioClient } from '@/components/it-portfolio-client';
import { DecisionsPanel } from '@/components/decisions-panel';
import { ItPortfolioHero, ItRibbon } from '@/components/it-portfolio-hero';
import { ItInsights, ItWatchlist } from '@/components/it-portfolio-sections';
import { ItProjectSearch } from '@/components/it-project-search';
import { ItPortfolioTabs } from '@/components/it-portfolio-tabs';
import { bodiesFor, loadGovernance } from '@/lib/governance';
import type { DecisionRecord, GateDecision, PortfolioAllocation, Project, ResourceDisplacement } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** One colour per decision body, bucket owners in their bucket's colour. */
function bodyColour(key: string): string {
  if (key.startsWith('bucket_owner:')) return bucketStyle(key.split(':')[1]).hex;
  return { investment_board: '#0f172a', cio: '#0284c7', sponsor: '#059669', finance: '#d97706', architecture: '#7c3aed' }[key] ?? '#64748b';
}

export default async function ItPortfolioPage({ searchParams }: { searchParams: Promise<{ fy?: string }> }) {
  const resolved = await getSessionRole();
  if (!resolved || !roleSees(resolved.role, 'it')) notFound();
  const { fy } = await searchParams;

  const supabase = createSupabaseServiceClient();
  const [projRes, allocRes, recRes, governance, holdRes, dispRes, coRes, benRes] = await Promise.all([
    supabase.from('projects').select('id, code, name, client, project_category, portfolio_bucket, fiscal_year, fiscal_years_approved, lifecycle_status, requested_budget, business_case, continuation_of_id, current_stage, approved_budget_current').eq('project_type', 'it').order('code'),
    supabase.from('portfolio_allocations').select('*').eq('project_type', 'it').order('fiscal_year'),
    supabase.from('decision_records').select('*').eq('project_type', 'it').order('proposed_at', { ascending: false }).limit(200),
    loadGovernance(supabase, 'it'),
    supabase.from('gate_decisions').select('*').eq('decision', 'hold').not('hold_until', 'is', null).order('hold_until'),
    supabase.from('resource_displacements').select('*').order('from_date', { ascending: false }).limit(50),
    supabase.from('change_orders').select('id, project_id, status, cost_impact_m, funding_source'),
    supabase.from('benefits_reports').select('project_id, period, planned_benefit, realised_benefit').order('period', { ascending: false }),
  ]);
  const records = (recRes.data ?? []) as DecisionRecord[];
  const holds = (holdRes.data ?? []) as GateDecision[];
  const displacements = (dispRes.data ?? []) as ResourceDisplacement[];
  const gov = { bodies: governance.bodies, myBodyKeys: bodiesFor(governance, resolved.role), myRoleId: resolved.role.id, myRoleType: resolved.role.role_type, myName: resolved.role.name };
  const projects = (projRes.data ?? []) as Array<Pick<Project, 'id' | 'code' | 'name' | 'client' | 'project_category' | 'portfolio_bucket' | 'fiscal_year' | 'fiscal_years_approved' | 'lifecycle_status' | 'requested_budget' | 'business_case' | 'continuation_of_id' | 'current_stage' | 'approved_budget_current'>>;
  const allocations = (allocRes.data ?? []) as PortfolioAllocation[];

  const yearSet = new Set<number>([...allocations.map((a) => a.fiscal_year), ...projects.map((p) => p.fiscal_year).filter((y): y is number => typeof y === 'number')]);
  if (yearSet.size === 0) yearSet.add(new Date().getFullYear() + 1);
  const years = Array.from(yearSet).sort();
  const fiscalYear = fy && years.includes(Number(fy)) ? Number(fy) : years[years.length - 1];
  const canManage = ['it_portfolio_manager', 'it_bucket_owner', 'it_board_member'].includes(resolved.role.role_type);
  const projectCodes = Object.fromEntries(projects.map((p) => [p.id, p.code]));
  const activeHolds = holds.filter((h) => projects.some((p) => p.id === h.project_id && p.lifecycle_status === 'on_hold'));
  const openDisplacements = displacements.filter((d) => !d.to_date);
  const canCreate = canRoleCreateProjectType(resolved.role.role_type, 'it');

  const openRecords = records.filter((r) => r.status === 'proposed');
  const awaitingMe = openRecords.filter((r) => gov.myBodyKeys.includes(r.required_body_key) || (r.required_concurrences ?? []).some((c) => gov.myBodyKeys.includes(c) && !(r.concurrences ?? []).some((x) => x.body_key === c)));
  const expiringHolds = activeHolds.filter((h) => h.hold_until && new Date(h.hold_until).getTime() - Date.now() < 30 * 86400000);
  const itIds = new Set(projects.map((p) => p.id));
  const openCos = ((coRes.data ?? []) as Array<{ project_id: string; status: string; cost_impact_m: number | null }>).filter((c) => itIds.has(c.project_id) && !['Approved', 'Rejected', 'Withdrawn', 'Closed'].includes(c.status));
  const openCoValue = openCos.reduce((n, c) => n + Number(c.cost_impact_m ?? 0) * 1_000_000, 0);
  const awaitingCommit = projects.filter((p) => p.lifecycle_status === 'approved');
  const concurrenceOwed = openRecords.filter((r) => (r.required_concurrences ?? []).some((k) => !(r.concurrences ?? []).some((c) => c.body_key === k && c.outcome === 'concur')));
  const latestBenefit = new Map<string, { planned: number; realised: number }>();
  for (const b of (benRes.data ?? []) as Array<{ project_id: string; planned_benefit: number; realised_benefit: number }>) if (!latestBenefit.has(b.project_id)) latestBenefit.set(b.project_id, { planned: Number(b.planned_benefit), realised: Number(b.realised_benefit) });
  const benefitsBehind = Array.from(latestBenefit.values()).filter((b) => b.realised < b.planned).length;
  const deferred = projects.filter((p) => p.fiscal_year === fiscalYear && p.lifecycle_status === 'deferred').length;

  return (
    <div className="container mx-auto max-w-screen-2xl space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">IT PMO workspace</p>
          <h1 className="text-2xl font-bold tracking-tight">IT portfolio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Bucketed envelope, within-bucket ranking against the waterline, continuation calls for multi-year projects, and every project&rsquo;s gate position.
          </p>
        </div>
        {canCreate && <Link href="/intake/it" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">+ Submit IT project</Link>}
      </div>

      <ItProjectSearch projects={projects} />

      <ItPortfolioTabs tabs={[
        { key: 'overview', label: 'Overview', anchors: ['bucket'], content: (<>
      <ItPortfolioHero fiscalYear={fiscalYear} years={years} projects={projects} allocations={allocations} />

      <ItRibbon items={[
        { label: 'Awaiting your decision', value: awaitingMe.length, href: '#decisions', tone: 'good' },
        { label: 'Open decisions', value: openRecords.length, href: '#decisions' },
        { label: 'Holds expiring in 30 days', value: expiringHolds.length, href: '#holds', tone: 'warn' },
        { label: 'People displaced', value: openDisplacements.length, href: '#displacement', tone: 'warn' },
      ]} />

      <ItPortfolioClient part="buckets" fiscalYear={fiscalYear} projects={projects} allocations={allocations} canManage={canManage} bodies={governance.bodies} matrix={governance.matrix} myRoleType={resolved.role.role_type} />

      <ItWatchlist tiles={[
        { label: 'Awaiting decision', value: String(openRecords.length), sub: `${awaitingMe.length} for you`, tone: awaitingMe.length > 0 ? 'ok' : 'neutral', href: '#decisions' },
        { label: 'Concurrence owed', value: String(concurrenceOwed.length), sub: 'Finance sign-off pending', tone: concurrenceOwed.length > 0 ? 'info' : 'neutral', href: '#decisions' },
        { label: 'Awaiting commit gate', value: String(awaitingCommit.length), sub: 'envelope granted, SG1 not yet', tone: 'info', href: '#running' },
        { label: 'Open change orders', value: String(openCos.length), sub: `${fmtMoney(openCoValue)} in flight`, tone: openCos.length > 0 ? 'warn' : 'neutral' },
        { label: 'Holds expiring', value: String(expiringHolds.length), sub: 'within 30 days', tone: expiringHolds.length > 0 ? 'warn' : 'neutral', href: '#holds' },
        { label: 'People displaced', value: String(openDisplacements.length), sub: 'incidents, run work, other projects', tone: openDisplacements.length > 0 ? 'warn' : 'neutral', href: '#displacement' },
        { label: 'Benefits behind plan', value: String(benefitsBehind), sub: `${deferred} deferred this year`, tone: benefitsBehind > 0 ? 'warn' : 'ok' },
      ]} />

      <ItInsights fiscalYear={fiscalYear} projects={projects} />
        </>) },
        { key: 'decisions', label: 'Decisions', badge: awaitingMe.length, content: (<>
      <section id="decisions">
        <DecisionsPanel records={records} gov={gov} projectCodes={projectCodes} projectStatus={Object.fromEntries(projects.map((p) => [p.code, p.lifecycle_status ?? '']))} title="Proposed by the PMO, decided by the authorised body" emptyText="Nothing awaiting decision. The envelope, the waterline, commit baselines, continuations, holds, cancellations and change orders all arrive here." />
      </section>

        </>) },
        { key: 'waterline', label: 'Waterline', badge: openRecords.filter((r) => r.decision_kind === 'waterline_approval' || r.decision_kind === 'continuation').length, badgeTone: 'amber', anchors: ['rank'], content: (<>
      <ItPortfolioClient part="ranking" fiscalYear={fiscalYear} projects={projects} allocations={allocations} canManage={canManage} bodies={governance.bodies} matrix={governance.matrix} myRoleType={resolved.role.role_type} />

        </>) },
        { key: 'delivery', label: 'Delivery', badge: expiringHolds.length + openDisplacements.length, badgeTone: 'amber', anchors: ['running', 'holds', 'displacement'], content: (<>
      <ItPortfolioClient part="running" fiscalYear={fiscalYear} projects={projects} allocations={allocations} canManage={canManage} bodies={governance.bodies} matrix={governance.matrix} myRoleType={resolved.role.role_type} />
        <section className="grid gap-6 lg:grid-cols-2">
          <div id="holds" className={`rounded-xl border p-5 shadow-sm ${activeHolds.length > 0 ? 'border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-white' : 'bg-card'}`}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold">Holds · time boxes</h2><p className="text-xs text-muted-foreground">Every hold carries an expiry; on expiry it re-enters through the continuation gate or is cancelled.</p></div>
              <p className="text-3xl font-semibold tabular-nums text-amber-700">{activeHolds.length}</p>
            </div>
            {activeHolds.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No projects on hold.</p> : (
              <table className="mt-3 w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="py-1.5">Project</th><th className="py-1.5">Since</th><th className="py-1.5">Expires</th><th className="py-1.5">Trigger</th></tr></thead>
                <tbody>{activeHolds.map((h) => { const expired = h.hold_until ? new Date(h.hold_until) < new Date() : false; return (
                  <tr key={h.id} className="border-t"><td className="py-1.5"><Link href={`/projects/${encodeURIComponent(projectCodes[h.project_id] ?? '')}`} className="font-medium hover:underline">{projectCodes[h.project_id]}</Link></td><td className="py-1.5 tabular-nums">{h.decided_on}</td><td className={`py-1.5 tabular-nums ${expired ? 'font-semibold text-red-700' : ''}`}>{h.hold_until}{expired ? ' — expired' : ''}</td><td className="py-1.5 text-muted-foreground">{h.notes ?? ''}</td></tr>
                ); })}</tbody></table>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">An expired hold re-enters through the continuation gate or is cancelled — it does not drift.</p>
          </div>
          <div id="displacement" className={`rounded-xl border p-5 shadow-sm ${openDisplacements.length > 0 ? 'border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-white' : 'bg-card'}`}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold">Resource displacement</h2><p className="text-xs text-muted-foreground">People pulled off IT projects — incidents, run work, higher-priority projects, audits — so the slip is attributed to its cause, not absorbed.</p></div>
              <p className="text-3xl font-semibold tabular-nums text-rose-700">{openDisplacements.length}<span className="ml-1 text-xs font-normal text-muted-foreground">open</span></p>
            </div>
            {displacements.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No displacements logged.</p> : (
              <table className="mt-3 w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="py-1.5">From</th><th className="py-1.5">Person</th><th className="py-1.5">To</th><th className="py-1.5">From</th><th className="py-1.5">To</th><th className="py-1.5 text-right">Days</th></tr></thead>
                <tbody>{displacements.slice(0, 12).map((d) => (
                  <tr key={d.id} className="border-t"><td className="py-1.5"><Link href={`/projects/${encodeURIComponent(projectCodes[d.from_project_id] ?? '')}`} className="font-medium hover:underline">{projectCodes[d.from_project_id] ?? '—'}</Link></td><td className="py-1.5">{d.resource_name}{d.skill ? ` (${d.skill})` : ''}</td><td className="py-1.5">{d.to_project_code ?? '—'}</td><td className="py-1.5 tabular-nums">{d.from_date}</td><td className="py-1.5 tabular-nums">{d.to_date ?? <span className="text-amber-800">open</span>}</td><td className="py-1.5 text-right tabular-nums">{d.schedule_impact_days ?? '—'}</td></tr>
                ))}</tbody></table>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">The view nobody has today: how much IT delay comes from people being moved, and where they went.</p>
          </div>
        </section>
        </>) },
        { key: 'governance', label: 'Who decides what', content: (<>
        <details open className="rounded-lg border bg-card p-5">
          <summary className="cursor-pointer text-sm font-semibold">Who decides what · delegation of authority <span className="ml-2 text-xs font-normal text-muted-foreground">{governance.bodies.length} bodies · {governance.matrix.length} rules</span></summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {governance.bodies.map((b) => (
              <div key={b.id} className={`relative overflow-hidden rounded-lg border p-4 text-xs shadow-sm ${gov.myBodyKeys.includes(b.key) ? 'ring-2 ring-teal-400' : ''}`}>
                <span className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: bodyColour(b.key) }} />
                <p className="pl-2 text-sm font-semibold" style={{ color: bodyColour(b.key) }}>{b.name}{gov.myBodyKeys.includes(b.key) && <span className="ml-2 rounded bg-teal-600 px-1.5 py-px text-[10px] font-medium text-white">you</span>}</p>
                <p className="mt-0.5 pl-2 text-muted-foreground">{b.description}</p>
                <p className="mt-1 pl-2 text-[11px]">Quorum {b.quorum}{b.member_role_type ? ` · any ${b.member_role_type.replace(/_/g, ' ')}` : ` · ${governance.members.filter((m) => m.body_id === b.id).length} member(s)`}</p>
              </div>
            ))}
          </div>
          <details className="mt-3 text-xs"><summary className="cursor-pointer font-medium text-muted-foreground">Authority matrix ({governance.matrix.length} rules)</summary>
            <table className="mt-2 w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="py-1">Decision</th><th className="py-1">Funding / phase</th><th className="py-1 text-right">From</th><th className="py-1 text-right">To</th><th className="py-1">Decides</th><th className="py-1">Concurrence</th></tr></thead>
              <tbody>{governance.matrix.map((r) => <tr key={r.id} className="border-t"><td className="py-1">{r.decision_kind.replace(/_/g, ' ')}</td><td className="py-1">{r.funding_source?.replace(/_/g, ' ') ?? (r.post_commit == null ? '—' : r.post_commit ? 'post-commit' : 'pre-commit')}</td><td className="py-1 text-right tabular-nums">{Number(r.min_amount).toLocaleString()}</td><td className="py-1 text-right tabular-nums">{r.max_amount == null ? '∞' : Number(r.max_amount).toLocaleString()}</td><td className="py-1"><span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: bodyColour(r.required_body_key) }}>{r.required_body_key.replace(/_/g, ' ').replace(':*', ' (of the bucket)')}</span></td><td className="py-1">{r.required_concurrences.join(', ') || '—'}</td></tr>)}</tbody></table>
          </details>
        </details>
        </>) },
      ]} />
    </div>
  );
}
