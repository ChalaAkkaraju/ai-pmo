/**
 * Quantitative risk helpers: Expected Monetary Value (EMV), inherent→residual
 * reduction, portfolio exposure, and contingency adequacy. Pure functions over
 * loosely-typed risk rows (the project page passes Array<Record<string,unknown>>).
 */
import { canonicalRiskStatus } from './risk-status';

export interface RiskRow {
  risk_type?: string | null;
  status?: string | null;
  emv_usd?: number | string | null;
  residual_emv_usd?: number | string | null;
  cost_impact_usd?: number | string | null;
  schedule_impact_days?: number | string | null;
  probability_pct?: number | string | null;
  residual_probability_pct?: number | string | null;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** Risks still "in play" — open or actively managed (residual exposure remains). */
export function isLive(status: string | null | undefined): boolean {
  const s = canonicalRiskStatus(status);
  return s === 'Open' || s === 'Active' || s === 'Mitigated';
}

export interface RiskExposure {
  liveThreats: number;
  inherentEmv: number;       // pre-mitigation EMV of live threats
  residualEmv: number;       // post-mitigation EMV of live threats
  reductionPct: number;      // how much mitigation has bought down exposure (0–1)
  opportunityUpside: number; // EMV of opportunities (potential gain)
  realisedCost: number;      // cost_impact of threats that have been Realised
}

export function computeExposure(risks: RiskRow[]): RiskExposure {
  let inherentEmv = 0, residualEmv = 0, opportunityUpside = 0, realisedCost = 0, liveThreats = 0;
  for (const r of risks) {
    const isOpp = (r.risk_type ?? 'threat') === 'opportunity';
    const status = canonicalRiskStatus(r.status);
    if (isOpp) {
      if (status !== 'Not materialised') opportunityUpside += n(r.emv_usd);
      continue;
    }
    if (status === 'Realised') { realisedCost += n(r.cost_impact_usd); continue; }
    if (isLive(r.status)) {
      liveThreats++;
      inherentEmv += n(r.emv_usd);
      residualEmv += n(r.residual_emv_usd);
    }
  }
  const reductionPct = inherentEmv > 0 ? (inherentEmv - residualEmv) / inherentEmv : 0;
  return { liveThreats, inherentEmv, residualEmv, reductionPct, opportunityUpside, realisedCost };
}

export type AdequacyBand = 'Adequate' | 'Tight' | 'Exposed';

export interface ContingencyAdequacy {
  contingency: number;
  consumed: number;
  remaining: number;
  residualExposure: number;
  coverage: number;       // remaining ÷ residual exposure
  band: AdequacyBand;
}

/**
 * Compare contingency remaining against residual EMV exposure.
 *   coverage ≥ 1.0 → Adequate · 0.5–1.0 → Tight · < 0.5 → Exposed
 */
export function contingencyAdequacy(
  residualExposure: number,
  contingency: number,
  consumed: number,
): ContingencyAdequacy {
  const remaining = Math.max(0, contingency - consumed);
  const coverage = residualExposure > 0 ? remaining / residualExposure : Infinity;
  const band: AdequacyBand = coverage >= 1 ? 'Adequate' : coverage >= 0.5 ? 'Tight' : 'Exposed';
  return { contingency, consumed, remaining, residualExposure, coverage, band };
}

/** Compact USD, e.g. $1.2M, $340k, $5,000. */
export function fmtUsd(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v).toLocaleString()}`;
}

export const STRATEGY_FOR: Record<'threat' | 'opportunity', string[]> = {
  threat: ['Avoid', 'Transfer', 'Mitigate', 'Accept', 'Escalate'],
  opportunity: ['Exploit', 'Share', 'Enhance', 'Accept', 'Escalate'],
};
