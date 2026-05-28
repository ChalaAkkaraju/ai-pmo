/**
 * Persist a long-form regenerated report back to its agent_outputs row.
 *
 * Why this exists: the original /api/agent call only returns the markdown —
 * it doesn't know which existing row to attach a regen to (it's used for
 * BOTH new invocations and on-demand long-form regens). When the report
 * page regenerates the long-form on first open, it calls this endpoint to
 * cache the result. Subsequent opens skip the regen entirely because the
 * server-side page render reads agent_outputs.full_output_md directly.
 *
 * POST /api/report/save-full
 * Body: { token: string, output_id: string, full_md: string }
 *
 * Auth: token in body, validated the same way the report page does.
 * Idempotency: simple UPDATE — last write wins. Race condition between
 * parallel users opening the same fresh report is benign (slightly wasted
 * regen cost, identical content).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  token: z.string().min(1),
  output_id: z.string().uuid(),
  full_md: z.string().min(1).max(200_000),
});

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof Body>;
  try {
    const raw = await request.json();
    parsed = Body.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid request body: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  // Validate the token — exact same check the report page does.
  const resolved = await resolveRoleFromToken(parsed.token);
  if (!resolved) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Confirm the agent_output exists before writing — protects against the
  // client sending a stale or wrong output_id.
  const supabase = createSupabaseServiceClient();
  const { data: existing, error: lookupError } = await supabase
    .from('agent_outputs')
    .select('id, full_output_md')
    .eq('id', parsed.output_id)
    .maybeSingle();

  if (lookupError || !existing) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // If something else already wrote the cache, leave it alone — saves a
  // wasted write and avoids an unnecessary Realtime broadcast.
  if (existing.full_output_md && existing.full_output_md.length > 0) {
    return NextResponse.json({ status: 'already_cached' }, { status: 200 });
  }

  const { error: updateError } = await supabase
    .from('agent_outputs')
    .update({ full_output_md: parsed.full_md })
    .eq('id', parsed.output_id);

  if (updateError) {
    console.error('[save-full] update failed:', updateError);
    return NextResponse.json(
      { error: `Failed to cache long-form: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: 'cached' }, { status: 200 });
}
