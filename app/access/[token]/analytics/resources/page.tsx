/**
 * Analytics → Resources. Portfolio resource-load: FTE demand per discipline
 * over time vs capacity, with over-allocation flags. Visibility only — no
 * levelling (that stays in the scheduler). Data mirrored from Dataverse / P6.
 */

import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { ResourceLoadPanel } from '@/components/resource-load-view';
import { computeLoad, type ResAssignment } from '@/lib/resource-load';

export const dynamic = 'force-dynamic';

export default async function ResourcesAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  let rows: ResAssignment[] = [];
  try {
    const { data } = await supabase
      .from('resource_assignments')
      .select('resource_role, period, planned_work_hours')
      .limit(100000);
    rows = (data ?? []) as ResAssignment[];
  } catch {
    rows = [];
  }
  const load = computeLoad(rows, true);
  const overRoles = load.roles.filter((r) => r.peakFte > r.capacityFte).length;
  const peakRole = load.roles[0] ?? null;

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Portfolio analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">Cross-project breakdowns. Resource view is visibility only — levelling stays in the scheduler.</p>
      <div className="mt-5"><AnalyticsNav token={token} /></div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Disciplines tracked" value={String(load.roles.length)} />
        <Stat label="Over-allocated disciplines" value={String(overRoles)} tone={overRoles > 0 ? 'warn' : 'ok'} sub="peak demand above capacity" />
        <Stat label="Highest-demand discipline" value={peakRole ? `${peakRole.peakFte.toFixed(0)} FTE` : '—'} sub={peakRole ? roleName(peakRole.role) : ''} />
      </div>

      <div className="mt-6">
        <ResourceLoadPanel
          load={load}
          mode="portfolio"
          title="Resource demand vs capacity"
          subtitle="Monthly FTE demand per discipline vs capacity across all projects · red months exceed capacity"
        />
      </div>

      <p className="mt-4 max-w-3xl text-xs text-muted-foreground">
        Demand is aggregated from scheduler assignments (Dataverse / P6) into FTE per month at {''}
        160 hours per FTE-month. Capacity is a portfolio stand-in per discipline. Over-allocation flags where peak monthly
        demand exceeds capacity — a signal to re-sequence in the scheduler, not something this layer resolves.
      </p>
    </div>
  );
}

function roleName(role: string): string {
  return role.replace(/_/g, ' ');
}

function Stat({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub?: string; tone?: 'neutral' | 'ok' | 'warn' }) {
  const cls = tone === 'warn' ? 'text-red-600' : tone === 'ok' ? 'text-emerald-700' : 'text-foreground';
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
