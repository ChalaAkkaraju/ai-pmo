/**
 * Project cash-flow forecast: cumulative cash-in (collections) vs cash-out
 * (payments), with the gap between them shaded as the working-capital / funding
 * exposure. The trough is the peak funding requirement; the crossover is when
 * the project turns cash-positive. Forecast months are dashed beyond "today".
 */
import { deriveCashFlow, type CashFlow } from '@/lib/cash-flow';
import type { ForecastPoint } from '@/lib/forecast';

const M = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v / 1_000_000).toFixed(1)}M`;
const mlabel = (s: string) => new Date(s).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

function Cell({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'bad' }) {
  const t = tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-foreground';
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${t}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function CashFlow({ points, finishIso }: { points: ForecastPoint[]; finishIso: string | null }) {
  const cf: CashFlow | null = deriveCashFlow(points, finishIso);
  if (!cf || cf.series.length < 2) return null;
  const s = cf.series;
  const lastHist = s.map((p) => p.forecast).lastIndexOf(false);

  const W = 640, H = 220, ml = 56, mr = 14, mt = 14, mb = 26;
  const iw = W - ml - mr, ih = H - mt - mb;
  const yMax = Math.max(1, ...s.flatMap((p) => [p.cashInCum, p.cashOutCum]));
  const x = (i: number) => ml + (i / (s.length - 1)) * iw;
  const y = (v: number) => mt + ih - (v / yMax) * ih;
  const seg = (from: number, to: number, acc: (p: CashPoint) => number) => s.slice(from, to + 1).map((p, k) => `${k === 0 ? 'M' : 'L'}${x(from + k).toFixed(1)},${y(acc(p)).toFixed(1)}`).join(' ');
  type CashPoint = (typeof s)[number];
  const band = seg(0, s.length - 1, (p) => p.cashOutCum) + ' ' + [...s].reverse().map((p, j) => `L${x(s.length - 1 - j).toFixed(1)},${y(p.cashInCum).toFixed(1)}`).join(' ') + ' Z';

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">Cash‑flow forecast — funding exposure</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Cumulative cash out (payments) vs cash in (collections); the shaded gap is the working capital you finance.</p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell label="Net cash position" value={M(cf.currentNet)} tone={cf.currentNet < 0 ? 'warn' : 'ok'} sub="collected − paid, to date" />
        <Cell label="Peak funding need" value={M(cf.peakFunding)} tone={cf.peakFunding < 0 ? 'bad' : 'ok'} sub={cf.peakPeriod ? `at ${mlabel(cf.peakPeriod)}` : undefined} />
        <Cell label="Cash‑positive" value={cf.cashPositivePeriod ? mlabel(cf.cashPositivePeriod) : 'after completion'} sub="forecast crossover" />
        <Cell label="Terms (assumed)" value={`${cf.collectLagM}mo / ${cf.payLagM}mo`} sub={`collect / pay · ${cf.retentionPct}% retention`} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Cumulative cash in versus cash out">
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={ml} y1={mt + ih - g * ih} x2={W - mr} y2={mt + ih - g * ih} stroke="currentColor" strokeOpacity="0.1" />
            <text x={ml - 6} y={mt + ih - g * ih + 3} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="end">{`$${((yMax * g) / 1_000_000).toFixed(0)}M`}</text>
          </g>
        ))}
        {s.map((p, i) => (i % Math.ceil(s.length / 6) === 0 || i === s.length - 1) && <text key={p.period} x={x(i)} y={H - 8} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="middle">{new Date(p.period).toLocaleDateString(undefined, { month: 'short' })}</text>)}
        {lastHist >= 0 && lastHist < s.length - 1 && <line x1={x(lastHist)} y1={mt} x2={x(lastHist)} y2={mt + ih} stroke="#ef4444" strokeOpacity="0.4" strokeDasharray="2 2" />}
        <path d={band} fill="#ef4444" fillOpacity="0.08" stroke="none" />
        <path d={seg(0, lastHist, (p) => p.cashOutCum)} fill="none" stroke="#ef4444" strokeWidth="2" />
        {lastHist < s.length - 1 && <path d={seg(lastHist, s.length - 1, (p) => p.cashOutCum)} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 3" />}
        <path d={seg(0, lastHist, (p) => p.cashInCum)} fill="none" stroke="#639922" strokeWidth="2" />
        {lastHist < s.length - 1 && <path d={seg(lastHist, s.length - 1, (p) => p.cashInCum)} fill="none" stroke="#639922" strokeWidth="2" strokeDasharray="4 3" />}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-0.5 w-4" style={{ background: '#639922' }} />Cash in (collections)</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-0.5 w-4" style={{ background: '#ef4444' }} />Cash out (payments)</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: '#ef4444', opacity: 0.18 }} />Funding exposure</span>
        <span className="ml-auto text-[11px] text-muted-foreground">dashed = forecast</span>
      </div>
    </div>
  );
}
