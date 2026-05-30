/**
 * Parser for the machine-readable ```actions block that the Risk Analyst
 * (and, later, other agents) append to their markdown output.
 *
 * The agent emits, at the very end of its response, a fenced block like:
 *
 *   ```actions
 *   [
 *     { "description": "Secure an alternate transformer supplier and pre-qualify",
 *       "assigned_to_role": "procurement", "urgency": "H", "source_ref": "R-004" }
 *   ]
 *   ```
 *
 * This module:
 *   1. extracts that block (tolerant of whitespace / casing),
 *   2. validates each item with Zod, normalising assigned_to_role to a known
 *      RoleType (fallback to 'pm' + a flag when the model names something
 *      off-list — mirrors the agent-router's fallback discipline),
 *   3. returns clean ProposedAction objects for the Assign UI, and
 *   4. provides a helper to strip the block from the markdown shown to users.
 *
 * Nothing here writes to the DB — that happens only on user confirmation via
 * POST /api/actions.
 */

import { z } from 'zod';
import { isValidRoleType, ROLE_SHORT_LABELS } from './roles';
import type { ActionUrgency, RoleType } from './types';

export interface ProposedAction {
  description: string;
  /** Normalised, always a valid RoleType. */
  assigned_to_role: RoleType;
  /** What the model originally wrote (for transparency when we had to coerce). */
  assigned_to_role_raw: string;
  /** True when assigned_to_role was coerced to the 'pm' fallback. */
  flagged: boolean;
  urgency: ActionUrgency;
  source_ref: string | null;
}

const FENCE_RE = /```actions\s*([\s\S]*?)```/i;

const rawItemSchema = z.object({
  description: z.string().min(1),
  assigned_to_role: z.string().min(1),
  urgency: z.string().optional(),
  source_ref: z.string().optional().nullable(),
});

/** Lower-cased label → role type, for coercing free-text role names. */
const LABEL_TO_ROLE: Record<string, RoleType> = Object.entries(
  ROLE_SHORT_LABELS,
).reduce((acc, [role, label]) => {
  acc[label.toLowerCase()] = role as RoleType;
  return acc;
}, {} as Record<string, RoleType>);

// A few common aliases the model tends to produce.
const ROLE_ALIASES: Record<string, RoleType> = {
  'procurement manager': 'procurement',
  'procurement strategist': 'procurement',
  'procurement lead': 'procurement',
  'risk manager': 'risk',
  'risk analyst': 'risk',
  'commercial manager': 'commercial',
  'project controls manager': 'project_controls',
  'project controls': 'project_controls',
  'program manager': 'program_manager',
  'programme manager': 'program_manager',
  'engineering manager': 'engineering_manager',
  'construction manager': 'construction_manager',
  'hse manager': 'hse_manager',
  'health and safety': 'hse_manager',
  sponsor: 'sponsor',
  'vp sponsor': 'sponsor',
  'project manager': 'pm',
  'senior pm': 'pm',
  pm: 'pm',
};

function coerceRole(raw: string): { role: RoleType; flagged: boolean } {
  const trimmed = raw.trim();
  // 1. exact role-type slug (e.g. "procurement")
  if (isValidRoleType(trimmed)) return { role: trimmed, flagged: false };
  const lower = trimmed.toLowerCase();
  // 2. known short label
  if (LABEL_TO_ROLE[lower]) return { role: LABEL_TO_ROLE[lower], flagged: false };
  // 3. alias table
  if (ROLE_ALIASES[lower]) return { role: ROLE_ALIASES[lower], flagged: false };
  // 4. give up — assign to PM and flag for review
  return { role: 'pm', flagged: true };
}

function coerceUrgency(raw: string | undefined): ActionUrgency {
  const v = (raw ?? '').trim().toUpperCase();
  if (v === 'L' || v === 'H') return v;
  if (v.startsWith('LOW')) return 'L';
  if (v.startsWith('HIGH')) return 'H';
  return 'M';
}

/**
 * Extract and validate proposed actions from an agent's markdown output.
 * Returns an empty array when there's no block or it can't be parsed —
 * never throws, so the chat UI degrades gracefully.
 */
export function parseProposedActions(markdown: string): ProposedAction[] {
  if (!markdown) return [];
  const match = markdown.match(FENCE_RE);
  if (!match) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1].trim());
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const actions: ProposedAction[] = [];
  for (const entry of parsed) {
    const result = rawItemSchema.safeParse(entry);
    if (!result.success) continue;
    const { role, flagged } = coerceRole(result.data.assigned_to_role);
    actions.push({
      description: result.data.description.trim(),
      assigned_to_role: role,
      assigned_to_role_raw: result.data.assigned_to_role.trim(),
      flagged,
      urgency: coerceUrgency(result.data.urgency),
      source_ref: result.data.source_ref?.trim() || null,
    });
  }
  return actions;
}

/**
 * Remove the ```actions block from markdown before rendering it to the user.
 * The block is for the system; the human reads the narrative + register.
 */
export function stripActionsBlock(markdown: string): string {
  if (!markdown) return markdown;
  return markdown.replace(FENCE_RE, '').replace(/\n{3,}$/, '\n').trimEnd();
}
