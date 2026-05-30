/**
 * Analytics → Risks. Portfolio-wide risk breakdowns.
 * Adds a probability × impact matrix; impact/status/segment as donuts,
 * cross-cutting class as a treemap. Status uses the 5 canonical buckets.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { Kpis, rowsFrom, tally, renameHML, cap } from '@/components/analytics-shared';
import { DonutPanel, RankedBarPanel, RiskMatrix } from '@/components/analytics-charts';
import { canonicalRiskStatus, CANONICAL_RISK_STATUSES } from '@/lib/risk-status';

export const dynamic = 'force-dynamic';

export default async function RisksAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const [risksRes, projectsRes] = await Promise.all([
    supabase.from('risks').select('project_id, impact, probability, status, cross_cutting_class').limit(10000),
    supabase.from('projects').select('id, segment').limit(10000),
  ]);
  const risks = (risksRes.data ?? []) as Array<{ project_id: string; impact: string; probability: string; status: string; cross_cutting_class: string }>;
  const projects = (projectsRes.data ?? []) as Array<{ id: string; segment: string }>;
  const segById = new Map(projects.map((p) => [p.id, p.segment]));

  const canon = risks.map((r) => canonicalRiskStatus(r.status));
  const total = risks.length;
  const open = canon.filter((c) => c === 'Open').length;
  const active = canon.filter((c) => c === 'Active').length;
  const realised = canon.filter((c) => c === 'Realised').length;
  const mitigated = canon.filter((c) => c === 'Mitigated').length;

  const byImpact = rowsFrom(renameHML(tally(risks, (r) => r.impact)), ['High', 'Medium', 'Low']);
  const byStatus = rowsFrom(tally(risks, (r) => canonicalRiskStatus(r.status)), CANONICAL_RISK_STATUSES);
  const byClass = rowsFrom(tally(risks, (r) => r.cross_cutting_class));
  const bySegment = rowsFrom(tally(risks, (r) => cap(segById.get(r.project_id) ?? '')));

  return (
    <div className="container mx-auto max-w-screen-xl px-8 py-6 space-y-4">
      <section>
        <Link href={`/access/${token}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Risks across the portfolio.</p>
      </section>

      <AnalyticsNav token={token} />

      <Kpis
        items={[
          { label: 'Total', value: total },
          { label: 'Open', value: open },
          { label: 'Active', value: active },
          { label: 'Realised', value: realised, tone: realised > 0 ? 'warn' : undefined },
          { label: 'Mitigated', value: mitigated, tone: 'ok' },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <RiskMatrix cells={risks.map((r) => ({ probability: r.probability, impact: r.impact }))} />
        <DonutPanel title="By status" rows={byStatus} centerLabel="risks" />
        <DonutPanel title="By impact" rows={byImpact} centerLabel="risks" />
        <DonutPanel title="By segment" rows={bySegment} centerLabel="risks" />
        <RankedBarPanel title="By cross-cutting class" rows={byClass} />
      </div>
    </div>
  );
}
