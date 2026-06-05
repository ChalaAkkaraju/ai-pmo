/**
 * Canonical risk status buckets.
 *
 * The seeded risk register accumulated ~18 free-text status variants
 * ("Realised — closed", "Active — buffer intact", "Realised (once, contained)"
 * …) which overwhelm users on the dashboard. We collapse everything to five
 * clean buckets, used both for display and (via migration 0011) for the
 * underlying data.
 *
 *   Open             — raised, not yet being actively managed
 *   Active           — live and being managed/monitored (any "Active — …")
 *   Mitigated        — response succeeded; risk brought down/closed via mitigation
 *   Realised         — the risk event occurred (any "Realised …")
 *   Not materialised — window passed without the event occurring
 */
import { riskBadge } from '@/lib/badge-styles';

export type CanonicalRiskStatus =
  | 'Open'
  | 'Active'
  | 'Mitigated'
  | 'Realised'
  | 'Not materialised';

/** Display order for charts/legends. */
export const CANONICAL_RISK_STATUSES: CanonicalRiskStatus[] = [
  'Open',
  'Active',
  'Mitigated',
  'Realised',
  'Not materialised',
];

/**
 * Map any raw status string to one of the five canonical buckets.
 * Order of checks matters: "Active — mitigated to date" must land in Active,
 * not Mitigated, so Active is tested before the bare "mitigated" check.
 */
export function canonicalRiskStatus(raw: string | null | undefined): CanonicalRiskStatus {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return 'Open';
  if (s.startsWith('realised') || s.startsWith('realized')) return 'Realised';
  if (s.startsWith('active')) return 'Active';
  if (s.includes('not materialis') || s.includes('not materializ')) return 'Not materialised';
  if (s.includes('mitigat')) return 'Mitigated';
  if (s.startsWith('open')) return 'Open';
  return 'Open';
}

/** Tailwind badge classes per canonical bucket. */
export function riskStatusBadgeClass(status: CanonicalRiskStatus): string {
  return riskBadge(status);
}
