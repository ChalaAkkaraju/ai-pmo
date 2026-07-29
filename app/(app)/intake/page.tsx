/**
 * Project intake — landing / segment picker.
 *
 * Pick a segment to open its intake form (the web "Project Data Sheet"), or
 * resume a saved draft. Only pm + engineering_manager may create projects;
 * other roles see a read-only explanation rather than the picker.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { SEGMENT_STYLES, segmentStyle } from '@/lib/segment-style';
import { segmentBlurb } from '@/lib/intake-config';
import type { Segment } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CREATE_ROLES = ['pm', 'engineering_manager'];

interface DraftRow {
  id: string;
  segment: string;
  name: string | null;
  updated_at: string;
}

async function draftsForRole(roleType: string): Promise<DraftRow[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('project_drafts')
    .select('id, segment, name, updated_at')
    .eq('created_by_role_type', roleType)
    .order('updated_at', { ascending: false })
    .limit(50);
  return (data ?? []) as DraftRow[];
}

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default async function IntakeLanding() {
  const token = 'session';
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const canCreate = CREATE_ROLES.includes(resolved.role.role_type);
  const segments = Object.keys(SEGMENT_STYLES) as Segment[];
  const drafts = canCreate ? await draftsForRole(resolved.role.role_type) : [];

  return (
    <div className="container mx-auto max-w-screen-lg px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight">New project intake</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Stand up a new project from a structured data sheet. Pick the segment to open its intake form — the system
        assigns the next available project code when you click Create, then the planning agents build out the rest.
      </p>

      {!canCreate ? (
        <div className="mt-8 rounded-lg border border-dashed bg-muted/20 p-6 text-sm">
          <p className="font-medium">Your role can view the portfolio but not create projects.</p>
          <p className="mt-1 text-muted-foreground">
            New projects are created by a PM or Engineering Manager. Ask one of them to run the intake, or open an
            existing project from the dashboard.
          </p>
          <Link
            href={`/dashboard`}
            className="mt-4 inline-block rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            ← Back to dashboard
          </Link>
        </div>
      ) : (
        <>
          {drafts.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-foreground">Resume a draft</h2>
              <div className="mt-3 space-y-2">
                {drafts.map((d) => {
                  const s = segmentStyle(d.segment);
                  return (
                    <Link
                      key={d.id}
                      href={`/intake/${d.segment}?draft=${d.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 transition hover:border-foreground/30 hover:shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.badge}`}>
                          {s.label}
                        </span>
                        <span className="truncate text-sm font-medium">{d.name?.trim() || 'Untitled draft'}</span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">Saved {when(d.updated_at)} →</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <h2 className="mt-8 text-sm font-semibold text-foreground">Start a new project</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {segments.map((seg) => {
              const s = SEGMENT_STYLES[seg];
              return (
                <Link
                  key={seg}
                  href={`/intake/${seg}`}
                  className="group relative overflow-hidden rounded-lg border bg-card p-5 transition hover:border-foreground/30 hover:shadow-sm"
                >
                  <span className={`absolute inset-y-0 left-0 w-1 ${s.accentBar}`} />
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{segmentBlurb(seg)}</p>
                  <p className="mt-3 text-sm font-medium text-foreground/80 transition group-hover:text-foreground">
                    Start {s.label.toLowerCase()} intake →
                  </p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
