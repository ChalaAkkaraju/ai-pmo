/**
 * Raise-an-entry route — lets a write-capable role create a risk / issue /
 * change-order entry *through the agent* (the agent drafts a ```pmo-entry
 * block; the chat shows a confirm card; confirming POSTs here).
 *
 * Rows are written app-raised (source_system='APP', created_via='agent') so
 * they read as provisional until booked back to the system of record.
 *
 *   POST /api/entries  { token, project_code, entry: {type, ...fields} }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { getRoleDefinition, isValidRoleType, roleLabel } from '@/lib/roles';
import { CROSS_CUTTING_CLASSES } from '@/lib/entry-parser';
import type { RoleType } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LMH = z.enum(['L', 'M', 'H']);
const entrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('risk'),
    description: z.string().min(1),
    category: z.string().default('General'),
    probability: LMH.default('M'),
    impact: LMH.default('M'),
    cross_cutting_class: z.string().default('Project-specific'),
    owner: z.string().default(''),
    response: z.string().default('Mitigate'),
    trigger: z.string().default(''),
    status: z.string().default('Open'),
  }),
  z.object({
    type: z.literal('issue'),
    description: z.string().min(1),
    category: z.string().default('General'),
    severity: LMH.default('M'),
    owner: z.string().default(''),
    status: z.enum(['Open', 'In progress', 'Resolved', 'Closed']).default('Open'),
  }),
  z.object({
    type: z.literal('change'),
    scope_summary: z.string().min(1),
    driver: z.string().default('Client-directed scope'),
    cost_impact_m: z.coerce.number().default(0),
    revenue_impact_m: z.coerce.number().default(0),
    schedule_impact_days: z.coerce.number().default(0),
    status: z.enum(['Identified', 'Quantified', 'Submitted to client', 'In negotiation', 'Approved', 'Absorbed', 'Withdrawn']).default('Identified'),
    funding_source: z.enum(['project_contingency', 'bucket_reserve', 'displacement']).nullable().optional().default(null),
  }),
  // IT PMO records (see lib/entry-parser.ts for the agent-facing shape)
  z.object({ type: z.literal('continuation_request'), fiscal_year: z.coerce.number().int(), requested_budget: z.coerce.number().nonnegative(), note: z.string().default('') }),
  z.object({
    type: z.literal('displacement'), resource_name: z.string().min(1), skill: z.string().default(''), to_project_code: z.string().default(''),
    from_date: z.string().min(4), to_date: z.string().nullable().optional().default(null), fte: z.coerce.number().positive().default(1),
    schedule_impact_days: z.coerce.number().int().default(0), reason: z.enum(['incident_run', 'higher_priority_project', 'audit_compliance', 'revenue_priority', 'other']).default('higher_priority_project'), notes: z.string().default(''),
  }),
  z.object({ type: z.literal('benefit_report'), period: z.string().min(4), planned_benefit: z.coerce.number().nonnegative(), realised_benefit: z.coerce.number().nonnegative(), commentary: z.string().default('') }),
]);

const postSchema = z.object({
  project_code: z.string().min(1),
  entry: entrySchema,
});

const lmhNum = (v: string) => (v === 'H' ? 3 : v === 'M' ? 2 : 1);

export async function POST(request: NextRequest) {
  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }

  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const role = resolved.role;
  if (!isValidRoleType(role.role_type)) return NextResponse.json({ error: 'Unknown role' }, { status: 403 });
  if (!getRoleDefinition(role.role_type).can_write) {
    return NextResponse.json({ error: 'This role is read-only and cannot raise entries.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase
    .from('projects').select('id, current_week').eq('code', body.project_code).maybeSingle<{ id: string; current_week: number | null }>();
  if (!project) return NextResponse.json({ error: `Project "${body.project_code}" not found` }, { status: 404 });

  const e = body.entry;
  const prov0 = { source_system: 'APP', created_via: 'agent', created_by_role_type: role.role_type as RoleType };

  // ---- IT PMO records: the assistant drafts, the user confirmed, we write. ----
  if (e.type === 'continuation_request') {
    const { data: row } = await supabase.from('projects').select('intake_json, project_type').eq('id', project.id).maybeSingle<{ intake_json: Record<string, unknown> | null; project_type: string }>();
    if (!row || row.project_type === 'revenue') return NextResponse.json({ error: 'Continuation requests apply to IT projects only.' }, { status: 400 });
    const { error } = await supabase.from('projects').update({
      fiscal_year: e.fiscal_year, requested_budget: e.requested_budget,
      intake_json: { ...(row.intake_json ?? {}), continuation_note: e.note || null, continuation_requested_at: new Date().toISOString(), continuation_requested_by: role.name },
    }).eq('id', project.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, type: e.type, code: `FY${e.fiscal_year}`, table: 'projects', id_col: 'code' });
  }
  if (e.type === 'displacement') {
    const { data: target } = e.to_project_code ? await supabase.from('projects').select('id').eq('code', e.to_project_code).maybeSingle<{ id: string }>() : { data: null };
    const { data: ins, error } = await supabase.from('resource_displacements').insert({
      from_project_id: project.id, to_project_id: target?.id ?? null, to_project_code: e.to_project_code || null,
      resource_name: e.resource_name, skill: e.skill || null, from_date: e.from_date, to_date: e.to_date || null, fte: e.fte,
      schedule_impact_days: e.schedule_impact_days || null, reason: e.reason, notes: e.notes || null, logged_by_role_id: role.id, logged_by_name: role.name,
    }).select('id').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, type: e.type, code: e.resource_name, table: 'resource_displacements', id_col: 'id', id: (ins as { id: string } | null)?.id });
  }
  if (e.type === 'benefit_report') {
    const { error } = await supabase.from('benefits_reports').upsert({
      project_id: project.id, period: e.period, planned_benefit: e.planned_benefit, realised_benefit: e.realised_benefit,
      commentary: e.commentary || null, reported_by: role.name, reported_at: new Date().toISOString(),
    }, { onConflict: 'project_id,period' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, type: e.type, code: e.period, table: 'benefits_reports', id_col: 'period' });
  }
  void prov0;

  const table = e.type === 'risk' ? 'risks' : e.type === 'issue' ? 'issues' : 'change_orders';
  const idCol = e.type === 'risk' ? 'risk_id' : e.type === 'issue' ? 'issue_id' : 'co_id';
  const prefix = e.type === 'risk' ? 'R' : e.type === 'issue' ? 'I' : 'CO';

  // Next app-raised id for this project + type.
  const { count } = await supabase
    .from(table).select('id', { count: 'exact', head: true })
    .eq('project_id', project.id).eq('source_system', 'APP');
  const seq = String((count ?? 0) + 1).padStart(2, '0');
  const code = `${prefix}-A${seq}`;

  const prov = { source_system: 'APP', created_via: 'agent', created_by_role_type: role.role_type as RoleType };
  let row: Record<string, unknown>;
  if (e.type === 'risk') {
    const ccc = (CROSS_CUTTING_CLASSES as readonly string[]).includes(e.cross_cutting_class) ? e.cross_cutting_class : 'Project-specific';
    row = {
      project_id: project.id, risk_id: code, category: e.category, description: e.description,
      probability: e.probability, impact: e.impact, score: lmhNum(e.probability) * lmhNum(e.impact),
      response: e.response || 'Mitigate', owner: e.owner || roleLabel(role.role_type),
      trigger: e.trigger || '[NEEDS REVIEW]', status: e.status || 'Open', cross_cutting_class: ccc, ...prov,
    };
  } else if (e.type === 'issue') {
    row = {
      project_id: project.id, issue_id: code, description: e.description, category: e.category,
      severity: e.severity, owner: e.owner || roleLabel(role.role_type), status: e.status,
      opened_week: project.current_week ?? 0, ...prov,
    };
  } else {
    row = {
      project_id: project.id, co_id: code, driver: e.driver, scope_summary: e.scope_summary,
      cost_impact_m: e.cost_impact_m, revenue_impact_m: e.revenue_impact_m,
      schedule_impact_days: e.schedule_impact_days, status: e.status, ...prov,
      ...(e.funding_source ? { funding_source: e.funding_source } : {}),
    };
  }

  const { data: inserted, error } = await supabase.from(table).insert(row).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, type: e.type, code, table, id_col: idCol, id: (inserted as { id: string } | null)?.id ?? null });
}
