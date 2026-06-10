/**
 * Earned-value dashboard card — Phase 3 flagship. Display only; metrics are
 * computed server-side by lib/earned-value. Header chip + KPI grid + S-curve
 * (PV→BAC, EV/AC to today, dashed EAC forecast), then variance, forecasting
 * and Earned-Schedule blocks.
 */

import { CHART } from '@/lib/chart-palette';
import type { EvMetrics, EvCurve, EarnedScheduleMetrics } from '@/lib/earned-value';

function money(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(2)}M`;
}
function signedMoney(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${n < 0 ? '−' : '+'}$${Math.abs(m).toFixed(2)}M`;
}
function num(n: number | null): string {
  return n == null ? '—' : n.toFixed(2);
}
function pct(n: number | null, signed = false): string {
  if (n == null) return '—';
  const v = n * 100;
  return `${signed && v >= 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
}
function weeks(n: number | null): string {
  if (n == null) return '—';
  return `${n < 0 ? '−' : '+'}${Math.abs(n).toFixed(1)} wk`;
}
function shortDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : '—';
}

export function EarnedValueCard({
  metrics, syncedAt, curve, es,
}: {
  metrics: EvMetrics;
  syncedAt: string | null;
  curve: EvCurve | null;
  es?: EarnedScheduleMetrics | null;
}) {
  if (!metrics.ready) {
    return (
      <section className="mt-6 rounded-lg border bg-card p-6 text-center">
        <p className="text-sm font-medium">Earned value not available yet.</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Needs cost actuals from SAP PS plus the WBS budget and task progress. Run the cost sync to compute it.
        </p>
      </section>
    );
  }

  const { bac, pv, ev, ac, cpi, spi, eac, vac, complete_pct,
    cv, sv, cvPct, svPct, eacTypical, eacAtypical, eacBoth, etc, vacPct, tcpiBac, spentPct } = metrics;
  const costState = cpi == null ? null : cpi < 0.97 ? 'over cost' : cpi > 1.03 ? 'under cost' : 'on budget';
  const schedState = spi == null ? null : spi < 0.97 ? 'behind schedule' : spi > 1.03 ? 'ahead of schedule' : 'on schedule';
  const trouble = (cpi != null && cpi < 0.97) || (spi != null && spi < 0.97);
  const great = cpi != null && cpi >= 1.0 && spi != null && spi >= 1.0;
  const chipCls = trouble ? 'bg-red-100 text-red-800' : great ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
  const readout = [schedState, costState].filter(Boolean).join(' · ') || 'in progress';

  const tone = (v: number | null, warnBelow = 0.95) =>
    v == null ? 'text-foreground' : v < warnBelow ? 'text-red-600' : v >= 1.0 ? 'text-emerald-700' : 'text-amber-700';
  const varTone = (v: number) => (v < 0 ? 'text-red-600' : v > 0 ? 'text-emerald-700' : 'text-foreground');

  const Metric = ({ label, value, cls = 'text-foreground', accent }: { label: string; value: string; cls?: string; accent?: string }) => (
    <div className="rounded-md border bg-card px-3 py-1.5" style={accent ? { backgroundColor: `${accent}1A` } : undefined}>
      <p className={`text-[10px] font-medium uppercase tracking-wider ${accent ? '' : 'text-muted-foreground'}`} style={accent ? { color: accent } : undefined}>{label}</p>
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{value}</p>
    </div>
  );

  // EAC forecast range across the three methods.
  const eacVals = [eacTypical, eacAtypical, eacBoth].filter((v): v is number => v != null);
  const eacLo = eacVals.length ? Math.min(...eacVals) : null;
  const eacHi = eacVals.length ? Math.max(...eacVals) : null;
  const yMax = Math.max(bac, eac ?? 0, ...(curve?.eacForecast?.map((p) => p.ac) ?? [0]));

  return (
    <section className="mt-6 overflow-hidden rounded-lg border bg-gradient-to-br from-emerald-50/40 via-card to-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">📈</span>
          <div>
            <p className="text-sm font-semibold">Earned value</p>
            <p className="text-xs text-muted-foreground">{complete_pct.toFixed(0)}% complete · {pct(spentPct)} of budget spent · cost from SAP PS, progress from the scheduler</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${chipCls}`}>{readout}</span>
          {syncedAt && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">as of {new Date(syncedAt).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-4 md:grid-cols-2 md:items-center">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Budget (BAC)" value={money(bac)} cls="text-foreground" />
          <Metric label="Planned (PV)" value={money(pv)} accent={CHART.planned} />
          <Metric label="Earned (EV)" value={money(ev)} accent={CHART.earned} />
          <Metric label="Actual (AC)" value={money(ac)} accent={CHART.actual} />
          <Metric label="CPI · cost" value={num(cpi)} cls={tone(cpi)} />
          <Metric label="SPI · schedule" value={num(spi)} cls={tone(spi)} />
          <Metric label="Forecast (EAC)" value={money(eac)} />
          <Metric label="Variance (VAC)" value={money(vac)} cls={vac != null && vac < 0 ? 'text-red-600' : 'text-emerald-700'} />
        </div>

        {curve && curve.bac > 0 && yMax > 0 ? (
          (() => {
            const px = (x: number) => 20 + x * 560;
            const py = (v: number) => 140 - (v / yMax) * 122;
            const pvPts = curve.points.map((p) => `${px(p.x).toFixed(1)},${py(p.pv).toFixed(1)}`).join(' ');
            const evPts = curve.points.filter((p) => p.ev != null).map((p) => `${px(p.x).toFixed(1)},${py(p.ev as number).toFixed(1)}`).join(' ');
            const acPts = curve.points.filter((p) => p.ac != null).map((p) => `${px(p.x).toFixed(1)},${py(p.ac as number).toFixed(1)}`).join(' ');
            const eacPts = (curve.eacForecast ?? []).map((p) => `${px(p.x).toFixed(1)},${py(p.ac).toFixed(1)}`).join(' ');
            const tx = px(curve.todayX);
            return (
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: CHART.planned }} />Planned (PV)</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: CHART.earned }} />Earned (EV)</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: CHART.actual }} />Actual (AC)</span>
                  {eacPts && <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t-2 border-dotted" style={{ borderColor: CHART.actual }} />EAC forecast</span>}
                </div>
                <svg viewBox="0 0 600 150" className="w-full" role="img" aria-label="Earned value S-curve: planned value rising to budget, earned value and actual cost to today, and a dashed forecast to estimate at completion">
                  <line x1="20" y1={py(bac).toFixed(1)} x2="580" y2={py(bac).toFixed(1)} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
                  <text x="20" y={(py(bac) - 4).toFixed(1)} fontSize="9" fill="currentColor" fillOpacity="0.5">BAC {money(bac)}</text>
                  <line x1="20" y1="140" x2="580" y2="140" stroke="currentColor" strokeOpacity="0.15" />
                  <line x1={tx} y1="14" x2={tx} y2="140" stroke={CHART.today} strokeOpacity="0.55" strokeWidth="1" />
                  <text x={tx + 3} y="23" fontSize="9" fill={CHART.today}>today</text>
                  <polyline points={pvPts} fill="none" stroke={CHART.planned} strokeWidth="2" strokeDasharray="5 3" />
                  {eacPts && <polyline points={eacPts} fill="none" stroke={CHART.actual} strokeWidth="1.75" strokeDasharray="2 3" opacity="0.8" />}
                  <polyline points={evPts} fill="none" stroke={CHART.earned} strokeWidth="2.5" />
                  <polyline points={acPts} fill="none" stroke={CHART.actual} strokeWidth="2.5" />
                </svg>
              </div>
            );
          })()
        ) : (
          <div className="hidden md:block" />
        )}
      </div>

      {/* Variance · Forecasting · Earned Schedule */}
      <div className="grid grid-cols-1 gap-px border-t bg-border md:grid-cols-3">
        <div className="bg-card px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variance</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <Row label="Cost variance (CV)" value={`${signedMoney(cv)} · ${pct(cvPct, true)}`} cls={varTone(cv)} />
            <Row label="Schedule variance (SV)" value={`${signedMoney(sv)} · ${pct(svPct, true)}`} cls={varTone(sv)} />
            <Row label="% spent vs % complete" value={`${pct(spentPct)} / ${complete_pct.toFixed(0)}%`} cls={spentPct > complete_pct / 100 + 0.02 ? 'text-amber-700' : 'text-foreground'} />
          </div>
        </div>
        <div className="bg-card px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Forecast to complete</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <Row label="EAC range" value={eacLo != null ? `${money(eacLo)} – ${money(eacHi)}` : '—'} sub="CPI · spend · CPI×SPI methods" />
            <Row label="To complete (ETC)" value={money(etc)} />
            <Row label="VAC %" value={pct(vacPct, true)} cls={vacPct != null && vacPct < 0 ? 'text-red-600' : 'text-emerald-700'} />
            <Row label="TCPI (to BAC)" value={num(tcpiBac)} cls={tcpiBac != null && cpi != null && tcpiBac > cpi + 0.05 ? 'text-red-600' : 'text-foreground'} sub="CPI needed on remaining work" />
          </div>
        </div>
        <div className="bg-card px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Earned schedule</p>
          {es ? (
            <div className="mt-2 space-y-1.5 text-sm">
              <Row label="SPI(t) · time-based" value={num(es.spit)} cls={tone(es.spit)} sub="honest schedule index" />
              <Row label="SV(t)" value={weeks(es.svtWeeks)} cls={varTone(es.svtWeeks)} />
              <Row label="Forecast finish" value={shortDate(es.forecastFinishISO)} sub={`contract ${shortDate(es.contractFinishISO)}`} cls={es.svtWeeks < -1 ? 'text-red-600' : es.svtWeeks > 1 ? 'text-emerald-700' : 'text-foreground'} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Needs the schedule dates to compute. SPI(t) corrects SPI&apos;s drift to 1.0 near completion.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, cls = 'text-foreground', sub }: { label: string; value: string; cls?: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-muted-foreground">{label}{sub && <span className="block text-[10px] opacity-70">{sub}</span>}</span>
      <span className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}
