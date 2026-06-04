/**
 * Phase 6 integration — shared types (the "ports").
 *
 * DTOs are SOURCE-shaped (what the system of record's API returns); canonical
 * rows are what we upsert. Mappers translate DTO → canonical and flag anything
 * that can't map. Adapters (live or mock) implement the connector interfaces.
 * See AI-PMO-Integration-Sync-Contract.md.
 */

export type SourceSystem = 'SAP_PS' | 'DATAVERSE' | 'P6';
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
