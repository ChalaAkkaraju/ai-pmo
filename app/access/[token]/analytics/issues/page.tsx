/**
 * Analytics → Issues. Portfolio-wide issue breakdowns (charts) plus a
 * sortable/filterable table of every issue on an ACTIVE project at the bottom.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { BreakdownTable, Kpis, rowsFrom, tally, renameHML } from '@/components/analytics-shared';
import { DonutPanel, RankedBarPanel } from '@/components/analytics-charts';
import { PortfolioIssuesTable, type PortfolioIssueRow } from '@/components/portfolio-tables';
import { canonicalIssueCategory, CANONICAL_ISSUE_CATEGORIES } from '@/lib/issue-category';
import { isOpenIssue, isOverdue, agingBand, resolveWeeks, type IssueRow } from '@/lib/issue-metrics';
import { fmtUsd } from '@/lib/risk-emv';

export const dynamic = 'force-dynamic';

export default async function IssuesAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const [issuesRes, projectsRes] = await Promise.all([
    supabase.from('issues').select('issue_id, project_id, description, category, severity, status, owner, opened_week, closed_week, sla_weeks, cost_impact_usd, schedule_impact_days, escalated, root_cause').limit(10000),
    supabase.from('projects').select('id, code, name, segment, status, current_week').limit(10000),
  ]);
  const issues = (issuesRes.data ?? []) as Array<{ issue_id: string; project_id: string; description: string; category: string; severity: string; status: string; owner: string | null; opened_week: number; closed_week: number | null; sla_weeks: number | null; cost_impact_usd: number | string | null; schedule_impact_days: number | null; escalated: boolean | null; root_cause: string | null }>;
  const projects = (projectsRes.data ?? []) as Array<{ id: string; code: string; name: string; segment: string; status: string; current_week: number }>;
  const codeById = new Map(projects.map((p) => [p.id, p.code]));
  const projById = new Map(projects.map((p) => [p.id, p]));

  const total = issues.length;
  const open = issues.filter((i) => i.status === 'Open').length;
  const inProg = issues.filter((i) => i.status === 'In progress').length;
  const high = issues.filter((i) => i.severity === 'H' && (i.status === 'Open' || i.status === 'In progress')).length;
  const closed = issues.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length;

  const bySeverity = rowsFrom(renameHML(tally(issues, (i) => i.severity)), ['High', 'Medium', 'Low']);
  const byStatus = rowsFrom(tally(issues, (i) => i.status), ['Open', 'In progress', 'Resolved', 'Closed']);
  const byCategory = rowsFrom(tally(issues, (i) => canonicalIssueCategory(i.category)), CANONICAL_ISSUE_CATEGORIES);
  const openByProject = tally(
    issues.filter((i) => i.status === 'Open' || i.status === 'In progress'),
    (i) => codeById.get(i.project_id) ?? null,
  );
  const topProjects = rowsFrom(openByProject).slice(0, 10);

  // Issue health across the portfolio — aging computed against each project's current week.
  const cwById = new Map(projects.map((p) => [p.id, Number(p.current_week) || 0]));
  const cwFor = (i: { project_id: string }) => cwById.get(i.project_id) ?? 0;
  const openIssues = issues.filter((i) => isOpenIssue(i.status));
  const overdue = openIssues.filter((i) => isOverdue(i as IssueRow, cwFor(i))).length;
  const escalatedCount = openIssues.filter((i) => i.escalated).length;
  const openCostExposure = openIssues.reduce((s, i) => s + (Number(i.cost_impact_usd) || 0), 0);
  const resolvedIssues = issues.filter((i) => !isOpenIssue(i.status));
  const mttrVals = resolvedIssues.map((i) => resolveWeeks(i as IssueRow)).filter((v): v is number => v != null);
  const mttr = mttrVals.length ? mttrVals.reduce((a, b) => a + b, 0) / mttrVals.length : null;
  const byRootCause = rowsFrom(tally(issues, (i) => i.root_cause || null));
  const byAging = rowsFrom(tally(openIssues, (i) => agingBand(i as IssueRow, cwFor(i))), ['Overdue', 'At risk', 'On track']);

  // Active-project table rows.
  const activeIssueRows: PortfolioIssueRow[] = issues
    .filter((i) => projById.get(i.project_id)?.status === 'Active')
    .map((i) => {
      const p = projById.get(i.project_id)!;
      return {
        issue_id: i.issue_id,
        project_code: p.code,
        project_name: p.name,
        segment: p.segment,
        description: i.description,
        category: i.category,
        severity: i.severity,
        status: i.status,
        owner: i.owner ?? '',
        opened_week: Number(i.opened_week),
      };
    });

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-6 space-y-4">
      <section>
        <Link href={`/access/${token}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <h1 className="text-lg font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Issues across the portfolio.</p>
        </div>
      </section>

      <AnalyticsNav token={token} />

      <Kpis
        items={[
          { label: 'Total', value: total },
          { label: 'Open', value: open, tone: open > 0 ? 'warn' : undefined },
          { label: 'In progress', value: inProg },
          { label: 'High sev (open)', value: high, tone: high > 0 ? 'warn' : undefined },
          { label: 'Resolved / closed', value: closed, tone: 'ok' },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DonutPanel title="By severity" rows={bySeverity} centerLabel="issues" />
        <DonutPanel title="By status" rows={byStatus} centerLabel="issues" />
        <RankedBarPanel title="By category" rows={byCategory} />
        <BreakdownTable title="Top projects by open issues" rows={topProjects} color="#f97316" />
      </div>

      <section className="space-y-2 pt-2">
        <h2 className="text-base font-semibold">Issue health across the portfolio</h2>
        <p className="text-xs text-muted-foreground">
          Aging against SLA, escalations, open-issue cost exposure and resolution speed — computed live from each project&apos;s current week.
        </p>
        <Kpis
          items={[
            { label: 'Open', value: openIssues.length },
            { label: 'Overdue', value: overdue, tone: overdue > 0 ? 'warn' : 'ok' },
            { label: 'Escalated', value: escalatedCount, tone: escalatedCount > 0 ? 'warn' : undefined },
            { label: 'Open cost exposure', value: fmtUsd(openCostExposure) },
            { label: 'Mean time to resolve', value: mttr != null ? `${mttr.toFixed(1)}w` : '\u2014' },
          ]}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <RankedBarPanel title="By root cause" rows={byRootCause} />
          <BreakdownTable title="Open issues by aging band" rows={byAging} color="#f43f5e" />
        </div>
      </section>

      <section className="space-y-2 pt-2">
        <h2 className="text-base font-semibold">All issues on active projects ({activeIssueRows.length})</h2>
        <p className="text-xs text-muted-foreground">
          Every issue on an active project. Search, filter by segment / status / severity, sort any column, and click a project to open it.
        </p>
        <PortfolioIssuesTable token={token} rows={activeIssueRows} />
      </section>
    </div>
  );
}
