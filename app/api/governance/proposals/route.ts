/**
 * Open a governed decision that is not raised from the portfolio or gates
 * screens: change-order approval (routed by funding source and amount) and
 * in-year reserve draws.
 *
 *   POST /api/governance/proposals
 *     { kind: 'change_order', project_code, change_order_id, funding_source }
 *     { kind: 'reserve_draw', project_code, amount, reason }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { loadGovernance, routeOrApply } from '@/lib/governance';
import { roleSees } from '@/lib/workspace';
import type { Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('change_order'), project_code: z.string().min(1), change_order_id: z.string().uuid(), funding_source: z.enum(['project_contingency', 'bucket_reserve', 'displacement']), displaces: z.string().optional().nullable() }),
  z.object({ kind: z.literal('reserve_draw'), project_code: z.string().min(1), amount: z.number().positive(), reason: z.string().min(1) }),
]);

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const sb = createSupabaseServiceClient();
  const { data: project } = await sb.from('projects').select('*').eq('code', body.project_code).maybeSingle<Project>();
  if (!project || !roleSees(resolved.role, project.project_type)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const g = await loadGovernance(sb, 'it');

  if (body.kind === 'change_order') {
    const { data: co } = await sb.from('change_orders').select('id, co_id, scope_summary, cost_impact_m, status').eq('id', body.change_order_id).eq('project_id', project.id).maybeSingle();
    if (!co) return NextResponse.json({ error: 'Change order not found' }, { status: 404 });
    const amount = Number((co as { cost_impact_m: number }).cost_impact_m) * 1_000_000;
    if ((co as { status: string }).status === 'Approved') return NextResponse.json({ error: 'This change order is already approved.' }, { status: 409 });
    // One live request per change order: a second submit returns the open one instead of duplicating it.
    const { data: openRows } = await sb.from('decision_records').select('id, required_body_key').eq('decision_kind', 'change_order').eq('status', 'proposed').contains('proposal', { change_order_id: body.change_order_id }).limit(1);
    const existing = (openRows ?? [])[0] as { id: string; required_body_key: string } | undefined;
    if (existing) return NextResponse.json({ ok: true, applied: false, requires: existing.required_body_key, record_id: existing.id, already_pending: true });
    await sb.from('change_orders').update({ funding_source: body.funding_source }).eq('id', body.change_order_id);
    const res = await routeOrApply(sb, g, resolved.role, {
      project_type: 'it', kind: 'change_order', project, fiscal_year: project.fiscal_year, amount, funding_source: body.funding_source,
      title: `${project.code} ${(co as { co_id: string }).co_id} — ${String((co as { scope_summary: string }).scope_summary).slice(0, 80)} · $${amount.toLocaleString()} from ${body.funding_source.replace(/_/g, ' ')}`,
      proposal: { change_order_id: body.change_order_id, funding_source: body.funding_source, ...(body.funding_source === 'displacement' && body.displaces ? { displaces: body.displaces } : {}) },
    });
    if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
    return NextResponse.json({ ok: true, applied: res.applied, requires: res.requires ?? null, record_id: res.record?.id ?? null });
  }

  const res = await routeOrApply(sb, g, resolved.role, {
    project_type: 'it', kind: 'reserve_draw', project, fiscal_year: project.fiscal_year, amount: body.amount,
    title: `${project.code} — in-year reserve draw $${body.amount.toLocaleString()}: ${body.reason.slice(0, 80)}`,
    proposal: { reason: body.reason },
  });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true, applied: res.applied, requires: res.requires ?? null, record_id: res.record?.id ?? null });
}
