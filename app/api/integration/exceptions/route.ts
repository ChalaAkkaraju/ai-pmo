/**
 * PATCH /api/integration/exceptions — resolve or ignore a sync exception.
 * Body: { token, id, status: 'resolved' | 'ignored' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { resolveRoleFromToken } from '@/lib/role-context';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(6),
  id: z.string().uuid(),
  status: z.enum(['resolved', 'ignored']),
});

export async function PATCH(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await resolveRoleFromToken(body.token);
  if (!resolved) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  if (!resolved.definition.can_write) {
    return NextResponse.json({ error: 'Your role cannot resolve sync exceptions.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('sync_exceptions').update({ status: body.status }).eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
