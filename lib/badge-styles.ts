/**
 * Single source of truth for status / severity badge styling.
 *
 * Replaces the per-component status-class functions that had drifted apart
 * (two greens for "done", amber-vs-red for a realised risk, etc). Rules:
 *   - "good / done / closed / mitigated"  → emerald
 *   - "realised risk" (the materialised, bad state) → red
 *   - "active risk" (live, being managed) → amber
 *   - "open" → sky (risks/actions) or red (issues, where open = unresolved)
 *   - "in progress" → blue · "acknowledged" → indigo
 * Badge (soft 100/900) and heatmap dot (solid 500 + ring) variants are kept
 * in lockstep so a status reads the same colour wherever it appears.
 */

const GRAY = 'bg-gray-100 text-gray-700';

/** Risk lifecycle badge. */
export function riskBadge(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s.startsWith('realis') || s.startsWith('realiz')) return 'bg-red-100 text-red-900';
  if (s.includes('not materialis') || s.includes('not materializ')) return GRAY;
  if (s.includes('mitigat')) return 'bg-emerald-100 text-emerald-900';
  if (s.startsWith('active')) return 'bg-amber-100 text-amber-900';
  if (s.startsWith('open')) return 'bg-sky-100 text-sky-900';
  return GRAY;
}

/** Risk heatmap dot — same semantics as riskBadge, solid + ring. */
export function riskDot(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s.startsWith('realis') || s.startsWith('realiz')) return 'bg-red-500 ring-red-600';
  if (s.includes('not materialis') || s.includes('not materializ')) return 'bg-gray-400 ring-gray-500';
  if (s.includes('mitigat')) return 'bg-emerald-500 ring-emerald-600';
  if (s.startsWith('active')) return 'bg-amber-500 ring-amber-600';
  if (s.startsWith('open')) return 'bg-sky-500 ring-sky-600';
  return 'bg-slate-400 ring-slate-500';
}

/** Issue lifecycle badge (open = unresolved → red). */
export function issueBadge(raw: string): string {
  const s = raw ?? '';
  if (s === 'Closed' || s === 'Resolved') return 'bg-emerald-100 text-emerald-900';
  if (s === 'In progress') return 'bg-amber-100 text-amber-900';
  if (s === 'Open') return 'bg-red-100 text-red-900';
  return GRAY;
}

/** Issue severity H / M / L. */
export function severityBadge(sev: string): string {
  if (sev === 'H') return 'bg-red-100 text-red-900';
  if (sev === 'M') return 'bg-amber-100 text-amber-900';
  return GRAY;
}

/** Action-item (assigned task) lifecycle badge. */
export function actionBadge(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s === 'done') return 'bg-emerald-100 text-emerald-800';
  if (s === 'in progress') return 'bg-blue-100 text-blue-900';
  if (s === 'acknowledged') return 'bg-indigo-100 text-indigo-900';
  if (s === 'open') return 'bg-amber-100 text-amber-800';
  return GRAY;
}

/** Change-order lifecycle badge. */
export function changeOrderBadge(raw: string): string {
  const s = (raw ?? '').toLowerCase();
  if (s === 'executed' || s === 'complete') return 'bg-emerald-100 text-emerald-800';
  if (s === 'absorbed') return 'bg-orange-100 text-orange-800';
  if (s === 'rejected' || s === 'withdrawn') return 'bg-slate-200 text-slate-600';
  if (s === 'priced' || s === 'under analysis' || s === 'anticipated') return 'bg-blue-100 text-blue-900';
  return 'bg-slate-100 text-slate-700';
}

/** Integration sync-run outcome badge. */
export function syncBadge(raw: string): string {
  if (raw === 'failed') return 'bg-red-100 text-red-800';
  if (raw === 'partial') return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
}
