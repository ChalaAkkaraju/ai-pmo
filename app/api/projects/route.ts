/**
 * Project intake route handler — creates ONE project from the web intake form.
 *
 *   POST /api/projects   create a project (role-gated: pm + engineering_manager)
 *   GET  /api/projects?token=…&segment=…   suggest the next available code
 *
 * Writes go through the service-role client (never the browser). The role URL
 * token gates the request; only pm + engineering_manager may create. The
 * system assigns the next available NW-<SEG>-#### code at insert time, so the
 * caller never picks it. Core facts land in typed columns; the full filled
 * sheet is stored in intake_json (migration 0013). See lib/roles.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase';
import type { Role, Segment } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Roles permitted to stand up a new project (Plan A decision).
const CREATE_ROLES = new Set(['pm', 'engineering_manager']);

const SEGMENT_PREFIX: Record<Segment, string> = {
  renewables: 'REN',
  water: 'WTR',
  industrial: 'IND',
  power: 'PWR',
};

const segmentSchema = z.enum(['renewables', 'water', 'industrial', 'power']);

const postSchema = z.object({
  token: z.string().min(8),
  segment: segmentSchema,
  name: z.string().min(1, 'Project name is required'),
  client: z.string().min(1, 'Customer / client is required'),
  contract_value: z.number().nonnegative(),
  approved_budget: z.number().nonnegative(),
  contingency: z.number().nonnegative().optional().default(0),
  start_week: z.number().int().min(0).optional().default(0),
  hard_deadline: z.string().optional().nullable(),
  // Everything else from the sheet (address, commercial terms, schedule dates,
  // segment-specific facts, governance, risk confirmations, preparer).
  intake: z.record(z.unknown()).optional().default({}),
});

async function roleFromToken(token: string): Promise<Role | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from('roles').select('*').eq('token', token).maybeSingle<Role>();
  return data ?? null;
}

/**
 * Compute the next available code for a segment by scanning existing codes
 * with the NW-<PREFIX>- stem and taking max(numeric suffix) + 1, zero-padded
 * to 4 digits. Falls back to 0001 when none exist.
 */
async function nextCodeForSegment(segment: Segment): Promise<string> {
  const prefix = SEGMENT_PREFIX[segment];
  const stem = `NW-${prefix}-`;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from('projects').select('code').like('code', `${stem}%`);
  let max = 0;
  for (const row of data ?? []) {
    const m = /(\d+)\s*$/.exec((row as { code: string }).code ?? '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${stem}${String(max + 1).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const segmentRaw = request.nextUrl.searchParams.get('segment') ?? '';
  if (token.length < 8) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const role = await roleFromToken(token);
  if (!role) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const parsed = segmentSchema.safeParse(segmentRaw);
  if (!parsed.success) return NextResponse.json({ error: 'Unknown segment' }, { status: 400 });

  const code = await nextCodeForSegment(parsed.data);
  return NextResponse.json({ code }, { status: 200 });
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
  if (!CREATE_ROLES.has(role.role_type)) {
    return NextResponse.json(
      { error: 'Your role cannot create projects. Ask a PM or Engineering Manager.' },
      { status: 403 },
    );
  }

  const supabase = createSupabaseServiceClient();
  const code = await nextCodeForSegment(body.segment);

  const row = {
    name: body.name,
    code,
    client: body.client,
    contract_value_initial: body.contract_value,
    contract_value_current: body.contract_value,
    approved_budget_initial: body.approved_budget,
    approved_budget_current: body.approved_budget,
    contingency: body.contingency,
    segment: body.segment,
    status: 'Active' as const,
    current_week: body.start_week,
    hard_deadline_description: body.hard_deadline?.trim() ? body.hard_deadline.trim() : null,
    intake_json: body.intake ?? {},
    created_via: 'intake_form',
  };

  const { data: inserted, error } = await supabase.from('projects').insert(row).select('id, code').maybeSingle();

  if (error) {
    // A race on the code unique constraint: retry once with a fresh code.
    if (/duplicate key|unique/i.test(error.message)) {
      const retryCode = await nextCodeForSegment(body.segment);
      const { data: retry, error: retryErr } = await supabase
        .from('projects')
        .insert({ ...row, code: retryCode })
        .select('id, code')
        .maybeSingle();
      if (retryErr) {
        return NextResponse.json({ error: `DB insert failed: ${retryErr.message}` }, { status: 500 });
      }
      return NextResponse.json({ project: retry }, { status: 200 });
    }
    return NextResponse.json({ error: `DB insert failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ project: inserted }, { status: 200 });
}
