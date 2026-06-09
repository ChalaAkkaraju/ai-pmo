/**
 * Forecast-trend derivations over month-end snapshots (forecast_snapshots).
 * Pure functions. The series gives the month-over-month EAC and recognised-
 * revenue trajectory; eacMovement decomposes the latest period's EAC change
 * into a scope component (budget growth from approved changes) and a cost-
 * performance component (the residual) — the monthly "EAC movement bridge".
 */
const n = (v: unknown) => Number(v) || 0;

export interface ForecastPoint {
  period: string;
  bac: number; ev: number; ac: number; eac: number; etc: number; vac: number;
  cpi: number | null; spi: number | null;
  contract: number; poc: number | null; recognised: number; billed: number; margin: number;
}

export function parseForecast(rows: Array<Record<string, unknown>>): ForecastPoint[] {
  return rows
    .map((r) => ({
      period: String(r.period),
      bac: n(r.bac), ev: n(r.ev), ac: n(r.ac), eac: n(r.eac), etc: n(r.etc), vac: n(r.vac),
      cpi: r.cpi == null ? null : n(r.cpi), spi: r.spi == null ? null : n(r.spi),
      contract: n(r.contract_value), poc: r.poc_pct == null ? null : n(r.poc_pct),
      recognised: n(r.recognised_revenue), billed: n(r.billed), margin: n(r.forecast_margin),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export interface EacMovement {
  from: string; to: string;
  prevEac: number; eac: number;
  total: number; scope: number; performance: number;
  prevMarginPct: number | null; marginPct: number | null;
}

/** Decompose the most recent period's EAC change vs the prior close. */
export function eacMovement(p: ForecastPoint[]): EacMovement | null {
  if (p.length < 2) return null;
  const a = p[p.length - 2];
  const b = p[p.length - 1];
  const total = b.eac - a.eac;
  // Scope = budget growth (approved changes) carried at the prior cost rate;
  // performance = whatever remains (the run-rate efficiency shift).
  const scope = (b.bac - a.bac) / (a.cpi || 1);
  const performance = total - scope;
  return {
    from: a.period, to: b.period,
    prevEac: a.eac, eac: b.eac,
    total, scope, performance,
    prevMarginPct: a.contract > 0 ? (a.margin / a.contract) * 100 : null,
    marginPct: b.contract > 0 ? (b.margin / b.contract) * 100 : null,
  };
}
