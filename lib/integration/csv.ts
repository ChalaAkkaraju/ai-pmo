/**
 * CSV template + parser for the file / manual ingestion channel (Phase 6).
 *
 * The published WBS template has friendly column names; parsing maps each row
 * back into the SAP-shaped DTO so the upload flows through the SAME mapper and
 * ingestion pipeline as the API channel (same validation + exception handling).
 * Mirrors the proven template-download + parse pattern.
 */

import type { SapWbsElementDTO } from './types';

export const WBS_TEMPLATE_COLUMNS = [
  'wbs_code',
  'parent_wbs_code',
  'name',
  'responsible',       // PM | ENG | CON | PROC | COMM | CTRL | HSE
  'billing_element',   // true | false
  'budget',            // numeric (leaf budgets; phases roll up)
  'baseline',          // numeric (as-sold budget)
  'target_finish',     // YYYY-MM-DD
] as const;

export function buildWbsTemplate(): string {
  const header = WBS_TEMPLATE_COLUMNS.join(',');
  const sample = [
    '1,,Development & permits,,false,,,',
    '1.1,1,Permits & approvals,PM,false,2000000,1920000,2026-03-31',
    '2,,Engineering,,false,,,',
    '2.1,2,Detailed design,ENG,false,6000000,5760000,2026-09-30',
    '3,,Procurement,,false,,,',
    '3.1,3,Major equipment supply,PROC,true,12800000,12288000,2027-02-28',
  ].join('\n');
  return `${header}\n${sample}\n`;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Parse the WBS template into SAP-shaped DTOs. Returns an error only when the
 * required COLUMNS are absent — row-level problems (e.g. a blank code) are left
 * for the mapper to flag as exceptions, exactly like an API sync.
 */
export function parseWbsCsv(text: string): { rows: SapWbsElementDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };

  const header = splitCsvLine(lines[0]);
  const required = ['wbs_code', 'name'];
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length > 0) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };

  const idx = (c: string) => header.indexOf(c);
  const num = (v: string): number | null => {
    const n = Number(v);
    return v.trim() === '' || Number.isNaN(n) ? null : n;
  };

  const rows: SapWbsElementDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    const code = v[idx('wbs_code')] ?? '';
    rows.push({
      WBSElementExternalID: code,
      ParentWBSElement: (v[idx('parent_wbs_code')] || '') || null,
      WBSElementDescription: v[idx('name')] ?? '',
      PersonResponsible: (v[idx('responsible')] || '') || null,
      IsBillingElement: (v[idx('billing_element')] || '').toLowerCase() === 'true',
      Budget: idx('budget') >= 0 ? num(v[idx('budget')] ?? '') : null,
      BudgetBaseline: idx('baseline') >= 0 ? num(v[idx('baseline')] ?? '') : null,
      LatestFinishDate: (idx('target_finish') >= 0 ? (v[idx('target_finish')] || '') : '') || null,
      WBSElementInternalID: code || `row-${i}`,
    });
  }
  return { rows, error: null };
}

/* ===================== Cost / Tasks / Resources templates ===================== */

import type { SapCostActualDTO, SchedulerTaskDTO, SchedulerResourceDTO, SapPurchaseOrderDTO, SapBillingDTO, SapResultsAnalysisDTO, SapChangeOrderDTO, SchedulerMilestoneDTO } from './types';

function toNum(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function field(header: string[], v: string[], col: string): string {
  const i = header.indexOf(col);
  return i >= 0 ? (v[i] ?? '') : '';
}

export type TemplateType = 'wbs' | 'cost' | 'tasks' | 'resources' | 'commitment' | 'billing' | 'results_analysis' | 'change_orders' | 'milestones';

/* ---- Cost ---- */
export const COST_TEMPLATE_COLUMNS = ['wbs_code', 'period', 'actual_cost', 'commitment', 'planned_value', 'value_category'] as const;
export function buildCostTemplate(): string {
  return [
    COST_TEMPLATE_COLUMNS.join(','),
    '1.1,2026-05-01,770000,210000,840000,Labour',
    '3.1,2026-05-01,5632000,1536000,6144000,Materials/Equipment',
    '4.1,2026-05-01,1430000,390000,1560000,Subcontract',
  ].join('\n') + '\n';
}
export function parseCostCsv(text: string): { rows: SapCostActualDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };
  const header = splitCsvLine(lines[0]);
  const missing = ['wbs_code', 'period'].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  const rows: SapCostActualDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    rows.push({
      WBSElementExternalID: field(header, v, 'wbs_code'),
      FiscalPeriod: field(header, v, 'period'),
      ActualAmount: toNum(field(header, v, 'actual_cost')) ?? 0,
      CommitmentAmount: toNum(field(header, v, 'commitment')) ?? 0,
      PlannedAmount: toNum(field(header, v, 'planned_value')),
      ValueCategory: field(header, v, 'value_category') || null,
    });
  }
  return { rows, error: null };
}

/* ---- Tasks (schedule) ---- */
export const TASK_TEMPLATE_COLUMNS = ['wbs_code', 'external_id', 'name', 'start', 'finish', 'percent_complete'] as const;
export function buildTaskTemplate(): string {
  return [
    TASK_TEMPLATE_COLUMNS.join(','),
    '1.1,T-01,Obtain permits,2025-01-15,2025-04-15,100',
    '3.1,T-04,Procure major equipment,2025-06-15,2026-03-15,55',
  ].join('\n') + '\n';
}
export function parseTaskCsv(text: string): { rows: SchedulerTaskDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };
  const header = splitCsvLine(lines[0]);
  const missing = ['wbs_code', 'name'].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  const rows: SchedulerTaskDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    rows.push({
      external_id: field(header, v, 'external_id') || `file-task-${i}`,
      name: field(header, v, 'name'),
      wbs_code: field(header, v, 'wbs_code') || null,
      start: field(header, v, 'start') || null,
      finish: field(header, v, 'finish') || null,
      percent_complete: toNum(field(header, v, 'percent_complete')),
    });
  }
  return { rows, error: null };
}

/* ---- Resources ---- */
export const RESOURCE_TEMPLATE_COLUMNS = ['wbs_code', 'external_id', 'resource_name', 'resource_role', 'period', 'hours', 'actual_hours', 'hourly_rate'] as const;
export function buildResourceTemplate(): string {
  return [
    RESOURCE_TEMPLATE_COLUMNS.join(','),
    '2.1,RA-01,Engineering pool,engineering_manager,2025-04-01,320,290,145',
    '4.1,RA-03,Construction pool,construction_manager,2025-12-01,640,700,110',
  ].join('\n') + '\n';
}
export function parseResourceCsv(text: string): { rows: SchedulerResourceDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };
  const header = splitCsvLine(lines[0]);
  const missing = ['resource_name', 'period'].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  const rows: SchedulerResourceDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    rows.push({
      external_id: field(header, v, 'external_id') || `file-res-${i}`,
      wbs_code: field(header, v, 'wbs_code') || null,
      resource_name: field(header, v, 'resource_name'),
      resource_role: field(header, v, 'resource_role') || null,
      period: field(header, v, 'period'),
      hours: toNum(field(header, v, 'hours')),
      actual_hours: toNum(field(header, v, 'actual_hours')),
      hourly_rate: toNum(field(header, v, 'hourly_rate')),
    });
  }
  return { rows, error: null };
}

/* ---- Commitment (purchase orders) ---- */
export const COMMITMENT_TEMPLATE_COLUMNS = ['wbs_code', 'po_number', 'vendor', 'value_category', 'po_value', 'received_value', 'status', 'raised_week'] as const;
export function buildCommitmentTemplate(): string {
  return [
    COMMITMENT_TEMPLATE_COLUMNS.join(','),
    '3.1,4500012345,Siemens Energy,Materials/Equipment,9000000,3600000,Partially received,8',
    '4.1,4500012346,Bechtel,Subcontract,2800000,900000,Partially received,14',
  ].join('\n') + '\n';
}
export function parseCommitmentCsv(text: string): { rows: SapPurchaseOrderDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };
  const header = splitCsvLine(lines[0]);
  const missing = ['wbs_code', 'po_number'].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  const rows: SapPurchaseOrderDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    rows.push({
      PurchaseOrder: field(header, v, 'po_number'),
      WBSElementExternalID: field(header, v, 'wbs_code'),
      Supplier: field(header, v, 'vendor'),
      ValueCategory: field(header, v, 'value_category') || 'Other',
      NetOrderValue: toNum(field(header, v, 'po_value')) ?? 0,
      DeliveredValue: toNum(field(header, v, 'received_value')) ?? 0,
      PurchaseOrderStatus: field(header, v, 'status') || 'Open',
      CreatedPeriodWeek: toNum(field(header, v, 'raised_week')),
    });
  }
  return { rows, error: null };
}

/* ---- Billing ---- */
export const BILLING_TEMPLATE_COLUMNS = ['wbs_code', 'invoice_number', 'billing_type', 'amount', 'billed_week', 'status'] as const;
export function buildBillingTemplate(): string {
  return [
    BILLING_TEMPLATE_COLUMNS.join(','),
    '1,9000045001,Advance,4000000,6,Paid',
    '3,9000045002,Milestone,18000000,18,Invoiced',
  ].join('\n') + '\n';
}
export function parseBillingCsv(text: string): { rows: SapBillingDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };
  const header = splitCsvLine(lines[0]);
  const missing = ['invoice_number'].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  const rows: SapBillingDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    rows.push({
      BillingDocument: field(header, v, 'invoice_number'),
      WBSElementExternalID: field(header, v, 'wbs_code') || null,
      BillingCategory: field(header, v, 'billing_type') || 'Progress',
      NetAmount: toNum(field(header, v, 'amount')) ?? 0,
      BilledPeriodWeek: toNum(field(header, v, 'billed_week')),
      BillingStatus: field(header, v, 'status') || 'Invoiced',
    });
  }
  return { rows, error: null };
}

/* ---- Results Analysis ---- */
export const RA_TEMPLATE_COLUMNS = ['wbs_code', 'period', 'ra_method', 'poc_pct', 'planned_cost', 'planned_revenue', 'cost_of_sales', 'calculated_revenue', 'recognized_margin', 'reserve'] as const;
export function buildRaTemplate(): string {
  return [
    RA_TEMPLATE_COLUMNS.join(','),
    '3,2026-05-01,Cost-based POC,71,42000000,46200000,29820000,32802000,2982000,0',
    '4,2026-05-01,Cost-based POC,22,23000000,25300000,5060000,5566000,506000,0',
  ].join('\n') + '\n';
}
export function parseRaCsv(text: string): { rows: SapResultsAnalysisDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };
  const header = splitCsvLine(lines[0]);
  const missing = ['period'].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  const rows: SapResultsAnalysisDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    rows.push({
      WBSElementExternalID: field(header, v, 'wbs_code') || null,
      FiscalPeriod: field(header, v, 'period'),
      RAMethod: field(header, v, 'ra_method') || 'Cost-based POC',
      PercentageOfCompletion: toNum(field(header, v, 'poc_pct')) ?? 0,
      PlannedCost: toNum(field(header, v, 'planned_cost')) ?? 0,
      PlannedRevenue: toNum(field(header, v, 'planned_revenue')) ?? 0,
      CostOfSales: toNum(field(header, v, 'cost_of_sales')) ?? 0,
      CalculatedRevenue: toNum(field(header, v, 'calculated_revenue')) ?? 0,
      RecognizedMargin: toNum(field(header, v, 'recognized_margin')) ?? 0,
      Reserve: toNum(field(header, v, 'reserve')) ?? 0,
    });
  }
  return { rows, error: null };
}

/* ---- Change orders (variations) ---- */
export const CHANGE_ORDER_TEMPLATE_COLUMNS = ['co_id', 'driver', 'scope_summary', 'cost_impact_m', 'revenue_impact_m', 'schedule_impact_days', 'margin_realized_pct', 'status', 'approval_routing', 'executed_week'] as const;
export function buildChangeOrderTemplate(): string {
  return [
    CHANGE_ORDER_TEMPLATE_COLUMNS.join(','),
    'CO-1001,Owner-requested scope,Additional grid connection bay,1.25,1.55,21,19,Executed,Steering committee,41',
    'CO-1002,Site condition,Unforeseen ground conditions — extra piling,0.90,0.60,35,,Priced,Project board,',
  ].join('\n') + '\n';
}
export function parseChangeOrderCsv(text: string): { rows: SapChangeOrderDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };
  const header = splitCsvLine(lines[0]);
  const missing = ['co_id', 'scope_summary'].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  const rows: SapChangeOrderDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    rows.push({
      ChangeOrderID: field(header, v, 'co_id'),
      ChangeDriver: field(header, v, 'driver'),
      ScopeDescription: field(header, v, 'scope_summary'),
      CostImpactM: toNum(field(header, v, 'cost_impact_m')) ?? 0,
      RevenueImpactM: toNum(field(header, v, 'revenue_impact_m')) ?? 0,
      ScheduleImpactDays: toNum(field(header, v, 'schedule_impact_days')) ?? 0,
      MarginRealizedPct: toNum(field(header, v, 'margin_realized_pct')),
      COStatus: field(header, v, 'status') || 'Under analysis',
      ApprovalRouting: field(header, v, 'approval_routing') || null,
      ExecutedPeriodWeek: toNum(field(header, v, 'executed_week')),
    });
  }
  return { rows, error: null };
}

/* ---- Milestones (schedule) ---- */
export const MILESTONE_TEMPLATE_COLUMNS = ['wbs_code', 'external_id', 'name', 'due_date', 'is_contractual', 'achieved', 'achieved_date'] as const;
export function buildMilestoneTemplate(): string {
  return [
    MILESTONE_TEMPLATE_COLUMNS.join(','),
    ',MS-01,Notice to proceed (NTP),2025-02-15,true,true,2025-02-15',
    '3.1,MS-03,Major equipment delivered,2026-04-15,true,false,',
  ].join('\n') + '\n';
}
export function parseMilestoneCsv(text: string): { rows: SchedulerMilestoneDTO[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'File is empty' };
  const header = splitCsvLine(lines[0]);
  const missing = ['name'].filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], error: `Missing required columns: ${missing.join(', ')}` };
  const rows: SchedulerMilestoneDTO[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitCsvLine(lines[i]);
    rows.push({
      external_id: field(header, v, 'external_id') || `file-ms-${i}`,
      name: field(header, v, 'name'),
      wbs_code: field(header, v, 'wbs_code') || null,
      due_date: field(header, v, 'due_date') || null,
      is_contractual: field(header, v, 'is_contractual').toLowerCase() === 'true',
      achieved: field(header, v, 'achieved').toLowerCase() === 'true',
      achieved_date: field(header, v, 'achieved_date') || null,
    });
  }
  return { rows, error: null };
}

/* ---- Dispatch ---- */
export const TEMPLATE_META: Record<TemplateType, { label: string; filename: string; build: () => string }> = {
  wbs: { label: 'WBS (structure)', filename: 'wbs-import-template.csv', build: buildWbsTemplate },
  cost: { label: 'Cost actuals', filename: 'cost-import-template.csv', build: buildCostTemplate },
  tasks: { label: 'Schedule (tasks)', filename: 'tasks-import-template.csv', build: buildTaskTemplate },
  resources: { label: 'Resource assignments', filename: 'resources-import-template.csv', build: buildResourceTemplate },
  commitment: { label: 'Commitment (POs)', filename: 'commitment-import-template.csv', build: buildCommitmentTemplate },
  billing: { label: 'Billing', filename: 'billing-import-template.csv', build: buildBillingTemplate },
  results_analysis: { label: 'Results Analysis', filename: 'results-analysis-import-template.csv', build: buildRaTemplate },
  change_orders: { label: 'Change orders', filename: 'change-orders-import-template.csv', build: buildChangeOrderTemplate },
  milestones: { label: 'Milestones', filename: 'milestones-import-template.csv', build: buildMilestoneTemplate },
};

/* ===================== Exporters (current data → CSV) =====================
 * Download what's in the canonical model in the SAME template column order, so
 * you can edit and re-upload (round-trip). Plus an SAP-loadable WBS export. */

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(columns: readonly string[], rows: Array<Record<string, unknown>>): string {
  const lines = [columns.join(',')];
  for (const r of rows) lines.push(columns.map((c) => csvCell(r[c])).join(','));
  return lines.join('\n') + '\n';
}

const ROLE_TO_CODE: Record<string, string> = {
  pm: 'PM', engineering_manager: 'ENG', construction_manager: 'CON', procurement: 'PROC',
  commercial: 'COMM', project_controls: 'CTRL', hse_manager: 'HSE',
};

type WP = { wbs_code: string; parent_wbs_code: string | null; name: string; responsible_role_type: string | null; is_billing_element: boolean; budget_bac: number | null; baseline_bac: number | null; target_finish: string | null };

export function exportWbsCsv(wps: WP[]): string {
  return toCsv(WBS_TEMPLATE_COLUMNS, wps.map((w) => ({
    wbs_code: w.wbs_code, parent_wbs_code: w.parent_wbs_code ?? '', name: w.name,
    responsible: w.responsible_role_type ? (ROLE_TO_CODE[w.responsible_role_type] ?? '') : '',
    billing_element: w.is_billing_element ? 'true' : 'false',
    budget: w.budget_bac ?? '', baseline: w.baseline_bac ?? '', target_finish: w.target_finish ?? '',
  })));
}
export function exportCostCsv(rows: Array<Record<string, unknown>>): string {
  return toCsv(COST_TEMPLATE_COLUMNS, rows.map((r) => ({
    wbs_code: r.wbs_code, period: r.period, actual_cost: r.actual_cost, commitment: r.commitment, planned_value: r.planned_value, value_category: r.value_category ?? '',
  })));
}
export function exportTaskCsv(rows: Array<Record<string, unknown>>): string {
  return toCsv(TASK_TEMPLATE_COLUMNS, rows.map((r) => ({
    wbs_code: r.wbs_code, external_id: r.external_id, name: r.name, start: r.start_date, finish: r.finish_date, percent_complete: r.percent_complete,
  })));
}
export function exportResourceCsv(rows: Array<Record<string, unknown>>): string {
  return toCsv(RESOURCE_TEMPLATE_COLUMNS, rows.map((r) => ({
    wbs_code: '', external_id: r.external_id, resource_name: r.resource_name, resource_role: r.resource_role, period: r.period, hours: r.planned_work_hours, actual_hours: r.actual_work_hours ?? '', hourly_rate: r.hourly_rate ?? '',
  })));
}

export function exportCommitmentCsv(rows: Array<Record<string, unknown>>): string {
  return toCsv(COMMITMENT_TEMPLATE_COLUMNS, rows.map((r) => ({
    wbs_code: r.wbs_code, po_number: r.po_number, vendor: r.vendor, value_category: r.value_category,
    po_value: r.po_value, received_value: r.received_value, status: r.status, raised_week: r.raised_week,
  })));
}
export function exportBillingCsv(rows: Array<Record<string, unknown>>): string {
  return toCsv(BILLING_TEMPLATE_COLUMNS, rows.map((r) => ({
    wbs_code: r.wbs_code, invoice_number: r.invoice_number, billing_type: r.billing_type,
    amount: r.amount, billed_week: r.billed_week, status: r.status,
  })));
}
export function exportRaCsv(rows: Array<Record<string, unknown>>): string {
  return toCsv(RA_TEMPLATE_COLUMNS, rows.map((r) => ({
    wbs_code: r.wbs_code, period: r.period, ra_method: r.ra_method, poc_pct: r.poc_pct,
    planned_cost: r.planned_cost, planned_revenue: r.planned_revenue, cost_of_sales: r.cost_of_sales,
    calculated_revenue: r.calculated_revenue, recognized_margin: r.recognized_margin, reserve: r.reserve,
  })));
}
export function exportChangeOrderCsv(rows: Array<Record<string, unknown>>): string {
  return toCsv(CHANGE_ORDER_TEMPLATE_COLUMNS, rows.map((r) => ({
    co_id: r.co_id, driver: r.driver, scope_summary: r.scope_summary, cost_impact_m: r.cost_impact_m,
    revenue_impact_m: r.revenue_impact_m, schedule_impact_days: r.schedule_impact_days, margin_realized_pct: r.margin_realized_pct ?? '',
    status: r.status, approval_routing: r.approval_routing ?? '', executed_week: r.executed_week ?? '',
  })));
}
export function exportMilestoneCsv(rows: Array<Record<string, unknown>>): string {
  return toCsv(MILESTONE_TEMPLATE_COLUMNS, rows.map((r) => ({
    wbs_code: '', external_id: r.external_id, name: r.name, due_date: r.due_date ?? '',
    is_contractual: r.is_contractual ? 'true' : 'false', achieved: r.achieved ? 'true' : 'false', achieved_date: r.achieved_date ?? '',
  })));
}

/* SAP PS WBS load file — columns shaped for an SAP project-structure upload
 * (Project Builder / LSMW). PSPID=project def, POSID=WBS element, POST1=short
 * text, STUFE=level, FAKKZ=billing-element flag, VERNR=responsible, plan budget. */
export const SAP_WBS_LOAD_COLUMNS = ['PSPID', 'POSID', 'POST1', 'STUFE', 'PARENT_POSID', 'FAKKZ', 'VERNR', 'PLAN_BUDGET'] as const;
export function buildSapWbsLoad(projectCode: string, wps: WP[]): string {
  const rows = [...wps].sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true })).map((w) => ({
    PSPID: projectCode,
    POSID: w.wbs_code,
    POST1: w.name,
    STUFE: w.wbs_code.split('.').length,
    PARENT_POSID: w.parent_wbs_code ?? '',
    FAKKZ: w.is_billing_element ? 'X' : '',
    VERNR: w.responsible_role_type ? (ROLE_TO_CODE[w.responsible_role_type] ?? '') : '',
    PLAN_BUDGET: w.budget_bac ?? '',
  }));
  return toCsv(SAP_WBS_LOAD_COLUMNS, rows);
}
