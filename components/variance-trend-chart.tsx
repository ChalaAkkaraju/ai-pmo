'use client';

/**
 * Variance trend chart card — two side-by-side SVG charts:
 *
 *   Left: CPI & SPI lines over reporting weeks with 1.0 baseline.
 *         Lines tinted red when current value < 0.95.
 *   Right: Contingency consumed (area) vs total contingency (reference line).
 *
 * With a single report the trend is empty, so a richer week-snapshot of KPI
 * tiles is shown instead (CPI, SPI, contingency, projected margin, buffer) —
 * the contingency tile compares the LIVE project budget against the figure the
 * report was written against. Tiles use the shared kpi-tone system.
 *
 * Sits ABOVE the existing per-week summary buttons on the project Variance tab.
 * No external charting library — inline SVG using project tokens.
 */
import { toneCard, toneText, type KpiTone } from '@/lib/kpi-tone';

interface VarianceReport {
  report_week: number;
  cpi: number | string;
  spi: number | string;
  cost_variance_m: number | string;
  schedule_variance_days: number;
  contingency_consumed_m: number | string;
  projected_margin_pct?: number | string | null;
  buffer_intact_days?: number | string | null;
  full_report_md?: string | null;
}

interface Props {
  rows: Array<Record<string, unknown>>;
  contingencyTotal: number;
}

function safeNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** The report narrative records its own contingency basis as "… of $YY.YM." */
function parseReportedTotalM(md: string | null | undefined): number | null {
  if (!md) return null;
  const m = md.match(/of\s+\$([\d.]+)\s*M/i);
  return m ? Number(m[1]) : null;
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
  const latestReport = reports[reports.length - 1];
  const totalContingencyM =
    Number.isFinite(contingencyTotal) && contingencyTotal > 0 ? contingencyTotal / 1_000_000 : 0;
  const consumedPct = totalContingencyM > 0 ? (latest.contingencyConsumedM / totalContingencyM) * 100 : 0;

  // A trend needs at least two points. With a single report, a line chart looks
  // empty/broken — show a clean week-snapshot of KPI tiles instead.
  const single = data.length < 2;

  return (
    <div className="rounded-lg border bg-card p-5">
      <header className="mb-4">
        <h3 className="text-sm font-semibold">{single ? `Variance snapshot — Week ${latest.week}` : 'Variance trend'}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {single
            ? `Only one report so far (Week ${latest.week}) — trend builds as more weeks are logged.`
            : `${data.length} reports across weeks ${data[0].week}–${latest.week}. Latest CPI ${latest.cpi.toFixed(2)} · SPI ${latest.spi.toFixed(2)}${totalContingencyM > 0 ? ` · contingency ${consumedPct.toFixed(0)}% consumed` : ''}.`}
        </p>
      </header>

      {single ? (
        <VarianceSnapshot
          week={latest.week}
          cpi={latest.cpi}
          spi={latest.spi}
          marginPct={latestReport.projected_margin_pct == null ? null : safeNum(latestReport.projected_margin_pct, 0)}
          bufferDays={latestReport.buffer_intact_days == null ? null : safeNum(latestReport.buffer_intact_days, 0)}
          consumedM={latest.contingencyConsumedM}
          liveTotalM={totalContingencyM}
          reportedTotalM={parseReportedTotalM(latestReport.full_report_md)}
          consumedPct={consumedPct}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <CpiSpiChart data={data} />
          <ContingencyBurnChart data={data} totalContingencyM={totalContingencyM} />
        </div>
      )}
    </div>
  );
}

/** Single-report view: CPI/SPI gauges, contingency (live vs as-reported), margin, buffer. */
function VarianceSnapshot({
  week,
  cpi,
  spi,
  marginPct,
  bufferDays,
  consumedM,
  liveTotalM,
  reportedTotalM,
  consumedPct,
}: {
  week: number;
  cpi: number;
  spi: number;
  marginPct: number | null;
  bufferDays: number | null;
  consumedM: number;
  liveTotalM: number;
  reportedTotalM: number | null;
  consumedPct: number;
}) {
  const cpiTone: KpiTone = cpi < 0.95 ? 'bad' : cpi >= 1 ? 'ok' : 'warn';
  const spiTone: KpiTone = spi < 0.95 ? 'bad' : spi >= 1 ? 'ok' : 'warn';
  const marginTone: KpiTone = marginPct == null ? 'neutral' : marginPct >= 8 ? 'ok' : marginPct >= 3 ? 'warn' : 'bad';
  const bufferTone: KpiTone = bufferDays == null ? 'neutral' : bufferDays < 0 ? 'bad' : bufferDays < 14 ? 'warn' : 'ok';
  const contTone: KpiTone = liveTotalM <= 0 ? 'neutral' : consumedPct > 75 ? 'bad' : consumedPct > 50 ? 'warn' : 'ok';
  const reportedPct = reportedTotalM && reportedTotalM > 0 ? (consumedM / reportedTotalM) * 100 : null;
  const drift = reportedTotalM != null && liveTotalM > 0 && Math.abs(reportedTotalM - liveTotalM) > 0.1;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <IndexGauge label="CPI" sub="Cost performance" value={cpi} tone={cpiTone} />
      <IndexGauge label="SPI" sub="Schedule performance" value={spi} tone={spiTone} />

      {/* Contingency — live budget vs the figure the report was written against */}
      <div className={`rounded-md border p-3 ${toneCard(contTone)}`}>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contingency</p>
        <p className={`mt-1 text-xl font-bold tabular-nums ${toneText(contTone)}`}>
          {liveTotalM > 0 ? `${consumedPct.toFixed(0)}%` : `$${consumedM.toFixed(1)}M`}
        </p>
        <p className="text-[10px] text-muted-foreground">${consumedM.toFixed(2)}M drawn</p>
        <div className="mt-1.5 space-y-0.5 text-[10px] tabular-nums">
          <p className="flex justify-between gap-2">
            <span className="text-muted-foreground">Live budget</span>
            <span className="font-medium text-foreground">${liveTotalM.toFixed(1)}M · {consumedPct.toFixed(0)}%</span>
          </p>
          {reportedTotalM != null && (
            <p className="flex justify-between gap-2">
              <span className="text-muted-foreground">As reported · Wk {week}</span>
              <span className="font-medium text-foreground">${reportedTotalM.toFixed(1)}M{reportedPct != null ? ` · ${reportedPct.toFixed(0)}%` : ''}</span>
            </p>
          )}
        </div>
        {liveTotalM > 0 && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${consumedPct > 100 ? 'bg-red-500' : consumedPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, consumedPct)}%` }}
            />
          </div>
        )}
        {drift && (
          <p className="mt-1 text-[9px] leading-tight text-muted-foreground">Budget revised since the Wk {week} report.</p>
        )}
      </div>

      {/* Projected margin */}
      <div className={`rounded-md border p-3 ${toneCard(marginTone)}`}>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Projected margin</p>
        <p className={`mt-1 text-xl font-bold tabular-nums ${toneText(marginTone)}`}>{marginPct == null ? '—' : `${marginPct.toFixed(1)}%`}</p>
        <p className="text-[10px] text-muted-foreground">forecast at completion</p>
      </div>

      {/* Buffer intact */}
      <div className={`rounded-md border p-3 ${toneCard(bufferTone)}`}>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Buffer intact</p>
        <p className={`mt-1 text-xl font-bold tabular-nums ${toneText(bufferTone)}`}>{bufferDays == null ? '—' : `${bufferDays}d`}</p>
        <p className="text-[10px] text-muted-foreground">schedule float remaining</p>
      </div>
    </div>
  );
}

/** Compact index gauge: value vs a 1.0 baseline, color-coded via shared tone. */
function IndexGauge({ label, sub, value, tone }: { label: string; sub: string; value: number; tone: KpiTone }) {
  const barTone = value < 0.95 ? 'bg-red-500' : value >= 1 ? 'bg-emerald-500' : 'bg-amber-500';
  // Map 0.7..1.3 onto 0..100% for the bar, with a baseline tick at 1.0.
  const pct = Math.max(0, Math.min(100, ((value - 0.7) / 0.6) * 100));
  const basePct = ((1.0 - 0.7) / 0.6) * 100;
  return (
    <div className={`rounded-md border p-3 ${toneCard(tone)}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneText(tone)}`}>{value.toFixed(2)}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
      <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
        {/* 1.0 baseline tick */}
        <span className="absolute top-0 h-full w-px bg-slate-500/60" style={{ left: `${basePct}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">baseline 1.00</p>
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
