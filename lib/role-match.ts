/**
 * Fuzzy-match a free-text owner/role string (e.g. risks.owner = "Procurement
 * Manager", issues.owner = "Construction Manager") to one of the 10 RoleTypes.
 *
 * Used by the dashboard action ribbon's "just mine" toggle to decide whether a
 * risk/issue belongs to the viewing role. Returns null when nothing matches
 * confidently — callers treat null as "not mine".
 *
 * Kept independent of lib/action-parser.ts (which matches the agent's
 * assigned_to_role slugs) so each can evolve without breaking the other.
 */

import { ROLE_SHORT_LABELS, isValidRoleType } from './roles';
import type { RoleType } from './types';

const LABEL_TO_ROLE: Record<string, RoleType> = Object.entries(ROLE_SHORT_LABELS).reduce(
  (acc, [role, label]) => {
    acc[label.toLowerCase()] = role as RoleType;
    return acc;
  },
  {} as Record<string, RoleType>,
);

// Substring keywords → role. Ordered most-specific first; first hit wins.
const KEYWORD_RULES: Array<[RegExp, RoleType]> = [
  [/procure|buyer|sourcing|supply chain|vendor manager/i, 'procurement'],
  [/\brisk\b/i, 'risk'],
  [/sponsor|executive sponsor|vp\b/i, 'sponsor'],
  [/commercial|contract|estimat/i, 'commercial'],
  [/project controls|cost engineer|planner|scheduler|controls/i, 'project_controls'],
  [/program(me)? manager|portfolio manager/i, 'program_manager'],
  [/engineering|design lead|technical lead|lead engineer/i, 'engineering_manager'],
  [/construction|site manager|field|superintendent/i, 'construction_manager'],
  [/hse|h&s|health.*safety|safety|environment|ehs/i, 'hse_manager'],
  [/project manager|^pm$|\bpm\b|pmo director|senior pm/i, 'pm'],
];

export function matchRoleFromText(text: string | null | undefined): RoleType | null {
  if (!text) return null;
  const t = text.trim();
  if (!t) return null;
  // 1. exact role-type slug
  if (isValidRoleType(t)) return t;
  const lower = t.toLowerCase();
  // 2. exact short label
  if (LABEL_TO_ROLE[lower]) return LABEL_TO_ROLE[lower];
  // 3. keyword rules
  for (const [re, role] of KEYWORD_RULES) {
    if (re.test(lower)) return role;
  }
  return null;
}
