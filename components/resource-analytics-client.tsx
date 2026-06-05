'use client';

/**
 * Resources analytics with segment drill-down. The server pre-computes a
 * LoadResult for "All segments" and one per segment; this component just lets
 * the user toggle which view is shown (stats + demand-vs-capacity panel).
 * Capacity is the same portfolio stand-in in every view, so a single segment
 * reads as the share of total capacity it consumes.
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
  const overRoles = load.roles.filter((r) => r.peakFte > r.capacityFte).length;
  const peakRole = load.roles[0] ?? null;
  const withSpare = load.roles.filter((r) => r.peakFte <= r.capacityFte).length;
  const isAll = active.key === 'all';

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
        <Stat label="Disciplines tracked" value={String(load.roles.length)} />
        <Stat label="Over-allocated disciplines" value={String(overRoles)} tone={overRoles > 0 ? 'warn' : 'ok'} sub="peak demand above capacity" />
        <Stat label="Highest-demand discipline" value={peakRole ? `${peakRole.peakFte.toFixed(0)} FTE` : '—'} sub={peakRole ? roleName(peakRole.role) : ''} />
        <Stat label="Disciplines with spare capacity" value={String(withSpare)} tone={withSpare > 0 ? 'ok' : 'neutral'} sub="headroom at peak demand" />
      </div>

      <div className="mt-6">
        <ResourceLoadPanel
          load={load}
          mode="portfolio"
          title={isAll ? 'Resource demand vs capacity' : `Resource demand vs capacity · ${active.label}`}
          subtitle={
            isAll
              ? 'Monthly FTE demand vs capacity across all projects · gray = available headroom, red months exceed capacity'
              : `Monthly FTE demand for ${active.label} projects vs total portfolio capacity · gray = headroom not used by this segment`
          }
        />
      </div>
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
