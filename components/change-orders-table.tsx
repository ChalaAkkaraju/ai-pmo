'use client';

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
    <div className="space-y-4">
      {cos.map((co) => (
        <div key={co.co_id} className="rounded-lg border bg-card">
          <div
            className="flex cursor-pointer flex-wrap items-start justify-between gap-3 p-5"
            onClick={() => setExpandedId(expandedId === co.co_id ? null : co.co_id)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold">{co.co_id}</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-900">
                  {co.driver}
                </span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-900">
                  {co.status}
                </span>
              </div>
              <p className="mt-2 text-sm">{co.scope_summary}</p>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-xs sm:gap-5">
              <div>
                <dt className="text-muted-foreground">Revenue</dt>
                <dd className="font-mono font-medium">
                  +${co.revenue_impact_m.toFixed(2)}M
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cost</dt>
                <dd className="font-mono font-medium">+${co.cost_impact_m.toFixed(2)}M</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Margin</dt>
                <dd className="font-mono font-medium">
                  {co.margin_realized_pct.toFixed(1)}%
                </dd>
              </div>
            </dl>
          </div>
          {expandedId === co.co_id && co.four_frame_analysis && (
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
      ))}
    </div>
  );
}
