'use client';

/**
 * Portfolio cash-flow explorer with drill-down: Portfolio -> segment -> project.
 * Each level is a rolled-up CashAgg (cumulative cash in vs out, funding gap
 * shaded). Click a segment, then a project, to drill; breadcrumb to climb back.
 */
import { useState } from 'react';
import type { CashAgg } from '@/lib/cash-flow';

const M = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v / 1_000_000).toFixed(1)}M`;
const mlabel = (s: string) => new Date(s).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface SegEntry { segment: string; agg: CashAgg; projects: Array<{ code: string; name: string; agg: CashAgg }>; }

function KCell({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'bad' }) {
  const t = tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-foreground';
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${t}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
function Leg({ c, t }: { c: string; t: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-0.5 w-4" style={{ background: c }} />{t}</span>;
}

function CurveChart({ agg }: { agg: CashAgg }) {
  const W = 720, H = 230, ml = 58, mr = 16, mt = 14, mb = 28;
  const iw = W - ml - mr, ih = H - mt - mb;
  const n = agg.periods.length;
  const yMax = Math.max(1, ...agg.cashInCum, ...agg.cashOutCum);
  const x = (i: number) => ml + (n === 1 ? 0 : (i / (n - 1)) * iw);
  const y = (v: number) => mt + ih - (v / yMax) * ih;
  const seg = (from: number, to: number, arr: number[]) => arr.slice(from, to + 1).map((v, k) => `${k === 0 ? 'M' : 'L'}${x(from + k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lh = Math.max(0, Math.min(agg.lastHistIdx, n - 1));
  const band = seg(0, n - 1, agg.cashOutCum) + ' ' + [...agg.cashInCum].reverse().map((v, j) => `L${x(n - 1 - j).toFixed(1)},${y(v).toFixed(1)}`).join(' ') + ' Z';
  const step = Math.max(1, Math.ceil(n / 7));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative cash in versus out">
      {[0, 0.5, 1].map((g) => (<g key={g}><line x1={ml} y1={mt + ih - g * ih} x2={W - mr} y2={mt + ih - g * ih} stroke="currentColor" strokeOpacity="0.1" /><text x={ml - 6} y={mt + ih - g * ih + 3} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="end">{`$${((yMax * g) / 1_000_000).toFixed(0)}M`}</text></g>))}
      {agg.periods.map((p, i) => (i % step === 0 || i === n - 1) && <text key={p} x={x(i)} y={H - 8} fontSize="9" fill="currentColor" fillOpacity="0.55" textAnchor="middle">{new Date(p).toLocaleDateString(undefined, { month: 'short' })}</text>)}
      {lh < n - 1 && <line x1={x(lh)} y1={mt} x2={x(lh)} y2={mt + ih} stroke="#ef4444" strokeOpacity="0.4" strokeDasharray="2 2" />}
      <path d={band} fill="#ef4444" fillOpacity="0.08" />
      <path d={seg(0, lh, agg.cashOutCum)} fill="none" stroke="#ef4444" strokeWidth="2" />
      {lh < n - 1 && <path d={seg(lh, n - 1, agg.cashOutCum)} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 3" />}
      <path d={seg(0, lh, agg.cashInCum)} fill="none" stroke="#639922" strokeWidth="2" />
      {lh < n - 1 && <path d={seg(lh, n - 1, agg.cashInCum)} fill="none" stroke="#639922" strokeWidth="2" strokeDasharray="4 3" />}
    </svg>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ key: string; label: string; sub: string; peak: number; net: number; onClick: () => void }> }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="divide-y">
        {rows.map((r) => (
          <button key={r.key} type="button" onClick={r.onClick} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-muted/40">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.label}</p>
              <p className="truncate text-xs text-muted-foreground">{r.sub}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Peak funding</p>
              <p className={`font-mono text-sm font-semibold tabular-nums ${r.peak < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{M(r.peak)}</p>
            </div>
            <div className="w-24 shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net now</p>
              <p className={`font-mono text-sm tabular-nums ${r.net < 0 ? 'text-amber-600' : 'text-emerald-700'}`}>{M(r.net)}</p>
            </div>
            <span className="text-muted-foreground/50">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type Sel = { level: 'portfolio' } | { level: 'segment'; seg: string } | { level: 'project'; seg: string; code: string };

export function CashFlowExplorer({ portfolio, segments }: { portfolio: CashAgg; segments: SegEntry[] }) {
  const [sel, setSel] = useState<Sel>({ level: 'portfolio' });
  const segEntry = sel.level !== 'portfolio' ? segments.find((s) => s.segment === sel.seg) : null;
  const projEntry = sel.level === 'project' && segEntry ? segEntry.projects.find((p) => p.code === sel.code) : null;
  const agg = sel.level === 'portfolio' ? portfolio : sel.level === 'segment' ? (segEntry?.agg ?? portfolio) : (projEntry?.agg ?? portfolio);
  const title = sel.level === 'portfolio' ? 'Portfolio' : sel.level === 'segment' ? cap(sel.seg) : (projEntry?.code ?? '');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-sm">
        <button type="button" onClick={() => setSel({ level: 'portfolio' })} className={`hover:underline ${sel.level === 'portfolio' ? 'font-semibold' : 'text-muted-foreground'}`}>Portfolio</button>
        {sel.level !== 'portfolio' && (<><span className="text-muted-foreground">/</span><button type="button" onClick={() => setSel({ level: 'segment', seg: sel.seg })} className={`hover:underline ${sel.level === 'segment' ? 'font-semibold' : 'text-muted-foreground'}`}>{cap(sel.seg)}</button></>)}
        {sel.level === 'project' && (<><span className="text-muted-foreground">/</span><span className="font-semibold">{projEntry?.code}</span></>)}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KCell label="Net cash position" value={M(agg.currentNet)} tone={agg.currentNet < 0 ? 'warn' : 'ok'} sub="collected − paid, to date" />
        <KCell label="Peak funding need" value={M(agg.peakFunding)} tone={agg.peakFunding < 0 ? 'bad' : 'ok'} sub={agg.peakPeriod ? `at ${mlabel(agg.peakPeriod)}` : undefined} />
        <KCell label="Cash-positive" value={agg.cashPositivePeriod ? mlabel(agg.cashPositivePeriod) : 'after completion'} sub="forecast crossover" />
        <KCell label={title} value={M(agg.cashOutCum[agg.cashOutCum.length - 1])} sub={sel.level === 'portfolio' ? `${segments.length} segments · total spend at complete` : sel.level === 'segment' ? `${segEntry?.projects.length} projects · spend at complete` : 'spend at complete'} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <CurveChart agg={agg} />
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <Leg c="#639922" t="Cash in (collections)" /><Leg c="#ef4444" t="Cash out (payments)" />
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: '#ef4444', opacity: 0.18 }} />Funding exposure</span>
          <span className="ml-auto text-[11px] text-muted-foreground">dashed = forecast</span>
        </div>
      </div>

      {sel.level === 'portfolio' && (
        <Breakdown title="By segment — click to drill" rows={[...segments].sort((a, b) => a.agg.peakFunding - b.agg.peakFunding).map((s) => ({ key: s.segment, label: cap(s.segment), sub: `${s.projects.length} projects`, peak: s.agg.peakFunding, net: s.agg.currentNet, onClick: () => setSel({ level: 'segment', seg: s.segment }) }))} />
      )}
      {sel.level === 'segment' && segEntry && (
        <Breakdown title={`${cap(sel.seg)} · projects — click to drill`} rows={[...segEntry.projects].sort((a, b) => a.agg.peakFunding - b.agg.peakFunding).map((p) => ({ key: p.code, label: p.code, sub: p.name, peak: p.agg.peakFunding, net: p.agg.currentNet, onClick: () => setSel({ level: 'project', seg: (sel as { seg: string }).seg, code: p.code }) }))} />
      )}
    </div>
  );
}
