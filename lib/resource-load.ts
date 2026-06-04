/**
 * Resource-load engine — Phase 4 (visibility, not levelling).
 *
 * Resource assignments are mirrored from the scheduler (Dataverse / P6). We
 * aggregate planned hours into FTE demand per discipline (resource_role) per
 * month, compare against a portfolio capacity per discipline, and flag months
 * where demand exceeds capacity. We do NOT level — that stays in the scheduler.
 */

export interface ResAssignment {
  resource_role: string | null;
  period: string | null; // date; we bucket by month
  planned_work_hours: number | null;
}

export const HOURS_PER_FTE_MONTH = 160;

/** Portfolio capacity per discipline, in FTE. Stand-in for an HR/resource plan. */
export const CAPACITY_FTE: Record<string, number> = {
  engineering_manager: 55,
  construction_manager: 110,
  procurement: 28,
  pm: 45,
  project_controls: 22,
  commercial: 18,
  hse_manager: 20,
  program_manager: 12,
  risk: 10,
};
export function capacityFor(role: string): number {
  return CAPACITY_FTE[role] ?? 15;
}

export interface RoleLoad {
  role: string;
  series: number[]; // FTE per month, aligned to months[]
  peakFte: number;
  totalFteMonths: number;
  capacityFte: number; // 0 when computed without capacity (project view)
  overMonths: number; // months where series > capacity (portfolio view)
}

export interface LoadResult {
  months: string[]; // 'YYYY-MM' sorted ascending
  roles: RoleLoad[]; // sorted by peak FTE desc
  ready: boolean;
}

function monthKey(period: string | null): string | null {
  if (!period) return null;
  const s = String(period);
  return s.length >= 7 ? s.slice(0, 7) : null;
}

export function computeLoad(rows: ResAssignment[], withCapacity: boolean): LoadResult {
  const monthsSet = new Set<string>();
  const demand = new Map<string, Map<string, number>>(); // role -> month -> hours

  for (const r of rows) {
    const m = monthKey(r.period);
    if (!m) continue;
    const role = r.resource_role || 'unassigned';
    monthsSet.add(m);
    const byMonth = demand.get(role) ?? new Map<string, number>();
    byMonth.set(m, (byMonth.get(m) ?? 0) + (Number(r.planned_work_hours) || 0));
    demand.set(role, byMonth);
  }

  const months = [...monthsSet].sort();
  const roles: RoleLoad[] = [...demand.entries()].map(([role, byMonth]) => {
    const series = months.map((m) => Math.round(((byMonth.get(m) ?? 0) / HOURS_PER_FTE_MONTH) * 10) / 10);
    const peakFte = series.length ? Math.max(...series) : 0;
    const totalFteMonths = Math.round(series.reduce((a, v) => a + v, 0) * 10) / 10;
    const capacityFte = withCapacity ? capacityFor(role) : 0;
    const overMonths = withCapacity ? series.filter((v) => v > capacityFte).length : 0;
    return { role, series, peakFte, totalFteMonths, capacityFte, overMonths };
  });

  roles.sort((a, b) => b.peakFte - a.peakFte);
  return { months, roles, ready: months.length > 0 };
}
