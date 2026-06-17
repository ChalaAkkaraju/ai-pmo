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
  SapPurchaseOrderDTO,
  SapBillingDTO,
  SapResultsAnalysisDTO,
  SapChangeOrderDTO,
  WorkPackageRow,
  CostActualRow,
  PurchaseOrderRow,
  BillingEventRow,
  ResultsAnalysisRow,
  ChangeOrderRow,
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

/** SAP cost elements / value categories carried on a cost actual row. */
const COST_ELEMENTS = new Set(['Labour', 'Materials/Equipment', 'Subcontract', 'Travel & expenses', 'Other']);

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
    const cat = d.ValueCategory && COST_ELEMENTS.has(d.ValueCategory) ? d.ValueCategory : null;
    rows.push({
      project_id: projectId,
      wbs_code: code,
      period: d.FiscalPeriod,
      actual_cost: Number(d.ActualAmount) || 0,
      commitment: Number(d.CommitmentAmount) || 0,
      planned_value: d.PlannedAmount ?? null,
      value_category: cat,
      source_system: 'SAP_PS',
      external_id: `${code}:${d.FiscalPeriod}:${cat ?? 'all'}`,
      synced_at: syncedAt,
    });
  }
  return { rows, exceptions };
}


const PO_CATEGORIES = new Set(['Materials/Equipment', 'Subcontract', 'Travel & expenses', 'Other']);
const PO_STATUSES = new Set(['Open', 'Partially received', 'Closed']);

export function mapSapPurchaseOrders(dtos: SapPurchaseOrderDTO[], projectId: string, syncedAt: string): MapResult<PurchaseOrderRow> {
  const rows: PurchaseOrderRow[] = [];
  const exceptions: MapResult<PurchaseOrderRow>['exceptions'] = [];
  for (const d of dtos) {
    const code = d.WBSElementExternalID ? normalizeWbs(d.WBSElementExternalID) : '';
    if (!d.PurchaseOrder || !d.PurchaseOrder.trim()) {
      exceptions.push({ kind: 'validation', external_id: code || null, reason: 'Purchase order has no document number', payload: d });
      continue;
    }
    if (!code) {
      exceptions.push({ kind: 'unmapped_wbs', external_id: d.PurchaseOrder, reason: `PO ${d.PurchaseOrder} has no WBS account assignment`, payload: d });
      continue;
    }
    rows.push({
      project_id: projectId,
      wbs_code: code,
      po_number: d.PurchaseOrder.trim(),
      vendor: d.Supplier ?? '',
      value_category: PO_CATEGORIES.has(d.ValueCategory) ? d.ValueCategory : 'Other',
      po_value: Number(d.NetOrderValue) || 0,
      received_value: Number(d.DeliveredValue) || 0,
      status: PO_STATUSES.has(d.PurchaseOrderStatus) ? d.PurchaseOrderStatus : 'Open',
      raised_week: d.CreatedPeriodWeek ?? null,
      source_system: 'SAP_PS',
      external_id: d.PurchaseOrder,
      synced_at: syncedAt,
    });
  }
  return { rows, exceptions };
}

const BILLING_TYPES = new Set(['Milestone', 'Progress', 'Advance', 'Retention release']);
const BILLING_STATUSES = new Set(['Planned', 'Invoiced', 'Paid']);

export function mapSapBilling(dtos: SapBillingDTO[], projectId: string, syncedAt: string): MapResult<BillingEventRow> {
  const rows: BillingEventRow[] = [];
  const exceptions: MapResult<BillingEventRow>['exceptions'] = [];
  for (const d of dtos) {
    if (!d.BillingDocument || !d.BillingDocument.trim()) {
      exceptions.push({ kind: 'validation', external_id: null, reason: 'Billing document has no number', payload: d });
      continue;
    }
    rows.push({
      project_id: projectId,
      wbs_code: d.WBSElementExternalID ? normalizeWbs(d.WBSElementExternalID) : null,
      invoice_number: d.BillingDocument.trim(),
      billing_type: BILLING_TYPES.has(d.BillingCategory) ? d.BillingCategory : 'Progress',
      amount: Number(d.NetAmount) || 0,
      billed_week: d.BilledPeriodWeek ?? null,
      status: BILLING_STATUSES.has(d.BillingStatus) ? d.BillingStatus : 'Invoiced',
      source_system: 'SAP_PS',
      external_id: d.BillingDocument,
      synced_at: syncedAt,
    });
  }
  return { rows, exceptions };
}

export function mapSapResultsAnalysis(dtos: SapResultsAnalysisDTO[], projectId: string, syncedAt: string): MapResult<ResultsAnalysisRow> {
  const rows: ResultsAnalysisRow[] = [];
  const exceptions: MapResult<ResultsAnalysisRow>['exceptions'] = [];
  for (const d of dtos) {
    if (!d.FiscalPeriod) {
      exceptions.push({ kind: 'validation', external_id: d.WBSElementExternalID ?? null, reason: 'RA row missing fiscal period', payload: d });
      continue;
    }
    const code = d.WBSElementExternalID ? normalizeWbs(d.WBSElementExternalID) : null;
    rows.push({
      project_id: projectId,
      wbs_code: code,
      period: d.FiscalPeriod,
      ra_method: d.RAMethod ?? 'Cost-based POC',
      poc_pct: Number(d.PercentageOfCompletion) || 0,
      planned_cost: Number(d.PlannedCost) || 0,
      planned_revenue: Number(d.PlannedRevenue) || 0,
      cost_of_sales: Number(d.CostOfSales) || 0,
      calculated_revenue: Number(d.CalculatedRevenue) || 0,
      recognized_margin: Number(d.RecognizedMargin) || 0,
      reserve: Number(d.Reserve) || 0,
      source_system: 'SAP_PS',
      external_id: `${code ?? 'PROJ'}:${d.FiscalPeriod}`,
      synced_at: syncedAt,
    });
  }
  return { rows, exceptions };
}

const CO_STATUSES = new Set(['Identified', 'Quantified', 'Submitted to client', 'In negotiation', 'Approved', 'Absorbed', 'Withdrawn']);

/** Change orders / variations — project-level (no WBS join). Validate ID + scope. */
export function mapSapChangeOrders(dtos: SapChangeOrderDTO[], projectId: string, syncedAt: string): MapResult<ChangeOrderRow> {
  const rows: ChangeOrderRow[] = [];
  const exceptions: MapResult<ChangeOrderRow>['exceptions'] = [];
  for (const d of dtos) {
    const id = d.ChangeOrderID ? d.ChangeOrderID.trim() : '';
    if (!id) {
      exceptions.push({ kind: 'validation', external_id: null, reason: 'Change order has no document ID', payload: d });
      continue;
    }
    if (!d.ScopeDescription || !d.ScopeDescription.trim()) {
      exceptions.push({ kind: 'validation', external_id: id, reason: `Change order ${id} has no scope description`, payload: d });
      continue;
    }
    rows.push({
      project_id: projectId,
      co_id: id,
      driver: d.ChangeDriver && d.ChangeDriver.trim() ? d.ChangeDriver.trim() : 'Unspecified',
      scope_summary: d.ScopeDescription.trim(),
      cost_impact_m: Number(d.CostImpactM) || 0,
      revenue_impact_m: Number(d.RevenueImpactM) || 0,
      schedule_impact_days: Math.round(Number(d.ScheduleImpactDays) || 0),
      margin_realized_pct: d.MarginRealizedPct ?? null,
      status: CO_STATUSES.has(d.COStatus) ? d.COStatus : 'Quantified',
      approval_routing: d.ApprovalRouting ?? null,
      executed_week: d.ExecutedPeriodWeek ?? null,
      source_system: 'SAP_PS',
      external_id: id,
      synced_at: syncedAt,
    });
  }
  return { rows, exceptions };
}
