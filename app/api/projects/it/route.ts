/**
 * IT project intake — creates ONE IT project from the IT intake form.
 *
 *   POST  /api/projects/it       create (role-gated: it_portfolio_manager + it_pm + it_sponsor)
 *   GET   /api/projects/it       suggest the next NW-IT-#### code
 *   PATCH /api/projects/it       { project_code, fiscal_year, requested_budget, note? }
 *                                request the next fiscal-year slice for a running
 *                                project (a continuation); ranked at that year's waterline
 *
 * Separate from /api/projects (revenue) so the revenue route is untouched.
 * The project lands as lifecycle 'proposed' for its fiscal year; the portfolio
 * waterline approves it (POST /api/portfolio/it) and Stage Gate 1 locks it
 * (POST /api/gates). Its stage template is chosen by category.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { canRoleCreateProjectType } from '@/lib/roles';
import { recomputeCase } from '@/lib/it-portfolio';

export const dynamic = 'force-dynamic';

const STEM = 'NW-IT-';

const postSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  sponsor: z.string().min(1, 'Sponsor is required'),
  category: z.enum(['design_development', 'deployment', 'maintenance_upgrade']),
  bucket: z.string().min(1, 'Bucket is required'),
  fiscal_year: z.number().int().min(2020).max(2100),
  requested_budget: z.number().nonnegative(),
  business_case: z.object({
    value_type: z.enum(['hard_savings', 'soft_benefit', 'risk_reduction', 'enablement', 'compliance']),
    benefit_summary: z.string().min(1, 'Benefit summary is required'),
    annual_benefit: z.number().nonnegative().nullable().optional(),
    roi_pct: z.number().nullable().optional(),
    payback_months: z.number().nonnegative().nullable().optional(),
    strategic_score: z.number().min(0).max(100).nullable().optional(),
    benefits_owner: z.string().nullable().optional(),
    capex_share_pct: z.number().min(0).max(100).nullable().optional(),
    is_mandatory: z.boolean().optional(),
  }),
  continuation_of_code: z.string().optional().nullable(),
  hard_deadline: z.string().optional().nullable(),
  intake: z.record(z.unknown()).optional().default({}),
});

async function nextCode(): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from('projects').select('code').like('code', `${STEM}%`);
  let max = 0;
  for (const row of data ?? []) {
    const m = /(\d+)\s*$/.exec((row as { code: string }).code ?? '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${STEM}${String(max + 1).padStart(4, '0')}`;
}

export async function GET() {
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ code: await nextCode() });
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }

  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const role = resolved.role;
  if (!canRoleCreateProjectType(role.role_type, 'it')) {
    return NextResponse.json({ error: 'Your role cannot create IT projects. Ask the IT Portfolio Manager or an IT PM.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: template } = await supabase
    .from('stage_templates')
    .select('id')
    .eq('project_type', 'it')
    .eq('category', body.category)
    .maybeSingle();

  let continuationOfId: string | null = null;
  if (body.continuation_of_code) {
    const { data: prev } = await supabase.from('projects').select('id').eq('code', body.continuation_of_code).maybeSingle();
    continuationOfId = (prev as { id: string } | null)?.id ?? null;
  }

  // Fill in ROI / payback when the submitter left them blank but gave a benefit.
  const derived = recomputeCase(body.requested_budget, body.business_case.annual_benefit ?? null);
  const business_case = {
    ...body.business_case,
    roi_pct: body.business_case.roi_pct ?? derived.roi_pct,
    payback_months: body.business_case.payback_months ?? derived.payback_months,
    is_mandatory: body.business_case.is_mandatory ?? body.business_case.value_type === 'compliance',
  };

  const code = await nextCode();
  const row = {
    name: body.name,
    code,
    client: body.sponsor, // the internal sponsor stands where the customer does on revenue projects
    contract_value_initial: 0,
    contract_value_current: 0,
    approved_budget_initial: 0, // set at Stage Gate 1 (SG1 baseline)
    approved_budget_current: 0,
    contingency: 0,
    segment: null,
    status: 'Active' as const,
    current_week: 0,
    hard_deadline_description: body.hard_deadline?.trim() ? body.hard_deadline.trim() : null,
    intake_json: { ...body.intake, sponsor: body.sponsor },
    created_via: 'intake_form',
    created_by_role_type: role.role_type,
    source_system: 'APP',
    project_type: 'it',
    project_category: body.category,
    portfolio_bucket: body.bucket,
    fiscal_year: body.fiscal_year,
    lifecycle_status: 'proposed',
    stage_template_id: (template as { id: string } | null)?.id ?? null,
    current_stage: 0,
    continuation_of_id: continuationOfId,
    business_case,
    requested_budget: body.requested_budget,
  };

  let attempt = await supabase.from('projects').insert(row).select('id, code').maybeSingle();
  if (attempt.error && /duplicate key|unique/i.test(attempt.error.message)) {
    attempt = await supabase.from('projects').insert({ ...row, code: await nextCode() }).select('id, code').maybeSingle();
  }
  if (attempt.error) return NextResponse.json({ error: `DB insert failed: ${attempt.error.message}` }, { status: 500 });
  return NextResponse.json({ project: attempt.data }, { status: 200 });
}

const patchSchema = z.object({
  project_code: z.string().min(1),
  fiscal_year: z.number().int().min(2020).max(2100),
  requested_budget: z.number().nonnegative(),
  note: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  let body: z.infer<typeof patchSchema>;
  try { body = patchSchema.parse(await request.json()); } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canRoleCreateProjectType(resolved.role.role_type, 'it')) return NextResponse.json({ error: 'Your role cannot request a continuation.' }, { status: 403 });
  const supabase = createSupabaseServiceClient();
  const { data: p } = await supabase.from('projects').select('id, fiscal_years_approved, lifecycle_status, intake_json').eq('code', body.project_code).eq('project_type', 'it').maybeSingle();
  if (!p) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const row = p as { id: string; fiscal_years_approved: number[]; lifecycle_status: string; intake_json: Record<string, unknown> | null };
  if ((row.fiscal_years_approved ?? []).includes(body.fiscal_year)) return NextResponse.json({ error: `FY${body.fiscal_year} is already approved for this project.` }, { status: 400 });
  const { error } = await supabase.from('projects').update({
    fiscal_year: body.fiscal_year, requested_budget: body.requested_budget,
    intake_json: { ...(row.intake_json ?? {}), continuation_note: body.note ?? null, continuation_requested_at: new Date().toISOString() },
  }).eq('id', row.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
