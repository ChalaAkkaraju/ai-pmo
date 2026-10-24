/**
 * IT portfolio — envelope and waterline, through governance.
 *
 *   PUT  /api/portfolio/it   { fiscal_year, allocations: [{ bucket, allocated_amount, reserve_amount, is_mandatory_lane }] }
 *        Proposes the fiscal-year envelope (decision kind envelope_allocation →
 *        investment board, Finance concurrence). Rows are stored as 'proposed'
 *        until approved; a board member proposing applies immediately.
 *
 *   POST /api/portfolio/it   { fiscal_year, decisions: [{ project_code, outcome: 'approve' | 'defer', amount? }] }
 *        Proposes waterline outcomes, one decision record per bucket and kind
 *        (waterline_approval for new projects, continuation for running ones).
 *        The authority matrix picks the body by amount; on approval the
 *        sanction events and lifecycle updates are written.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { loadGovernance, resolveBodyKey, resolveRule, routeOrApply } from '@/lib/governance';
import type { DecisionRecord } from '@/lib/types';
import { bucketLabel } from '@/lib/it-portfolio';
import type { Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PROPOSERS = new Set(['it_portfolio_manager', 'it_bucket_owner', 'it_board_member']);

const putSchema = z.object({
  fiscal_year: z.number().int(),
  allocations: z.array(z.object({
    bucket: z.string().min(1),
    allocated_amount: z.number().nonnegative(),
    reserve_amount: z.number().nonnegative().default(0),
    is_mandatory_lane: z.boolean().default(false),
  })).min(1),
});

const postSchema = z.object({
  fiscal_year: z.number().int(),
  decisions: z.array(z.object({
    project_code: z.string().min(1),
    outcome: z.enum(['approve', 'defer']),
    amount: z.number().nonnegative().optional().nullable(),
  })).min(1),
});

export async function PUT(request: NextRequest) {
  let body: z.infer<typeof putSchema>;
  try { body = putSchema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!PROPOSERS.has(resolved.role.role_type)) return NextResponse.json({ error: 'Your role cannot propose the envelope.' }, { status: 403 });

  const sb = createSupabaseServiceClient();
  const g = await loadGovernance(sb, 'it');
  const total = body.allocations.reduce((n, a) => n + a.allocated_amount, 0);
  const res = await routeOrApply(sb, g, resolved.role, {
    project_type: 'it', kind: 'envelope_allocation', fiscal_year: body.fiscal_year, amount: total,
    title: `FY${body.fiscal_year} IT envelope — ${body.allocations.map((a) => `${bucketLabel(a.bucket)} ${Math.round(a.allocated_amount / 1000)}k`).join(', ')}`,
    proposal: { allocations: body.allocations },
  });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
  if (!res.applied && res.record) {
    // Store the proposed split so the ranking can be previewed against it.
    const { error } = await sb.from('portfolio_allocations').upsert(body.allocations.map((a) => ({
      project_type: 'it', fiscal_year: body.fiscal_year, bucket: a.bucket, allocated_amount: a.allocated_amount, reserve_amount: a.reserve_amount,
      is_mandatory_lane: a.is_mandatory_lane, status: 'proposed', decision_record_id: res.record!.id, updated_at: new Date().toISOString(),
    })), { onConflict: 'project_type,fiscal_year,bucket' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, applied: res.applied, requires: res.requires ?? null, record_id: res.record?.id ?? null });
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof postSchema>;
  try { body = postSchema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!PROPOSERS.has(resolved.role.role_type)) return NextResponse.json({ error: 'Your role cannot propose waterline decisions.' }, { status: 403 });

  const sb = createSupabaseServiceClient();
  const g = await loadGovernance(sb, 'it');
  const codes = body.decisions.map((d) => d.project_code);
  const { data: projects } = await sb.from('projects').select('*').in('code', codes).eq('project_type', 'it');
  const byCode = new Map((projects ?? []).map((p) => [(p as Project).code, p as Project]));

  // Group by bucket × kind so each decision goes to the right body.
  type Row = { project_id: string; project_code: string; outcome: 'approve' | 'defer'; amount: number; is_continuation: boolean };
  const groups = new Map<string, { bucket: string; kind: 'waterline_approval' | 'continuation'; rows: Row[] }>();
  for (const d of body.decisions) {
    const p = byCode.get(d.project_code);
    if (!p) continue;
    const isCont = Boolean(p.continuation_of_id) || (p.fiscal_years_approved ?? []).some((y) => y < body.fiscal_year);
    const kind = isCont ? 'continuation' : 'waterline_approval';
    const bucket = p.portfolio_bucket ?? 'unassigned';
    const key = `${bucket}|${kind}`;
    if (!groups.has(key)) groups.set(key, { bucket, kind, rows: [] });
    groups.get(key)!.rows.push({ project_id: p.id, project_code: p.code, outcome: d.outcome, amount: Number(d.amount ?? p.requested_budget ?? 0), is_continuation: isCont });
  }

  const results: Array<{ bucket: string; kind: string; applied: boolean; requires: string | null; record_id: string | null; error?: string }> = [];
  for (const grp of groups.values()) {
    const approved = grp.rows.filter((r) => r.outcome === 'approve');
    const amount = approved.reduce((n, r) => n + r.amount, 0);
    // One live proposal per bucket × kind × year. If the PMO re-runs the waterline
    // (or funds / defers a single project) while a proposal is still open, the open
    // proposal is amended rather than duplicated: rows for the same projects are
    // replaced, the rest kept, and the deciding body re-resolved from the new total.
    const { data: openRows } = await sb.from('decision_records').select('*').eq('project_type', 'it').eq('decision_kind', grp.kind)
      .eq('fiscal_year', body.fiscal_year).eq('status', 'proposed').contains('proposal', { bucket: grp.bucket }).order('proposed_at', { ascending: false }).limit(1);
    const open = (openRows ?? [])[0] as DecisionRecord | undefined;
    const title = (rows: Row[]) => `FY${body.fiscal_year} ${bucketLabel(grp.bucket)} ${grp.kind === 'continuation' ? 'continuations' : 'waterline'} — approve ${rows.filter((r) => r.outcome === 'approve').length}, defer ${rows.filter((r) => r.outcome === 'defer').length}`;
    if (open) {
      const prev = ((open.proposal as { decisions?: Row[] }).decisions ?? []).filter((r) => !grp.rows.some((n) => n.project_code === r.project_code));
      const merged = [...prev, ...grp.rows];
      const mergedAmount = merged.filter((r) => r.outcome === 'approve').reduce((n, r) => n + r.amount, 0);
      const rule = resolveRule(g, grp.kind, mergedAmount);
      const bodyKey = rule ? resolveBodyKey(rule.required_body_key, grp.bucket) : open.required_body_key;
      const { error } = await sb.from('decision_records').update({
        amount: mergedAmount, title: title(merged), proposal: { ...(open.proposal as Record<string, unknown>), bucket: grp.bucket, decisions: merged },
        required_body_key: bodyKey, required_concurrences: rule?.required_concurrences ?? open.required_concurrences, proposed_at: new Date().toISOString(),
      }).eq('id', open.id);
      results.push({ bucket: grp.bucket, kind: grp.kind, applied: false, requires: bodyKey, record_id: open.id, error: error?.message });
      continue;
    }
    const res = await routeOrApply(sb, g, resolved.role, {
      project_type: 'it', kind: grp.kind, bucket: grp.bucket, fiscal_year: body.fiscal_year, amount,
      title: title(grp.rows),
      proposal: { bucket: grp.bucket, decisions: grp.rows },
    });
    results.push({ bucket: grp.bucket, kind: grp.kind, applied: res.applied, requires: res.requires ?? null, record_id: res.record?.id ?? null, error: res.error });
  }
  return NextResponse.json({ ok: results.every((r) => !r.error), results });
}
