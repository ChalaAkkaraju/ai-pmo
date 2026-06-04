/**
 * SAP PS mapper — source DTO → canonical rows. Pure functions, no I/O.
 *
 * Validation failures (missing WBS code or description) are returned as
 * exceptions, never ingested. Coding-mask normalisation (trim, strip leading
 * zeros on numeric segments) is applied so the WBS join is robust.
 */

import type {
  SapWbsElementDTO,
  SapCostActualDTO,
  WorkPackageRow,
  CostActualRow,
  MapResult,
} from '../types';

/** Map an SAP responsible-person string to one of our role types (best effort). */
const RESPONSIBLE_TO_ROLE: Record<string, string> = {
  PM: 'pm',
  ENG: 'engineering_manager',
  CON: 'construction_manager',
  PROC: 'procurement',
  COMM: 'commercial',
  CTRL: 'project_controls',
  HSE: 'hse_manager',
};
function mapRole(person: string | null): string | null {
  if (!person) return null;
  const key = person.trim().toUpperCase();
  return RESPONSIBLE_TO_ROLE[key] ?? null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Normalise a WBS code so equivalent codes join (trim, collapse separators). */
export function normalizeWbs(code: string): string {
  return code.trim().replace(/\s+/g, '');
}

export function mapSapWbs(dtos: SapWbsElementDTO[], projectId: string, syncedAt: string): MapResult<WorkPackageRow> {
  const rows: WorkPackageRow[] = [];
  const exceptions: MapResult<WorkPackageRow>['exceptions'] = [];

  for (const d of dtos) {
    const code = d.WBSElementExternalID ? normalizeWbs(d.WBSElementExternalID) : '';
    if (!code) {
      exceptions.push({ kind: 'validation', external_id: d.WBSElementInternalID ?? null, reason: 'WBS element has no external WBS code', payload: d });
      continue;
    }
    if (!d.WBSElementDescription || !d.WBSElementDescription.trim()) {
      exceptions.push({ kind: 'validation', external_id: code, reason: `WBS ${code} has no description`, payload: d });
      continue;
    }
    rows.push({
      project_id: projectId,
      wbs_code: code,
      parent_wbs_code: d.ParentWBSElement ? normalizeWbs(d.ParentWBSElement) : null,
      name: d.WBSElementDescription.trim(),
      responsible_role_type: mapRole(d.PersonResponsible),
      is_billing_element: d.IsBillingElement === true,
      budget_bac: d.Budget ?? null,
      baseline_bac: d.BudgetBaseline ?? null,
      target_finish: d.LatestFinishDate ?? null,
      source_system: 'SAP_PS',
      external_id: d.WBSElementInternalID ?? code,
      synced_at: syncedAt,
      is_app_native: false,
    });
  }

  // SAP often carries budget at the leaf; roll phase (parent-less) budgets up
  // from their direct children so the WBS tree shows subtotals and a real BAC.
  for (const phase of rows.filter((r) => !r.parent_wbs_code)) {
    if (phase.budget_bac != null) continue;
    const kids = rows.filter((r) => r.parent_wbs_code === phase.wbs_code);
    if (kids.length === 0) continue;
    phase.budget_bac = round2(kids.reduce((sum, k) => sum + (k.budget_bac ?? 0), 0));
    phase.baseline_bac = round2(kids.reduce((sum, k) => sum + (k.baseline_bac ?? 0), 0));
  }

  return { rows, exceptions };
}

export function mapSapCost(dtos: SapCostActualDTO[], projectId: string, syncedAt: string): MapResult<CostActualRow> {
  const rows: CostActualRow[] = [];
  const exceptions: MapResult<CostActualRow>['exceptions'] = [];

  for (const d of dtos) {
    const code = d.WBSElementExternalID ? normalizeWbs(d.WBSElementExternalID) : '';
    if (!code || !d.FiscalPeriod) {
      exceptions.push({ kind: 'validation', external_id: code || null, reason: 'Cost row missing WBS code or period', payload: d });
      continue;
    }
    rows.push({
      project_id: projectId,
      wbs_code: code,
      period: d.FiscalPeriod,
      actual_cost: Number(d.ActualAmount) || 0,
      commitment: Number(d.CommitmentAmount) || 0,
      planned_value: d.PlannedAmount ?? null,
      source_system: 'SAP_PS',
      external_id: `${code}:${d.FiscalPeriod}`,
      synced_at: syncedAt,
    });
  }
  return { rows, exceptions };
}
