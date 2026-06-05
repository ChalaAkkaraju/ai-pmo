'use client';

/**
 * Resources analytics with segment drill-down. The server pre-computes a
 * LoadResult for "All segments" (with capacity) and one per segment (demand
 * only). The all-segments view compares demand against the portfolio capacity
 * stand-in; segment views show demand only, because that capacity pool is not
 * attributable to a single segment.
 */

import { useState } from 'react';
import { ResourceLoadPanel } from './resource-load-view';
import type { LoadResult } from '@/lib/resource-load';

export interface ResourceView {
  key: string;
  label: string;
  dotCls: string;
  projectCount: number;
  load: LoadResult;
}

function roleName(role: string): string {
  return role.replace(/_/g, ' ');
}

export function ResourceAnalyticsClient({ views }: { views: ResourceView[] }) {
  const [activeKey, setActiveKey] = useState(views[0]?.key ?? 'all');
  const active = views.find((v) => v.key === activeKey) ?? views[0];
  if (!active) return null;

  const load = active.load;
  const isAll = active.key === 'all';
  const peakRole = load.roles[0] ?? null;

  return (
    <>
      {/* Segment drill-down selector */}
      <div className="mt-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Drill down by segment</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {views.map((v) => {
            const on = v.key === activeKey;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setActiveKey(v.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  on ? 'border-foreground/30 bg-muted text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${v.dotCls}`} />
                {v.label}
                <span className="tabular-nums text-muted-foreground/70">{v.projectCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isAll ? <CapacityStats load={load} /> : <DemandStats load={load} />}
      </div>

      <div className="mt-6">
        <ResourceLoadPanel
          load={load}
          mode={isAll ? 'portfolio' : 'demand'}
          title={isAll ? 'Resource demand vs capacity' : `Resource demand · ${active.label}`}
          subtitle={
            isAll
              ? 'Monthly FTE demand vs capacity across all projects · gray = available headroom, red months exceed capacity'
              : `Monthly FTE demand by discipline for ${active.label} projects · capacity is portfolio-level, so it is not shown at segment level`
          }
        />
      </div>

      {!isAll && peakRole && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {roleName(peakRole.role)} is the busiest discipline in this segment, peaking at {peakRole.peakFte.toFixed(0)} FTE.
        </p>
      )}
    </>
  );
}

function CapacityStats({ load }: { load: LoadResult }) {
  const overRoles = load.roles.filter((r) => r.peakFte > r.capacityFte).length;
  const peakRole = load.roles[0] ?? null;
  const withSpare = load.roles.filter((r) => r.peakFte <= r.capacityFte).length;
  return (
    <>
      <Stat label="Disciplines tracked" value={String(load.roles.length)} />
      <Stat label="Over-allocated disciplines" value={String(overRoles)} tone={overRoles > 0 ? 'warn' : 'ok'} sub="peak demand above capacity" />
      <Stat label="Highest-demand discipline" value={peakRole ? `${peakRole.peakFte.toFixed(0)} FTE` : '—'} sub={peakRole ? peakRole.role.replace(/_/g, ' ') : ''} />
      <Stat label="Disciplines with spare capacity" value={String(withSpare)} tone={withSpare > 0 ? 'ok' : 'neutral'} sub="headroom at peak demand" />
    </>
  );
}

function DemandStats({ load }: { load: LoadResult }) {
  const peakRole = load.roles[0] ?? null;
  const totalFteMonths = Math.round(load.roles.reduce((a, r) => a + r.totalFteMonths, 0));
  const peakConcurrent = load.months.length
    ? Math.max(...load.months.map((_, i) => load.roles.reduce((a, r) => a + (r.series[i] ?? 0), 0)))
    : 0;
  return (
    <>
      <Stat label="Disciplines tracked" value={String(load.roles.length)} />
      <Stat label="Highest-demand discipline" value={peakRole ? `${peakRole.peakFte.toFixed(0)} FTE` : '—'} sub={peakRole ? peakRole.role.replace(/_/g, ' ') : ''} />
      <Stat label="Peak combined staffing" value={`${peakConcurrent.toFixed(0)} FTE`} sub="all disciplines, busiest month" />
      <Stat label="Total effort" value={`${totalFteMonths}`} sub="FTE-months over the timeline" />
    </>
  );
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
