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

export interface EvTaskDated {
  wbs_code: string | null;
  start_date: string | null;
  finish_date: string | null;
}
export interface EvCurvePoint {
  x: number; // 0..1 across the timeline
  pv: number;
  ev: number | null; // only up to today
  ac: number | null;
}
export interface EvCurve {
  points: EvCurvePoint[];
  todayX: number;
  bac: number;
}

/**
 * Build the earned-value S-curve. PV is computed from the task schedule
 * (cumulative planned value over time → BAC). We only have an as-of snapshot
 * for EV/AC, so they are modelled as tracking PV at the project's SPI (and
 * AC = EV / CPI) up to today — which lands them exactly on the current EV/AC.
 */
export function evCurve(leaves: EvLeaf[], tasks: EvTaskDated[], spi: number | null, cpi: number | null): EvCurve | null {
  const bacByWbs = new Map(leaves.map((l) => [l.wbs_code, Number(l.budget_bac) || 0]));
  const segs = tasks
    .map((t) => ({ s: t.start_date ? Date.parse(t.start_date) : NaN, f: t.finish_date ? Date.parse(t.finish_date) : NaN, bac: bacByWbs.get(t.wbs_code ?? '') || 0 }))
    .filter((x) => !Number.isNaN(x.s) && !Number.isNaN(x.f) && x.f > x.s);
  if (segs.length === 0) return null;

  const t0 = Math.min(...segs.map((x) => x.s));
  const t1 = Math.max(...segs.map((x) => x.f));
  const span = t1 - t0 || 1;
  const todayX = Math.max(0, Math.min(1, (Date.now() - t0) / span));
  const s = spi ?? 1;
  const c = cpi ?? 1;
  const pvAt = (d: number) => segs.reduce((a, x) => a + Math.max(0, Math.min(1, (d - x.s) / (x.f - x.s))) * x.bac, 0);

  const N = 24;
  const points: EvCurvePoint[] = [];
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    const pv = pvAt(t0 + x * span);
    const within = x <= todayX;
    points.push({ x, pv, ev: within ? pv * s : null, ac: within ? (pv * s) / (c || 1) : null });
  }
  const bac = leaves.reduce((a, l) => a + (Number(l.budget_bac) || 0), 0);
  return { points, todayX, bac };
}

/* ----------------------------------------------------- Portfolio roll-up */

export interface PortfolioEv extends EvMetrics {
  /** Projects with enough data to compute EV (a budget and some actual cost). */
  projects_in: number;
  /** Projects behind schedule (SPI < 0.97). */
  behind_count: number;
  /** Projects over cost (CPI < 0.97). */
  over_count: number;
}

/**
 * Portfolio earned value. The honest way to aggregate is to SUM the dollar
 * quantities (BAC/PV/EV/AC) across projects and recompute the indices from the
 * totals — not to average per-project CPI/SPI, which would over-weight small
 * projects. WBS codes are only unique within a project, so callers must group
 * by project and compute each project's EvMetrics BEFORE rolling up here.
 */
export function rollUpEv(perProject: EvMetrics[]): PortfolioEv {
  let bac = 0, pv = 0, ev = 0, ac = 0, projects_in = 0, behind = 0, over = 0;
  for (const m of perProject) {
    if (!m.ready) continue;
    projects_in++;
    bac += m.bac; pv += m.pv; ev += m.ev; ac += m.ac;
    if (m.spi != null && m.spi < 0.97) behind++;
    if (m.cpi != null && m.cpi < 0.97) over++;
  }
  const cpi = ac > 0 ? ev / ac : null;
  const spi = pv > 0 ? ev / pv : null;
  const eac = cpi && cpi > 0 ? bac / cpi : null;
  const vac = eac != null ? bac - eac : null;
  const complete_pct = bac > 0 ? (ev / bac) * 100 : 0;
  return { bac, pv, ev, ac, cpi, spi, eac, vac, complete_pct, ready: bac > 0 && ac > 0, projects_in, behind_count: behind, over_count: over };
}
