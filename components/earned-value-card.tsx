/**
 * Earned-value dashboard card — Phase 3 flagship. Display only; metrics are
 * computed server-side by lib/earned-value. Compact two-column layout: the
 * BAC/PV/EV/AC + CPI/SPI/EAC/VAC KPIs on the left, the earned-value S-curve
 * (PV rising to BAC, EV/AC up to today) on the right.
 */

import type { EvMetrics, EvCurve } from '@/lib/earned-value';

function money(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(2)}M`;
}
function num(n: number | null): string {
  return n == null ? '—' : n.toFixed(2);
}

export function EarnedValueCard({ metrics, syncedAt, curve }: { metrics: EvMetrics; syncedAt: string | null; curve: EvCurve | null }) {
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

  const { bac, pv, ev, ac, cpi, spi, eac, vac, complete_pct } = metrics;
  const costState = cpi == null ? null : cpi < 0.97 ? 'over cost' : cpi > 1.03 ? 'under cost' : 'on budget';
  const schedState = spi == null ? null : spi < 0.97 ? 'behind schedule' : spi > 1.03 ? 'ahead of schedule' : 'on schedule';
  const trouble = (cpi != null && cpi < 0.97) || (spi != null && spi < 0.97);
  const great = cpi != null && cpi >= 1.0 && spi != null && spi >= 1.0;
  const chipCls = trouble ? 'bg-red-100 text-red-800' : great ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
  const readout = [schedState, costState].filter(Boolean).join(' · ') || 'in progress';

  const tone = (v: number | null, warnBelow = 0.95) =>
    v == null ? 'text-foreground' : v < warnBelow ? 'text-red-600' : v >= 1.0 ? 'text-emerald-700' : 'text-amber-700';

  const Metric = ({ label, value, cls = 'text-foreground', accent }: { label: string; value: string; cls?: string; accent?: string }) => (
    <div className="rounded-md bg-muted/40 px-3 py-1.5" style={accent ? { backgroundColor: `${accent}1A` } : undefined}>
      <p className={`text-[10px] font-medium uppercase tracking-wider ${accent ? '' : 'text-muted-foreground'}`} style={accent ? { color: accent } : undefined}>{label}</p>
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{value}</p>
    </div>
  );

  return (
    <section className="mt-6 overflow-hidden rounded-lg border bg-gradient-to-br from-emerald-50/40 via-card to-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">📈</span>
          <div>
            <p className="text-sm font-semibold">Earned value</p>
            <p className="text-xs text-muted-foreground">{complete_pct.toFixed(0)}% complete · cost from SAP PS, progress from the scheduler</p>
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
          <Metric label="Planned (PV)" value={money(pv)} accent="#378ADD" />
          <Metric label="Earned (EV)" value={money(ev)} accent="#639922" />
          <Metric label="Actual (AC)" value={money(ac)} accent="#BA7517" />
          <Metric label="CPI · cost" value={num(cpi)} cls={tone(cpi)} />
          <Metric label="SPI · schedule" value={num(spi)} cls={tone(spi)} />
          <Metric label="Forecast (EAC)" value={money(eac)} />
          <Metric label="Variance (VAC)" value={money(vac)} cls={vac != null && vac < 0 ? 'text-red-600' : 'text-emerald-700'} />
        </div>

        {curve && curve.bac > 0 ? (
          (() => {
            const px = (x: number) => 20 + x * 560;
            const py = (v: number) => 140 - (v / curve.bac) * 122;
            const pvPts = curve.points.map((p) => `${px(p.x).toFixed(1)},${py(p.pv).toFixed(1)}`).join(' ');
            const evPts = curve.points.filter((p) => p.ev != null).map((p) => `${px(p.x).toFixed(1)},${py(p.ev as number).toFixed(1)}`).join(' ');
            const acPts = curve.points.filter((p) => p.ac != null).map((p) => `${px(p.x).toFixed(1)},${py(p.ac as number).toFixed(1)}`).join(' ');
            const tx = px(curve.todayX);
            return (
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: '#378ADD' }} />Planned (PV)</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: '#639922' }} />Earned (EV)</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: '#BA7517' }} />Actual (AC)</span>
                </div>
                <svg viewBox="0 0 600 150" className="w-full" role="img" aria-label="Earned value S-curve: planned value rising to budget, with earned value and actual cost up to today">
                  <line x1="20" y1="18" x2="580" y2="18" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
                  <text x="20" y="12" fontSize="9" fill="currentColor" fillOpacity="0.5">BAC {money(curve.bac)}</text>
                  <line x1="20" y1="140" x2="580" y2="140" stroke="currentColor" strokeOpacity="0.15" />
                  <line x1={tx} y1="18" x2={tx} y2="140" stroke="#DC2626" strokeOpacity="0.55" strokeWidth="1" />
                  <text x={tx + 3} y="27" fontSize="9" fill="#DC2626">today</text>
                  <polyline points={pvPts} fill="none" stroke="#378ADD" strokeWidth="2" strokeDasharray="5 3" />
                  <polyline points={evPts} fill="none" stroke="#639922" strokeWidth="2.5" />
                  <polyline points={acPts} fill="none" stroke="#BA7517" strokeWidth="2.5" />
                </svg>
              </div>
            );
          })()
        ) : (
          <div className="hidden md:block" />
        )}
      </div>
    </section>
  );
}
