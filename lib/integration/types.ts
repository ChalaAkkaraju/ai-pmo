/**
 * Phase 6 integration — shared types (the "ports").
 *
 * DTOs are SOURCE-shaped (what the system of record's API returns); canonical
 * rows are what we upsert. Mappers translate DTO → canonical and flag anything
 * that can't map. Adapters (live or mock) implement the connector interfaces.
 * See AI-PMO-Integration-Sync-Contract.md.
 */

export type SourceSystem = 'SAP_PS' | 'MS_PROJECT' | 'P6';
export type IngestChannel = 'api' | 'file' | 'manual';

/* ---- SAP PS source DTOs (shaped like S/4HANA Enterprise Project OData) ---- */

export interface SapWbsElementDTO {
  WBSElementExternalID: string;        // -> wbs_code (the join key)
  ParentWBSElement: string | null;     // -> parent_wbs_code
  WBSElementDescription: string;       // -> name
  PersonResponsible: string | null;    // -> responsible_role_type (mapped)
  IsBillingElement: boolean;           // -> is_billing_element
  Budget: number | null;               // -> budget_bac (as-planned)
  BudgetBaseline: number | null;       // -> baseline_bac (as-sold)
  LatestFinishDate: string | null;     // -> target_finish (YYYY-MM-DD)
  WBSElementInternalID: string;        // -> external_id (object number)
}

export interface SapCostActualDTO {
  WBSElementExternalID: string;        // join to wbs_code
  FiscalPeriod: string;                // YYYY-MM-01
  ActualAmount: number;                // -> actual_cost
  CommitmentAmount: number;            // -> commitment
  PlannedAmount: number | null;        // -> planned_value
  ValueCategory: string | null;        // -> value_category (Labour / Materials / Subcontract / Travel / Other)
}

/** Purchase order — the commitment source (ME2J / Purchasing Document API). */
export interface SapPurchaseOrderDTO {
  PurchaseOrder: string;               // -> po_number
  WBSElementExternalID: string;        // join to wbs_code
  Supplier: string;                    // -> vendor
  ValueCategory: string;               // -> value_category
  NetOrderValue: number;               // -> po_value
  DeliveredValue: number;              // -> received_value (goods receipt)
  PurchaseOrderStatus: string;         // -> status
  CreatedPeriodWeek: number | null;    // -> raised_week
}

/** Billing document — invoices / billing plan (Billing Document API). */
export interface SapBillingDTO {
  BillingDocument: string;             // -> invoice_number
  WBSElementExternalID: string | null; // join to wbs_code (phase)
  BillingCategory: string;             // -> billing_type
  NetAmount: number;                   // -> amount
  BilledPeriodWeek: number | null;     // -> billed_week
  BillingStatus: string;               // -> status
}

/** Results Analysis output — recognised revenue (CJ/KKA RA run, posted to CO). */
export interface SapResultsAnalysisDTO {
  WBSElementExternalID: string | null; // join to wbs_code (phase)
  FiscalPeriod: string;                // YYYY-MM-01
  RAMethod: string;                    // -> ra_method
  PercentageOfCompletion: number;      // -> poc_pct
  PlannedCost: number;
  PlannedRevenue: number;
  CostOfSales: number;
  CalculatedRevenue: number;           // recognised revenue
  RecognizedMargin: number;
  Reserve: number;
}

/** Change order / variation — claim or owner change (PS variation Z-service). */
export interface SapChangeOrderDTO {
  ChangeOrderID: string;              // -> co_id
  ChangeDriver: string;              // -> driver
  ScopeDescription: string;          // -> scope_summary
  CostImpactM: number;               // -> cost_impact_m (millions)
  RevenueImpactM: number;            // -> revenue_impact_m (millions)
  ScheduleImpactDays: number;        // -> schedule_impact_days
  MarginRealizedPct: number | null;  // -> margin_realized_pct
  COStatus: string;                  // -> status
  ApprovalRouting: string | null;    // -> approval_routing
  ExecutedPeriodWeek: number | null; // -> executed_week
}

/* ---- Canonical rows (what we upsert) ---- */

export interface WorkPackageRow {
  project_id: string;
  wbs_code: string;
  parent_wbs_code: string | null;
  name: string;
  responsible_role_type: string | null;
  is_billing_element: boolean;
  budget_bac: number | null;
  baseline_bac: number | null;
  target_finish: string | null;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
  is_app_native: boolean;
}

export interface CostActualRow {
  project_id: string;
  wbs_code: string;
  period: string;
  actual_cost: number;
  commitment: number;
  planned_value: number | null;
  value_category: string | null;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
}

export interface PurchaseOrderRow {
  project_id: string;
  wbs_code: string;
  po_number: string;
  vendor: string;
  value_category: string;
  po_value: number;
  received_value: number;
  status: string;
  raised_week: number | null;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
}

export interface BillingEventRow {
  project_id: string;
  wbs_code: string | null;
  invoice_number: string;
  billing_type: string;
  amount: number;
  billed_week: number | null;
  status: string;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
}

export interface ResultsAnalysisRow {
  project_id: string;
  wbs_code: string | null;
  period: string;
  ra_method: string;
  poc_pct: number;
  planned_cost: number;
  planned_revenue: number;
  cost_of_sales: number;
  calculated_revenue: number;
  recognized_margin: number;
  reserve: number;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
}

export interface ChangeOrderRow {
  project_id: string;
  co_id: string;
  driver: string;
  scope_summary: string;
  cost_impact_m: number;
  revenue_impact_m: number;
  schedule_impact_days: number;
  margin_realized_pct: number | null;
  status: string;
  approval_routing: string | null;
  executed_week: number | null;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
}

/* ---- Exceptions (queued, never dropped) ---- */

export type ExceptionKind = 'unmapped_wbs' | 'validation' | 'conflict' | 'orphaned_wbs';

export interface MappedException {
  kind: ExceptionKind;
  external_id: string | null;
  reason: string;
  payload: unknown;
}

export interface MapResult<T> {
  rows: T[];
  exceptions: MappedException[];
}

/* ---- Connector ports ---- */

export interface ConnectionStatus {
  ok: boolean;
  message: string;
}

export interface SapConnector {
  source: 'SAP_PS';
  testConnection(): Promise<ConnectionStatus>;
  fetchWbs(projectExternalId: string): Promise<SapWbsElementDTO[]>;
  fetchCostActuals(projectExternalId: string): Promise<SapCostActualDTO[]>;
  fetchPurchaseOrders(projectExternalId: string): Promise<SapPurchaseOrderDTO[]>;
  fetchBilling(projectExternalId: string): Promise<SapBillingDTO[]>;
  fetchResultsAnalysis(projectExternalId: string): Promise<SapResultsAnalysisDTO[]>;
  fetchChangeOrders(projectExternalId: string): Promise<SapChangeOrderDTO[]>;
}

export interface SyncResult {
  ok: boolean;
  run_id: string | null;
  source_system: SourceSystem;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  exceptions: number;
  message: string;
}

/* ---- Scheduler (Microsoft Project / P6) source DTOs ----
 * Adapters normalise their source schema (Microsoft Project (msdyn_projecttask), P6
 * activity) into this neutral scheduler shape; the mapper then joins on WBS
 * code (shared across schedulers — that's where the join exception lives). */

export interface SchedulerTaskDTO {
  external_id: string;          // msdyn_projecttaskid / P6 ObjectId
  name: string;                 // msdyn_subject / Activity.Name
  wbs_code: string | null;      // custom column cr_wbscode / activity WBS code
  start: string | null;         // YYYY-MM-DD
  finish: string | null;        // YYYY-MM-DD
  percent_complete: number | null;
}

export interface SchedulerResourceDTO {
  external_id: string;
  wbs_code: string | null;
  resource_name: string;        // discipline pool / named resource
  resource_role: string | null; // discipline (role type)
  period: string;               // YYYY-MM-01
  hours: number | null;         // planned hours
  actual_hours: number | null;  // labour actuals (timesheet)
  hourly_rate: number | null;   // blended rate for the discipline
}

/** Schedule milestone — a zero-duration task / flag from the scheduler. */
export interface SchedulerMilestoneDTO {
  external_id: string;          // milestone task id / P6 milestone ObjectId
  name: string;
  wbs_code: string | null;      // optional WBS tie (project-level if null)
  due_date: string | null;      // YYYY-MM-DD (baseline finish)
  is_contractual: boolean;      // contractual / LD-bearing milestone
  achieved: boolean;
  achieved_date: string | null;
}

export interface TaskRow {
  project_id: string;
  wbs_code: string;
  name: string;
  start_date: string | null;
  finish_date: string | null;
  percent_complete: number;
  owner_role_type: string | null;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
  is_app_native: boolean;
}

export interface ResourceRow {
  project_id: string;
  resource_name: string;
  resource_role: string | null;
  period: string;
  planned_work_hours: number | null;
  actual_work_hours: number | null;
  hourly_rate: number | null;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
}

export interface MilestoneRow {
  project_id: string;
  work_package_id: string | null;
  name: string;
  due_date: string | null;
  is_contractual: boolean;
  achieved: boolean;
  achieved_date: string | null;
  source_system: SourceSystem;
  external_id: string | null;
  synced_at: string;
}

export interface SchedulerConnector {
  source: 'MS_PROJECT' | 'P6';
  testConnection(): Promise<ConnectionStatus>;
  fetchTasks(projectExternalId: string): Promise<SchedulerTaskDTO[]>;
  fetchResourceAssignments(projectExternalId: string): Promise<SchedulerResourceDTO[]>;
  fetchMilestones(projectExternalId: string): Promise<SchedulerMilestoneDTO[]>;
}
