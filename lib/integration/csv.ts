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
