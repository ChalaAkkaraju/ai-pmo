/**
 * Role landing dashboard — two-ribbon redesign.
 *
 *   Ribbon 1: 6 portfolio KPIs (financial bundle)
 *   Ribbon 2: 4 theme/segment cards (clickable to drill-down)
 *   Inline drill-down: filtered project grid + filter row, shown only when a
 *   theme card is selected.
 */

import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { matchRoleFromText } from '@/lib/role-match';
import { WelcomeGate } from '@/components/welcome-gate';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { computeEv, rollUpEv, type PortfolioEv } from '@/lib/earned-value';
import {
  DashboardClient,
  type DashboardProject,
  type DashboardActivity,
  type PortfolioKpis,
  type SegmentSummary,
  type PortfolioInsights,
  type HotItem,
  type OperationalKpis,
  type FinancialKpis,
  type RoleKpiStrip,
  type RecentlyAddedProject,
} from '@/components/dashboard-client';

// Always fetch fresh from Supabase — no Next.js data cache
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

const ALL_SEGMENTS: ReadonlyArray<'renewables' | 'water' | 'industrial' | 'power'> = [
  'renewables',
  'water',
  'industrial',
  'power',
];

export default async function RoleLandingPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();

  const [projectsRes, risksRes, issuesRes, varianceRes, changeOrdersRes, patternsRes, activityRes, workspaceCountRes, workspaceRecentRes] =
    await Promise.all([
      supabase
        .from('projects')
        .select('id, code, name, client, segment, status, current_week, contract_value_current, approved_budget_current, contingency, hard_deadline_description, created_via, created_at')
        .order('code', { ascending: true }),
      supabase.from('risks').select('project_id, status, impact, cross_cutting_class, owner, description, emv_usd, residual_emv_usd'),
      supabase.from('issues').select('project_id, severity, status, category, owner, description'),
      supabase.from('variance_reports').select('project_id, report_week, cpi, spi, contingency_consumed_m'),
      supabase.from('change_orders').select('project_id, status, revenue_impact_m, margin_realized_pct'),
      supabase.from('portfolio_patterns').select('status, threshold_projects, supporting_projects, cross_cutting_class'),
      supabase
        .from('agent_outputs')
        .select('id, agent_type, invoked_at, project_id, user_prompt, output_md, projects:project_id(code, name, segment), roles:invoked_by_role_id(name, role_type)')
        .eq('invoked_by_role_id', resolved.role.id)
        .order('invoked_at', { ascending: false })
        .limit(5),
      supabase.from('agent_outputs').select('id', { count: 'exact', head: true }),
      supabase
        .from('agent_outputs')
        .select('id, agent_type, invoked_at, project_id, user_prompt, output_md, projects:project_id(code, name, segment), roles:invoked_by_role_id(name, role_type)')
        .order('invoked_at', { ascending: false })
        .limit(8),
    ]);

  const projects = (projectsRes.data ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    client: string;
    segment: string;
    status: string;
    current_week: number;
    contract_value_current: number | string;
    approved_budget_current: number | string;
    contingency: number | string;
    hard_deadline_description: string | null;
    created_via: string | null;
    created_at: string;
  }>;
  const risks = (risksRes.data ?? []) as Array<{ project_id: string; status: string; impact: string; cross_cutting_class: string; owner: string | null; description: string; emv_usd: number | string | null; residual_emv_usd: number | string | null }>;
  const issues = (issuesRes.data ?? []) as Array<{ project_id: string; severity: string; status: string; category: string; owner: string | null; description: string }>;
  const variance = (varianceRes.data ?? []) as Array<{ project_id: string; report_week: number; cpi: number | string; spi: number | string; contingency_consumed_m: number | string | null }>;
  const changeOrders = (changeOrdersRes.data ?? []) as Array<{ project_id: string; status: string; revenue_impact_m: number | string | null; margin_realized_pct: number | string | null }>;
  const patterns = (patternsRes.data ?? []) as Array<{ status: string; threshold_projects: number; supporting_projects: string[] | null; cross_cutting_class: string }>;

  const projIdToContract = new Map<string, number>();
  for (const p of projects) {
    projIdToContract.set(p.id, Number(p.contract_value_current));
  }

  // Latest variance report per project (sort desc by week, take first per pid)
  const latestVariance = new Map<string, { cpi: number; spi: number; contingency_m: number }>();
  const varianceSorted = [...variance].sort((a, b) => b.report_week - a.report_week);
  for (const v of varianceSorted) {
    if (!latestVariance.has(v.project_id)) {
      latestVariance.set(v.project_id, {
        cpi: Number(v.cpi),
        spi: Number(v.spi),
        contingency_m: Number(v.contingency_consumed_m ?? 0),
      });
    }
  }

  // -------- Portfolio KPIs (financial bundle) --------
  let totalContract = 0;
  let totalBudget = 0;
  let activeCount = 0;
  for (const p of projects) {
    totalContract += Number(p.contract_value_current);
    totalBudget += Number(p.approved_budget_current);
    if (p.status === 'Active') activeCount++;
  }

  let realisedRisks = 0;
  for (const r of risks) {
    if (String(r.status).toLowerCase().startsWith('realised')) realisedRisks++;
  }

  let openHighIssues = 0;
  for (const i of issues) {
    if (i.severity === 'H' && (i.status === 'Open' || i.status === 'In progress')) openHighIssues++;
  }

  // Weighted avg CPI/SPI
  let weightedCpiSum = 0;
  let weightedSpiSum = 0;
  let totalWeight = 0;
  for (const [pid, v] of latestVariance) {
    const weight = projIdToContract.get(pid) ?? 0;
    weightedCpiSum += v.cpi * weight;
    weightedSpiSum += v.spi * weight;
    totalWeight += weight;
  }
  const avgCpi = totalWeight > 0 ? weightedCpiSum / totalWeight : 1;
  const avgSpi = totalWeight > 0 ? weightedSpiSum / totalWeight : 1;

  const kpis: PortfolioKpis = {
    total_contract_b: totalContract / 1_000_000_000,
    total_budget_b: totalBudget / 1_000_000_000,
    active_count: activeCount,
    realised_risks: realisedRisks,
    open_h_issues: openHighIssues,
    avg_cpi: avgCpi,
    avg_spi: avgSpi,
  };

  // -------- Operational portfolio signals (net-new vs the hero) --------
  let costOffTrack = 0;
  let schedOffTrack = 0;
  let contingencyDrawnM = 0;
  for (const [, v] of latestVariance) {
    if (v.cpi < 0.95) costOffTrack++;
    if (v.spi < 0.95) schedOffTrack++;
    contingencyDrawnM += v.contingency_m;
  }
  let patternsAtEmergence = 0;
  for (const p of patterns) {
    const n = Array.isArray(p.supporting_projects) ? p.supporting_projects.length : 0;
    if (n >= (p.threshold_projects ?? Number.POSITIVE_INFINITY)) patternsAtEmergence++;
  }

  const operational: OperationalKpis = {
    open_h_issues: openHighIssues,
    realised_risks: realisedRisks,
    cost_off_track: costOffTrack,
    sched_off_track: schedOffTrack,
    contingency_drawn_m: contingencyDrawnM,
    patterns_at_emergence: patternsAtEmergence,
  };

  // -------- Portfolio financial position (cost-to-cash rollup across active projects) --------
  let financial: FinancialKpis | null = null;
  try {
    const activeIds = new Set(projects.filter((p) => p.status === 'Active').map((p) => p.id));
    const [poRes, raRes, billRes] = await Promise.all([
      supabase.from('purchase_orders').select('project_id, po_value, received_value, status').limit(100000),
      supabase.from('results_analysis').select('project_id, calculated_revenue, recognized_margin').limit(100000),
      supabase.from('billing_events').select('project_id, amount, status').limit(100000),
    ]);
    let openCommit = 0, recRev = 0, recMargin = 0, billed = 0;
    let coValue = 0, coInFlight = 0;
    for (const c of changeOrders) {
      coValue += (Number(c.revenue_impact_m) || 0) * 1_000_000;
      if (c.status === 'Anticipated' || c.status === 'Under analysis' || c.status === 'Priced') coInFlight++;
    }
    for (const po of (poRes.data ?? []) as Array<{ project_id: string; po_value: number | string; received_value: number | string; status: string }>) {
      if (!activeIds.has(po.project_id) || po.status === 'Closed') continue;
      openCommit += Math.max(0, (Number(po.po_value) || 0) - (Number(po.received_value) || 0));
    }
    for (const r of (raRes.data ?? []) as Array<{ project_id: string; calculated_revenue: number | string | null; recognized_margin: number | string | null }>) {
      if (!activeIds.has(r.project_id)) continue;
      recRev += Number(r.calculated_revenue) || 0;
      recMargin += Number(r.recognized_margin) || 0;
    }
    for (const b of (billRes.data ?? []) as Array<{ project_id: string; amount: number | string | null; status: string }>) {
      if (!activeIds.has(b.project_id) || !(b.status === 'Invoiced' || b.status === 'Paid')) continue;
      billed += Number(b.amount) || 0;
    }
    financial = {
      open_commitment: openCommit,
      recognised_revenue: recRev,
      recognised_margin: recMargin,
      recognised_margin_pct: recRev > 0 ? (recMargin / recRev) * 100 : 0,
      net_unbilled: recRev - billed,
      billed,
      co_value: coValue,
      co_in_flight: coInFlight,
    };
  } catch {
    financial = null;
  }

  // -------- Role-specific KPI strip (pilot: commercial, risk, hse) --------
  // Each tile is chosen to be net-new vs the hero AND the operational ribbon,
  // and is computed from real seeded data (see lib/types + seed generators).
  let roleKpis: RoleKpiStrip | null = null;
  const rt = resolved.definition.type;

  if (rt === 'commercial') {
    let coValueM = 0;
    let marginSum = 0;
    let marginN = 0;
    let inFlight = 0;
    for (const c of changeOrders) {
      coValueM += Number(c.revenue_impact_m ?? 0);
      if (c.margin_realized_pct !== null && c.margin_realized_pct !== undefined) {
        marginSum += Number(c.margin_realized_pct);
        marginN++;
      }
      if (c.status === 'Under analysis' || c.status === 'Priced') inFlight++;
    }
    const avgMargin = marginN > 0 ? marginSum / marginN : 0;
    roleKpis = {
      title: 'Your commercial KPIs',
      subtitle: 'Change-order economics across the portfolio — not shown in the shared view above.',
      tiles: [
        { label: 'Change-order value', value: `$${coValueM.toFixed(1)}M`, sub: 'total revenue impact', tone: 'neutral' },
        { label: 'Avg margin protected', value: `${avgMargin.toFixed(1)}%`, sub: 'on executed / complete COs', tone: avgMargin > 0 && avgMargin < 8 ? 'warn' : 'ok' },
        { label: 'Change orders in flight', value: String(inFlight), sub: 'awaiting decision', tone: inFlight > 0 ? 'info' : 'neutral' },
      ],
    };
  } else if (rt === 'risk') {
    let openRisks = 0;
    let highOpen = 0;
    let mitigated = 0;
    for (const r of risks) {
      if (r.status === 'Open') {
        openRisks++;
        if (r.impact === 'H') highOpen++;
      }
      if (r.status === 'Mitigated') mitigated++;
    }
    roleKpis = {
      title: 'Your risk KPIs',
      subtitle: 'Open-register cuts that complement the realised-risk and pattern counts in the shared view.',
      tiles: [
        { label: 'Open risks', value: String(openRisks), sub: 'active in the register', tone: 'neutral' },
        { label: 'High-impact open', value: String(highOpen), sub: 'impact = High', tone: highOpen > 0 ? 'warn' : 'ok' },
        { label: 'Mitigated risks', value: String(mitigated), sub: 'closed via mitigation', tone: 'info' },
      ],
    };
  } else if (rt === 'hse_manager') {
    const hseRe = /hse|safety|environment|h&s|ehs/i;
    let hseOpen = 0;
    let hseHigh = 0;
    for (const i of issues) {
      if (hseRe.test(i.category ?? '') && (i.status === 'Open' || i.status === 'In progress')) {
        hseOpen++;
        if (i.severity === 'H') hseHigh++;
      }
    }
    let siteWeatherRisks = 0;
    for (const r of risks) {
      if (
        r.cross_cutting_class === 'Site-conditions variance' ||
        r.cross_cutting_class === 'Weather / climate-sensitive construction'
      ) {
        siteWeatherRisks++;
      }
    }
    roleKpis = {
      title: 'Your HSE KPIs',
      subtitle: 'Safety / environment signals filtered from the portfolio — not surfaced in the shared view.',
      tiles: [
        { label: 'Open HSE issues', value: String(hseOpen), sub: 'safety / environment, open', tone: hseOpen > 0 ? 'warn' : 'ok' },
        { label: 'High-severity HSE', value: String(hseHigh), sub: 'severity = High', tone: hseHigh > 0 ? 'warn' : 'ok' },
        { label: 'Site & weather risks', value: String(siteWeatherRisks), sub: 'site-conditions & weather classes', tone: 'info' },
      ],
    };
  }

  // -------- Per-segment summaries --------
  const segmentSummaries: SegmentSummary[] = ALL_SEGMENTS.map((seg) => {
    const segProjects = projects.filter((p) => p.segment === seg);
    const segProjIds = new Set(segProjects.map((p) => p.id));
    let segContract = 0;
    let segBudget = 0;
    let segActive = 0;
    let segSc = 0;
    let segClosed = 0;
    for (const p of segProjects) {
      segContract += Number(p.contract_value_current);
      segBudget += Number(p.approved_budget_current);
      if (p.status === 'Active') segActive++;
      else if (p.status === 'SC') segSc++;
      else if (p.status === 'Closed') segClosed++;
    }
    const segMargin = segContract > 0 ? ((segContract - segBudget) / segContract) * 100 : null;

    let segWCpiSum = 0;
    let segWSpiSum = 0;
    let segWeight = 0;
    for (const [pid, v] of latestVariance) {
      if (!segProjIds.has(pid)) continue;
      const weight = projIdToContract.get(pid) ?? 0;
      segWCpiSum += v.cpi * weight;
      segWSpiSum += v.spi * weight;
      segWeight += weight;
    }
    const segCpi = segWeight > 0 ? segWCpiSum / segWeight : null;
    const segSpi = segWeight > 0 ? segWSpiSum / segWeight : null;

    return {
      segment: seg,
      project_count: segProjects.length,
      contract_value_b: segContract / 1_000_000_000,
      active_count: segActive,
      sc_count: segSc,
      closed_count: segClosed,
      avg_cpi: segCpi,
      avg_spi: segSpi,
      margin_pct: segMargin,
    };
  });

  // -------- Portfolio insights (for the 3 mini charts) --------
  // 1. Risks by category
  const riskClassCounts: Record<string, number> = {};
  for (const r of risks) {
    const cls = r.cross_cutting_class || 'Project-specific';
    riskClassCounts[cls] = (riskClassCounts[cls] ?? 0) + 1;
  }

  // 2. Issues by severity
  const issueSeverityCounts: Record<string, number> = { H: 0, M: 0, L: 0 };
  for (const i of issues) {
    if (i.severity in issueSeverityCounts) {
      issueSeverityCounts[i.severity]++;
    }
  }

  // 3. Contingency-consumption distribution across projects (bucketed).
  // Actual: each project's latest contingency consumed ($M from variance) as a
  // share of its contingency budget (projects.contingency, in dollars).
  const buckets = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0, '>100%': 0 };
  for (const p of projects) {
    const budget = Number(p.contingency) || 0;
    if (budget <= 0) continue;
    const consumed = (latestVariance.get(p.id)?.contingency_m ?? 0) * 1_000_000;
    const pct = (consumed / budget) * 100;
    if (pct < 25) buckets['0-25%']++;
    else if (pct < 50) buckets['25-50%']++;
    else if (pct < 75) buckets['50-75%']++;
    else if (pct < 100) buckets['75-100%']++;
    else buckets['>100%']++;
  }

  // Drill-down detail rows (shown in the dashboard insight popups).
  const projMetaById = new Map<string, { code: string; name: string; segment: string }>();
  for (const p of projects) projMetaById.set(p.id, { code: p.code, name: p.name, segment: p.segment });
  const issue_rows = issues.map((i) => {
    const m = projMetaById.get(i.project_id);
    return { code: m?.code ?? '\u2014', project: m?.name ?? '\u2014', severity: i.severity, status: i.status, owner: i.owner ?? '\u2014', description: i.description };
  });
  const risk_rows = risks.map((r) => {
    const m = projMetaById.get(r.project_id);
    return { code: m?.code ?? '\u2014', project: m?.name ?? '\u2014', klass: r.cross_cutting_class, impact: r.impact, status: r.status, owner: r.owner ?? '\u2014', description: r.description };
  });
  const bandOf = (pct: number) => (pct < 25 ? '0-25%' : pct < 50 ? '25-50%' : pct < 75 ? '50-75%' : pct < 100 ? '75-100%' : '>100%');
  const contingency_rows: PortfolioInsights['contingency_rows'] = [];
  for (const p of projects) {
    const budget = Number(p.contingency) || 0;
    if (budget <= 0) continue;
    const consumedM = latestVariance.get(p.id)?.contingency_m ?? 0;
    const pct = ((consumedM * 1_000_000) / budget) * 100;
    contingency_rows.push({ code: p.code, name: p.name, segment: p.segment, pct: Math.round(pct), consumedM, budgetM: budget / 1_000_000, band: bandOf(pct) });
  }
  const project_rows: PortfolioInsights['project_rows'] = [];
  for (const p of projects) {
    const v = latestVariance.get(p.id);
    if (!v) continue;
    project_rows.push({ code: p.code, name: p.name, segment: p.segment, cpi: v.cpi, spi: v.spi });
  }
  const pattern_rows: PortfolioInsights['pattern_rows'] = patterns.map((pt) => ({
    klass: pt.cross_cutting_class,
    status: pt.status,
    supporting: Array.isArray(pt.supporting_projects) ? pt.supporting_projects.length : 0,
    threshold: pt.threshold_projects ?? 0,
  }));

  let riskExposure = 0;
  for (const r of risks) {
    const st = String(r.status).toLowerCase();
    if (st.startsWith('realis') || st.includes('not materialis')) continue; // no residual exposure
    riskExposure += Number(r.residual_emv_usd) || Number(r.emv_usd) || 0;
  }

  const insights: PortfolioInsights = {
    risk_exposure_m: riskExposure / 1_000_000,
    risk_class_counts: riskClassCounts,
    issue_severity_counts: issueSeverityCounts,
    contingency_buckets: buckets,
    issue_rows,
    risk_rows,
    contingency_rows,
    project_rows,
    pattern_rows,
  };

  // -------- Hot 5 — top projects of concern --------
  // Composite score per project:
  //   + CPI deviation × 10 (when CPI < 1)
  //   + SPI deviation × 10 (when SPI < 1)
  //   + 2 per open H-severity issue
  //   + 1 per realised risk
  // Sort descending, take top 5. Active or SC projects only (Closed projects
  // shouldn't appear in hot list).
  const openHByProject = new Map<string, number>();
  for (const i of issues) {
    if (i.severity === 'H' && (i.status === 'Open' || i.status === 'In progress')) {
      openHByProject.set(i.project_id, (openHByProject.get(i.project_id) ?? 0) + 1);
    }
  }
  const realisedByProject = new Map<string, number>();
  for (const r of risks) {
    if (String(r.status).toLowerCase().startsWith('realised')) {
      realisedByProject.set(r.project_id, (realisedByProject.get(r.project_id) ?? 0) + 1);
    }
  }

  const hotItemsAll: HotItem[] = projects
    .filter((p) => p.status === 'Active' || p.status === 'SC')
    .map((p) => {
      const v = latestVariance.get(p.id);
      const cpi = v?.cpi ?? 1;
      const spi = v?.spi ?? 1;
      const cpiPenalty = Math.max(0, 1 - cpi) * 10;
      const spiPenalty = Math.max(0, 1 - spi) * 10;
      const openH = openHByProject.get(p.id) ?? 0;
      const realised = realisedByProject.get(p.id) ?? 0;
      const score = cpiPenalty + spiPenalty + openH * 2 + realised * 1;
      const bac = Number(p.approved_budget_current) || 0;
      const eac = cpi > 0 ? bac / cpi : bac;
      const vac_m = (bac - eac) / 1_000_000;
      const contract_m = (Number(p.contract_value_current) || 0) / 1_000_000;
      const contBudget = Number(p.contingency) || 0;
      const contingency_pct = contBudget > 0 ? Math.round((((v?.contingency_m ?? 0) * 1_000_000) / contBudget) * 100) : null;
      // Estimated end + progress (same heuristic as the schedule timeline):
      // Active ~70% elapsed, SC short warranty tail.
      const cw = Number(p.current_week) || 0;
      const estEnd =
        p.status === 'SC' ? Math.max(1, Math.ceil(cw * 1.05)) : Math.max(cw + 4, Math.ceil(cw / 0.7));
      const progressPct = estEnd > 0 ? Math.min(100, Math.round((cw / estEnd) * 100)) : 0;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        segment: p.segment,
        status: p.status,
        current_week: cw,
        est_end_week: estEnd,
        progress_pct: progressPct,
        cpi,
        spi,
        contract_m,
        vac_m,
        contingency_pct,
        open_h_issues: openH,
        realised_risks: realised,
        score: Number(score.toFixed(1)),
      };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  const hotItems = hotItemsAll.slice(0, 5);

  // Project rows for inline drill-down grid. A project is "new" when it was
  // created via the intake form within the last 14 days.
  const RECENT_MS = 14 * 24 * 60 * 60 * 1000;
  const isNewProject = (p: { created_via: string | null; created_at: string }) =>
    p.created_via === 'intake_form' && Date.now() - new Date(p.created_at).getTime() < RECENT_MS;

  const dashboardProjects: DashboardProject[] = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    client: p.client,
    segment: p.segment,
    status: p.status,
    current_week: p.current_week,
    contract_value_current: Number(p.contract_value_current),
    hard_deadline_description: p.hard_deadline_description ?? null,
    is_new: isNewProject(p),
  }));

  // Recently-added banner: form-created projects from the last 14 days, newest first.
  let recentlyAdded: RecentlyAddedProject[] = projects
    .filter(isNewProject)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 9)
    .map((p) => ({ code: p.code, name: p.name, segment: p.segment, status: p.status, created_at: p.created_at }));

  // Who created each one (migration 0016). Resilient: if the column is missing
  // the select errors, creators stays empty, and we just show "added X ago".
  if (recentlyAdded.length > 0) {
    const { data: creatorRows } = await supabase
      .from('projects')
      .select('code, created_by_role_type')
      .in('code', recentlyAdded.map((r) => r.code));
    const creators = new Map(
      (creatorRows ?? []).map((r) => [r.code, (r as { created_by_role_type: string | null }).created_by_role_type ?? null]),
    );
    recentlyAdded = recentlyAdded.map((r) => ({ ...r, created_by_role_type: creators.get(r.code) ?? null }));
  }

  // -------- Recent activity (role-led, workspace backfill) --------
  // Supabase returns joined relations as an array even for single-FK joins.
  type JoinedProject = { code: string; name: string; segment: string };
  type JoinedRole = { name: string; role_type: string };
  type RawActivity = {
    id: string;
    agent_type: string;
    invoked_at: string;
    project_id: string | null;
    user_prompt: string | null;
    output_md: string | null;
    projects: JoinedProject | JoinedProject[] | null;
    roles: JoinedRole | JoinedRole[] | null;
  };
  const normalizeActivity = (a: RawActivity, is_you: boolean): DashboardActivity => {
    const proj = Array.isArray(a.projects) ? a.projects[0] ?? null : a.projects;
    const role = Array.isArray(a.roles) ? a.roles[0] ?? null : a.roles;
    return {
      id: a.id,
      agent_type: a.agent_type,
      invoked_at: a.invoked_at,
      project_code: proj?.code ?? null,
      project_name: proj?.name ?? null,
      project_segment: proj?.segment ?? null,
      user_prompt: a.user_prompt ?? null,
      output_md: a.output_md ?? null,
      colleague_name: role?.name ?? null,
      role_type: role?.role_type ?? null,
      is_you,
    };
  };

  const ACTIVITY_LIMIT = 5;
  const roleActivity = ((activityRes.data ?? []) as unknown as RawActivity[]).map((a) =>
    normalizeActivity(a, true),
  );
  const workspaceRecent = ((workspaceRecentRes.data ?? []) as unknown as RawActivity[]).map((a) =>
    normalizeActivity(a, false),
  );

  // The current role's own invocations take priority; once the list isn't full,
  // backfill with the most recent workspace-wide invocations (deduped by id).
  // Over time each role accrues enough of their own that backfill drops away.
  const seenActivity = new Set(roleActivity.map((a) => a.id));
  const dashboardActivity: DashboardActivity[] = [
    ...roleActivity,
    ...workspaceRecent.filter((a) => !seenActivity.has(a.id)),
  ].slice(0, ACTIVITY_LIMIT);

  // Workspace-wide context line (total count + most recent invocation overall).
  const wsLatest = workspaceRecent[0] ?? null;
  const workspaceActivity = {
    count: workspaceCountRes.count ?? 0,
    latest_at: wsLatest?.invoked_at ?? null,
    latest_by: wsLatest?.colleague_name ?? null,
  };

  // ---- Action-ribbon tile counts ----
  // Two trios: "active" (portfolio-wide, live work only) and "mine" (the
  // viewing role's slice). "Active" excludes Closed/SC projects so the numbers
  // mean "what's live". The ribbon defaults to active with a "just mine" toggle.
  const activeProjectIds = new Set(projects.filter((p) => p.status === 'Active').map((p) => p.id));
  const myRoleType = resolved.definition.type;

  // Actions: fetch the rows we need (resilient — empty on any error / missing table).
  type ActionLite = { status: string; assigned_to_role_type: string | null; raised_by_role_type: string | null };
  let actionRows: ActionLite[] = [];
  try {
    const { data: aData } = await supabase
      .from('action_items')
      .select('status, assigned_to_role_type, raised_by_role_type');
    actionRows = (aData ?? []) as ActionLite[];
  } catch {
    actionRows = [];
  }
  const actionsActive = actionRows.filter((a) => a.status !== 'Done').length;
  const actionsMine = actionRows.filter(
    (a) => a.status !== 'Done' && (a.assigned_to_role_type === myRoleType || a.raised_by_role_type === myRoleType),
  ).length;

  // Issues: active = open/in-progress on a live project.
  const issueIsActive = (i: { status: string; project_id: string }) =>
    (i.status === 'Open' || i.status === 'In progress') && activeProjectIds.has(i.project_id);
  const issuesActive = issues.filter(issueIsActive).length;
  const issuesMine = issues.filter((i) => issueIsActive(i) && matchRoleFromText(i.owner) === myRoleType).length;

  // Risks: active = status active/open on a live project.
  const riskIsActive = (r: { status: string; project_id: string }) =>
    (String(r.status).toLowerCase().startsWith('active') || r.status === 'Open') && activeProjectIds.has(r.project_id);
  const risksActive = risks.filter(riskIsActive).length;
  const risksMine = risks.filter((r) => riskIsActive(r) && matchRoleFromText(r.owner) === myRoleType).length;

  // -------- Portfolio earned value (Phase 3 flagship, computed from the
  // canonical model). Resilient: tables exist only after migration 0017, and
  // WBS codes are unique only within a project, so we group by project_id and
  // compute each project's EV before rolling the dollar totals up. --------
  const evProjectRows: Array<{ code: string; name: string; segment: string; cpi: number | null; spi: number | null }> = [];
  let portfolioEv: PortfolioEv | null = null;
  try {
    const [wpRes, taskRes, costRes] = await Promise.all([
      supabase.from('work_packages').select('project_id, wbs_code, parent_wbs_code, budget_bac'),
      supabase.from('tasks').select('project_id, wbs_code, percent_complete'),
      supabase.from('cost_actuals').select('project_id, actual_cost, planned_value'),
    ]);
    const wps = (wpRes.data ?? []) as Array<{ project_id: string; wbs_code: string; parent_wbs_code: string | null; budget_bac: number | null }>;
    const tks = (taskRes.data ?? []) as Array<{ project_id: string; wbs_code: string | null; percent_complete: number | null }>;
    const cst = (costRes.data ?? []) as Array<{ project_id: string; actual_cost: number | null; planned_value: number | null }>;
    if (wps.length > 0) {
      const byProj = <T extends { project_id: string }>(rows: T[]) => {
        const m = new Map<string, T[]>();
        for (const r of rows) {
          const a = m.get(r.project_id) ?? [];
          a.push(r);
          m.set(r.project_id, a);
        }
        return m;
      };
      const wpByP = byProj(wps);
      const tkByP = byProj(tks);
      const cstByP = byProj(cst);
      const perProject = [...wpByP.entries()].map(([pid, rows]) => {
        const leaves = rows.filter((w) => w.parent_wbs_code).map((w) => ({ wbs_code: w.wbs_code, budget_bac: w.budget_bac }));
        const tasksForP = (tkByP.get(pid) ?? []).map((t) => ({ wbs_code: t.wbs_code, percent_complete: t.percent_complete }));
        const costForP = (cstByP.get(pid) ?? []).map((c) => ({ actual_cost: c.actual_cost, planned_value: c.planned_value }));
        const m = computeEv(leaves, tasksForP, costForP);
        if (m.ready) {
          const meta = projMetaById.get(pid);
          if (meta) evProjectRows.push({ code: meta.code, name: meta.name, segment: meta.segment, cpi: m.cpi, spi: m.spi });
        }
        return m;
      });
      portfolioEv = rollUpEv(perProject);
    }
  } catch {
    portfolioEv = null;
  }

  // Reconcile segment CPI/SPI to the canonical earned value (same basis as the
  // pulse + EV band) so every CPI/SPI on the page agrees; leaves the reported
  // average where a segment has no canonical EV.
  {
    const segEv = new Map<string, { c: number; s: number; n: number }>();
    for (const r of evProjectRows) {
      if (r.cpi == null || r.spi == null) continue;
      const e = segEv.get(r.segment) ?? { c: 0, s: 0, n: 0 };
      e.c += r.cpi; e.s += r.spi; e.n++; segEv.set(r.segment, e);
    }
    for (const ss of segmentSummaries) {
      const e = segEv.get(ss.segment);
      if (e && e.n > 0) { ss.avg_cpi = e.c / e.n; ss.avg_spi = e.s / e.n; }
    }
  }

  return (
    <>
      <WelcomeGate token={token} />
      <DashboardClient
      token={token}
      roleType={resolved.definition.type}
      actionsActive={actionsActive}
      issuesActive={issuesActive}
      risksActive={risksActive}
      actionsMine={actionsMine}
      issuesMine={issuesMine}
      risksMine={risksMine}
      roleName={resolved.role.name}
      roleDisplayName={resolved.definition.display_name}
      roleDescription={resolved.definition.description}
      canWrite={resolved.definition.can_write}
      allowedAgentCount={resolved.definition.allowed_agents.length}
      kpis={kpis}
      portfolioEv={portfolioEv}
      evProjectRows={evProjectRows}
      roleId={resolved.role.id}
      workspaceActivity={workspaceActivity}
      operational={operational}
      financial={financial}
      roleKpis={roleKpis}
      insights={insights}
      hotItems={hotItems}
      segmentSummaries={segmentSummaries}
      projects={dashboardProjects}
      recentlyAdded={recentlyAdded}
      activity={dashboardActivity}
      />
    </>
  );
}
