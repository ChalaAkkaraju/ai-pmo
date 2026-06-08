/**
 * Results Analysis — the EXTERNAL / financial revenue view. Pure computation.
 * Independent of earned value by design: recognised revenue is the posted RA
 * figure (its own POC), not EV ÷ BAC × contract. Reconciled against billing to
 * give WIP (revenue in excess of billings — a contract asset) or deferred
 * revenue (billings in excess — a contract liability). Keyed to WBS phase.
 */

const n = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export interface RaRow {
  wbs_code?: string | null;
  ra_method?: string | null;
  poc_pct?: number | string | null;
  planned_cost?: number | string | null;
  planned_revenue?: number | string | null;
  cost_of_sales?: number | string | null;
  calculated_revenue?: number | string | null;
  recognized_margin?: number | string | null;
  reserve?: number | string | null;
}

export interface RaPhase {
  phase: string;
  poc: number;
  recognised: number;
  costOfSales: number;
  margin: number;
  marginPct: number | null;
  billed: number;
  net: number; // recognised − billed: >0 = unbilled WIP, <0 = deferred / over-billed
}

export interface RaSummary {
  method: string;
  recognisedRevenue: number;
  costOfSales: number;
  recognisedMargin: number;
  marginPct: number | null;
  billed: number;
  wip: number;        // recognised in excess of billings (contract asset)
  deferred: number;   // billings in excess of recognised (contract liability)
  byPhase: RaPhase[];
  ready: boolean;
}

export function computeResultsAnalysis(rows: RaRow[], billingByPhase: { phase: string; amount: number }[]): RaSummary {
  const billedByPhase = new Map(billingByPhase.map((b) => [b.phase, b.amount]));
  let recognisedRevenue = 0, costOfSales = 0, recognisedMargin = 0, billed = 0;
  const byPhase: RaPhase[] = rows.map((r) => {
    const phase = String(r.wbs_code ?? '');
    const recognised = n(r.calculated_revenue);
    const cos = n(r.cost_of_sales);
    const margin = n(r.recognized_margin);
    const ph_billed = billedByPhase.get(phase) ?? 0;
    recognisedRevenue += recognised; costOfSales += cos; recognisedMargin += margin; billed += ph_billed;
    return {
      phase, poc: n(r.poc_pct), recognised, costOfSales: cos, margin,
      marginPct: recognised > 0 ? margin / recognised : null,
      billed: ph_billed, net: recognised - ph_billed,
    };
  }).sort((a, b) => a.phase.localeCompare(b.phase));

  // Any billing on phases with no RA row still counts toward total billed.
  for (const b of billingByPhase) {
    if (!rows.some((r) => String(r.wbs_code ?? '') === b.phase)) billed += b.amount;
  }

  const net = recognisedRevenue - billed;
  return {
    method: String(rows[0]?.ra_method ?? 'Cost-based POC'),
    recognisedRevenue, costOfSales, recognisedMargin,
    marginPct: recognisedRevenue > 0 ? recognisedMargin / recognisedRevenue : null,
    billed,
    wip: Math.max(0, net),
    deferred: Math.max(0, -net),
    byPhase,
    ready: rows.length > 0,
  };
}
