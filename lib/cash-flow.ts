/**
 * Cash-flow forecast — derived (no new data) from the month-end forecast
 * snapshots plus the project finish. Cash OUT = cumulative cost paid (AC to
 * date, then ramping to EAC by finish) lagged by payment terms; cash IN =
 * cumulative billing collected (billed to date, then ramping to contract net of
 * retention) lagged by collection terms. The gap between them is the working-
 * capital / funding exposure; the trough is the peak funding requirement.
 */
import type { ForecastPoint } from './forecast';

export interface CashPoint { period: string; cashInCum: number; cashOutCum: number; net: number; forecast: boolean; }
export interface CashFlow {
  series: CashPoint[];
  currentNet: number;
  peakFunding: number;            // most negative net (max financing need, <= 0)
  peakPeriod: string | null;
  cashPositivePeriod: string | null;
  payLagM: number; collectLagM: number; retentionPct: number;
}

const monthStartStr = (s: string) => { const d = new Date(s); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const addMonths = (period: string, n: number) => { const d = new Date(period + 'T00:00:00'); return new Date(d.getFullYear(), d.getMonth() + n, 1).toISOString().slice(0, 10); };
const monthsBetween = (a: string, b: string) => { const da = new Date(a), db = new Date(b); return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()); };
const smooth = (t: number) => t * t * (3 - 2 * t);

export function deriveCashFlow(points: ForecastPoint[], finishIso: string | null, opts?: { payLagM?: number; collectLagM?: number; retentionPct?: number }): CashFlow | null {
  if (points.length < 2) return null;
  const payLagM = opts?.payLagM ?? 1;
  const collectLagM = opts?.collectLagM ?? 2;
  const retentionPct = opts?.retentionPct ?? 5;
  const retention = retentionPct / 100;

  const last = points[points.length - 1];
  const startP = points[0].period;
  const finishP = finishIso ? monthStartStr(finishIso) : null;
  const endP = finishP && monthsBetween(last.period, finishP) > 1 ? finishP : addMonths(last.period, 6);
  const nMonths = Math.max(points.length, monthsBetween(startP, endP) + 1);
  const lastHistIdx = monthsBetween(startP, last.period);
  const fwdCount = (nMonths - 1) - lastHistIdx;

  const histByPeriod = new Map(points.map((p) => [p.period, p]));
  const contractNet = last.contract * (1 - retention);

  const periods: string[] = [], cumCost: number[] = [], cumBill: number[] = [], fwd: boolean[] = [];
  for (let m = 0; m < nMonths; m++) {
    const period = addMonths(startP, m);
    periods.push(period);
    const h = histByPeriod.get(period);
    if (h && m <= lastHistIdx) { cumCost.push(h.ac); cumBill.push(h.billed); fwd.push(false); }
    else {
      const t = fwdCount > 0 ? smooth((m - lastHistIdx) / fwdCount) : 1;
      cumCost.push(last.ac + (last.eac - last.ac) * t);
      cumBill.push(last.billed + (contractNet - last.billed) * t);
      fwd.push(true);
    }
  }

  const series: CashPoint[] = periods.map((period, m) => {
    const cashOutCum = cumCost[Math.max(0, m - payLagM)];
    const cashInCum = cumBill[Math.max(0, m - collectLagM)];
    return { period, cashInCum, cashOutCum, net: cashInCum - cashOutCum, forecast: fwd[m] };
  });

  let peakFunding = 0, peakPeriod: string | null = null;
  for (const s of series) if (s.net < peakFunding) { peakFunding = s.net; peakPeriod = s.period; }
  const peakIdx = peakPeriod ? series.findIndex((s) => s.period === peakPeriod) : 0;
  let cashPositivePeriod: string | null = null;
  for (let i = peakIdx; i < series.length; i++) if (series[i].net >= 0) { cashPositivePeriod = series[i].period; break; }
  const currentNet = series[lastHistIdx >= 0 ? lastHistIdx : series.length - 1].net;

  return { series, currentNet, peakFunding, peakPeriod, cashPositivePeriod, payLagM, collectLagM, retentionPct };
}

/* ---- Portfolio aggregation (sum each project's cumulative curve per calendar month) ---- */

export interface CashAgg {
  periods: string[];
  cashInCum: number[];
  cashOutCum: number[];
  net: number[];
  lastHistIdx: number;
  currentNet: number;
  peakFunding: number;
  peakPeriod: string | null;
  cashPositivePeriod: string | null;
}

function evalAt(series: CashPoint[], period: string, key: 'cashInCum' | 'cashOutCum'): number {
  if (!series.length || period < series[0].period) return 0;
  let v = 0;
  for (const p of series) { if (p.period <= period) v = p[key]; else break; }
  return v;
}

/** Roll up many projects' cash curves onto a shared monthly timeline. */
export function aggregateCashFlow(items: Array<{ series: CashPoint[] }>): CashAgg | null {
  const ps = new Set<string>();
  let boundary = '';
  for (const it of items) {
    for (const p of it.series) {
      ps.add(p.period);
      if (!p.forecast && p.period > boundary) boundary = p.period;
    }
  }
  const periods = [...ps].sort();
  if (periods.length < 2) return null;

  const cashInCum: number[] = [], cashOutCum: number[] = [], net: number[] = [];
  for (const period of periods) {
    let inc = 0, out = 0;
    for (const it of items) { inc += evalAt(it.series, period, 'cashInCum'); out += evalAt(it.series, period, 'cashOutCum'); }
    cashInCum.push(inc); cashOutCum.push(out); net.push(inc - out);
  }

  let lastHistIdx = periods.findIndex((p) => p > boundary) - 1;
  if (lastHistIdx < 0) lastHistIdx = periods.length - 1;

  let peakFunding = 0, peakPeriod: string | null = null;
  net.forEach((n, i) => { if (n < peakFunding) { peakFunding = n; peakPeriod = periods[i]; } });
  const peakI = peakPeriod ? periods.indexOf(peakPeriod) : 0;
  let cashPositivePeriod: string | null = null;
  for (let i = peakI; i < net.length; i++) if (net[i] >= 0) { cashPositivePeriod = periods[i]; break; }

  return { periods, cashInCum, cashOutCum, net, lastHistIdx, currentNet: net[Math.max(0, lastHistIdx)], peakFunding, peakPeriod, cashPositivePeriod };
}
