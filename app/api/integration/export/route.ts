/**
 * GET /api/integration/export?type=wbs|cost|tasks|resources&projectCode=&token=
 * Download the project's CURRENT canonical data in import-template format
 * (round-trip: download → edit → re-upload).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { resolveRoleFromToken } from '@/lib/role-context';
import { exportWbsCsv, exportCostCsv, exportTaskCsv, exportResourceCsv, type TemplateType } from '@/lib/integration/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const token = sp.get('token') ?? '';
  const type = (sp.get('type') ?? 'wbs') as TemplateType;
  const projectCode = sp.get('projectCode') ?? '';

  const resolved = await resolveRoleFromToken(token);
  if (!resolved) return new NextResponse('Invalid token', { status: 401 });

  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase.from('projects').select('id, code').eq('code', projectCode).maybeSingle();
  if (!project) return new NextResponse('Project not found', { status: 404 });
  const pid = (project as { id: string }).id;

  let csv = '';
  if (type === 'wbs') {
    const { data } = await supabase.from('work_packages').select('wbs_code, parent_wbs_code, name, responsible_role_type, is_billing_element, budget_bac, baseline_bac, target_finish').eq('project_id', pid);
    csv = exportWbsCsv((data ?? []) as Parameters<typeof exportWbsCsv>[0]);
  } else if (type === 'cost') {
    const { data } = await supabase.from('cost_actuals').select('wbs_code, period, actual_cost, commitment, planned_value').eq('project_id', pid);
    csv = exportCostCsv((data ?? []) as Array<Record<string, unknown>>);
  } else if (type === 'tasks') {
    const { data } = await supabase.from('tasks').select('wbs_code, external_id, name, start_date, finish_date, percent_complete').eq('project_id', pid);
    csv = exportTaskCsv((data ?? []) as Array<Record<string, unknown>>);
  } else {
    const { data } = await supabase.from('resource_assignments').select('external_id, resource_name, resource_role, period, planned_work_hours').eq('project_id', pid);
    csv = exportResourceCsv((data ?? []) as Array<Record<string, unknown>>);
  }

  return new NextResponse(csv, {
    status: 200,
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${projectCode}-${type}.csv"` },
  });
}
