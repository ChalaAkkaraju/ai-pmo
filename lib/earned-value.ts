/**
 * Earned-value engine — Phase 3. Pure computation, no I/O.
 *
 * Joins the three systems by WBS code:
 *   BAC  = budget per work package (from SAP PS / WBS)
 *   EV   = % complete (from the scheduler) × budget per work package
 *   PV   = planned value, and AC = actual cost (from SAP PS cost actuals)
 * → CPI, SPI, EAC, VAC. This is the one number no single system produces.
 */

export interface EvLeaf {
  wbs_code: string;
  budget_bac: number | null;
}
export interface EvTask {
  wbs_code: string | null;
  percent_complete: number | null;
}
export interface EvCost {
  actual_cost: number | null;
  planned_value: number | null;
}

export interface EvMetrics {
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  vac: number | null;
  complete_pct: number;
  /** True once there is enough data (a budget and some cost) to compute EV. */
  ready: boolean;
}

export function computeEv(leaves: EvLeaf[], tasks: EvTask[], cost: EvCost[]): EvMetrics {
  const pctByWbs = new Map<string, number>();
  for (const t of tasks) {
    if (t.wbs_code) pctByWbs.set(t.wbs_code, Number(t.percent_complete) || 0);
  }

  let bac = 0;
  let ev = 0;
  for (const w of leaves) {
    const b = Number(w.budget_bac) || 0;
    bac += b;
    ev += ((pctByWbs.get(w.wbs_code) ?? 0) / 100) * b;
  }

  const ac = cost.reduce((a, c) => a + (Number(c.actual_cost) || 0), 0);
  const pv = cost.reduce((a, c) => a + (Number(c.planned_value) || 0), 0);

  const cpi = ac > 0 ? ev / ac : null;
  const spi = pv > 0 ? ev / pv : null;
  const eac = cpi && cpi > 0 ? bac / cpi : null;
  const vac = eac != null ? bac - eac : null;
  const complete_pct = bac > 0 ? (ev / bac) * 100 : 0;

  return { bac, pv, ev, ac, cpi, spi, eac, vac, complete_pct, ready: bac > 0 && ac > 0 };
}
