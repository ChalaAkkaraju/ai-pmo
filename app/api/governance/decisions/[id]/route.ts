/**
 * Act on a decision record.
 *
 *   POST /api/governance/decisions/:id
 *     { action: 'concur', body_key, outcome: 'concur' | 'object', notes? }
 *     { action: 'decide', outcome: 'approved' | 'rejected' | 'returned', attendees?, conditions?, minutes? }
 *     { action: 'withdraw' }   (proposer only)
 *
 * Membership of the required body (or the concurrence body) is checked in
 * lib/governance; approval applies the operational effect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { concur, decide, loadGovernance } from '@/lib/governance';
import type { DecisionRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('concur'), body_key: z.string().min(1), outcome: z.enum(['concur', 'object']), notes: z.string().optional().nullable() }),
  z.object({ action: z.literal('decide'), outcome: z.enum(['approved', 'rejected', 'returned']), attendees: z.array(z.string()).optional(), conditions: z.string().optional().nullable(), minutes: z.string().optional().nullable() }),
  z.object({ action: z.literal('withdraw') }),
]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const sb = createSupabaseServiceClient();
  const { data: rec } = await sb.from('decision_records').select('*').eq('id', id).maybeSingle<DecisionRecord>();
  if (!rec) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
  const g = await loadGovernance(sb, rec.project_type);

  if (body.action === 'withdraw') {
    if (rec.proposed_by_role_id !== resolved.role.id) return NextResponse.json({ error: 'Only the proposer can withdraw.' }, { status: 403 });
    if (rec.status !== 'proposed') return NextResponse.json({ error: 'Decision is no longer open' }, { status: 400 });
    const { error } = await sb.from('decision_records').update({ status: 'withdrawn' }).eq('id', rec.id);
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (body.action === 'concur') {
    const res = await concur(sb, g, resolved.role, rec, body.body_key, body.outcome, body.notes ?? null);
    if (res.error) return NextResponse.json({ error: res.error }, { status: 403 });
    return NextResponse.json({ ok: true, record: res.record });
  }
  const res = await decide(sb, g, resolved.role, rec, body.outcome, { attendees: body.attendees, conditions: body.conditions ?? null, minutes: body.minutes ?? null });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 403 });
  return NextResponse.json({ ok: true, applied: res.applied, record: res.record });
}
