/**
 * Analytics → Cross-agent actions. Portfolio-wide breakdowns (charts) plus a
 * sortable/filterable table of every action on active work at the bottom.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';
import { AnalyticsNav } from '@/components/analytics-nav';
import { Kpis, rowsFrom, tally, renameHML } from '@/components/analytics-shared';
import { DonutPanel, RankedBarPanel } from '@/components/analytics-charts';
import { PortfolioActionsTable, type PortfolioActionRow } from '@/components/portfolio-tables';

export const dynamic = 'force-dynamic';

function labelRole(rt: string | null | undefined): string {
  if (!rt) return 'Unassigned';
  return roleLabel(rt as RoleType);
}

export default async function ActionsAnalyticsPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const [actionsRes, projectsRes] = await Promise.all([
    supabase.from('action_items').select('*').limit(10000),
    supabase.from('projects').select('id, code, name, segment, status').limit(10000),
  ]);
  type ActionRow = {
    id: string;
    project_id: string | null;
    description: string;
    status: string;
    urgency: string;
    assigned_to_role_type: string | null;
    raised_by_role_type: string | null;
    response_md: string | null;
    created_at: string;
  };
  const actions = (actionsRes.data ?? []) as ActionRow[];
  const projects = (projectsRes.data ?? []) as Array<{ id: string; code: string; name: string; segment: string; status: string }>;
  const projById = new Map(projects.map((p) => [p.id, p]));

  const total = actions.length;
  const open = actions.filter((a) => a.status === 'Open').length;
  const inProg = actions.filter((a) => a.status === 'In progress' || a.status === 'Acknowledged').length;
  const done = actions.filter((a) => a.status === 'Done').length;
  const responded = actions.filter((a) => !!a.response_md).length;

  const byStatus = rowsFrom(tally(actions, (a) => a.status), ['Open', 'Acknowledged', 'In progress', 'Done']);
  const byUrgency = rowsFrom(renameHML(tally(actions, (a) => a.urgency)), ['High', 'Medium', 'Low']);
  const byOwner = rowsFrom(tally(actions, (a) => labelRole(a.assigned_to_role_type)));
  const byRaiser = rowsFrom(tally(actions, (a) => labelRole(a.raised_by_role_type)));

  // Active-work table: actions on an active project, plus portfolio-level ones.
  const activeActionRows: PortfolioActionRow[] = actions
    .filter((a) => !a.project_id || projById.get(a.project_id)?.status === 'Active')
    .map((a) => {
      const p = a.project_id ? projById.get(a.project_id) : null;
      return {
        id: a.id,
        project_code: p?.code ?? null,
        project_name: p?.name ?? '',
        segment: p?.segment ?? '',
        description: a.description,
        assigned_to_role: a.assigned_to_role_type ?? 'pm',
        raised_by_role: a.raised_by_role_type,
        urgency: a.urgency,
        status: a.status,
        created_at: a.created_at,
      };
    });

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-6 space-y-4">
      <section>
        <Link href={`/dashboard`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <h1 className="text-lg font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Cross-agent actions across the portfolio.</p>
        </div>
      </section>

      <AnalyticsNav />

      <Kpis
        items={[
          { label: 'Total', value: total },
          { label: 'Open', value: open, tone: open > 0 ? 'warn' : undefined },
          { label: 'In progress', value: inProg },
          { label: 'Done', value: done, tone: done > 0 ? 'ok' : undefined },
          { label: 'Responded', value: responded },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DonutPanel title="By status" rows={byStatus} centerLabel="actions" />
        <DonutPanel title="By urgency" rows={byUrgency} centerLabel="actions" />
        <RankedBarPanel title="By owning role" rows={byOwner} />
        <RankedBarPanel title="By raising role" rows={byRaiser} />
      </div>

      <section className="space-y-2 pt-2">
        <h2 className="text-base font-semibold">All actions on active work ({activeActionRows.length})</h2>
        <p className="text-xs text-muted-foreground">
          Every cross-agent action on an active project (plus portfolio-level ones). Search, filter by segment / status / urgency / owner, sort any column.
        </p>
        <PortfolioActionsTable rows={activeActionRows} />
      </section>
    </div>
  );
}
