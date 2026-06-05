'use client';

import { changeOrderBadge } from '@/lib/badge-styles';
import { useState } from 'react';

interface ChangeOrder {
  co_id: string;
  driver: string;
  scope_summary: string;
  cost_impact_m: number;
  revenue_impact_m: number;
  schedule_impact_days: number;
  margin_realized_pct: number;
  status: string;
  approval_routing: string;
  executed_week: number | null;
  four_frame_analysis: {
    vendor_leverage: string;
    client_leverage: string;
    client_position: string;
    northwood_acceptance: string;
  } | null;
}


function marginTone(pct: number): string {
  if (pct <= 0) return 'text-red-600';
  if (pct < 8) return 'text-amber-600';
  return 'text-emerald-700';
}

/** Strings collapse to a comparable form so we can detect driver==scope duplication. */
function norm(s: string): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function ChangeOrdersTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const cos = rows as unknown as ChangeOrder[];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (cos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No change orders on this project to date.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {cos.map((co) => {
        const isOpen = expandedId === co.co_id;
        const driverDup = norm(co.driver) === norm(co.scope_summary);
        const sched = co.schedule_impact_days;
        return (
          <div key={co.co_id} className="overflow-hidden rounded-lg border bg-card transition hover:border-foreground/20">
            <div
              className="flex cursor-pointer flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              onClick={() => setExpandedId(isOpen ? null : co.co_id)}
            >
              {/* Left: id + status, then scope title, then meta chips */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-[11px] font-semibold text-background">
                    {co.co_id}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${changeOrderBadge(co.status)}`}>
                    {co.status}
                  </span>
                  <span className="text-muted-foreground/40">{isOpen ? '▾' : '▸'}</span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                  {co.scope_summary}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {!driverDup && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-muted-foreground/70">Driver:</span>
                      <span className="font-medium text-foreground/80">{co.driver}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground/70">Schedule:</span>
                    <span className={`font-medium ${sched > 0 ? 'text-amber-600' : 'text-foreground/80'}`}>
                      {sched > 0 ? `+${sched} days` : sched < 0 ? `${sched} days` : 'no impact'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Right: financials */}
              <dl className="flex shrink-0 items-stretch divide-x divide-border rounded-md border bg-muted/30">
                <div className="px-4 py-2 text-center">
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Revenue</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-emerald-700">+${co.revenue_impact_m.toFixed(2)}M</dd>
                </div>
                <div className="px-4 py-2 text-center">
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cost</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">+${co.cost_impact_m.toFixed(2)}M</dd>
                </div>
                <div className="px-4 py-2 text-center">
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Margin</dt>
                  <dd className={`mt-0.5 font-mono text-sm font-semibold ${marginTone(co.margin_realized_pct)}`}>
                    {co.margin_realized_pct.toFixed(1)}%
                  </dd>
                </div>
              </dl>
            </div>

            {isOpen && co.four_frame_analysis && (
              <div className="border-t bg-muted/20 p-5 text-sm">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Four-frame commercial dynamics
                </h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Vendor leverage</dt>
                    <dd className="mt-0.5">{co.four_frame_analysis.vendor_leverage}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Client leverage</dt>
                    <dd className="mt-0.5">{co.four_frame_analysis.client_leverage}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Client position</dt>
                    <dd className="mt-0.5">{co.four_frame_analysis.client_position}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Northwood acceptance</dt>
                    <dd className="mt-0.5">{co.four_frame_analysis.northwood_acceptance}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-muted-foreground">
                  {co.approval_routing}
                  {co.executed_week && ` · Executed Week ${co.executed_week}`}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
