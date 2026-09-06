/**
 * Resource displacement log — a shared person moved from this project to
 * another project type's work (typically a revenue recovery with LD exposure).
 * Recorded, dated and attributed, never absorbed.
 *
 *   POST /api/displacements  { project_code, resource_name, skill?, to_project_code?, from_date, to_date?, fte?, schedule_impact_days?, reason, notes? }
 *   PATCH /api/displacements { id, to_date }   (close an open displacement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { roleSees } from '@/lib/workspace';
import type { Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

const postSchema = z.object({
  project_code: z.string().min(1),
  resource_name: z.string().min(1),
  skill: z.string().optional().nullable(),
  to_project_code: z.string().optional().nullable(),
  from_date: z.string().min(8),
  to_date: z.string().optional().nullable(),
  fte: z.number().min(0.05).max(1).default(1),
  schedule_impact_days: z.number().int().optional().nullable(),
  reason: z.enum(['incident_run', 'higher_priority_project', 'audit_compliance', 'revenue_priority', 'other']),
  notes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof postSchema>;
  try { body = postSchema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!resolved.definition.can_write) return NextResponse.json({ error: 'Read-only role' }, { status: 403 });
  const sb = createSupabaseServiceClient();
  const { data: from } = await sb.from('projects').select('id, project_type').eq('code', body.project_code).maybeSingle<Pick<Project, 'id' | 'project_type'>>();
  if (!from || !roleSees(resolved.role, from.project_type)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  let toId: string | null = null;
  if (body.to_project_code) {
    const { data: to } = await sb.from('projects').select('id').eq('code', body.to_project_code).maybeSingle();
    toId = (to as { id: string } | null)?.id ?? null;
  }
  const { data, error } = await sb.from('resource_displacements').insert({
    from_project_id: from.id, to_project_id: toId, to_project_code: body.to_project_code ?? null, resource_name: body.resource_name, skill: body.skill ?? null,
    from_date: body.from_date, to_date: body.to_date ?? null, fte: body.fte, schedule_impact_days: body.schedule_impact_days ?? null, reason: body.reason, notes: body.notes ?? null,
    logged_by_role_id: resolved.role.id, logged_by_name: resolved.role.name,
  }).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id });
}

export async function PATCH(request: NextRequest) {
  const body = z.object({ id: z.string().uuid(), to_date: z.string().min(8) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  const resolved = await getSessionRole();
  if (!resolved || !resolved.definition.can_write) return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from('resource_displacements').update({ to_date: body.data.to_date }).eq('id', body.data.id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
