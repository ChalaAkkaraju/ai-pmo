/**
 * Analytics → Cross-agent actions. Portfolio-wide breakdowns of action_items,
 * server-rendered in the Usage-page style.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';
import { AnalyticsNav } from '@/components/analytics-nav';
import { BreakdownTable, Kpis, rowsFrom, tally, renameHML } from '@/components/analytics-shared';

export const dynamic = 'force-dynamic';

function labelRole(rt: string | null | undefined): string {
  if (!rt) return 'Unassigned';
  return roleLabel(rt as RoleType);
}

export default async function ActionsAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from('action_items').select('*').limit(10000);
  type ActionRow = {
    status: string;
    urgency: string;
    assigned_to_role_type: string | null;
    raised_by_role_type: string | null;
    response_md: string | null;
  };
  const actions = (data ?? []) as ActionRow[];

  const total = actions.length;
  const open = actions.filter((a) => a.status === 'Open').length;
  const inProg = actions.filter((a) => a.status === 'In progress' || a.status === 'Acknowledged').length;
  const done = actions.filter((a) => a.status === 'Done').length;
  const responded = actions.filter((a) => !!a.response_md).length;

  const byStatus = rowsFrom(tally(actions, (a) => a.status), ['Open', 'Acknowledged', 'In progress', 'Done']);
  const byUrgency = rowsFrom(renameHML(tally(actions, (a) => a.urgency)), ['High', 'Medium', 'Low']);
  const byOwner = rowsFrom(tally(actions, (a) => labelRole(a.assigned_to_role_type)));
  const byRaiser = rowsFrom(tally(actions, (a) => labelRole(a.raised_by_role_type)));

  return (
    <div className="container mx-auto max-w-screen-xl px-8 py-6 space-y-4">
      <section>
        <Link href={`/access/${token}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cross-agent actions across the portfolio.</p>
      </section>

      <AnalyticsNav token={token} />

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
        <BreakdownTable title="By status" rows={byStatus} color="#6366f1" />
        <BreakdownTable title="By urgency" rows={byUrgency} color="#f59e0b" />
        <BreakdownTable title="By owning role" rows={byOwner} color="#0ea5e9" />
        <BreakdownTable title="By raising role" rows={byRaiser} color="#8b5cf6" />
      </div>
    </div>
  );
}
