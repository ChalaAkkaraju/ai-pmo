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

import type { SapCostActualDTO, SchedulerTaskDTO, SchedulerResourceDTO } from './types';

function toNum(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function field(header: string[], v: string[], col: string): string {
  const i = header.indexOf(col);
  return i >= 0 ? (v[i] ?? '') : '';
}

export type TemplateType = 'wbs' | 'cost' | 'tasks' | 'resources';

/* ---- Cost ---- */
export const COST_TEMPLATE_COLUMNS = ['wbs_code', 'period', 'actual_cost', 'commitment', 'planned_value'] as const;
export function buildCostTemplate(): string {
  return [
    COST_TEMPLATE_COLUMNS.join(','),
    '1.1,2026-05-01,1100000,300000,1200000',
    '3.1,2026-05-01,7040000,1920000,7680000',
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
export const RESOURCE_TEMPLATE_COLUMNS = ['wbs_code', 'external_id', 'resource_name', 'resource_role', 'period', 'hours'] as const;
export function buildResourceTemplate(): string {
  return [
    RESOURCE_TEMPLATE_COLUMNS.join(','),
    '2.1,RA-01,Engineering pool,engineering_manager,2025-04-01,320',
    '4.1,RA-03,Construction pool,construction_manager,2025-12-01,640',
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
};
