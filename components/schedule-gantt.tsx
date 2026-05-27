'use client';

/**
 * Gantt-style schedule strip — horizontal timeline that sits above the
 * Schedule markdown on the project Schedule tab.
 *
 * Renders:
 *   - A horizontal bar from W0 to an estimated end-week
 *   - A filled segment from W0 to current_week, coloured by project status
 *     (Active = amber, SC = teal, Closed = slate-gray) — deliberately distinct
 *     from the CPI sky-blue / SPI violet / contingency green used on the
 *     Variance trend chart so the two cards don't read as duplicates.
 *   - Variance report ticks above the bar (▼ downward, navy) — any tick within
 *     ±2 weeks of Today is skipped so it doesn't overlap the dashed marker
 *   - "Today" marker — vertical dashed line + "Week N" label
 *   - "Closeout" marker — small square at the end if status = Closed
 *   - A 4-stat sidebar (Status, Current week, Reports filed, COs)
 *
 * End-week heuristic:
 *   - Closed: end = current_week (project is done)
 *   - SC: end = ceil(current_week * 1.05) (short warranty tail)
 *   - Active: end = ceil(current_week / 0.7) (assume ~70% complete)
 */

interface VarianceReport {
  report_week: number;
}

interface ChangeOrder {
  co_id?: string;
  status?: string;
}

interface Props {
  currentWeek: number;
  status: string; // 'Active' | 'SC' | 'Closed'
  hardDeadlineDescription: string | null;
  varianceReports: Array<Record<string, unknown>>;
  changeOrders: Array<Record<string, unknown>>;
}

const CHART_W = 700;
const CHART_H = 120;
const PAD_LEFT = 28;
const PAD_RIGHT = 28;
const BAR_Y = 56;
const BAR_HEIGHT = 18;

function estimateEndWeek(currentWeek: number, status: string): number {
  const s = String(status).toLowerCase();
  if (s === 'closed') return Math.max(1, currentWeek);
  if (s === 'sc') return Math.max(1, Math.ceil(currentWeek * 1.05));
  return Math.max(currentWeek + 4, Math.ceil(currentWeek / 0.7));
}

function statusFillColour(status: string): { fill: string; bg: string; text: string; chip: string } {
  const s = String(status).toLowerCase();
  if (s === 'closed') return { fill: 'rgb(100 116 139)', bg: 'rgb(241 245 249)', text: 'text-slate-700', chip: 'bg-slate-200 text-slate-800' };
  if (s === 'sc') return { fill: 'rgb(20 184 166)', bg: 'rgb(204 251 241)', text: 'text-teal-700', chip: 'bg-teal-100 text-teal-800' };
  // Active
  return { fill: 'rgb(245 158 11)', bg: 'rgb(254 243 199)', text: 'text-amber-700', chip: 'bg-amber-100 text-amber-800' };
}

export function ScheduleGantt({
  currentWeek,
  status,
  hardDeadlineDescription,
  varianceReports,
  changeOrders,
}: Props) {
  const reports = (varianceReports as unknown as VarianceReport[]).slice().sort(
    (a, b) => a.report_week - b.report_week,
  );
  const cos = changeOrders as unknown as ChangeOrder[];

  const endWeek = estimateEndWeek(currentWeek, status);
  const xRange = Math.max(1, endWeek);
  const pctComplete = Math.min(100, Math.max(0, (currentWeek / xRange) * 100));

  const colours = statusFillColour(status);

  function xPos(w: number): number {
    return PAD_LEFT + (w / xRange) * (CHART_W - PAD_LEFT - PAD_RIGHT);
  }

  const xTicks = [0, Math.round(xRange * 0.25), Math.round(xRange * 0.5), Math.round(xRange * 0.75), xRange];
  const visibleReports = reports.filter((r) => Math.abs(r.report_week - currentWeek) > 2);

  const statusLabel =
    status.toLowerCase() === 'sc' ? 'Substantial completion' : status;

  return (
    <div className="rounded-lg border bg-card p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Project timeline</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Currently at week {currentWeek} of estimated {endWeek} · {pctComplete.toFixed(0)}% elapsed
            {hardDeadlineDescription ? ` · ${hardDeadlineDescription}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colours.chip}`}>
          {statusLabel}
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_180px]">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Project schedule timeline"
        >
          {/* Background bar (full timeline, light grey) */}
          <rect
            x={PAD_LEFT}
            y={BAR_Y}
            width={CHART_W - PAD_LEFT - PAD_RIGHT}
            height={BAR_HEIGHT}
            fill="rgb(241 245 249)"
            rx={4}
          />

          {/* Completed portion (W0 → current_week) */}
          <rect
            x={PAD_LEFT}
            y={BAR_Y}
            width={Math.max(0, xPos(currentWeek) - PAD_LEFT)}
            height={BAR_HEIGHT}
            fill={colours.fill}
            fillOpacity={0.75}
            rx={4}
          />

          {/* X-axis tick labels */}
          {xTicks.map((w, idx) => (
            <g key={`xtick-${idx}`}>
              <line
                x1={xPos(w)}
                y1={BAR_Y + BAR_HEIGHT}
                x2={xPos(w)}
                y2={BAR_Y + BAR_HEIGHT + 4}
                stroke="rgb(148 163 184)"
                strokeWidth={0.75}
              />
              <text
                x={xPos(w)}
                y={BAR_Y + BAR_HEIGHT + 16}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="10"
              >
                W{w}
              </text>
            </g>
          ))}

          {/* Variance report ticks (▼ above bar, navy). Skip any within
              ±2 weeks of Today (those overlap the dashed marker visually). */}
          {visibleReports.map((r, idx) => (
            <g key={`vr-${idx}`}>
              <polygon
                points={`${xPos(r.report_week) - 4},${BAR_Y - 10} ${xPos(r.report_week) + 4},${BAR_Y - 10} ${xPos(r.report_week)},${BAR_Y - 2}`}
                fill="rgb(15 23 42)"
                fillOpacity={0.55}
              >
                <title>Variance report — Week {r.report_week}</title>
              </polygon>
            </g>
          ))}

          {/* "Today" marker — vertical dashed line + label */}
          <line
            x1={xPos(currentWeek)}
            y1={BAR_Y - 14}
            x2={xPos(currentWeek)}
            y2={BAR_Y + BAR_HEIGHT + 6}
            stroke="rgb(15 23 42)"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          <text
            x={xPos(currentWeek)}
            y={BAR_Y - 18}
            textAnchor="middle"
            className="fill-foreground"
            fontSize="10"
            fontWeight="500"
          >
            Week {currentWeek}
          </text>

          {/* Closeout marker — square at the end if Closed */}
          {String(status).toLowerCase() === 'closed' && (
            <g>
              <rect
                x={xPos(endWeek) - 5}
                y={BAR_Y + BAR_HEIGHT / 2 - 5}
                width={10}
                height={10}
                fill="rgb(100 116 139)"
                stroke="white"
                strokeWidth={1}
              />
              <text
                x={xPos(endWeek)}
                y={BAR_Y + BAR_HEIGHT + 30}
                textAnchor="middle"
                className="fill-slate-700"
                fontSize="10"
                fontWeight="500"
              >
                Closed
              </text>
            </g>
          )}

          {/* Legend strip at bottom of SVG. Count shown reflects ALL reports
              (not just visible ticks) so the user sees the true total. */}
          <g transform={`translate(${PAD_LEFT}, ${CHART_H - 10})`}>
            <polygon points="0,-4 6,-4 3,2" fill="rgb(15 23 42)" fillOpacity={0.55} />
            <text x={10} y={2} className="fill-muted-foreground" fontSize="9">
              Variance report ({reports.length})
            </text>
            <g transform="translate(140, 0)">
              <line x1={0} y1={-1} x2={10} y2={-1} stroke="rgb(15 23 42)" strokeWidth={1} strokeDasharray="3 2" />
              <text x={14} y={2} className="fill-muted-foreground" fontSize="9">
                Today (Wk {currentWeek})
              </text>
            </g>
          </g>
        </svg>

        {/* Sidebar stats */}
        <dl className="grid grid-cols-2 gap-2 self-start lg:grid-cols-1">
          <Stat label="Status" value={statusLabel} valueClass={colours.text} />
          <Stat label="Current week" value={`${currentWeek}`} />
          <Stat label="Reports filed" value={`${reports.length}`} />
          <Stat label="Change orders" value={`${cos.length}`} />
        </dl>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md border bg-background/60 px-3 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${valueClass ?? ''}`}>{value}</dd>
    </div>
  );
}
