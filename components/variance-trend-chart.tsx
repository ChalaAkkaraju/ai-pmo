'use client';

/**
 * Variance trend chart card — two side-by-side SVG charts:
 *
 *   Left: CPI & SPI lines over reporting weeks with 1.0 baseline.
 *         Lines tinted red when current value < 0.95.
 *   Right: Contingency consumed (area) vs total contingency (reference line).
 *
 * Sits ABOVE the existing per-week summary buttons on the project Variance tab.
 * No external charting library — inline SVG using project tokens.
 */

interface VarianceReport {
  report_week: number;
  cpi: number | string;
  spi: number | string;
  cost_variance_m: number | string;
  schedule_variance_days: number;
  contingency_consumed_m: number | string;
}

interface Props {
  rows: Array<Record<string, unknown>>;
  contingencyTotal: number;
}

function safeNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const CHART_W = 320;
const CHART_H = 180;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

export function VarianceTrendChart({ rows, contingencyTotal }: Props) {
  const reports = (rows as unknown as VarianceReport[]).slice().sort(
    (a, b) => a.report_week - b.report_week,
  );

  if (reports.length === 0) return null;

  const data = reports.map((r) => ({
    week: r.report_week,
    cpi: safeNum(r.cpi, 1),
    spi: safeNum(r.spi, 1),
    contingencyConsumedM: safeNum(r.contingency_consumed_m, 0),
  }));

  const latest = data[data.length - 1];
  const totalContingencyM =
    Number.isFinite(contingencyTotal) && contingencyTotal > 0 ? contingencyTotal / 1_000_000 : 0;
  const consumedPct = totalContingencyM > 0 ? (latest.contingencyConsumedM / totalContingencyM) * 100 : 0;

  return (
    <div className="rounded-lg border bg-card p-5">
      <header className="mb-4">
        <h3 className="text-sm font-semibold">Variance trend</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {data.length} report{data.length === 1 ? '' : 's'} across weeks {data[0].week}–{latest.week}.
          Latest CPI {latest.cpi.toFixed(2)} · SPI {latest.spi.toFixed(2)}
          {totalContingencyM > 0 ? ` · contingency ${consumedPct.toFixed(0)}% consumed` : ''}.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <CpiSpiChart data={data} />
        <ContingencyBurnChart data={data} totalContingencyM={totalContingencyM} />
      </div>
    </div>
  );
}

function CpiSpiChart({ data }: { data: Array<{ week: number; cpi: number; spi: number }> }) {
  const yMin = 0.7;
  const yMax = 1.3;

  const xMin = data[0].week;
  const xMax = data[data.length - 1].week;
  const xRange = Math.max(1, xMax - xMin);

  function xPos(w: number): number {
    return PAD_LEFT + ((w - xMin) / xRange) * (CHART_W - PAD_LEFT - PAD_RIGHT);
  }
  function yPos(v: number): number {
    return PAD_TOP + (1 - (v - yMin) / (yMax - yMin)) * (CHART_H - PAD_TOP - PAD_BOTTOM);
  }

  const cpiPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(d.week).toFixed(1)} ${yPos(d.cpi).toFixed(1)}`)
    .join(' ');
  const spiPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(d.week).toFixed(1)} ${yPos(d.spi).toFixed(1)}`)
    .join(' ');

  const latest = data[data.length - 1];
  const cpiAlert = latest.cpi < 0.95;
  const spiAlert = latest.spi < 0.95;

  const gridLines = [0.8, 1.0, 1.2];
  const xLabels = [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]];

  return (
    <figure className="flex flex-col">
      <figcaption className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>CPI / SPI</span>
        <span className="flex items-center gap-3 normal-case tracking-normal">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-3 rounded-sm ${cpiAlert ? 'bg-red-500' : 'bg-sky-500'}`} />
            <span>CPI {latest.cpi.toFixed(2)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-3 rounded-sm ${spiAlert ? 'bg-red-500' : 'bg-violet-500'}`} />
            <span>SPI {latest.spi.toFixed(2)}</span>
          </span>
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="CPI and SPI over time">
        {gridLines.map((g, idx) => (
          <g key={`y-${idx}`}>
            <line x1={PAD_LEFT} y1={yPos(g)} x2={CHART_W - PAD_RIGHT} y2={yPos(g)} stroke={g === 1.0 ? 'rgb(100 116 139)' : 'rgb(226 232 240)'} strokeWidth={g === 1.0 ? 1 : 0.5} strokeDasharray={g === 1.0 ? '0' : '2 2'} />
            <text x={PAD_LEFT - 4} y={yPos(g) + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">{g.toFixed(1)}</text>
          </g>
        ))}

        {xLabels.map((d, idx) => (
          <text key={`x-${idx}`} x={xPos(d.week)} y={CHART_H - 10} textAnchor="middle" className="fill-muted-foreground" fontSize="9">W{d.week}</text>
        ))}

        <path d={cpiPath} fill="none" stroke={cpiAlert ? 'rgb(239 68 68)' : 'rgb(14 165 233)'} strokeWidth={1.8} />
        <path d={spiPath} fill="none" stroke={spiAlert ? 'rgb(239 68 68)' : 'rgb(139 92 246)'} strokeWidth={1.8} />

        <circle cx={xPos(latest.week)} cy={yPos(latest.cpi)} r={3} fill={cpiAlert ? 'rgb(239 68 68)' : 'rgb(14 165 233)'} />
        <circle cx={xPos(latest.week)} cy={yPos(latest.spi)} r={3} fill={spiAlert ? 'rgb(239 68 68)' : 'rgb(139 92 246)'} />
      </svg>
    </figure>
  );
}

function ContingencyBurnChart({
  data,
  totalContingencyM,
}: {
  data: Array<{ week: number; contingencyConsumedM: number }>;
  totalContingencyM: number;
}) {
  const safeTotal = Number.isFinite(totalContingencyM) && totalContingencyM > 0 ? totalContingencyM : 0;
  const peakConsumed = Math.max(0, ...data.map((d) => (Number.isFinite(d.contingencyConsumedM) ? d.contingencyConsumedM : 0)));
  const yMax = Math.max(safeTotal, peakConsumed, 1) * 1.05;
  const yMin = 0;

  const xMin = data[0].week;
  const xMax = data[data.length - 1].week;
  const xRange = Math.max(1, xMax - xMin);

  function xPos(w: number): number {
    return PAD_LEFT + ((w - xMin) / xRange) * (CHART_W - PAD_LEFT - PAD_RIGHT);
  }
  function yPos(v: number): number {
    return PAD_TOP + (1 - (v - yMin) / (yMax - yMin)) * (CHART_H - PAD_TOP - PAD_BOTTOM);
  }

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(d.week).toFixed(1)} ${yPos(d.contingencyConsumedM).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${xPos(data[data.length - 1].week).toFixed(1)} ${yPos(0).toFixed(1)} L ${xPos(data[0].week).toFixed(1)} ${yPos(0).toFixed(1)} Z`;

  const latest = data[data.length - 1];
  const latestConsumed = Number.isFinite(latest.contingencyConsumedM) ? latest.contingencyConsumedM : 0;
  const consumedPct = safeTotal > 0 ? (latestConsumed / safeTotal) * 100 : 0;
  const overBudget = consumedPct > 100;
  const fillColour = overBudget ? 'rgb(239 68 68)' : consumedPct > 75 ? 'rgb(245 158 11)' : 'rgb(16 185 129)';

  const halfTotal = safeTotal / 2;
  const gridLines = [0, halfTotal, safeTotal];
  const xLabels = [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]];

  return (
    <figure className="flex flex-col">
      <figcaption className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>Contingency burn</span>
        <span className="flex items-center gap-3 normal-case tracking-normal">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: fillColour }} />
            <span>${latestConsumed.toFixed(1)}M{safeTotal > 0 ? ` / $${safeTotal.toFixed(1)}M` : ''}</span>
          </span>
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Contingency consumption over time">
        {gridLines.map((g, idx) => (
          <g key={`y-${idx}`}>
            <line x1={PAD_LEFT} y1={yPos(g)} x2={CHART_W - PAD_RIGHT} y2={yPos(g)} stroke={idx === 2 && safeTotal > 0 ? 'rgb(239 68 68)' : 'rgb(226 232 240)'} strokeWidth={idx === 2 && safeTotal > 0 ? 1 : 0.5} strokeDasharray={idx === 2 && safeTotal > 0 ? '3 2' : '2 2'} />
            <text x={PAD_LEFT - 4} y={yPos(g) + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">${safeTotal < 2 ? g.toFixed(1) : g.toFixed(0)}M</text>
          </g>
        ))}

        {xLabels.map((d, idx) => (
          <text key={`x-${idx}`} x={xPos(d.week)} y={CHART_H - 10} textAnchor="middle" className="fill-muted-foreground" fontSize="9">W{d.week}</text>
        ))}

        <path d={areaPath} fill={fillColour} fillOpacity={0.18} />
        <path d={linePath} fill="none" stroke={fillColour} strokeWidth={1.8} />
        <circle cx={xPos(latest.week)} cy={yPos(latestConsumed)} r={3} fill={fillColour} />

        {safeTotal > 0 && (
          <text x={CHART_W - PAD_RIGHT} y={yPos(safeTotal) - 4} textAnchor="end" className="fill-red-600" fontSize="8.5" fontWeight="500">Total</text>
        )}
      </svg>
    </figure>
  );
}
