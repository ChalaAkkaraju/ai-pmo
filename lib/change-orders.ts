/**
 * Change-order derivations — pure functions over the change_orders rows.
 * Money fields (cost_impact_m / revenue_impact_m) are already in $millions;
 * margin_realized_pct is a percentage. Everything here is derived (no I/O, no
 * new data): a summary rollup, the status pipeline, margin-impact analysis, and
 * a by-driver breakdown. Rejected COs are excluded from the "change book"
 * totals but kept visible in the pipeline.
 */

export type CoLike = Record<string, unknown>;
const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => (v == null ? '' : String(v));

export const CO_STAGES = ['Anticipated', 'Under analysis', 'Priced', 'Executed', 'Complete'] as const;
const APPROVED = new Set(['Executed', 'Complete']);
const OPEN = new Set(['Anticipated', 'Under analysis', 'Priced']);

export type CoOutcome = 'funded' | 'absorbed' | 'open' | 'withdrawn';
/** Resolve a change/trend status to its commercial outcome. */
export function classifyOutcome(status: string): CoOutcome {
  if (status === 'Executed' || status === 'Complete') return 'funded';
  if (status === 'Absorbed') return 'absorbed';
  if (status === 'Rejected' || status === 'Withdrawn') return 'withdrawn';
  return 'open';
}

/** Bucket a free-text driver into a canonical category. */
export function categorizeDriver(driver: string): string {
  const d = driver.toLowerCase();
  if (/site|ground|geotech|condition|unforeseen|weather|access/.test(d)) return 'Site conditions';
  if (/regulat|permit|environment|complian|statutory|consent/.test(d)) return 'Regulatory & permits';
  if (/estimat|productiv|overrun|underperform|rework/.test(d)) return 'Estimating & productivity';
  if (/design|engineer|error|omission|technical|interface/.test(d)) return 'Design development';
  if (/owner|client|scope|request|addition|extra|enhance|upgrade/.test(d)) return 'Client-directed scope';
  if (/supplier|vendor|procure|material|escalat|price|currency/.test(d)) return 'Supply & escalation';
  return 'Other';
}

export interface CoSummary {
  count: number;
  executed: number;
  pending: number;
  rejected: number;
  totalCostM: number;
  totalRevenueM: number;
  netMarginM: number;
  blendedMarginPct: number | null;
  scheduleDays: number;
  soldContractM: number;
  revisedContractM: number;
  contractGrowthPct: number | null;
  fundedCount: number;
  absorbedCount: number;
  openCount: number;
  fundedRevenueM: number;
  absorbedCostM: number;
  openRevenueM: number;
  expectedRecoveryM: number;
  revenueAtRiskM: number;
  avgRecoveryPct: number | null;
}

function active(cos: CoLike[]) {
  // Real changes (cost forecast now): funded + absorbed + open trends. Withdrawn = no impact.
  return cos.filter((c) => classifyOutcome(str(c.status)) !== 'withdrawn');
}

export function summarizeChangeOrders(cos: CoLike[], soldContract: number): CoSummary {
  const a = active(cos);
  const totalCostM = a.reduce((s, c) => s + num(c.cost_impact_m), 0);
  const totalRevenueM = a.reduce((s, c) => s + num(c.revenue_impact_m), 0);
  const approvedRevM = cos.filter((c) => APPROVED.has(str(c.status))).reduce((s, c) => s + num(c.revenue_impact_m), 0);
  const soldM = soldContract / 1_000_000;
  const funded = cos.filter((c) => classifyOutcome(str(c.status)) === 'funded');
  const absorbed = cos.filter((c) => classifyOutcome(str(c.status)) === 'absorbed');
  const open = cos.filter((c) => classifyOutcome(str(c.status)) === 'open');
  const openRevenueM = open.reduce((s, c) => s + num(c.revenue_impact_m), 0);
  const expectedRecoveryM = open.reduce((s, c) => s + num(c.revenue_impact_m) * (num(c.recovery_confidence) / 100), 0);
  return {
    count: cos.length,
    executed: funded.length,
    pending: open.length,
    rejected: cos.filter((c) => classifyOutcome(str(c.status)) === 'withdrawn').length,
    totalCostM,
    totalRevenueM,
    netMarginM: totalRevenueM - totalCostM,
    blendedMarginPct: totalRevenueM > 0 ? ((totalRevenueM - totalCostM) / totalRevenueM) * 100 : null,
    scheduleDays: a.reduce((s, c) => s + num(c.schedule_impact_days), 0),
    soldContractM: soldM,
    revisedContractM: soldM + approvedRevM,
    contractGrowthPct: soldM > 0 ? (approvedRevM / soldM) * 100 : null,
    fundedCount: funded.length,
    absorbedCount: absorbed.length,
    openCount: open.length,
    fundedRevenueM: funded.reduce((s, c) => s + num(c.revenue_impact_m), 0),
    absorbedCostM: absorbed.reduce((s, c) => s + num(c.cost_impact_m), 0),
    openRevenueM,
    expectedRecoveryM,
    revenueAtRiskM: openRevenueM - expectedRecoveryM,
    avgRecoveryPct: openRevenueM > 0 ? (expectedRecoveryM / openRevenueM) * 100 : null,
  };
}

export interface CoStage {
  stage: string;
  count: number;
  revenueM: number;
  costM: number;
}
export function pipelineStages(cos: CoLike[]): CoStage[] {
  return CO_STAGES.map((stage) => {
    const inStage = cos.filter((c) => str(c.status) === stage);
    return {
      stage,
      count: inStage.length,
      revenueM: inStage.reduce((s, c) => s + num(c.revenue_impact_m), 0),
      costM: inStage.reduce((s, c) => s + num(c.cost_impact_m), 0),
    };
  });
}

export interface CoMarginImpact {
  baseMarginPct: number;
  blendedChangeMarginPct: number | null;
  accretive: boolean;
  deltaPct: number | null;
  cumulativeRevenueM: number;
  cumulativeCostM: number;
  dilutive: Array<{ co_id: string; marginPct: number; revenueM: number }>;
}
export function marginImpact(cos: CoLike[], baseMarginPct: number): CoMarginImpact {
  const a = active(cos);
  const rev = a.reduce((s, c) => s + num(c.revenue_impact_m), 0);
  const cost = a.reduce((s, c) => s + num(c.cost_impact_m), 0);
  const blended = rev > 0 ? ((rev - cost) / rev) * 100 : null;
  const dilutive = a
    .filter((c) => num(c.margin_realized_pct) < baseMarginPct)
    .map((c) => ({ co_id: str(c.co_id), marginPct: num(c.margin_realized_pct), revenueM: num(c.revenue_impact_m) }))
    .sort((x, y) => x.marginPct - y.marginPct);
  return {
    baseMarginPct,
    blendedChangeMarginPct: blended,
    accretive: blended != null && blended >= baseMarginPct,
    deltaPct: blended != null ? blended - baseMarginPct : null,
    cumulativeRevenueM: rev,
    cumulativeCostM: cost,
    dilutive,
  };
}

export interface CoDriverRow {
  category: string;
  count: number;
  costM: number;
  revenueM: number;
  scheduleDays: number;
}
export function byDriver(cos: CoLike[]): CoDriverRow[] {
  const m = new Map<string, CoDriverRow>();
  for (const c of active(cos)) {
    const cat = categorizeDriver(str(c.driver));
    const r = m.get(cat) ?? { category: cat, count: 0, costM: 0, revenueM: 0, scheduleDays: 0 };
    r.count++;
    r.costM += num(c.cost_impact_m);
    r.revenueM += num(c.revenue_impact_m);
    r.scheduleDays += num(c.schedule_impact_days);
    m.set(cat, r);
  }
  return [...m.values()].sort((a, b) => b.revenueM - a.revenueM);
}
