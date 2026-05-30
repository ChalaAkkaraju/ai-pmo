/**
 * Analytics → Issues. Portfolio-wide issue breakdowns.
 * Severity/status as donuts, category as a treemap, top projects as bars.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { BreakdownTable, Kpis, rowsFrom, tally, renameHML } from '@/components/analytics-shared';
import { DonutPanel, RankedBarPanel } from '@/components/analytics-charts';
import { canonicalIssueCategory, CANONICAL_ISSUE_CATEGORIES } from '@/lib/issue-category';

export const dynamic = 'force-dynamic';

export default async function IssuesAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const [issuesRes, projectsRes] = await Promise.all([
    supabase.from('issues').select('project_id, severity, status, category').limit(10000),
    supabase.from('projects').select('id, code').limit(10000),
  ]);
  const issues = (issuesRes.data ?? []) as Array<{ project_id: string; severity: string; status: string; category: string }>;
  const projects = (projectsRes.data ?? []) as Array<{ id: string; code: string }>;
  const codeById = new Map(projects.map((p) => [p.id, p.code]));

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

  return (
    <div className="container mx-auto max-w-screen-xl px-8 py-6 space-y-4">
      <section>
        <Link href={`/access/${token}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Issues across the portfolio.</p>
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
    </div>
  );
}
