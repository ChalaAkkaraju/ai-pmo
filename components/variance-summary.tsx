'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface VarianceReport {
  report_week: number;
  cpi: number;
  spi: number;
  cost_variance_m: number;
  schedule_variance_days: number;
  contingency_consumed_m: number;
  projected_margin_pct: number;
  buffer_intact_days: number | null;
  full_report_md: string;
}

export function VarianceSummary({ rows }: { rows: Array<Record<string, unknown>> }) {
  const reports = rows as unknown as VarianceReport[];
  const [selectedWeek, setSelectedWeek] = useState<number | null>(
    reports.length > 0 ? reports[reports.length - 1].report_week : null,
  );

  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No variance reports recorded.</p>
    );
  }

  const selected = reports.find((r) => r.report_week === selectedWeek);

  // With a single report the week-selector is pointless (nothing to switch
  // between) and the snapshot card above already shows CPI/SPI/Margin/Buffer —
  // so skip the grid and show the full report full-width.
  const showWeekSelector = reports.length > 1;

  return (
    <div className="space-y-4">
      {/* Week selector — only when there's more than one report */}
      {showWeekSelector && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {reports.map((r) => (
          <button
            key={r.report_week}
            onClick={() => setSelectedWeek(r.report_week)}
            className={`rounded-lg border bg-card p-4 text-left transition hover:border-foreground/40 ${
              selectedWeek === r.report_week ? 'border-foreground/60 shadow-sm' : ''
            }`}
          >
            <p className="text-xs font-medium text-muted-foreground">Week {r.report_week}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">CPI</p>
                <p className="font-mono font-medium">{r.cpi.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">SPI</p>
                <p className="font-mono font-medium">{r.spi.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Margin</p>
                <p className="font-mono font-medium">{r.projected_margin_pct.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Buffer</p>
                <p className="font-mono font-medium">{r.buffer_intact_days ?? '—'}d</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      )}

      {/* Full report markdown — compact when it's a one-line summary */}
      {selected && (() => {
        const short = (selected.full_report_md ?? '').trim().length < 280;
        return (
          <div className={`rounded-lg border bg-card ${short ? 'p-4' : 'p-6'}`}>
            <h4 className={`text-sm font-semibold ${short ? 'mb-2' : 'mb-4'}`}>
              Full variance report — Week {selected.report_week}
            </h4>
            <article className={`prose prose-sm max-w-none dark:prose-invert ${short ? 'prose-p:my-0 prose-headings:mt-0 prose-headings:mb-1' : ''}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selected.full_report_md}
              </ReactMarkdown>
            </article>
          </div>
        );
      })()}
    </div>
  );
}
