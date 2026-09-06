/**
 * Gate decisions — records the outcome of a stage gate on a project, through
 * governance where the authority matrix requires it.
 *
 *   POST /api/gates   { project_code, stage_seq, decision, notes?, criteria_scores?,
 *                       baseline_amount?, capex_share_pct?, hold_until? }
 *
 *   go at the COMMIT gate → decision kind commit_baseline (body by amount,
 *                           Finance concurrence). Applied immediately if the
 *                           actor may decide and Finance has concurred;
 *                           otherwise a proposal is opened.
 *   go elsewhere          → delivery decision, recorded directly; stage advances
 *                           (a GO at the last stage closes the project).
 *   hold                  → decision kind hold (pre-commit: sponsor; post-commit:
 *                           bucket owner), time-boxed by hold_until.
 *   kill                  → decision kind cancel (pre-commit: bucket owner;
 *                           post-commit: investment board + Finance).
 *   recycle / defer       → recorded directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { roleSees } from '@/lib/workspace';
import { stageAt, nextStage, isCommitted } from '@/lib/stage-gates';
import { isMember, loadGovernance, resolveBodyKey, resolveRule, routeOrApply } from '@/lib/governance';
import type { GateDecision, Project, ProjectType, StageTemplate } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DELIVERY_ROLES = new Set(['it_pm', 'it_portfolio_manager', 'it_sponsor', 'it_bucket_owner', 'it_board_member']);

const schema = z.object({
  project_code: z.string().min(1),
  stage_seq: z.number().int().min(0),
  decision: z.enum(['go', 'hold', 'kill', 'recycle', 'defer', 'resume']),
  notes: z.string().optional().nullable(),
  criteria_scores: z.record(z.unknown()).optional().nullable(),
  baseline_amount: z.number().nonnegative().optional().nullable(),
  capex_share_pct: z.number().min(0).max(100).optional().nullable(),
  hold_until: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const role = resolved.role;

  const sb = createSupabaseServiceClient();
  const { data: project } = await sb.from('projects').select('*').eq('code', body.project_code).maybeSingle<Project>();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!roleSees(role, project.project_type as ProjectType) || !DELIVERY_ROLES.has(role.role_type)) {
    return NextResponse.json({ error: 'Your role cannot record gate decisions on this project.' }, { status: 403 });
  }
  if (!project.stage_template_id) return NextResponse.json({ error: 'Project has no stage template.' }, { status: 400 });
  const { data: template } = await sb.from('stage_templates').select('*').eq('id', project.stage_template_id).maybeSingle<StageTemplate>();
  const stage = stageAt(template, body.stage_seq);
  if (!template || !stage) return NextResponse.json({ error: 'Unknown stage for this template.' }, { status: 400 });
  const { data: priorRows } = await sb.from('gate_decisions').select('*').eq('project_id', project.id);
  const committed = isCommitted(template, (priorRows ?? []) as GateDecision[]);

  // ---- governed decisions --------------------------------------------------
  if (body.decision === 'go' && stage.is_commit) {
    const g = await loadGovernance(sb, 'it');
    const amount = Number(body.baseline_amount ?? project.requested_budget ?? 0);
    const res = await routeOrApply(sb, g, role, {
      project_type: 'it', kind: 'commit_baseline', project, fiscal_year: project.fiscal_year, amount,
      title: `${project.code} ${project.name} — ${stage.gate_name}: lock baseline at $${amount.toLocaleString()}`,
      proposal: { stage_seq: stage.seq, criteria_scores: body.criteria_scores ?? null, capex_share_pct: body.capex_share_pct ?? null, notes: body.notes ?? null },
    });
    if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
    return NextResponse.json({ ok: true, applied: res.applied, requires: res.requires ?? null, record_id: res.record?.id ?? null });
  }
  // ---- lift a hold: same authority that places one (pre-commit sponsor, post-commit bucket owner) ----
  if (body.decision === 'resume') {
    if (project.lifecycle_status !== 'on_hold') return NextResponse.json({ error: 'The project is not on hold.' }, { status: 400 });
    const g = await loadGovernance(sb, 'it');
    const rule = resolveRule(g, 'hold', Number(project.approved_budget_current) || Number(project.requested_budget) || 0, { post_commit: committed });
    const bodyKey = rule ? resolveBodyKey(rule.required_body_key, project.portfolio_bucket) : null;
    if (!bodyKey || !isMember(g, role, bodyKey)) return NextResponse.json({ error: `Only ${bodyKey ? bodyKey.replace(/_/g, ' ').replace(':', ' — ') : 'the holding authority'} can lift this hold.` }, { status: 403 });
    const { error: gErr } = await sb.from('gate_decisions').insert({
      project_id: project.id, stage_seq: stage.seq, gate_name: stage.gate_name, decision: 'resume', decided_on: new Date().toISOString().slice(0, 10),
      decided_by: role.name, decided_by_role_type: role.role_type, notes: body.notes ?? 'Hold lifted', source_system: 'APP',
    });
    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
    const { error } = await sb.from('projects').update({ lifecycle_status: 'active' }).eq('id', project.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, applied: true });
  }
  if (body.decision === 'hold' || body.decision === 'kill') {
    if (body.decision === 'hold' && !body.hold_until) return NextResponse.json({ error: 'A hold must be time-boxed — give a hold-until date.' }, { status: 400 });
    const g = await loadGovernance(sb, 'it');
    const res = await routeOrApply(sb, g, role, {
      project_type: 'it', kind: body.decision === 'hold' ? 'hold' : 'cancel', project, fiscal_year: project.fiscal_year, amount: Number(project.approved_budget_current) || Number(project.requested_budget ?? 0),
      post_commit: committed,
      title: `${project.code} ${project.name} — ${body.decision === 'hold' ? `hold until ${body.hold_until}` : 'cancel'} (${committed ? 'post-commit' : 'pre-commit'})`,
      proposal: { stage_seq: stage.seq, notes: body.notes ?? null, hold_until: body.hold_until ?? null },
    });
    if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
    return NextResponse.json({ ok: true, applied: res.applied, requires: res.requires ?? null, record_id: res.record?.id ?? null });
  }

  // ---- delivery decisions (recorded directly) ------------------------------
  const { data: decisionRow, error: decErr } = await sb.from('gate_decisions').insert({
    project_id: project.id, stage_seq: stage.seq, gate_name: stage.gate_name, decision: body.decision, decided_by: role.name, decided_by_role_type: role.role_type,
    criteria_scores: body.criteria_scores ?? null, case_snapshot: null, notes: body.notes ?? null, source_system: 'APP',
  }).select('id').maybeSingle();
  if (decErr) return NextResponse.json({ error: `Could not record decision: ${decErr.message}` }, { status: 500 });

  const patch: Record<string, unknown> = {};
  if (body.decision === 'go') {
    const next = nextStage(template, stage.seq);
    if (next) { patch.current_stage = next.seq; patch.lifecycle_status = 'active'; }
    else { patch.lifecycle_status = 'closed'; patch.status = 'Closed'; }
  } else if (body.decision === 'defer') {
    patch.lifecycle_status = 'deferred';
  }
  if (Object.keys(patch).length) {
    const { error } = await sb.from('projects').update(patch).eq('id', project.id);
    if (error) return NextResponse.json({ error: `Decision recorded but project not updated: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, applied: true, decision_id: (decisionRow as { id: string } | null)?.id ?? null });
}
