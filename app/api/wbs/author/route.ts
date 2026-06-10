/**
 * POST /api/wbs/author — AI authors a deliverable-based WBS for an app-native
 * project, persisted as a PROPOSAL (status='proposed', source_system='APP').
 *
 * This is the upstream "authoring" bookend of the intelligence layer: ERPs are
 * weak at authoring a WBS (static templates), so the AI proposes a scope-true
 * structure that a human reviews and then BOOKS into SAP (see /api/wbs/book).
 * Templates act as guardrails (coding mask + mandatory phases), the AI fills
 * the project-specific detail beneath them. Nothing is written to SAP here —
 * this only creates a reviewable proposal in our own canonical model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { resolveRoleFromToken } from '@/lib/role-context';
import { invokeModel } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ token: z.string().min(6), projectCode: z.string().min(1) });

interface WbsNode {
  code: string;
  parent: string | null;
  name: string;
  role?: string | null;
  billing?: boolean;
  weight?: number;
}

const ALLOWED_ROLES = new Set([
  'pm', 'engineering_manager', 'construction_manager', 'procurement',
  'commercial', 'project_controls', 'hse_manager', 'program_manager',
]);

// Deterministic guardrail structure — used if the model is unavailable or
// returns unparseable JSON, so the flow always works. Five governance phases
// with a few deliverable leaves; weights across all leaves sum to 1.
function fallbackWbs(segment: string): WbsNode[] {
  const proc =
    segment === 'renewables' ? 'Module & inverter supply' :
    segment === 'water' ? 'Membrane & pump supply' :
    segment === 'power' ? 'Turbine & BoP supply' : 'Process equipment supply';
  return [
    { code: '1', parent: null, name: 'Development & permits' },
    { code: '1.1', parent: '1', name: 'Permits & approvals', role: 'pm', weight: 0.05 },
    { code: '1.2', parent: '1', name: 'Land & grid/connection rights', role: 'commercial', weight: 0.05 },
    { code: '2', parent: null, name: 'Engineering' },
    { code: '2.1', parent: '2', name: 'Detailed design', role: 'engineering_manager', weight: 0.12 },
    { code: '2.2', parent: '2', name: 'Design reviews & approvals', role: 'engineering_manager', weight: 0.05 },
    { code: '3', parent: null, name: 'Procurement' },
    { code: '3.1', parent: '3', name: proc, role: 'procurement', billing: true, weight: 0.30 },
    { code: '3.2', parent: '3', name: 'Balance-of-plant procurement', role: 'procurement', weight: 0.10 },
    { code: '4', parent: null, name: 'Construction' },
    { code: '4.1', parent: '4', name: 'Civil & foundations', role: 'construction_manager', weight: 0.10 },
    { code: '4.2', parent: '4', name: 'Mechanical & electrical install', role: 'construction_manager', billing: true, weight: 0.13 },
    { code: '5', parent: null, name: 'Commissioning & handover' },
    { code: '5.1', parent: '5', name: 'Testing & commissioning', role: 'engineering_manager', weight: 0.03 },
    { code: '5.2', parent: '5', name: 'Handover & closeout', role: 'pm', weight: 0.02 },
  ];
}

function parseWbs(text: string): WbsNode[] | null {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr
      .filter((n) => n && typeof n.code === 'string' && typeof n.name === 'string')
      .map((n) => ({
        code: String(n.code),
        parent: n.parent == null ? null : String(n.parent),
        name: String(n.name),
        role: n.role ? String(n.role) : null,
        billing: n.billing === true,
        weight: typeof n.weight === 'number' ? n.weight : 0,
      }));
  } catch {
    return null;
  }
}

async function authorWithModel(project: Record<string, unknown>): Promise<WbsNode[]> {
  const system =
    'You are a senior SAP PS project-controls architect. Author a deliverable-based Work Breakdown Structure for ONE project. ' +
    'Rules: exactly 4-6 top-level phases (parent=null); each phase has 1-3 deliverable leaf elements; ' +
    'use a numeric coding mask (phases "1","2",…; leaves "1.1","1.2",…); mark 1-2 cost-heavy leaves as billing elements; ' +
    'assign each leaf a responsible role from this set only: pm, engineering_manager, construction_manager, procurement, commercial, project_controls, hse_manager. ' +
    'Give each LEAF a weight (fraction of total budget); all leaf weights MUST sum to 1.0. Phases have weight 0. ' +
    'Return ONLY a JSON array, no prose, of objects {code, parent, name, role, billing, weight}.';
  const user =
    `Project: ${project.name}\nSegment: ${project.segment}\nClient: ${project.client ?? '—'}\n` +
    `Contract value: ${project.contract_value_current}\nApproved budget: ${project.approved_budget_current}\n` +
    `Hard deadline: ${project.hard_deadline_description ?? 'none'}\n\nAuthor the WBS now as a JSON array.`;
  const res = await invokeModel({ systemPrompt: system, userMessage: user });
  return parseWbs(res.output_md) ?? fallbackWbs(String(project.segment));
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await resolveRoleFromToken(body.token);
  if (!resolved) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  if (!resolved.definition.can_write) {
    return NextResponse.json({ error: 'Your role cannot author a WBS.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase.from('projects').select('*').eq('code', body.projectCode).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Refuse if a real (active) WBS already exists — that is the system of record.
  const { data: activeRows } = await supabase
    .from('work_packages').select('id').eq('project_id', project.id).eq('status', 'active').limit(1);
  if (activeRows && activeRows.length > 0) {
    return NextResponse.json({ error: 'This project already has a booked WBS.' }, { status: 409 });
  }

  // Author (model, with deterministic fallback).
  let nodes: WbsNode[];
  try {
    nodes = await authorWithModel(project as Record<string, unknown>);
  } catch {
    nodes = fallbackWbs(String(project.segment));
  }

  // Compute budgets: leaf = weight × BAC; phase = sum of its leaf budgets.
  const bac = Number(project.approved_budget_current) || 0;
  const leafBudget = new Map<string, number>();
  for (const n of nodes) {
    if (n.parent) leafBudget.set(n.code, Math.round((n.weight ?? 0) * bac * 100) / 100);
  }
  const phaseBudget = new Map<string, number>();
  for (const n of nodes) {
    if (n.parent) phaseBudget.set(n.parent, (phaseBudget.get(n.parent) ?? 0) + (leafBudget.get(n.code) ?? 0));
  }

  const rows = nodes.map((n) => ({
    project_id: project.id,
    wbs_code: n.code,
    parent_wbs_code: n.parent,
    name: n.name,
    responsible_role_type: n.role && ALLOWED_ROLES.has(n.role) ? n.role : null,
    is_billing_element: n.billing === true,
    budget_bac: n.parent ? (leafBudget.get(n.code) ?? 0) : (phaseBudget.get(n.code) ?? 0),
    source_system: 'APP',
    is_app_native: true,
    status: 'proposed',
    authored_by_role_type: resolved.role.role_type,
  }));

  // Replace any prior proposal so re-authoring is clean.
  await supabase.from('work_packages').delete().eq('project_id', project.id).eq('status', 'proposed');
  const { error } = await supabase.from('work_packages').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length });
}
