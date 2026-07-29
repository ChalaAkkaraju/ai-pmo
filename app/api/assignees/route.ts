/**
 * GET /api/assignees — the list of people a task can be assigned to.
 *
 * Each person is a roles row (their own login) carrying a role_type. Used by
 * the assign-task and assign-actions pickers so a task can go to a specific
 * colleague or to a whole role. Admin and disabled accounts are excluded.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated', assignees: [] }, { status: 401 });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('roles')
    .select('id, name, username, role_type, is_admin, disabled')
    .order('role_type', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message, assignees: [] }, { status: 500 });
  }

  const assignees = (data ?? [])
    .filter((r) => !r.is_admin && !r.disabled && r.role_type !== 'admin')
    .map((r) => ({ id: r.id, name: r.name, username: r.username, role_type: r.role_type }));

  return NextResponse.json({ assignees }, { status: 200 });
}
