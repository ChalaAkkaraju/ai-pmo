/**
 * Demo role switcher (migration 0052).
 *
 *   GET  /api/role/switch              roles the signed-in switcher can act as
 *   POST /api/role/switch { role_id }  act as that role on THIS address;
 *                                      role_id 'self' returns to your own role
 *
 * Only a role flagged demo_switcher may use it. The choice is a cookie, so it
 * is per address: it-quality can act as the IT PMO while quality acts as you.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { ACTING_COOKIE, ACTING_SELF, getSessionRole } from '@/lib/auth';
import { homePathFor } from '@/lib/workspace';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function switcher() {
  const resolved = await getSessionRole();
  if (!resolved) return null;
  const own = resolved.actor ?? resolved.role;
  return own.demo_switcher ? { resolved, own } : null;
}

export async function GET() {
  const s = await switcher();
  if (!s) return NextResponse.json({ error: 'Not available for this account' }, { status: 403 });
  const { data } = await createSupabaseServiceClient().from('roles').select('id, name, role_type, disabled').eq('disabled', false).order('role_type');
  return NextResponse.json({ current: s.resolved.role.id, own: s.own.id, roles: data ?? [] });
}

const schema = z.object({ role_id: z.string().min(1) });

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const s = await switcher();
  if (!s) return NextResponse.json({ error: 'Not available for this account' }, { status: 403 });

  let target: Role = s.own;
  if (body.role_id !== ACTING_SELF && body.role_id !== s.own.id) {
    const { data } = await createSupabaseServiceClient().from('roles').select('*').eq('id', body.role_id).maybeSingle<Role>();
    if (!data || data.disabled) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    target = data;
  }
  const res = NextResponse.json({ ok: true, home: homePathFor(target), name: target.name });
  res.cookies.set(ACTING_COOKIE, target.id === s.own.id ? ACTING_SELF : target.id, {
    httpOnly: true, sameSite: 'lax', path: '/', secure: request.nextUrl.protocol === 'https:', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
