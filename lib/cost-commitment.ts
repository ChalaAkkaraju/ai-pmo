/**
 * Cost commitment & cost-element analytics — pure computation, no I/O.
 * SAP's WBS cost lifecycle is Budget → Commitment (open PO) → Actual. This adds
 * the commitment view (open PO value), a cost-to-date that includes it, a
 * commitment-aware EAC, the cost-element (value-category) mix, and labour
 * productivity from planned-vs-actual hours. Everything keys off the WBS.
 */

const n = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/* --------------------------------------------------------- Commitment / POs */

export interface PoRow {
  wbs_code?: string | null;
  vendor?: string | null;
  po_number?: string | null;
  value_category?: string | null;
  po_value?: number | string | null;
  received_value?: number | string | null;
  status?: string | null;
}

export interface CommitmentSummary {
  poValue: number;        // total ordered
  received: number;       // goods-receipted / invoiced (→ actual)
  openCommitment: number; // poValue − received (non-closed)
  poCount: number;
  openCount: number;
  byCategory: { category: string; open: number; value: number }[];
  byBranch: { branch: string; open: number; value: number }[];
}

const branchOf = (wbs: string | null | undefined) => {
  const p = String(wbs ?? '').split('.');
  return p.length >= 2 ? `${p[0]}.${p[1]}` : String(wbs ?? '');
};

export function computeCommitment(pos: PoRow[]): CommitmentSummary {
  let poValue = 0, received = 0, openCommitment = 0, openCount = 0;
  const cat = new Map<string, { open: number; value: number }>();
  const br = new Map<string, { open: number; value: number }>();
  for (const po of pos) {
    const v = n(po.po_value), r = n(po.received_value);
    const open = String(po.status ?? '') === 'Closed' ? 0 : Math.max(0, v - r);
    poValue += v; received += r; openCommitment += open;
    if (open > 0) openCount++;
    const c = po.value_category ?? 'Other';
    const cc = cat.get(c) ?? { open: 0, value: 0 }; cc.open += open; cc.value += v; cat.set(c, cc);
    const b = branchOf(po.wbs_code);
    const bb = br.get(b) ?? { open: 0, value: 0 }; bb.open += open; bb.value += v; br.set(b, bb);
  }
  return {
    poValue, received, openCommitment, poCount: pos.length, openCount,
    byCategory: [...cat.entries()].map(([category, x]) => ({ category, ...x })).sort((a, b) => b.open - a.open),
    byBranch: [...br.entries()].map(([branch, x]) => ({ branch, ...x })).sort((a, b) => b.open - a.open),
  };
}

/** Cost to date = actual + open commitment (money already spent or locked in). */
export function costToDate(ac: number, openCommitment: number): number {
  return ac + openCommitment;
}

/**
 * Commitment-aware EAC: actuals + open commitments are taken at face value
 * (already incurred or contractually locked); only the still-uncommitted
 * remainder of the work is projected at the to-date CPI.
 *   EAC = AC + openCommitment + (BAC − EV − openCommitment) / CPI
 */
export function commitmentAwareEac(bac: number, ev: number, ac: number, cpi: number | null, openCommitment: number): number | null {
  if (!cpi || cpi <= 0) return null;
  const uncommittedRemaining = Math.max(0, bac - ev - openCommitment);
  return ac + openCommitment + uncommittedRemaining / cpi;
}

/* ------------------------------------------------------- Cost elements */

export interface CostElementRow {
  value_category?: string | null;
  actual_cost?: number | string | null;
  planned_value?: number | string | null;
}

export function costByElement(rows: CostElementRow[]): { category: string; actual: number; planned: number }[] {
  const m = new Map<string, { actual: number; planned: number }>();
  for (const r of rows) {
    const c = r.value_category ?? 'Other';
    const e = m.get(c) ?? { actual: 0, planned: 0 };
    e.actual += n(r.actual_cost); e.planned += n(r.planned_value);
    m.set(c, e);
  }
  return [...m.entries()].map(([category, x]) => ({ category, ...x })).sort((a, b) => b.actual - a.actual);
}

/* ------------------------------------------------------- Labour productivity */

export interface LabourRow {
  planned_work_hours?: number | string | null;
  actual_work_hours?: number | string | null;
  hourly_rate?: number | string | null;
}

export interface LabourProductivity {
  plannedHoursToDate: number;
  actualHoursToDate: number;
  totalPlannedHours: number;
  hoursVarPct: number | null;     // (actual − planned) ÷ planned, to date
  productivityIndex: number | null; // planned ÷ actual (>1 = fewer hours than planned)
  blendedRate: number | null;     // labour cost ÷ actual hours
  labourCostToDate: number;       // Σ actual hours × rate
  ready: boolean;
}

/** Productivity from the paired planned/actual hours (actuals exist only for
 *  elapsed periods, so they define the "to date" window). */
export function computeLabourProductivity(rows: LabourRow[]): LabourProductivity {
  let plannedToDate = 0, actualToDate = 0, totalPlanned = 0, cost = 0;
  for (const r of rows) {
    const planned = n(r.planned_work_hours);
    totalPlanned += planned;
    if (r.actual_work_hours == null) continue; // future period
    const actual = n(r.actual_work_hours);
    plannedToDate += planned; actualToDate += actual;
    cost += actual * n(r.hourly_rate);
  }
  return {
    plannedHoursToDate: plannedToDate,
    actualHoursToDate: actualToDate,
    totalPlannedHours: totalPlanned,
    hoursVarPct: plannedToDate > 0 ? (actualToDate - plannedToDate) / plannedToDate : null,
    productivityIndex: actualToDate > 0 ? plannedToDate / actualToDate : null,
    blendedRate: actualToDate > 0 ? cost / actualToDate : null,
    labourCostToDate: cost,
    ready: actualToDate > 0,
  };
}
