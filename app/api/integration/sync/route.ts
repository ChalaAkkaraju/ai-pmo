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
import { resolveRoleFromToken } from '@/lib/role-context';
import { ingestSapProject } from '@/lib/integration/ingestion-service';
import { SapPsMockAdapter } from '@/lib/integration/adapters/sap-ps-mock';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(8),
  projectCode: z.string().min(1),
  source: z.enum(['SAP_PS', 'DATAVERSE', 'P6']).optional().default('SAP_PS'),
  channel: z.enum(['api', 'file', 'manual']).optional().default('api'),
});

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
    return NextResponse.json({ error: 'Your role cannot run a data sync.' }, { status: 403 });
  }
  if (body.source !== 'SAP_PS') {
    return NextResponse.json({ error: `Connector for ${body.source} not implemented yet (SAP PS only).` }, { status: 501 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase.from('projects').select('id, code').eq('code', body.projectCode).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const result = await ingestSapProject(supabase, project as { id: string; code: string }, new SapPsMockAdapter(), body.channel);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
