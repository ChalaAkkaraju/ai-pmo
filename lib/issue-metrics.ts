/**
 * Issue metrics: aging, SLA, priority, escalation, MTTR, and an issue-health
 * rollup. Issues are realized problems, so the dimensions are resolution speed
 * and impact (not probability). Pure functions over loosely-typed issue rows.
 * Age/overdue/priority depend on the project's current week, so are computed
 * here at read time rather than stored.
 */
export interface IssueRow {
  severity?: string | null;
  status?: string | null;
  opened_week?: number | string | null;
  closed_week?: number | string | null;
  sla_weeks?: number | string | null;
  cost_impact_usd?: number | string | null;
  schedule_impact_days?: number | string | null;
  owner?: string | null;
  escalated?: boolean | null;
}

const num = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const SEV_NUM: Record<string, number> = { L: 1, M: 2, H: 3 };
const DEFAULT_SLA: Record<string, number> = { L: 12, M: 6, H: 2 };

export function isOpenIssue(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'open' || s === 'in progress';
}
export function sevKey(i: IssueRow): 'L' | 'M' | 'H' {
  const s = String(i.severity ?? 'M').toUpperCase().charAt(0);
  return s === 'L' || s === 'H' ? s : 'M';
}
export function issueAge(i: IssueRow, currentWeek: number): number {
  const opened = num(i.opened_week);
  const end = i.closed_week != null && i.closed_week !== '' ? num(i.closed_week) : currentWeek;
  return Math.max(0, end - opened);
}
export function slaWeeks(i: IssueRow): number { return num(i.sla_weeks) || DEFAULT_SLA[sevKey(i)]; }
export function isOverdue(i: IssueRow, currentWeek: number): boolean {
  return isOpenIssue(i.status) && issueAge(i, currentWeek) > slaWeeks(i);
}

export type AgingBand = 'On track' | 'At risk' | 'Overdue';
export function agingBand(i: IssueRow, currentWeek: number): AgingBand {
  if (!isOpenIssue(i.status)) return 'On track';
  const age = issueAge(i, currentWeek), sla = slaWeeks(i);
  if (age > sla) return 'Overdue';
  if (age >= sla * 0.75) return 'At risk';
  return 'On track';
}
/** Priority = severity (1–3) × age (capped). Higher = more urgent. */
export function priorityScore(i: IssueRow, currentWeek: number): number {
  return SEV_NUM[sevKey(i)] * Math.min(issueAge(i, currentWeek), 26);
}
export function needsEscalation(i: IssueRow, currentWeek: number): boolean {
  return isOpenIssue(i.status) && sevKey(i) === 'H' && (isOverdue(i, currentWeek) || !i.owner) && !i.escalated;
}
/** Weeks to resolve, for closed/resolved issues. */
export function resolveWeeks(i: IssueRow): number | null {
  return i.closed_week != null && i.closed_week !== '' ? Math.max(0, num(i.closed_week) - num(i.opened_week)) : null;
}

export interface IssueHealth {
  open: number; openH: number; openM: number; openL: number;
  onTrack: number; atRisk: number; overdue: number;
  oldestOpenAge: number;
  openCostExposure: number;
  mttr: number | null;        // mean weeks-to-resolve of closed issues
  escalated: number; needsEscalation: number;
}

export function computeIssueHealth(issues: IssueRow[], currentWeek: number): IssueHealth {
  let open = 0, openH = 0, openM = 0, openL = 0, onTrack = 0, atRisk = 0, overdue = 0, oldest = 0, cost = 0, esc = 0, needEsc = 0;
  let resSum = 0, resN = 0;
  for (const i of issues) {
    if (isOpenIssue(i.status)) {
      open++;
      const k = sevKey(i); if (k === 'H') openH++; else if (k === 'M') openM++; else openL++;
      const b = agingBand(i, currentWeek); if (b === 'Overdue') overdue++; else if (b === 'At risk') atRisk++; else onTrack++;
      oldest = Math.max(oldest, issueAge(i, currentWeek));
      cost += num(i.cost_impact_usd);
      if (i.escalated) esc++;
      if (needsEscalation(i, currentWeek)) needEsc++;
    } else {
      const rw = resolveWeeks(i); if (rw != null) { resSum += rw; resN++; }
    }
  }
  return { open, openH, openM, openL, onTrack, atRisk, overdue, oldestOpenAge: oldest, openCostExposure: cost, mttr: resN ? resSum / resN : null, escalated: esc, needsEscalation: needEsc };
}
