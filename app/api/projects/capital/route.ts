/**
 * Capital project intake — creates ONE capital project request.
 *
 *   POST /api/projects/capital   create (capital_portfolio_manager, capital_pm, capital_sponsor)
 *   GET  /api/projects/capital   suggest the next NW-CAP-#### code
 *
 * The request lands as lifecycle 'proposed' at FEL1 (major) or Define
 * (minor). Nothing is appropriated: study money is released at the FEL gates,
 * the AFE at the commit gate. The capex test is answered here because it is
 * the first thing Finance asks and the cheapest point to find out a "capital
 * project" is really maintenance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { canRoleCreateProjectType } from '@/lib/roles';
import { capexVerdict, CAPITAL_BUCKETS } from '@/lib/capital';

export const dynamic = 'force-dynamic';

const STEM = 'NW-CAP-';

const postSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  site: z.string().min(1, 'Site is required'),
  sponsor: z.string().min(1, 'Plant manager / sponsor is required'),
  category: z.enum(['major', 'minor']),
  bucket: z.enum(CAPITAL_BUCKETS),
  fiscal_year: z.number().int().min(2020).max(2100),
  requested_budget: z.number().positive('Give an order-of-magnitude estimate'),
  problem: z.string().optional().default(''),
  outcome: z.string().optional().default(''),
  in_service_date: z.string().optional().nullable(),
  asset_class: z.string().optional().nullable(),
  useful_life_years: z.number().int().positive().optional().nullable(),
  npv: z.number().optional().nullable(),
  irr_pct: z.number().optional().nullable(),
  payback_months: z.number().optional().nullable(),
  annual_benefit: z.number().optional().nullable(),
  capex_test: z.object({
    new_asset: z.boolean(), extends_life: z.boolean(), adds_capacity: z.boolean(), like_for_like_repair: z.boolean(),
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
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid request body', details: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }
  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const role = resolved.role;
  if (!canRoleCreateProjectType(role.role_type, 'capital')) {
    return NextResponse.json({ error: 'Your role cannot raise a capital request. Ask the Capital Portfolio Manager, a capital PM or the plant manager.' }, { status: 403 });
  }
  const verdict = capexVerdict(body.capex_test);
  if (verdict.verdict === 'opex') {
    return NextResponse.json({ error: `This reads as operating spend, not capital: ${verdict.reason} Route it through the maintenance budget instead.` }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: template } = await supabase.from('stage_templates').select('id').eq('project_type', 'capital').eq('category', body.category).maybeSingle();

  const code = await nextCode();
  const row = {
    name: body.name, code,
    client: body.sponsor, // the plant manager stands where the customer does on revenue work
    contract_value_initial: 0, contract_value_current: 0,
    approved_budget_initial: 0, approved_budget_current: 0, contingency: 0,
    segment: null, status: 'Active' as const, current_week: 0,
    hard_deadline_description: null,
    intake_json: { sponsor: body.sponsor, site: body.site, problem: body.problem, outcome: body.outcome },
    created_via: 'intake_form', created_by_role_type: role.role_type, source_system: 'APP',
    project_type: 'capital', project_category: body.category, portfolio_bucket: body.bucket, fiscal_year: body.fiscal_year,
    lifecycle_status: 'proposed', stage_template_id: (template as { id: string } | null)?.id ?? null, current_stage: 0,
    business_case: {
      value_type: body.bucket === 'hse_regulatory' ? 'compliance' : body.bucket === 'cost_reduction' ? 'hard_savings' : body.bucket === 'sustaining' ? 'risk_reduction' : 'enablement',
      benefit_summary: body.outcome || body.name,
      annual_benefit: body.annual_benefit ?? null,
      payback_months: body.payback_months ?? null,
      benefits_owner: body.sponsor,
      is_mandatory: body.bucket === 'hse_regulatory',
      capex_share_pct: verdict.verdict === 'mixed' ? 80 : 95,
      expected_expense_pct: verdict.verdict === 'mixed' ? 20 : 5,
      site: body.site, asset_class: body.asset_class ?? null, useful_life_years: body.useful_life_years ?? null,
      npv: body.npv ?? null, irr_pct: body.irr_pct ?? null,
      estimate_class: 5, eac: null,
      in_service_date: body.in_service_date || null, planned_in_service_date: null,
      capex_test: body.capex_test,
    },
    requested_budget: body.requested_budget,
  };

  let attempt = await supabase.from('projects').insert(row).select('id, code').maybeSingle();
  if (attempt.error && /duplicate key|unique/i.test(attempt.error.message)) {
    attempt = await supabase.from('projects').insert({ ...row, code: await nextCode() }).select('id, code').maybeSingle();
  }
  if (attempt.error || !attempt.data) return NextResponse.json({ error: attempt.error?.message ?? 'Could not create project' }, { status: 500 });
  return NextResponse.json({ project: attempt.data, verdict });
}
