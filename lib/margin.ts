/**
 * Three-state margin reconciliation — the bookend to earned value.
 *
 *   as-sold    : what we won at booking  (sold contract − frozen baseline budget)
 *   as-planned : the current plan        (current contract − current WBS budget)
 *   as-built   : the forecast            (current contract − EAC)
 *
 * The bridge decomposes the move from sold margin to forecast margin into three
 * honest steps, which reconcile exactly:
 *   sold margin
 *     − budget growth     (as-planned budget grew above the as-sold baseline)
 *     + contract change   (scope / change orders grew the contract since booking)
 *     − cost performance  (EAC above the planned budget)
 *   = forecast margin
 *
 * The headline question it answers: are we delivering the margin we sold?
 */

export interface MarginBridge {
  ready: boolean;
  soldContract: number;
  soldBudget: number;
  currentContract: number;
  plannedBudget: number;
  eac: number;
  soldMargin: number;      // $
  plannedMargin: number;   // $
  forecastMargin: number;  // $
  soldMarginPct: number;
  plannedMarginPct: number;
  forecastMarginPct: number;
  dBudget: number;   // step: budget growth (≤ 0 when eroded)
  dContract: number; // step: contract change (≥ 0 when grown)
  dExecution: number; // step: cost performance (≤ 0 when over)
}

export function computeMarginBridge(input: {
  soldContract: number;
  soldBudget: number;
  currentContract: number;
  plannedBudget: number;
  eac: number | null;
}): MarginBridge {
  const ready = input.soldContract > 0 && input.soldBudget > 0 && input.currentContract > 0 && input.plannedBudget > 0;
  const eac = input.eac ?? input.plannedBudget;

  const soldMargin = input.soldContract - input.soldBudget;
  const plannedMargin = input.currentContract - input.plannedBudget;
  const forecastMargin = input.currentContract - eac;

  const pct = (m: number, c: number) => (c > 0 ? (m / c) * 100 : 0);

  return {
    ready,
    soldContract: input.soldContract,
    soldBudget: input.soldBudget,
    currentContract: input.currentContract,
    plannedBudget: input.plannedBudget,
    eac,
    soldMargin,
    plannedMargin,
    forecastMargin,
    soldMarginPct: pct(soldMargin, input.soldContract),
    plannedMarginPct: pct(plannedMargin, input.currentContract),
    forecastMarginPct: pct(forecastMargin, input.currentContract),
    dBudget: -(input.plannedBudget - input.soldBudget),
    dContract: input.currentContract - input.soldContract,
    dExecution: -(eac - input.plannedBudget),
  };
}
