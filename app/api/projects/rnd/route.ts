/**
 * R&D programme intake — creates ONE R&D programme from the R&D intake form.
 *
 *   POST /api/projects/rnd   create (role-gated: rnd_portfolio_manager, rnd_pm, rnd_sponsor)
 *   GET  /api/projects/rnd   suggest the next NW-RD-#### code
 *
 * Separate from /api/projects (revenue) and /api/projects/it so neither is
 * touched. The programme lands as lifecycle 'proposed' at stage 0; the first
 * gate decides whether it gets a scoping allowance, and the commit gate is
 * where feasibility must be demonstrated and the budget released.
 *
 * The submitted case is written as business_case_versions v1 — the versioned
 * record is the truth in R&D, and starting it at intake means there is always
 * something to reconcile the commit case against later.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { canRoleCreateProjectType } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const STEM = 'NW-RD-';

const postSchema = z.object({
  name: z.string().min(1, 'Programme name is required'),
  sponsor: z.string().min(1, 'Business sponsor is required'),
  category: z.enum(['new_product', 'derivative', 'platform_research']),
  bucket: z.string().min(1, 'Bucket is required'),
  fiscal_year: z.number().int().min(2020).max(2100),
  requested_budget: z.number().nonnegative(),
  problem: z.string().optional().default(''),
  outcome: z.string().optional().default(''),
  hard_deadline: z.string().optional().nullable(),
  // The case. Research programmes legitimately carry no NPV, so every
  // commercial figure is nullable and none of them is required.
  business_case: z.object({
    npv: z.number().nullable().optional(),
    peak_annual_sales: z.number().nullable().optional(),
    launch_date: z.string().nullable().optional(),
    development_cost_estimate: z.number().nullable().optional(),
    launch_cost: z.number().nullable().optional(),
    technical_success_pct: z.number().min(0).max(100).nullable().optional(),
    commercial_success_pct: z.number().min(0).max(100).nullable().optional(),
    notes: z.string().nullable().optional(),
  }),
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
  if (!canRoleCreateProjectType(role.role_type, 'rnd')) {
    return NextResponse.json({ error: 'Your role cannot open an R&D programme. Ask the R&D Portfolio Manager, a programme lead or the business sponsor.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: template } = await supabase
    .from('stage_templates').select('id')
    .eq('project_type', 'rnd').eq('category', body.category).maybeSingle();

  const bc = body.business_case;
  const code = await nextCode();
  const row = {
    name: body.name,
    code,
    client: body.sponsor,   // the business sponsor stands where the customer does on revenue work
    contract_value_initial: 0,
    contract_value_current: 0,
    approved_budget_initial: 0,   // nothing is committed until a gate releases it
    approved_budget_current: 0,
    contingency: 0,
    segment: null,
    status: 'Active' as const,
    current_week: 0,
    hard_deadline_description: body.hard_deadline?.trim() ? body.hard_deadline.trim() : null,
    intake_json: { sponsor: body.sponsor, problem: body.problem, outcome: body.outcome },
    created_via: 'intake_form',
    created_by_role_type: role.role_type,
    source_system: 'APP',
    project_type: 'rnd',
    project_category: body.category,
    portfolio_bucket: body.bucket,
    fiscal_year: body.fiscal_year,
    lifecycle_status: 'proposed',
    stage_template_id: (template as { id: string } | null)?.id ?? null,
    current_stage: 0,
    business_case: {
      value_type: body.bucket === 'regulatory' ? 'compliance' : body.bucket === 'sustaining' ? 'hard_savings' : 'soft_benefit',
      benefit_summary: body.outcome || body.name,
      annual_benefit: bc.peak_annual_sales ?? null,
      benefits_owner: body.sponsor,
      is_mandatory: body.bucket === 'regulatory',
    },
    requested_budget: body.requested_budget,
  };

  let attempt = await supabase.from('projects').insert(row).select('id, code').maybeSingle();
  if (attempt.error && /duplicate key|unique/i.test(attempt.error.message)) {
    attempt = await supabase.from('projects').insert({ ...row, code: await nextCode() }).select('id, code').maybeSingle();
  }
  if (attempt.error || !attempt.data) {
    return NextResponse.json({ error: attempt.error?.message ?? 'Could not create programme' }, { status: 500 });
  }
  const project = attempt.data as { id: string; code: string };

  // v1 of the case. Written even when it is mostly empty: an unwritten case is
  // a finding at the first gate, and a missing row would hide it.
  const { error: cErr } = await supabase.from('business_case_versions').insert({
    project_id: project.id,
    version: 1,
    gate_stage_seq: null,
    authored_on: new Date().toISOString().slice(0, 10),
    authored_by: role.name,
    npv: bc.npv ?? null,
    peak_annual_sales: bc.peak_annual_sales ?? null,
    launch_date: bc.launch_date || null,
    development_cost_estimate: bc.development_cost_estimate ?? null,
    launch_cost: bc.launch_cost ?? null,
    technical_success_pct: bc.technical_success_pct ?? null,
    commercial_success_pct: bc.commercial_success_pct ?? null,
    currency: 'USD',
    is_current: true,
    notes: bc.notes ?? 'Submitted at intake; to be re-underwritten at each gate.',
    source_system: 'APP',
  });
  if (cErr) {
    return NextResponse.json({ project, warning: `Programme created, but the case version could not be written: ${cErr.message}` });
  }

  return NextResponse.json({ project });
}
