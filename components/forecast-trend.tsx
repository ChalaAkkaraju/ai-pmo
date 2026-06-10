/**
 * Month-over-month cost & revenue forecast. The main chart is a "margin at
 * complete" band — Contract over EAC, margin shaded between, BAC a faint
 * reference, on a zoomed axis. Directly below it, a transposed month-by-month
 * table (months as columns, aligned with the graph) gives the exact figures. A
 * small recognised-vs-billed line shows revenue timing.
 */
import { eacMovement, type ForecastPoint } from '@/lib/forecast';

const M = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v / 1_000_000).toFixed(1)}M`;
const sM = (v: number) => `${v < 0 ? '−' : '+'}$${Math.abs(v / 1_000_000).toFixed(1)}M`;
const pct = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);
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

export function ForecastTrend({ points }: { points: ForecastPoint[] }) {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const mv = eacMovement(points);
  const marginPct = last.contract > 0 ? (last.margin / last.contract) * 100 : null;

  // ---- main: margin-at-complete band (zoomed axis) ----
  const W = 640, H = 230, ml = 56, mr = 14, mt = 16, mb = 26;
  const ih = H - mt - mb;
  const band = points.flatMap((p) => [p.contract, p.eac, p.bac]);
  let lo = Math.min(...band), hi = Math.max(...band);
  const pad = (hi - lo) * 0.18 || hi * 0.05 || 1;
  lo = Math.max(0, lo - pad); hi = hi + pad;
  const y = (v: number) => mt + ih - ((v - lo) / (hi - lo)) * ih;
  const x = (i: number) => ml + (i + 0.5) * ((W - ml) / points.length);  // band centres, aligned with the table columns
  const poly = (acc: (p: ForecastPoint) => number) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(acc(p)).toFixed(1)}`).join(' ');
  const rev = [...points].reverse();
  const bandPath = poly((p) => p.contract) + ' ' + rev.map((p, j) => `L${x(points.length - 1 - j).toFixed(1)},${y(p.eac).toFixed(1)}`).join(' ') + ' Z';
  const bandFill = last.margin >= 0 ? '#10b981' : '#ef4444';

  // ---- secondary: recognised vs billed (to date) ----
  const W2 = 640, H2 = 96, mt2 = 8, mb2 = 18, ih2 = H2 - mt2 - mb2;
  const rmax = Math.max(1, ...points.map((p) => Math.max(p.recognised, p.billed)));
  const y2 = (v: number) => mt2 + ih2 - (v / rmax) * ih2;
  const poly2 = (acc: (p: ForecastPoint) => number) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y2(acc(p)).toFixed(1)}`).join(' ');

  const rows: Array<{ label: string; cell: (p: ForecastPoint, i: number) => string; cls: (p: ForecastPoint, i: number) => string }> = [
    { label: 'EAC', cell: (p) => M(p.eac), cls: () => '' },
    { label: 'Δ EAC', cell: (p, i) => (i === 0 ? '—' : sM(p.eac - points[i - 1].eac)), cls: (p, i) => (i === 0 ? 'text-muted-foreground' : p.eac - points[i - 1].eac > 0 ? 'text-amber-600' : 'text-emerald-700') },
    { label: 'Contract', cell: (p) => M(p.contract), cls: () => '' },
    { label: 'Margin %', cell: (p) => pct(p.contract > 0 ? (p.margin / p.contract) * 100 : null), cls: (p) => { const m = p.contract > 0 ? (p.margin / p.contract) * 100 : null; return m != null && m < 5 ? 'text-amber-600' : ''; } },
    { label: 'CPI', cell: (p) => (p.cpi == null ? '—' : p.cpi.toFixed(2)), cls: () => '' },
    { label: 'Recognised', cell: (p) => M(p.recognised), cls: () => 'text-muted-foreground' },
    { label: 'Billed', cell: (p) => M(p.billed), cls: () => 'text-muted-foreground' },
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">Cost &amp; revenue forecast — month-end trend</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Forecast margin is the band between contract and EAC; watch it pinch or hold across the closes.</p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell label="EAC (latest close)" value={M(last.eac)} sub={`BAC ${M(last.bac)}`} />
        <Cell label="Variance at complete" value={sM(last.vac)} tone={last.vac < 0 ? 'bad' : 'ok'} />
        <Cell label="Forecast margin" value={pct(marginPct)} tone={marginPct != null && marginPct < 5 ? 'warn' : 'ok'} sub={`contract ${M(last.contract)}`} />
        <Cell label="EAC movement" value={mv ? sM(mv.total) : '—'} tone={mv && mv.total > 0 ? 'warn' : 'ok'} sub={mv ? `scope ${sM(mv.scope)} · perf ${sM(mv.performance)}` : undefined} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Forecast margin band: contract over EAC">
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={ml} y1={mt + ih - g * ih} x2={W - mr} y2={mt + ih - g * ih} stroke="currentColor" strokeOpacity="0.1" />
            <text x={ml - 6} y={mt + ih - g * ih + 3} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="end">{`$${((lo + (hi - lo) * g) / 1_000_000).toFixed(0)}M`}</text>
          </g>
        ))}
        {points.map((p, i) => (<text key={p.period} x={x(i)} y={H - 8} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="middle">{new Date(p.period).toLocaleDateString(undefined, { month: 'short' })}</text>))}
        <path d={bandPath} fill={bandFill} fillOpacity="0.1" stroke="none" />
        <path d={poly((p) => p.bac)} fill="none" stroke="#888780" strokeWidth="1.2" strokeDasharray="4 3" strokeOpacity="0.6" />
        <path d={poly((p) => p.contract)} fill="none" stroke="#378ADD" strokeWidth="2" strokeLinejoin="round" />
        <path d={poly((p) => p.eac)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (<g key={p.period}><circle cx={x(i)} cy={y(p.contract)} r="2.4" fill="#378ADD" /><circle cx={x(i)} cy={y(p.eac)} r="2.4" fill="#ef4444" /></g>))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-0.5 w-4" style={{ background: '#378ADD' }} />Contract (revenue)</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-0.5 w-4" style={{ background: '#ef4444' }} />EAC (cost forecast)</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: bandFill, opacity: 0.25 }} />Forecast margin</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-0.5 w-4" style={{ background: '#888780' }} />Budget (BAC)</span>
      </div>

      {/* month-by-month figures — transposed (months as columns), aligned under the graph */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs tabular-nums" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-1 pr-2 text-left font-medium" style={{ width: `${((ml / W) * 100).toFixed(2)}%` }} />
              {points.map((p, i) => (
                <th key={p.period} className={`py-1 text-center font-medium ${i === points.length - 1 ? 'text-foreground' : ''}`}>{mlabel(p.period)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t even:bg-muted/50">
                <td className="py-1 pr-2 text-left text-[11px] text-muted-foreground">{row.label}</td>
                {points.map((p, i) => (
                  <td key={p.period} className={`py-1 text-center ${row.cls(p, i)} ${i === points.length - 1 ? 'font-semibold' : ''}`}>{row.cell(p, i)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 border-t pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recognised revenue vs billed · to date</p>
        <svg viewBox={`0 0 ${W2} ${H2}`} className="mt-1 w-full" role="img" aria-label="Recognised revenue versus billed to date">
          <line x1={ml} y1={mt2 + ih2} x2={W - mr} y2={mt2 + ih2} stroke="currentColor" strokeOpacity="0.12" />
          <text x={ml - 6} y={mt2 + 8} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="end">{`$${(rmax / 1_000_000).toFixed(0)}M`}</text>
          <path d={poly2((p) => p.recognised)} fill="none" stroke="#639922" strokeWidth="2" strokeLinejoin="round" />
          <path d={poly2((p) => p.billed)} fill="none" stroke="#1D9E75" strokeWidth="1.6" strokeDasharray="4 3" strokeLinejoin="round" />
          {points.map((p, i) => (<text key={p.period} x={x(i)} y={H2 - 5} fontSize="9" fill="currentColor" fillOpacity="0.5" textAnchor="middle">{new Date(p.period).toLocaleDateString(undefined, { month: 'short' })}</text>))}
        </svg>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-0.5 w-4" style={{ background: '#639922' }} />Recognised</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-0.5 w-4" style={{ background: '#1D9E75' }} />Billed</span>
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">net unbilled {M(last.recognised - last.billed)}</span>
        </div>
      </div>

      {mv && (
        <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
          EAC moved <span className={`font-medium ${mv.total > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{sM(mv.total)}</span> at the {new Date(mv.to).toLocaleDateString(undefined, { month: 'short' })} close — {sM(mv.scope)} from approved scope, {sM(mv.performance)} from cost performance.
        </p>
      )}
    </div>
  );
}
