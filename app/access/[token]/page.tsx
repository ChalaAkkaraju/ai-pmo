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
import { createSupabaseServiceClient } from '@/lib/supabase';
import {
  DashboardClient,
  type DashboardProject,
  type DashboardActivity,
  type PortfolioKpis,
  type SegmentSummary,
  type PortfolioInsights,
  type HotItem,
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

  const [projectsRes, risksRes, issuesRes, varianceRes, activityRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, code, name, client, segment, status, current_week, contract_value_current, approved_budget_current, contingency, hard_deadline_description')
      .order('code', { ascending: true }),
    supabase.from('risks').select('project_id, status, cross_cutting_class'),
    supabase.from('issues').select('project_id, severity, status'),
    supabase.from('variance_reports').select('project_id, report_week, cpi, spi'),
    supabase
      .from('agent_outputs')
      .select('id, agent_type, invoked_at, project_id, user_prompt, output_md, projects:project_id(code, name, segment), roles:invoked_by_role_id(name, role_type)')
      .order('invoked_at', { ascending: false })
      .limit(5),
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
  }>;
  const risks = (risksRes.data ?? []) as Array<{ project_id: string; status: string; cross_cutting_class: string }>;
  const issues = (issuesRes.data ?? []) as Array<{ project_id: string; severity: string; status: string }>;
  const variance = (varianceRes.data ?? []) as Array<{ project_id: string; report_week: number; cpi: number | string; spi: number | string }>;

  const projIdToContract = new Map<string, number>();
  for (const p of projects) {
    projIdToContract.set(p.id, Number(p.contract_value_current));
  }

  // Latest variance report per project (sort desc by week, take first per pid)
  const latestVariance = new Map<string, { cpi: number; spi: number }>();
  const varianceSorted = [...variance].sort((a, b) => b.report_week - a.report_week);
  for (const v of varianceSorted) {
    if (!latestVariance.has(v.project_id)) {
      latestVariance.set(v.project_id, { cpi: Number(v.cpi), spi: Number(v.spi) });
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

  // -------- Per-segment summaries --------
  const segmentSummaries: SegmentSummary[] = ALL_SEGMENTS.map((seg) => {
    const segProjects = projects.filter((p) => p.segment === seg);
    const segProjIds = new Set(segProjects.map((p) => p.id));
    let segContract = 0;
    let segActive = 0;
    let segSc = 0;
    let segClosed = 0;
    for (const p of segProjects) {
      segContract += Number(p.contract_value_current);
      if (p.status === 'Active') segActive++;
      else if (p.status === 'SC') segSc++;
      else if (p.status === 'Closed') segClosed++;
    }

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
    };
  });

  // -------- Portfolio insights (for the 3 mini charts) --------
  // 1. Risks by cross-cutting class
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

  // 3. Contingency-consumption distribution across projects (bucketed)
  // Use latest variance per project as a proxy for "current state"
  const buckets = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0, '>100%': 0 };
  // Latest contingency_consumed_m by project — need a separate small query later or derive
  // For now, approximate from CPI deviation: lower CPI = more contingency burnt
  for (const [pid, v] of latestVariance) {
    const cpiDeviation = Math.max(0, 1 - v.cpi);  // 0 if on plan or better, positive if behind
    const pct = cpiDeviation * 5 * 100;  // rough proxy
    if (pct < 25) buckets['0-25%']++;
    else if (pct < 50) buckets['25-50%']++;
    else if (pct < 75) buckets['50-75%']++;
    else if (pct < 100) buckets['75-100%']++;
    else buckets['>100%']++;
  }

  const insights: PortfolioInsights = {
    risk_class_counts: riskClassCounts,
    issue_severity_counts: issueSeverityCounts,
    contingency_buckets: buckets,
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
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        segment: p.segment,
        status: p.status,
        current_week: p.current_week,
        cpi,
        spi,
        open_h_issues: openH,
        realised_risks: realised,
        score: Number(score.toFixed(1)),
      };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  const hotItems = hotItemsAll.slice(0, 5);

  // Project rows for inline drill-down grid
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
  }));

  // Recent agent activity. Supabase returns joined relations as an array even
  // for single-FK joins; normalise via Array.isArray check.
  type JoinedProject = { code: string; name: string; segment: string };
  type JoinedRole = { name: string; role_type: string };
  const dashboardActivity: DashboardActivity[] = ((activityRes.data ?? []) as unknown as Array<{
    id: string;
    agent_type: string;
    invoked_at: string;
    project_id: string | null;
    user_prompt: string | null;
    output_md: string | null;
    projects: JoinedProject | JoinedProject[] | null;
    roles: JoinedRole | JoinedRole[] | null;
  }>).map((a) => {
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
    };
  });

  return (
    <DashboardClient
      token={token}
      roleName={resolved.role.name}
      roleDisplayName={resolved.definition.display_name}
      roleDescription={resolved.definition.description}
      canWrite={resolved.definition.can_write}
      allowedAgentCount={resolved.definition.allowed_agents.length}
      kpis={kpis}
      insights={insights}
      hotItems={hotItems}
      segmentSummaries={segmentSummaries}
      projects={dashboardProjects}
      activity={dashboardActivity}
    />
  );
}
