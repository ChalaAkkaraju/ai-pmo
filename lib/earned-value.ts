/**
 * Earned-value engine — Phase 3 flagship. Pure computation, no I/O.
 *
 * Joins the three systems by WBS code:
 *   BAC  = budget per work package (from SAP PS / WBS)
 *   EV   = % complete (from the scheduler) × budget per work package
 *   PV   = planned value, and AC = actual cost (from SAP PS cost actuals)
 * → CV/SV, CPI/SPI, EAC (3 methods), ETC, TCPI, VAC, and the Earned-Schedule
 * time metrics. This is the one number no single system produces.
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
/** Cost actual carrying its WBS code — needed for the per-branch breakdown. */
export interface EvCostWbs extends EvCost {
  wbs_code: string | null;
}

export interface EvMetrics {
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  // Variances (dollars + %)
  cv: number;             // EV − AC  (cost variance; <0 = over cost)
  sv: number;             // EV − PV  (schedule variance; <0 = behind)
  cvPct: number | null;   // CV ÷ EV
  svPct: number | null;   // SV ÷ PV
  // Forecasts
  eac: number | null;     // typical EAC = BAC ÷ CPI (kept for back-compat)
  eacTypical: number | null;  // BAC ÷ CPI
  eacAtypical: number;        // AC + (BAC − EV)  — assumes rest goes to plan
  eacBoth: number | null;     // AC + (BAC − EV) ÷ (CPI × SPI)  — cost & schedule drag
  etc: number | null;     // EAC − AC  (estimate to complete)
  vac: number | null;     // BAC − EAC
  vacPct: number | null;  // VAC ÷ BAC
  tcpiBac: number | null; // (BAC − EV) ÷ (BAC − AC)  — CPI needed to still hit budget
  tcpiEac: number | null; // (BAC − EV) ÷ (EAC − AC)  — CPI needed to hit the forecast
  spentPct: number;       // AC ÷ BAC
  complete_pct: number;   // EV ÷ BAC × 100
  /** True once there is enough data (a budget and some cost) to compute EV. */
  ready: boolean;
}

/** Derive the full metric set from the four dollar quantities. Shared by the
 *  project-level and portfolio roll-up computations so they stay identical. */
export function deriveMetrics(bac: number, pv: number, ev: number, ac: number): Omit<EvMetrics, 'ready'> {
  const cpi = ac > 0 ? ev / ac : null;
  const spi = pv > 0 ? ev / pv : null;
  const cv = ev - ac;
  const sv = ev - pv;
  const eacTypical = cpi && cpi > 0 ? bac / cpi : null;
  const eacAtypical = ac + (bac - ev);
  const eacBoth = cpi && spi && cpi > 0 && spi > 0 ? ac + (bac - ev) / (cpi * spi) : null;
  const eac = eacTypical;
  const etc = eac != null ? eac - ac : null;
  const vac = eac != null ? bac - eac : null;
  return {
    bac, pv, ev, ac, cpi, spi,
    cv, sv,
    cvPct: ev > 0 ? cv / ev : null,
    svPct: pv > 0 ? sv / pv : null,
    eac, eacTypical, eacAtypical, eacBoth, etc, vac,
    vacPct: vac != null && bac > 0 ? vac / bac : null,
    tcpiBac: bac - ac !== 0 ? (bac - ev) / (bac - ac) : null,
    tcpiEac: eac != null && eac - ac !== 0 ? (bac - ev) / (eac - ac) : null,
    spentPct: bac > 0 ? ac / bac : 0,
    complete_pct: bac > 0 ? (ev / bac) * 100 : 0,
  };
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

  return { ...deriveMetrics(bac, pv, ev, ac), ready: bac > 0 && ac > 0 };
}

/* ------------------------------------------------- Per-WBS branch breakdown */

export interface EvBranch {
  branch: string;       // top-level WBS code
  name: string;         // branch name where known
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  cv: number;
  sv: number;
  cvPct: number | null;
  svPct: number | null;
  status: 'over' | 'behind' | 'watch' | 'ok';  // worst dimension breaching ±threshold
}

const VAR_THRESHOLD = 0.05; // ±5% CV%/SV% before a branch is flagged

/**
 * Earned value rolled up to the top-level WBS branch — where in the structure
 * the cost/schedule performance sits. Uses the per-WBS cost actuals (AC, PV by
 * wbs_code) joined to leaf budgets and task progress. RAG status flags the
 * worst of the two variances against a ±5% threshold.
 */
export function computeEvByWbs(
  leaves: EvLeaf[], tasks: EvTask[], cost: EvCostWbs[], names?: Map<string, string>,
): EvBranch[] {
  const pctByWbs = new Map<string, number>();
  for (const t of tasks) if (t.wbs_code) pctByWbs.set(t.wbs_code, Number(t.percent_complete) || 0);
  const branchKey = (wbs: string) => wbs.split('.')[0];

  const acc = new Map<string, { bac: number; pv: number; ev: number; ac: number }>();
  const bump = (branch: string) => acc.get(branch) ?? { bac: 0, pv: 0, ev: 0, ac: 0 };

  for (const w of leaves) {
    const branch = branchKey(w.wbs_code);
    const b = Number(w.budget_bac) || 0;
    const a = bump(branch);
    a.bac += b;
    a.ev += ((pctByWbs.get(w.wbs_code) ?? 0) / 100) * b;
    acc.set(branch, a);
  }
  for (const c of cost) {
    if (!c.wbs_code) continue;
    const branch = branchKey(c.wbs_code);
    const a = bump(branch);
    a.ac += Number(c.actual_cost) || 0;
    a.pv += Number(c.planned_value) || 0;
    acc.set(branch, a);
  }

  const branches: EvBranch[] = [...acc.entries()].map(([branch, a]) => {
    const cpi = a.ac > 0 ? a.ev / a.ac : null;
    const spi = a.pv > 0 ? a.ev / a.pv : null;
    const cv = a.ev - a.ac;
    const sv = a.ev - a.pv;
    const cvPct = a.ev > 0 ? cv / a.ev : null;
    const svPct = a.pv > 0 ? sv / a.pv : null;
    const overCost = cvPct != null && cvPct < -VAR_THRESHOLD;
    const behind = svPct != null && svPct < -VAR_THRESHOLD;
    const watch = (cvPct != null && cvPct < 0) || (svPct != null && svPct < 0);
    const status: EvBranch['status'] =
      overCost && (cvPct ?? 0) <= (svPct ?? 0) ? 'over'
        : behind ? 'behind'
          : overCost ? 'over'
            : watch ? 'watch' : 'ok';
    return { branch, name: names?.get(branch) ?? '', bac: a.bac, pv: a.pv, ev: a.ev, ac: a.ac, cpi, spi, cv, sv, cvPct, svPct, status };
  });
  return branches.sort((x, y) => x.cv - y.cv); // worst cost variance first
}

/* ------------------------------------------------------------ S-curve + EAC */

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
  t0: number;            // timeline start (ms epoch)
  t1: number;            // timeline finish (ms epoch)
  durationDays: number;
  eac: number | null;
  /** Projected actual-cost trajectory from today to completion, ending at EAC. */
  eacForecast: { x: number; ac: number }[] | null;
}

/**
 * Build the earned-value S-curve. PV is computed from the task schedule
 * (cumulative planned value over time → BAC). We only have an as-of snapshot
 * for EV/AC, so they are modelled as tracking PV at the project's SPI (and
 * AC = EV / CPI) up to today — which lands them exactly on the current EV/AC.
 * The dashed EAC forecast extends AC from today to the projected cost at finish.
 */
export function evCurve(
  leaves: EvLeaf[], tasks: EvTaskDated[], spi: number | null, cpi: number | null, eac: number | null = null,
): EvCurve | null {
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

  // EAC forecast trajectory: from today's AC up to EAC at completion, paced by
  // remaining planned work so it lands at x = 1.
  let eacForecast: { x: number; ac: number }[] | null = null;
  const pvToday = pvAt(t0 + todayX * span);
  const acToday = (pvToday * s) / (c || 1);
  if (eac != null && bac > pvToday) {
    eacForecast = points
      .filter((p) => p.x >= todayX)
      .map((p) => ({ x: p.x, ac: acToday + (eac - acToday) * ((p.pv - pvToday) / (bac - pvToday)) }));
  }

  return { points, todayX, bac, t0, t1, durationDays: span / 86400000, eac, eacForecast };
}

/* -------------------------------------------------------- Earned Schedule */

export interface EarnedScheduleMetrics {
  es: number;             // earned schedule as a fraction of duration (0..1)
  esWeeks: number;        // ES in weeks from start
  atWeeks: number;        // actual time in weeks from start
  svtWeeks: number;       // SV(t) = ES − AT, in weeks (<0 = behind)
  spit: number | null;    // SPI(t) = ES ÷ AT
  ieactWeeks: number | null;  // independent time forecast of total duration
  forecastFinishISO: string | null;
  contractFinishISO: string;
}

/**
 * Earned Schedule — the time-based companion to SPI. Where SPI (a dollar ratio)
 * drifts to 1.0 near the end even on a late project, ES asks "the work earned so
 * far was *planned* to be done by when?" and compares that to now. SV(t)/SPI(t)
 * are therefore honest schedule metrics, and SPI(t) gives an independent finish
 * forecast. ES is found where cumulative PV first reaches the current EV.
 */
export function earnedSchedule(curve: EvCurve, ev: number): EarnedScheduleMetrics | null {
  const pts = curve.points;
  if (pts.length < 2 || curve.durationDays <= 0) return null;
  // Find x* where the planned-value curve reaches EV (linear interpolation).
  let esX = 0;
  if (ev <= pts[0].pv) {
    esX = 0;
  } else if (ev >= pts[pts.length - 1].pv) {
    esX = 1;
  } else {
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].pv >= ev) {
        const lo = pts[i - 1], hi = pts[i];
        const frac = hi.pv === lo.pv ? 0 : (ev - lo.pv) / (hi.pv - lo.pv);
        esX = lo.x + frac * (hi.x - lo.x);
        break;
      }
    }
  }
  const weeks = curve.durationDays / 7;
  const esWeeks = esX * weeks;
  const atWeeks = curve.todayX * weeks;
  const svtWeeks = esWeeks - atWeeks;
  const spit = atWeeks > 0 ? esX / curve.todayX : null;
  const ieactWeeks = spit && spit > 0 ? weeks / spit : null;
  const forecastFinishISO = ieactWeeks != null ? new Date(curve.t0 + ieactWeeks * 7 * 86400000).toISOString() : null;
  return { es: esX, esWeeks, atWeeks, svtWeeks, spit, ieactWeeks, forecastFinishISO, contractFinishISO: new Date(curve.t1).toISOString() };
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
  return { ...deriveMetrics(bac, pv, ev, ac), ready: bac > 0 && ac > 0, projects_in, behind_count: behind, over_count: over };
}
