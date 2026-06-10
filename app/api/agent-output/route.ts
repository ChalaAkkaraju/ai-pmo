/**
 * Agent-output edit route handler.
 *
 *   PATCH /api/agent-output   save a human-edited version of an agent draft,
 *                             or revert to the AI original.
 *
 * Keeps the AI draft (output_md) untouched; the PM's correction is stored in
 * edited_md with provenance (edited_by_role_type + edited_at). Role-gated to
 * write-capable roles (read-only roles like the Sponsor cannot edit). See
 * migration 0015.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { ROLE_DEFINITIONS } from '@/lib/roles';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    token: z.string().min(6),
    id: z.string().uuid(),
    edited_md: z.string().min(1).optional(),
    revert: z.boolean().optional(),
  })
  .refine((v) => v.revert === true || typeof v.edited_md === 'string', {
    message: 'Provide edited_md to save, or revert: true to clear edits',
  });

async function roleFromToken(token: string): Promise<Role | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from('roles').select('*').eq('token', token).maybeSingle<Role>();
  return data ?? null;
}

export async function PATCH(request: NextRequest) {
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }

  const role = await roleFromToken(body.token);
  if (!role) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  if (ROLE_DEFINITIONS[role.role_type]?.can_write !== true) {
    return NextResponse.json({ error: 'Your role is read-only and cannot edit drafts.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();

  const update =
    body.revert === true
      ? { edited_md: null, edited_by_role_type: null, edited_at: null }
      : {
          edited_md: body.edited_md,
          edited_by_role_type: role.role_type,
          edited_at: new Date().toISOString(),
        };

  const { data, error } = await supabase
    .from('agent_outputs')
    .update(update)
    .eq('id', body.id)
    .select('id, edited_md, edited_by_role_type, edited_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `Could not save edit: ${error.message}` }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Output not found' }, { status: 404 });
  }
  return NextResponse.json(data, { status: 200 });
}
