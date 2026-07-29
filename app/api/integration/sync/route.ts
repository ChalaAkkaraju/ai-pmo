/**
 * POST /api/integration/sync — run an ingestion sync for one project + source.
 *
 * Phase 6 trigger. Currently wired to the SAP PS mock adapter through the real
 * ingestion pipeline (fetch → map → idempotent upsert → provenance → log).
 * Swap the adapter for a live BTP one behind the same SapConnector interface.
 *
 * Body: { token, projectCode, source?: 'SAP_PS', channel?: 'api'|'file'|'manual' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';
import { ingestSapProject, ingestSchedulerProject } from '@/lib/integration/ingestion-service';
import { SapPsMockAdapter } from '@/lib/integration/adapters/sap-ps-mock';
import { MsProjectMockAdapter } from '@/lib/integration/adapters/msproject-mock';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  projectCode: z.string().min(1),
  source: z.enum(['SAP_PS', 'MS_PROJECT', 'P6']).optional().default('SAP_PS'),
  channel: z.enum(['api', 'file', 'manual']).optional().default('api'),
  entity: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  if (!resolved.definition.can_write) {
    return NextResponse.json({ error: 'Your role cannot run a data sync.' }, { status: 403 });
  }
  if (body.source === 'P6') {
    return NextResponse.json({ error: 'P6 connector not implemented yet.' }, { status: 501 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase.from('projects').select('id, code').eq('code', body.projectCode).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const proj = project as { id: string; code: string };

  const result = body.source === 'MS_PROJECT'
    ? await ingestSchedulerProject(supabase, proj, new MsProjectMockAdapter(), body.channel, body.entity)
    : await ingestSapProject(supabase, proj, new SapPsMockAdapter(), body.channel, body.entity);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
