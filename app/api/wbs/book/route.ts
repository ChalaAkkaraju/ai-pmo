/**
 * POST /api/wbs/book — "book" a proposed WBS into SAP PS.
 *
 * The downstream half of the authoring bookend: a human has approved the
 * AI-authored proposal, so we hand the system of record to SAP. In this
 * simulation that means flipping provenance (no live SAP): proposed rows
 * become active + source_system='SAP_PS' with a stamped external_id and
 * synced_at; the project itself is tagged SAP_PS. A real implementation
 * would call BAPI_PROJECTDEF_CREATE / WBS-element BAPIs (or the S/4 Enterprise
 * Project OData APIs) here and store the IDs SAP returns. After booking the
 * WBS is read-only — exactly like any pre-existing SAP project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ projectCode: z.string().min(1) });

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
    return NextResponse.json({ error: 'Your role cannot book a WBS to SAP.' }, { status: 403 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: project } = await supabase.from('projects').select('id, code').eq('code', body.projectCode).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: proposed } = await supabase
    .from('work_packages').select('id, wbs_code').eq('project_id', project.id).eq('status', 'proposed');
  if (!proposed || proposed.length === 0) {
    return NextResponse.json({ error: 'No proposed WBS to book.' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();

  // Stamp each element with a simulated SAP external id and flip provenance.
  for (const wp of proposed) {
    const { error } = await supabase
      .from('work_packages')
      .update({
        status: 'active',
        source_system: 'SAP_PS',
        is_app_native: false,
        external_id: `${project.code}-${wp.wbs_code}`,
        synced_at: nowIso,
        booked_at: nowIso,
      })
      .eq('id', wp.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Tag the project itself as SAP-sourced now that its structure lives in SAP.
  await supabase
    .from('projects')
    .update({ source_system: 'SAP_PS', external_id: project.code, last_synced_at: nowIso })
    .eq('id', project.id);

  return NextResponse.json({ ok: true, count: proposed.length });
}
