/**
 * GET /api/integration/export?projectCode=&token=&type= — download the current
 * canonical rows for one object as CSV, in the SAME column order as its import
 * template (so it round-trips: download → edit → re-upload). Useful while we're
 * on mock data; in production this is the outbound extract.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { exportWbsCsv, exportCostCsv, exportCommitmentCsv, exportBillingCsv, exportRaCsv, exportTaskCsv, exportResourceCsv, exportChangeOrderCsv, exportMilestoneCsv } from '@/lib/integration/csv';

export const dynamic = 'force-dynamic';

type Rows = Array<Record<string, unknown>>;
const EXPORTERS: Record<string, { table: string; fn: (rows: Rows) => string }> = {
  wbs: { table: 'work_packages', fn: exportWbsCsv as unknown as (rows: Rows) => string },
  cost: { table: 'cost_actuals', fn: exportCostCsv },
  commitment: { table: 'purchase_orders', fn: exportCommitmentCsv },
  billing: { table: 'billing_events', fn: exportBillingCsv },
  results_analysis: { table: 'results_analysis', fn: exportRaCsv },
  tasks: { table: 'tasks', fn: exportTaskCsv },
  resources: { table: 'resource_assignments', fn: exportResourceCsv },
  change_orders: { table: 'change_orders', fn: exportChangeOrderCsv },
  milestones: { table: 'milestones', fn: exportMilestoneCsv },
};

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const resolved = await getSessionRole();
  if (!resolved) return new NextResponse('Invalid token', { status: 401 });

  const type = sp.get('type') ?? 'wbs';
  const meta = EXPORTERS[type];
  if (!meta) return new NextResponse('Unknown object type', { status: 400 });

  const projectCode = sp.get('projectCode') ?? '';
  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase.from('projects').select('id, code').eq('code', projectCode).maybeSingle();
  if (!project) return new NextResponse('Project not found', { status: 404 });

  const { data } = await supabase.from(meta.table).select('*').eq('project_id', (project as { id: string }).id);
  const csv = meta.fn((data ?? []) as Rows);

  return new NextResponse(csv, {
    status: 200,
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${projectCode}-${type}.csv"` },
  });
}
