/**
 * GET /api/integration/export-sap?projectCode=&token= — download the project's
 * WBS in an SAP-loadable format (the outbound "feed into SAP" file). In a live
 * setup this is what BAPI_PROJECTDEF_CREATE / a Project Builder upload consumes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { resolveRoleFromToken } from '@/lib/role-context';
import { buildSapWbsLoad } from '@/lib/integration/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const resolved = await resolveRoleFromToken(sp.get('token') ?? '');
  if (!resolved) return new NextResponse('Invalid token', { status: 401 });

  const projectCode = sp.get('projectCode') ?? '';
  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase.from('projects').select('id, code').eq('code', projectCode).maybeSingle();
  if (!project) return new NextResponse('Project not found', { status: 404 });

  const { data } = await supabase.from('work_packages')
    .select('wbs_code, parent_wbs_code, name, responsible_role_type, is_billing_element, budget_bac, baseline_bac, target_finish')
    .eq('project_id', (project as { id: string }).id);
  const csv = buildSapWbsLoad(projectCode, (data ?? []) as Parameters<typeof buildSapWbsLoad>[1]);

  return new NextResponse(csv, {
    status: 200,
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${projectCode}-WBS-SAP-load.csv"` },
  });
}
