/**
 * Capital governance actions on one project (migration 0051).
 *
 *   POST /api/capital/decisions
 *     { project_code, action: 'study_budget', amount, notes? }        FEL1/FEL2 gate: release the study budget for the next stage
 *     { project_code, action: 'afe', amount, notes?, document_ref? }  FEL3 (commit) gate: sanction the AFE
 *     { project_code, action: 'supplementary', increment, reason, eac? }  increase an approved AFE
 *     { project_code, action: 'hold', hold_until, notes? }
 *     { project_code, action: 'cancel', notes? }
 *
 * Every action goes through the authority matrix (lib/governance): if the
 * actor sits on the required body and no concurrence is outstanding it is
 * applied at once; otherwise a proposal is opened for the body to decide.
 * A supplementary is routed on the REVISED total, so a supplementary that
 * takes a project over a threshold goes to the higher authority — the rule
 * that stops large projects being approved in small pieces.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { roleSees } from '@/lib/workspace';
import { loadGovernance, routeOrApply } from '@/lib/governance';
import { commitStage, isCommitted, stageAt } from '@/lib/stage-gates';
import { asCapitalCase, capexVerdict, fmtMoneyCap } from '@/lib/capital';
import type { GateDecision, Project, StageTemplate } from '@/lib/types';

export const dynamic = 'force-dynamic';

// The deciders (committee, Finance) do not raise their own requests: proposer and decider stay apart.
const PROPOSERS = new Set(['capital_pm', 'capital_portfolio_manager', 'capital_sponsor']);

const schema = z.discriminatedUnion('action', [
  z.object({ project_code: z.string().min(1), action: z.literal('study_budget'), amount: z.number().nonnegative(), notes: z.string().optional().nullable() }),
  z.object({ project_code: z.string().min(1), action: z.literal('afe'), amount: z.number().positive(), notes: z.string().optional().nullable(), document_ref: z.string().optional().nullable() }),
  z.object({ project_code: z.string().min(1), action: z.literal('supplementary'), increment: z.number().positive(), reason: z.string().min(1, 'Say why the forecast moved'), eac: z.number().positive().optional().nullable() }),
  z.object({ project_code: z.string().min(1), action: z.literal('hold'), hold_until: z.string().min(1, 'A hold must be time-boxed'), notes: z.string().optional().nullable() }),
  z.object({ project_code: z.string().min(1), action: z.literal('cancel'), notes: z.string().optional().nullable() }),
]);

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const role = resolved.role;
  if (!PROPOSERS.has(role.role_type)) return NextResponse.json({ error: 'Your role cannot raise capital decisions. The capital PM, the PMO or the plant manager raises them.' }, { status: 403 });

  const sb = createSupabaseServiceClient();
  const { data: project } = await sb.from('projects').select('*').eq('code', body.project_code).maybeSingle<Project>();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (project.project_type !== 'capital' || !roleSees(role, 'capital')) return NextResponse.json({ error: 'Not a capital project you can see.' }, { status: 403 });
  if (!project.stage_template_id) return NextResponse.json({ error: 'Project has no stage template.' }, { status: 400 });
  if (['cancelled', 'closed'].includes(project.lifecycle_status)) return NextResponse.json({ error: `The project is ${project.lifecycle_status}.` }, { status: 400 });

  const [{ data: template }, { data: gd }, { data: open }] = await Promise.all([
    sb.from('stage_templates').select('*').eq('id', project.stage_template_id).maybeSingle<StageTemplate>(),
    sb.from('gate_decisions').select('*').eq('project_id', project.id),
    sb.from('decision_records').select('id, decision_kind').eq('project_id', project.id).eq('status', 'proposed'),
  ]);
  const committed = isCommitted(template, (gd ?? []) as GateDecision[]);
  const stage = stageAt(template, project.current_stage ?? 0);
  const commit = commitStage(template);
  const openKinds = new Set(((open ?? []) as Array<{ decision_kind: string }>).map((r) => r.decision_kind));
  const g = await loadGovernance(sb, 'capital');
  const bc = asCapitalCase(project.business_case);
  const label = `${project.code} ${project.name}`;

  let res;
  if (body.action === 'study_budget') {
    if (!stage || stage.is_commit || committed) return NextResponse.json({ error: 'Study budgets are released at the FEL1 and FEL2 gates, before the AFE.' }, { status: 400 });
    if (openKinds.has('gate_decision')) return NextResponse.json({ error: 'A gate release is already open on this project.' }, { status: 409 });
    res = await routeOrApply(sb, g, role, {
      project_type: 'capital', kind: 'gate_decision', project, fiscal_year: project.fiscal_year, amount: body.amount,
      title: `${label} — ${stage.gate_name}: release ${fmtMoneyCap(body.amount)} study budget`,
      proposal: { stage_seq: stage.seq, notes: body.notes ?? null, criteria_scores: { must_meet: stage.exit_criteria.map((c) => ({ criterion: c, met: true })) } },
    });
  } else if (body.action === 'afe') {
    if (committed) return NextResponse.json({ error: 'The AFE is already sanctioned — raise a supplementary for an increase.' }, { status: 400 });
    if (!stage?.is_commit) return NextResponse.json({ error: `The AFE is sanctioned at ${commit?.gate_name ?? 'the commit gate'}; this project is at ${stage?.name ?? 'an earlier stage'}.` }, { status: 400 });
    if (openKinds.has('afe_approval')) return NextResponse.json({ error: 'An AFE request is already open on this project.' }, { status: 409 });
    const verdict = capexVerdict(bc.capex_test);
    res = await routeOrApply(sb, g, role, {
      project_type: 'capital', kind: 'afe_approval', project, fiscal_year: project.fiscal_year, amount: body.amount,
      title: `${label} — AFE ${fmtMoneyCap(body.amount)} at ${stage.gate_name}`,
      proposal: {
        stage_seq: stage.seq, notes: body.notes ?? null, document_ref: body.document_ref ?? null,
        capex_verdict: verdict.verdict, estimate_class: bc.estimate_class ?? null, in_service_date: bc.in_service_date ?? null,
        npv_amount: bc.npv ?? null, irr_pct: bc.irr_pct ?? null,
      },
    });
  } else if (body.action === 'supplementary') {
    if (!committed) return NextResponse.json({ error: 'A supplementary AFE needs an approved AFE to add to.' }, { status: 400 });
    if (openKinds.has('supplementary_afe')) return NextResponse.json({ error: 'A supplementary AFE is already open on this project.' }, { status: 409 });
    const prior = Number(project.approved_budget_current) || 0;
    const revised = prior + body.increment;
    res = await routeOrApply(sb, g, role, {
      project_type: 'capital', kind: 'supplementary_afe', project, fiscal_year: project.fiscal_year, amount: revised,
      title: `${label} — supplementary AFE +${fmtMoneyCap(body.increment)} (revised total ${fmtMoneyCap(revised)})`,
      proposal: { increment_amount: body.increment, prior_total_amount: prior, eac_amount: body.eac ?? bc.eac ?? null, reason: body.reason, over_afe_pct: prior > 0 ? Math.round(((Number(body.eac ?? bc.eac ?? revised) - prior) / prior) * 1000) / 10 : null },
    });
  } else {
    if (openKinds.has(body.action)) return NextResponse.json({ error: `A ${body.action} request is already open on this project.` }, { status: 409 });
    res = await routeOrApply(sb, g, role, {
      project_type: 'capital', kind: body.action, project, fiscal_year: project.fiscal_year,
      amount: Number(project.approved_budget_current) || Number(project.requested_budget ?? 0), post_commit: committed,
      title: `${label} — ${body.action === 'hold' ? `hold until ${body.hold_until}` : 'cancel'} (${committed ? 'after AFE' : 'in FEL'})`,
      proposal: { stage_seq: project.current_stage ?? 0, notes: body.notes ?? null, hold_until: body.action === 'hold' ? body.hold_until : null },
    });
  }
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true, applied: res.applied, requires: res.requires ?? null, record_id: res.record?.id ?? null });
}
