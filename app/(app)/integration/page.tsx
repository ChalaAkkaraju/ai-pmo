/**
 * Integration / Data Import admin page (Phase 6). Loads sync history, the
 * exception queue, last-sync per source, and a project picker, then renders the
 * connector surface (Sync Now / Test Connection / resolve exceptions).
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import {
  IntegrationClient,
  type SyncRunRow,
  type SyncExceptionRow,
  type ProjectOption,
} from '@/components/integration-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

type JoinedProj = { code: string; name?: string } | { code: string; name?: string }[] | null;
function projCode(p: JoinedProj): string | null {
  const o = Array.isArray(p) ? p[0] : p;
  return o?.code ?? null;
}

export default async function IntegrationPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();

  let runs: SyncRunRow[] = [];
  let exceptions: SyncExceptionRow[] = [];
  try {
    const [runsRes, exRes] = await Promise.all([
      supabase.from('sync_runs').select('id, source_system, channel, entity, api_endpoint, status, started_at, finished_at, rows_inserted, rows_updated, exceptions, message, projects:project_id(code)').order('started_at', { ascending: false }).limit(60),
      supabase.from('sync_exceptions').select('id, source_system, entity, kind, external_id, reason, created_at, projects:project_id(code)').eq('status', 'open').order('created_at', { ascending: false }).limit(50),
    ]);
    runs = ((runsRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id), source_system: String(r.source_system), channel: String(r.channel), status: String(r.status),
      entity: (r.entity as string) ?? null, api_endpoint: (r.api_endpoint as string) ?? null,
      started_at: String(r.started_at), finished_at: (r.finished_at as string) ?? null,
      rows_inserted: Number(r.rows_inserted), rows_updated: Number(r.rows_updated), exceptions: Number(r.exceptions),
      message: (r.message as string) ?? null, project_code: projCode(r.projects as JoinedProj),
    }));
    exceptions = ((exRes.data ?? []) as Array<Record<string, unknown>>).map((e) => ({
      id: String(e.id), source_system: String(e.source_system), entity: (e.entity as string) ?? null, kind: String(e.kind),
      external_id: (e.external_id as string) ?? null, reason: String(e.reason), created_at: String(e.created_at),
      project_code: projCode(e.projects as JoinedProj),
    }));
  } catch {
    runs = []; exceptions = [];
  }

  const lastSyncBySource: Record<string, string | null> = {};
  for (const r of runs) {
    if (!(r.source_system in lastSyncBySource)) lastSyncBySource[r.source_system] = r.started_at;
  }

  const { data: projData } = await supabase.from('projects').select('code, name, source_system').order('code', { ascending: true }).limit(300);
  const projects: ProjectOption[] = (projData ?? []).map((p) => ({
    code: String((p as { code: string }).code), name: String((p as { name: string }).name), source_system: (p as { source_system: string | null }).source_system ?? null,
  }));

  return (
    <div className="container mx-auto max-w-screen-xl px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/dashboard`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Data integration</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">Data integration</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        The consume side: structure, cost, commitment, billing, revenue recognition and change orders from SAP PS —
        plus tasks, resources and milestones from the scheduler — are mirrored from the systems of record into the
        canonical model, joined by WBS code. SAP PS is live (mock adapter through the real pipeline); the scheduler connectors follow the same
        contract. Records that can&apos;t map are queued below, never dropped.
      </p>

      <div className="mt-6">
        <IntegrationClient
          projects={projects}
          runs={runs}
          exceptions={exceptions}
          lastSyncBySource={lastSyncBySource}
          canWrite={resolved.definition.can_write}
        />
      </div>
    </div>
  );
}
