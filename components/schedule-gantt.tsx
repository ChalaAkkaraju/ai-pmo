'use client';

/**
 * Project event timeline.
 *
 * The database has no phase/milestone schedule — only week markers — so rather
 * than fake a Gantt we present an honest TIMELINE OF REAL EVENTS on one axis,
 * with each milestone (start, variance reports, change orders, today, estimated
 * end / deadline) labelled directly ON the bar. Labels stagger above/below the
 * axis to avoid collisions.
 *
 * Sits above the Schedule agent's markdown on the project Schedule tab.
 * Props unchanged so the parent (project-tabs) needs no edits.
 */

interface VarianceReport {
  report_week: number;
}

interface ChangeOrder {
  co_id?: string;
  status?: string;
  scope_summary?: string;
  executed_week?: number | null;
}

interface Props {
  currentWeek: number;
  status: string; // 'Active' | 'SC' | 'Closed'
  hardDeadlineDescription: string | null;
  varianceReports: Array<Record<string, unknown>>;
  changeOrders: Array<Record<string, unknown>>;
}

const CHART_W = 720;
const PAD_LEFT = 30;
const PAD_RIGHT = 30;
const AXIS_Y = 56;           // baseline of the progress bar
const BAR_HEIGHT = 14;

function estimateEndWeek(currentWeek: number, status: string): number {
  const s = String(status).toLowerCase();
  if (s === 'closed') return Math.max(1, currentWeek);
  if (s === 'sc') return Math.max(1, Math.ceil(currentWeek * 1.05));
  return Math.max(currentWeek + 4, Math.ceil(currentWeek / 0.7));
}

function statusColours(status: string): { fill: string; chip: string } {
  const s = String(status).toLowerCase();
  if (s === 'closed') return { fill: 'rgb(100 116 139)', chip: 'bg-slate-200 text-slate-800' };
  if (s === 'sc') return { fill: 'rgb(20 184 166)', chip: 'bg-teal-100 text-teal-800' };
  return { fill: 'rgb(245 158 11)', chip: 'bg-amber-100 text-amber-800' };
}

type EventKind = 'start' | 'variance' | 'change_order' | 'today' | 'end';

interface TLEvent {
  week: number;
  kind: EventKind;
  label: string;
  detail?: string;
}

const KIND: Record<EventKind, { color: string; glyph: string }> = {
  start:        { color: 'rgb(100 116 139)', glyph: '●' },
  variance:     { color: 'rgb(99 102 241)',  glyph: '▼' },
  change_order: { color: 'rgb(139 92 246)',  glyph: '◆' },
  today:        { color: 'rgb(15 23 42)',     glyph: '◇' },
  end:          { color: 'rgb(239 68 68)',    glyph: '⏱' },
};

export function ScheduleGantt({
  currentWeek,
  status,
  hardDeadlineDescription,
  varianceReports,
  changeOrders,
}: Props) {
  const reports = (varianceReports as unknown as VarianceReport[]).slice().sort((a, b) => a.report_week - b.report_week);
  const cos = changeOrders as unknown as ChangeOrder[];

  const endWeek = estimateEndWeek(currentWeek, status);
  const xRange = Math.max(1, endWeek);
  const pctComplete = Math.min(100, Math.max(0, (currentWeek / xRange) * 100));
  const colours = statusColours(status);
  const statusLabel = status.toLowerCase() === 'sc' ? 'Substantial completion' : status;
  const isClosed = status.toLowerCase() === 'closed';

  function xPos(w: number): number {
    return PAD_LEFT + (Math.min(w, xRange) / xRange) * (CHART_W - PAD_LEFT - PAD_RIGHT);
  }

  // Build events, sorted by week.
  const events: TLEvent[] = [];
  events.push({ week: 0, kind: 'start', label: 'Start' });
  for (const r of reports) events.push({ week: r.report_week, kind: 'variance', label: `Variance W${r.report_week}` });
  for (const c of cos) {
    if (typeof c.executed_week === 'number' && c.executed_week > 0) {
      events.push({ week: c.executed_week, kind: 'change_order', label: c.co_id ?? 'Change order', detail: c.scope_summary ?? undefined });
    }
  }
  events.push({ week: currentWeek, kind: 'today', label: `Today · W${currentWeek}` });
  events.push({ week: endWeek, kind: 'end', label: isClosed ? `Closed · W${endWeek}` : `Est. end · W${endWeek}`, detail: hardDeadlineDescription ?? undefined });
  events.sort((a, b) => a.week - b.week);

  // Stagger labels: alternate above / below as we move left→right so adjacent
  // markers don't overlap. 'today' always goes above (it's the key reference).
  let aboveToggle = true;
  const placed = events.map((e) => {
    const above = e.kind === 'today' ? true : (aboveToggle = !aboveToggle, aboveToggle);
    return { ...e, above };
  });

  return (
    <div className="rounded-lg border bg-card p-5">
      <header className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Project timeline</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Week {currentWeek} of an estimated {endWeek} · {pctComplete.toFixed(0)}% elapsed
            {hardDeadlineDescription ? ` · deadline: ${hardDeadlineDescription}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colours.chip}`}>{statusLabel}</span>
      </header>

      <svg viewBox={`0 0 ${CHART_W} 116`} className="w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Project event timeline with milestones">
        {/* track */}
        <rect x={PAD_LEFT} y={AXIS_Y} width={CHART_W - PAD_LEFT - PAD_RIGHT} height={BAR_HEIGHT} fill="rgb(241 245 249)" rx={7} />
        {/* elapsed */}
        <rect x={PAD_LEFT} y={AXIS_Y} width={Math.max(0, xPos(currentWeek) - PAD_LEFT)} height={BAR_HEIGHT} fill={colours.fill} fillOpacity={0.85} rx={7} />

        {/* baseline week ticks */}
        {[0, Math.round(xRange * 0.5), xRange].map((w, idx) => (
          <text key={`t-${idx}`} x={xPos(w)} y={AXIS_Y + BAR_HEIGHT + 16} textAnchor="middle" className="fill-muted-foreground" fontSize="9.5">W{w}</text>
        ))}

        {/* milestone markers + labels, on the bar */}
        {placed.map((e, idx) => {
          const x = xPos(e.week);
          const k = KIND[e.kind];
          // connector + label position
          const labelY = e.above ? AXIS_Y - 14 : AXIS_Y + BAR_HEIGHT + 30;
          const stemTop = e.above ? AXIS_Y - 10 : AXIS_Y + BAR_HEIGHT;
          const stemBot = e.above ? AXIS_Y : AXIS_Y + BAR_HEIGHT + 10;
          const anchor = x < 70 ? 'start' : x > CHART_W - 70 ? 'end' : 'middle';
          const isToday = e.kind === 'today';

          return (
            <g key={`m-${idx}`}>
              {/* connector stem */}
              <line x1={x} y1={stemTop} x2={x} y2={stemBot} stroke={k.color} strokeWidth={isToday ? 1.2 : 0.8} strokeDasharray={isToday ? '3 2' : '0'} strokeOpacity={0.6} />
              {/* marker on the bar */}
              <circle cx={x} cy={AXIS_Y + BAR_HEIGHT / 2} r={isToday ? 5 : 4} fill={k.color} stroke="white" strokeWidth={1.5}>
                <title>{e.label}{e.detail ? ` — ${e.detail}` : ''}</title>
              </circle>
              {/* glyph + label */}
              <text x={x} y={labelY} textAnchor={anchor} fontSize="10.5" fontWeight={isToday ? 700 : 600} fill={k.color}>
                <tspan>{k.glyph} </tspan>
                <tspan fill="rgb(30 41 59)">{e.label}</tspan>
              </text>
              {/* optional detail line under label (truncated) */}
              {e.detail && (
                <text x={x} y={labelY + (e.above ? -12 : 13)} textAnchor={anchor} fontSize="8.5" fill="rgb(100 116 139)">
                  {e.detail.length > 42 ? e.detail.slice(0, 41) + '…' : e.detail}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* compact legend */}
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <LegendItem glyph="▼" className="text-indigo-600" label={`Variance (${reports.length})`} />
        <LegendItem glyph="◆" className="text-violet-600" label={`Change order (${events.filter((e) => e.kind === 'change_order').length})`} />
        <LegendItem glyph="◇" className="text-foreground" label="Today" />
        <LegendItem glyph={isClosed ? '◼' : '⏱'} className={isClosed ? 'text-slate-600' : 'text-red-600'} label={isClosed ? 'Closed' : 'Est. end'} />
      </div>
    </div>
  );
}

function LegendItem({ glyph, className, label }: { glyph: string; className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`text-[11px] leading-none ${className}`}>{glyph}</span>
      <span>{label}</span>
    </span>
  );
}
