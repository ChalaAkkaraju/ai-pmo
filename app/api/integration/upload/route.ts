/**
 * POST /api/integration/upload — manual/file ingestion of a CSV.
 * Body: { token, projectCode, csv, type?: 'wbs'|'cost'|'tasks'|'resources', channel? }
 * Each type parses to source DTOs and runs the SAME ingestion pipeline.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { resolveRoleFromToken } from '@/lib/role-context';
import { parseWbsCsv, parseCostCsv, parseTaskCsv, parseResourceCsv } from '@/lib/integration/csv';
import { FileSapAdapter } from '@/lib/integration/adapters/file-sap';
import { FileSchedulerAdapter } from '@/lib/integration/adapters/file-scheduler';
import { ingestSapProject, ingestSchedulerProject } from '@/lib/integration/ingestion-service';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(8),
  projectCode: z.string().min(1),
  csv: z.string().min(1),
  type: z.enum(['wbs', 'cost', 'tasks', 'resources']).optional().default('wbs'),
  channel: z.enum(['manual', 'file']).optional().default('manual'),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const resolved = await resolveRoleFromToken(body.token);
  if (!resolved) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  if (!resolved.definition.can_write) return NextResponse.json({ error: 'Your role cannot import data.' }, { status: 403 });

  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase.from('projects').select('id, code').eq('code', body.projectCode).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const proj = project as { id: string; code: string };

  if (body.type === 'wbs') {
    const { rows, error } = parseWbsCsv(body.csv);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const result = await ingestSapProject(supabase, proj, new FileSapAdapter(rows, []), body.channel);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }
  if (body.type === 'cost') {
    const { rows, error } = parseCostCsv(body.csv);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const result = await ingestSapProject(supabase, proj, new FileSapAdapter([], rows), body.channel);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }
  if (body.type === 'tasks') {
    const { rows, error } = parseTaskCsv(body.csv);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const result = await ingestSchedulerProject(supabase, proj, new FileSchedulerAdapter(rows, []), body.channel);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }
  const { rows, error } = parseResourceCsv(body.csv);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const result = await ingestSchedulerProject(supabase, proj, new FileSchedulerAdapter([], rows), body.channel);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
