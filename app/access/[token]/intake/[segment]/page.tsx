/**
 * Per-segment project intake page.
 *
 * Server component: validates the token, gates on role (pm + engineering_manager),
 * validates the segment, loads same-segment "similar project" references, and —
 * when ?draft=<id> is present — loads a saved draft to resume. No project code
 * is computed here: the code is assigned only when the user clicks Create
 * (POST /api/projects). The form itself is the client component <IntakeForm>.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { IntakeForm } from '@/components/intake-form';
import type { ReferenceProject } from '@/lib/intake-config';
import type { Segment } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CREATE_ROLES = ['pm', 'engineering_manager'];

function isSegment(v: string): v is Segment {
  return v === 'renewables' || v === 'water' || v === 'industrial' || v === 'power';
}

// Same-segment projects offered as a reference. intake_json is only present
// after migration 0013, so we try with it and fall back without it — that way
// the picker works against the seeded portfolio even before 0013 is applied.
async function referencesForSegment(segment: Segment): Promise<ReferenceProject[]> {
  const supabase = createSupabaseServiceClient();
  const base = 'code, name, client, contract_value_initial, approved_budget_initial, contingency, hard_deadline_description';

  let rows = await supabase
    .from('projects')
    .select(`${base}, intake_json`)
    .eq('segment', segment)
    .order('name', { ascending: true })
    .limit(500);

  if (rows.error) {
    rows = (await supabase
      .from('projects')
      .select(base)
      .eq('segment', segment)
      .order('name', { ascending: true })
      .limit(500)) as typeof rows;
  }

  return (rows.data ?? []).map((r) => ({
    ...(r as Record<string, unknown>),
    intake_json: (r as { intake_json?: Record<string, unknown> | null }).intake_json ?? null,
  })) as ReferenceProject[];
}

interface DraftLoad {
  draftId?: string;
  initialValues?: Record<string, string>;
  initialRefCode?: string;
}

async function loadDraft(draftId: string, segment: Segment, roleType: string): Promise<DraftLoad> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('project_drafts')
    .select('id, segment, payload')
    .eq('id', draftId)
    .eq('created_by_role_type', roleType)
    .maybeSingle<{ id: string; segment: string; payload: { values?: Record<string, string>; refCode?: string } }>();
  if (error || !data || data.segment !== segment) return {};
  return {
    draftId: data.id,
    initialValues: data.payload?.values ?? undefined,
    initialRefCode: data.payload?.refCode ?? '',
  };
}

export default async function SegmentIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; segment: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { token, segment } = await params;
  const { draft } = await searchParams;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();
  if (!isSegment(segment)) notFound();

  if (!CREATE_ROLES.includes(resolved.role.role_type)) {
    return (
      <div className="container mx-auto max-w-screen-lg px-8 py-12">
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm">
          <p className="font-medium">Your role cannot create projects.</p>
          <p className="mt-1 text-muted-foreground">New projects are created by a PM or Engineering Manager.</p>
          <Link
            href={`/access/${token}`}
            className="mt-4 inline-block rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [references, draftLoad] = await Promise.all([
    referencesForSegment(segment),
    draft ? loadDraft(draft, segment, resolved.role.role_type) : Promise.resolve({} as DraftLoad),
  ]);

  return (
    <div className="container mx-auto px-8 py-8">
      <IntakeForm
        token={token}
        segment={segment}
        references={references}
        initialValues={draftLoad.initialValues}
        initialRefCode={draftLoad.initialRefCode}
        draftId={draftLoad.draftId}
      />
    </div>
  );
}
