/**
 * Analytics → Risks. Portfolio-wide risk breakdowns (charts) plus a
 * sortable/filterable table of every risk on an ACTIVE project at the bottom.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { AnalyticsNav } from '@/components/analytics-nav';
import { Kpis, rowsFrom, tally, renameHML, cap } from '@/components/analytics-shared';
import { DonutPanel, RankedBarPanel, RiskMatrix } from '@/components/analytics-charts';
import { PortfolioRisksTable, type PortfolioRiskRow } from '@/components/portfolio-tables';
import { canonicalRiskStatus, CANONICAL_RISK_STATUSES } from '@/lib/risk-status';
import { computeExposure, fmtUsd, type RiskRow } from '@/lib/risk-emv';

export const dynamic = 'force-dynamic';

export default async function RisksAnalyticsPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const [risksRes, projectsRes] = await Promise.all([
    supabase.from('risks').select('risk_id, project_id, description, impact, probability, score, status, owner, cross_cutting_class, emv_usd, residual_emv_usd, cost_impact_usd, risk_type').limit(10000),
    supabase.from('projects').select('id, code, name, segment, status').limit(10000),
  ]);
  const risks = (risksRes.data ?? []) as Array<{ risk_id: string; project_id: string; description: string; impact: string; probability: string; score: number; status: string; owner: string | null; cross_cutting_class: string; emv_usd: number | null; residual_emv_usd: number | null; cost_impact_usd: number | null; risk_type: string | null }>;
  const projects = (projectsRes.data ?? []) as Array<{ id: string; code: string; name: string; segment: string; status: string }>;
  const segById = new Map(projects.map((p) => [p.id, p.segment]));
  const projById = new Map(projects.map((p) => [p.id, p]));

  const canon = risks.map((r) => canonicalRiskStatus(r.status));
  const total = risks.length;
  const open = canon.filter((c) => c === 'Open').length;
  const active = canon.filter((c) => c === 'Active').length;
  const realised = canon.filter((c) => c === 'Realised').length;
  const mitigated = canon.filter((c) => c === 'Mitigated').length;
  const exposure = computeExposure(risks as unknown as RiskRow[]);

  const byImpact = rowsFrom(renameHML(tally(risks, (r) => r.impact)), ['High', 'Medium', 'Low']);
  const byStatus = rowsFrom(tally(risks, (r) => canonicalRiskStatus(r.status)), CANONICAL_RISK_STATUSES);
  const byClass = rowsFrom(tally(risks, (r) => r.cross_cutting_class));
  const bySegment = rowsFrom(tally(risks, (r) => cap(segById.get(r.project_id) ?? '')));

  const activeRiskRows: PortfolioRiskRow[] = risks
    .filter((r) => projById.get(r.project_id)?.status === 'Active')
    .map((r) => {
      const p = projById.get(r.project_id)!;
      return {
        risk_id: r.risk_id,
        project_code: p.code,
        project_name: p.name,
        segment: p.segment,
        description: r.description,
        impact: r.impact,
        probability: r.probability,
        score: Number(r.score),
        status: canonicalRiskStatus(r.status),
        cross_cutting_class: r.cross_cutting_class,
        owner: r.owner ?? '',
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
          <p className="text-sm text-muted-foreground">Risks across the portfolio.</p>
        </div>
      </section>

      <AnalyticsNav />

      <Kpis
        items={[
          { label: 'Total', value: total },
          { label: 'Open', value: open },
          { label: 'Active', value: active },
          { label: 'Realised', value: realised, tone: realised > 0 ? 'warn' : undefined },
          { label: 'Mitigated', value: mitigated, tone: 'ok' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Inherent EMV · live threats</div><div className="mt-0.5 font-mono text-lg font-semibold">{fmtUsd(exposure.inherentEmv)}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Residual EMV</div><div className="mt-0.5 font-mono text-lg font-semibold text-emerald-600">{fmtUsd(exposure.residualEmv)}</div><div className="text-[11px] text-muted-foreground">{Math.round(exposure.reductionPct * 100)}% bought down</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Opportunity upside</div><div className="mt-0.5 font-mono text-lg font-semibold text-emerald-600">{fmtUsd(exposure.opportunityUpside)}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Realised risk cost</div><div className="mt-0.5 font-mono text-lg font-semibold">{fmtUsd(exposure.realisedCost)}</div></div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <RiskMatrix cells={risks.map((r) => ({ probability: r.probability, impact: r.impact }))} />
        <DonutPanel title="By status" rows={byStatus} centerLabel="risks" />
        <DonutPanel title="By impact" rows={byImpact} centerLabel="risks" />
        <DonutPanel title="By segment" rows={bySegment} centerLabel="risks" />
        <RankedBarPanel title="By category" rows={byClass} />
      </div>

      <section className="space-y-2 pt-2">
        <h2 className="text-base font-semibold">All risks on active projects ({activeRiskRows.length})</h2>
        <p className="text-xs text-muted-foreground">
          Every risk on an active project. Search, filter by segment / status / impact, sort any column, and click a project to open it.
        </p>
        <PortfolioRisksTable rows={activeRiskRows} />
      </section>
    </div>
  );
}
