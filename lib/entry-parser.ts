/**
 * Parser for the machine-readable ```pmo-entry block that risk/issue/change
 * agents append when the user asks to *raise* (create) an entry through the
 * agent — the create-mode counterpart to lib/action-parser.ts.
 *
 * The agent emits, at the end of its reply, a fenced block like:
 *
 *   ```pmo-entry
 *   { "type": "risk",
 *     "description": "Sole-source transformer vendor may slip delivery ~6 weeks",
 *     "category": "Procurement", "probability": "M", "impact": "H",
 *     "cross_cutting_class": "Vendor / supplier concentration",
 *     "owner": "Procurement Strategist", "response": "Mitigate",
 *     "trigger": "Vendor misses the Week 14 milestone", "status": "Open" }
 *   ```
 *
 * Nothing here writes to the DB — that happens only on user confirmation via
 * POST /api/entries, exactly like the assign-actions flow.
 */

import { z } from 'zod';

export type EntryKind = 'risk' | 'issue' | 'change' | 'continuation_request' | 'displacement' | 'benefit_report';

const LMH = z.enum(['L', 'M', 'H']);

const riskSchema = z.object({
  type: z.literal('risk'),
  description: z.string().min(1),
  category: z.string().optional().default('General'),
  probability: LMH.optional().default('M'),
  impact: LMH.optional().default('M'),
  cross_cutting_class: z.string().optional().default('Project-specific'),
  owner: z.string().optional().default(''),
  response: z.string().optional().default('Mitigate'),
  trigger: z.string().optional().default(''),
  status: z.string().optional().default('Open'),
});

const issueSchema = z.object({
  type: z.literal('issue'),
  description: z.string().min(1),
  category: z.string().optional().default('General'),
  severity: LMH.optional().default('M'),
  owner: z.string().optional().default(''),
  status: z.enum(['Open', 'In progress', 'Resolved', 'Closed']).optional().default('Open'),
});

const changeSchema = z.object({
  type: z.literal('change'),
  scope_summary: z.string().min(1),
  driver: z.string().optional().default('Client-directed scope'),
  cost_impact_m: z.coerce.number().optional().default(0),
  revenue_impact_m: z.coerce.number().optional().default(0),
  schedule_impact_days: z.coerce.number().optional().default(0),
  status: z.enum(['Identified', 'Quantified', 'Submitted to client', 'In negotiation', 'Approved', 'Absorbed', 'Withdrawn']).optional().default('Identified'),
  /** IT projects only: which pot pays — routes the approval (sponsor / bucket owner / CIO / board). */
  funding_source: z.enum(['project_contingency', 'bucket_reserve', 'displacement']).optional().nullable().default(null),
});

// ---- IT PMO records (raised through the assistant, confirmed by the user) ----

const continuationSchema = z.object({
  type: z.literal('continuation_request'),
  fiscal_year: z.coerce.number().int(),
  requested_budget: z.coerce.number().nonnegative(),
  note: z.string().optional().default(''),
});

const displacementSchema = z.object({
  type: z.literal('displacement'),
  resource_name: z.string().min(1),
  skill: z.string().optional().default(''),
  to_project_code: z.string().optional().default(''),
  from_date: z.string().min(4),
  to_date: z.string().optional().nullable().default(null),
  fte: z.coerce.number().positive().optional().default(1),
  schedule_impact_days: z.coerce.number().int().optional().default(0),
  reason: z.enum(['incident_run', 'higher_priority_project', 'audit_compliance', 'revenue_priority', 'other']).optional().default('higher_priority_project'),
  notes: z.string().optional().default(''),
});

const benefitSchema = z.object({
  type: z.literal('benefit_report'),
  period: z.string().min(4),
  planned_benefit: z.coerce.number().nonnegative(),
  realised_benefit: z.coerce.number().nonnegative(),
  commentary: z.string().optional().default(''),
});

const entrySchema = z.discriminatedUnion('type', [riskSchema, issueSchema, changeSchema, continuationSchema, displacementSchema, benefitSchema]);

export type ProposedEntry = z.infer<typeof entrySchema>;

const FENCE_RE = /```pmo-entry\s*([\s\S]*?)```/i;

/** Extract + validate the first pmo-entry block. Returns null if absent/invalid. */
export function parseProposedEntry(md: string | undefined | null): ProposedEntry | null {
  if (!md) return null;
  const m = md.match(FENCE_RE);
  if (!m) return null;
  let json: unknown;
  try {
    json = JSON.parse(m[1].trim());
  } catch {
    return null;
  }
  const parsed = entrySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** Remove the pmo-entry fenced block from markdown shown to the user. */
export function stripEntryBlock(md: string): string {
  return md.replace(FENCE_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

export const CROSS_CUTTING_CLASSES = [
  'Vendor / supplier concentration',
  'Regulatory / external deadline',
  'Site-conditions variance',
  'Resource / labour scarcity',
  'Client-driven scope or sequence changes',
  'Weather / climate-sensitive construction',
  'Project-specific',
] as const;
