/**
 * Action items route handler — cross-agent task assignment.
 *
 *   POST  /api/actions   commit one or more proposed actions to the queue
 *   GET   /api/actions   list actions (scope=mine | scope=raised | scope=project)
 *   PATCH /api/actions   update status and/or save a drafted response
 *
 * Writes go through the service-role client (never the browser). Every request
 * is gated by a role URL token; the assigning role is recorded as
 * raised_by_role_type, and the responding role as responded_by_role_type.
 * See migrations 0009 / 0010 and lib/action-parser.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { isValidRoleType } from '@/lib/roles';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  description: z.string().min(1),
  assigned_to_role: z.string().min(1),
  urgency: z.enum(['L', 'M', 'H']).optional(),
  source_ref: z.string().optional().nullable(),
  flagged: z.boolean().optional(),
});

const postSchema = z.object({
  token: z.string().min(6),
  project_code: z.string().optional(),
  source_type: z.enum(['risk', 'issue']).optional(),
  raised_by_agent_type: z.string().optional(),
  created_from_output_id: z.string().uuid().optional(),
  items: z.array(itemSchema).min(1),
});

const patchSchema = z
  .object({
    token: z.string().min(6),
    id: z.string().uuid(),
    status: z.enum(['Open', 'Acknowledged', 'In progress', 'Done']).optional(),
    response_md: z.string().min(1).optional(),
  })
  .refine((v) => v.status !== undefined || v.response_md !== undefined, {
    message: 'Provide at least one of status or response_md',
  });

async function roleFromToken(token: string): Promise<Role | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('roles')
    .select('*')
    .eq('token', token)
    .maybeSingle<Role>();
  return data ?? null;
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }

  const role = await roleFromToken(body.token);
  if (!role) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const supabase = createSupabaseServiceClient();

  // Resolve project_id (and a risk-id → source_id map) when a project is named.
  let projectId: string | null = null;
  const refToRiskId = new Map<string, string>();
  if (body.project_code) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('code', body.project_code)
      .maybeSingle<{ id: string }>();
    if (!project) {
      return NextResponse.json({ error: `Project "${body.project_code}" not found` }, { status: 404 });
    }
    projectId = project.id;

    const refs = body.items.map((i) => i.source_ref).filter((r): r is string => !!r);
    if (refs.length > 0) {
      const { data: risks } = await supabase
        .from('risks')
        .select('id, risk_id')
        .eq('project_id', projectId)
        .in('risk_id', refs);
      for (const r of risks ?? []) refToRiskId.set(r.risk_id, r.id);
    }
  }

  const sourceType = body.source_type ?? 'risk';
  const rows = body.items.map((item) => {
    const valid = isValidRoleType(item.assigned_to_role);
    return {
      project_id: projectId,
      source_type: sourceType,
      source_id: item.source_ref ? refToRiskId.get(item.source_ref) ?? null : null,
      source_ref: item.source_ref ?? null,
      description: item.description,
      assigned_to_role_type: valid ? item.assigned_to_role : 'pm',
      raised_by_role_type: role.role_type,
      raised_by_agent_type: body.raised_by_agent_type ?? null,
      urgency: item.urgency ?? 'M',
      status: 'Open',
      created_from_output_id: body.created_from_output_id ?? null,
      assignment_flagged: item.flagged === true || !valid,
    };
  });

  const { data: inserted, error } = await supabase
    .from('action_items')
    .insert(rows)
    .select('*');

  if (error) {
    return NextResponse.json({ error: `DB insert failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ created: inserted?.length ?? 0, items: inserted ?? [] }, { status: 200 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const scope = request.nextUrl.searchParams.get('scope') ?? 'mine';
  const projectCode = request.nextUrl.searchParams.get('project_code') ?? undefined;
  if (token.length < 8) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const role = await roleFromToken(token);
  if (!role) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const supabase = createSupabaseServiceClient();
  let query = supabase.from('action_items').select('*').order('created_at', { ascending: false });

  if (scope === 'project' && projectCode) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('code', projectCode)
      .maybeSingle<{ id: string }>();
    query = query.eq('project_id', project?.id ?? '00000000-0000-0000-0000-000000000000');
  } else if (scope === 'raised') {
    // Actions the caller's role raised — so the raiser can see responses.
    query = query.eq('raised_by_role_type', role.role_type);
  } else {
    // Default: actions assigned to the caller's role.
    query = query.eq('assigned_to_role_type', role.role_type);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message, items: [] }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not parse JSON body' }, { status: 400 });
  }

  const role = await roleFromToken(body.token);
  if (!role) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const supabase = createSupabaseServiceClient();

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.response_md !== undefined) {
    update.response_md = body.response_md;
    update.responded_by_role_type = role.role_type;
    update.responded_at = new Date().toISOString();
    // Accepting a response implies the owner has taken it on — advance the
    // status unless they explicitly set one or it's already further along.
    if (body.status === undefined) {
      const { data: current } = await supabase
        .from('action_items')
        .select('status')
        .eq('id', body.id)
        .maybeSingle<{ status: string }>();
      if (current && (current.status === 'Open' || current.status === 'Acknowledged')) {
        update.status = 'In progress';
      }
    }
  }

  const { data, error } = await supabase
    .from('action_items')
    .update(update)
    .eq('id', body.id)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 200 });
}
