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
import { getRoleDefinition, isValidRoleType, roleLabel } from '@/lib/roles';
import { CROSS_CUTTING_CLASSES } from '@/lib/entry-parser';
import type { Role, RoleType } from '@/lib/types';

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
  }),
]);

const postSchema = z.object({
  token: z.string().min(6),
  project_code: z.string().min(1),
  entry: entrySchema,
});

const lmhNum = (v: string) => (v === 'H' ? 3 : v === 'M' ? 2 : 1);

async function roleFromToken(token: string): Promise<Role | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from('roles').select('*').eq('token', token).maybeSingle<Role>();
  return data ?? null;
}

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

  const role = await roleFromToken(body.token);
  if (!role) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  if (!isValidRoleType(role.role_type)) return NextResponse.json({ error: 'Unknown role' }, { status: 403 });
  if (!getRoleDefinition(role.role_type).can_write) {
    return NextResponse.json({ error: 'This role is read-only and cannot raise entries.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase
    .from('projects').select('id, current_week').eq('code', body.project_code).maybeSingle<{ id: string; current_week: number | null }>();
  if (!project) return NextResponse.json({ error: `Project "${body.project_code}" not found` }, { status: 404 });

  const e = body.entry;
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
    };
  }

  const { error } = await supabase.from(table).insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, type: e.type, code, table, id_col: idCol });
}
