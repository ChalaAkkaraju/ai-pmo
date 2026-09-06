/**
 * Benefits realisation — the named benefits owner reports planned vs realised
 * benefit per period after close (12–24 months), so the ranking model learns.
 *
 *   POST /api/benefits  { project_code, period, planned_benefit, realised_benefit, commentary? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { roleSees } from '@/lib/workspace';
import type { Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

const schema = z.object({
  project_code: z.string().min(1),
  period: z.string().regex(/^\d{4}-(Q[1-4]|\d{2})$/, 'period like 2027-Q1 or 2027-03'),
  planned_benefit: z.number().nonnegative(),
  realised_benefit: z.number().nonnegative(),
  commentary: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved || !resolved.definition.can_write) return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  const sb = createSupabaseServiceClient();
  const { data: p } = await sb.from('projects').select('id, project_type').eq('code', body.project_code).maybeSingle<Pick<Project, 'id' | 'project_type'>>();
  if (!p || !roleSees(resolved.role, p.project_type)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const { error } = await sb.from('benefits_reports').upsert({
    project_id: p.id, period: body.period, planned_benefit: body.planned_benefit, realised_benefit: body.realised_benefit, commentary: body.commentary ?? null,
    reported_by: resolved.role.name, reported_at: new Date().toISOString(),
  }, { onConflict: 'project_id,period' });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
