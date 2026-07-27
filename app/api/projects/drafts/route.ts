/**
 * Project intake DRAFTS route handler.
 *
 *   POST   /api/projects/drafts   save a draft (insert, or update when draft_id given)
 *   GET    /api/projects/drafts?token=…   list the caller role's drafts
 *   DELETE /api/projects/drafts?token=…&id=…   discard a draft
 *
 * Drafts hold a half-filled intake form so a PM / Engineering Manager can
 * finish + submit later. A draft carries no project code — the code is only
 * assigned when the draft is submitted via POST /api/projects. Role-gated to
 * the same roles that may create projects. See migration 0014.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CREATE_ROLES = new Set(['pm', 'engineering_manager']);

const postSchema = z.object({
  segment: z.enum(['renewables', 'water', 'industrial', 'power']),
  draft_id: z.string().uuid().optional(),
  name: z.string().optional().nullable(),
  payload: z.record(z.unknown()).optional().default({}),
});

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
  if (!CREATE_ROLES.has(role.role_type)) {
    return NextResponse.json({ error: 'Your role cannot save project drafts.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();
  const name = body.name?.trim() ? body.name.trim() : null;

  if (body.draft_id) {
    const { data, error } = await supabase
      .from('project_drafts')
      .update({ segment: body.segment, name, payload: body.payload ?? {} })
      .eq('id', body.draft_id)
      .eq('created_by_role_type', role.role_type)
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: `Could not save draft: ${error.message}` }, { status: 500 });
    if (data) return NextResponse.json({ id: data.id }, { status: 200 });
    // draft_id didn't match a row this role owns — fall through to insert.
  }

  const { data, error } = await supabase
    .from('project_drafts')
    .insert({ segment: body.segment, name, payload: body.payload ?? {}, created_by_role_type: role.role_type })
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: `Could not save draft: ${error.message}` }, { status: 500 });
  return NextResponse.json({ id: data?.id }, { status: 200 });
}

export async function GET() {
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated', items: [] }, { status: 401 });
  const role = resolved.role;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('project_drafts')
    .select('id, segment, name, updated_at')
    .eq('created_by_role_type', role.role_type)
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ items: [] }, { status: 200 });
  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';

  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const role = resolved.role;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('project_drafts')
    .delete()
    .eq('id', id)
    .eq('created_by_role_type', role.role_type);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
