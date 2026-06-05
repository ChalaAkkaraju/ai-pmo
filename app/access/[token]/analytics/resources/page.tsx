/**
 * Analytics → Resources. Portfolio resource-load: FTE demand per discipline
 * over time vs capacity, with over-allocation flags. Visibility only — no
 * levelling (that stays in the scheduler). Data mirrored from Dataverse / P6.
 *
 * Supports drill-down by segment: the server pre-computes a load view for all
 * projects and one per segment; the client toggles between them.
 */

import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { ResourceAnalyticsClient, type ResourceView } from '@/components/resource-analytics-client';
import { computeLoad, type ResAssignment } from '@/lib/resource-load';
import { SEGMENT_STYLES, segmentStyle } from '@/lib/segment-style';

export const dynamic = 'force-dynamic';

interface Row extends ResAssignment {
  project_id: string;
}

export default async function ResourcesAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  let rows: Row[] = [];
  const segById = new Map<string, string>();
  try {
    const [{ data: ra }, { data: projs }] = await Promise.all([
      supabase.from('resource_assignments').select('project_id, resource_role, period, planned_work_hours').limit(100000),
      supabase.from('projects').select('id, segment').limit(100000),
    ]);
    rows = (ra ?? []) as Row[];
    for (const p of (projs ?? []) as Array<{ id: string; segment: string | null }>) {
      segById.set(p.id, p.segment ?? 'other');
    }
  } catch {
    rows = [];
  }

  // Group assignments by segment + count distinct projects per segment.
  const bySeg = new Map<string, Row[]>();
  const projBySeg = new Map<string, Set<string>>();
  const allProjects = new Set<string>();
  for (const r of rows) {
    if (r.project_id) allProjects.add(r.project_id);
    const seg = segById.get(r.project_id) ?? 'other';
    (bySeg.get(seg) ?? bySeg.set(seg, []).get(seg)!).push(r);
    (projBySeg.get(seg) ?? projBySeg.set(seg, new Set()).get(seg)!).add(r.project_id);
  }

  const views: ResourceView[] = [
    { key: 'all', label: 'All segments', dotCls: 'bg-foreground', projectCount: allProjects.size, load: computeLoad(rows, true) },
  ];
  // Known segments first (stable order), then any others present.
  const ordered = [...Object.keys(SEGMENT_STYLES), ...[...bySeg.keys()].filter((s) => !(s in SEGMENT_STYLES))];
  for (const seg of ordered) {
    const segRows = bySeg.get(seg);
    if (!segRows || segRows.length === 0) continue;
    const style = segmentStyle(seg);
    views.push({
      key: seg,
      label: style.label,
      dotCls: style.dot,
      projectCount: projBySeg.get(seg)?.size ?? 0,
      load: computeLoad(segRows, false),
    });
  }

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Portfolio analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">Cross-project breakdowns. Resource view is visibility only — levelling stays in the scheduler.</p>
      <div className="mt-5"><AnalyticsNav token={token} /></div>

      <ResourceAnalyticsClient views={views} />

      <p className="mt-4 max-w-3xl text-xs text-muted-foreground">
        Demand is aggregated from scheduler assignments (Dataverse / P6) into FTE per month at {''}
        160 hours per FTE-month. Capacity is a portfolio-level stand-in per discipline, so it is shown only in the
        all-segments view; drilling into a single segment shows demand only, because that capacity pool is not
        attributable to one segment. Over-allocation (all-segments view) flags where peak monthly demand exceeds
        capacity — a signal to re-sequence in the scheduler, not something this layer resolves.
      </p>
    </div>
  );
}
