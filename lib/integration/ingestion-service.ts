/**
 * Ingestion service — the source-agnostic core (Phase 6).
 *
 * fetch (via a connector) → map (DTO → canonical) → idempotent upsert
 * (work_packages by project+wbs; cost_actuals replace-by-source) → stamp
 * provenance on the project → queue exceptions → write a sync-run log.
 *
 * Re-running a sync with unchanged source data produces the same canonical
 * rows (idempotent). The connector is injected, so the live BTP adapter and
 * the mock adapter run through exactly this path.
 */

import type { createSupabaseServiceClient } from '@/lib/supabase';
import { mapSapWbs, mapSapCost } from './mappers/sap-ps';
import { mapSchedulerTasks, mapSchedulerResources } from './mappers/scheduler';
import type { SapConnector, SchedulerConnector, SyncResult, IngestChannel, SourceSystem } from './types';

type Supabase = ReturnType<typeof createSupabaseServiceClient>;

export async function ingestSapProject(
  supabase: Supabase,
  project: { id: string; code: string },
  connector: SapConnector,
  channel: IngestChannel = 'api',
): Promise<SyncResult> {
  const fail = (run_id: string | null, message: string): SyncResult => ({
    ok: false, run_id, source_system: 'SAP_PS', rows_inserted: 0, rows_updated: 0, rows_skipped: 0, exceptions: 0, message,
  });

  const { data: run, error: runErr } = await supabase
    .from('sync_runs')
    .insert({ project_id: project.id, source_system: 'SAP_PS', channel, status: 'success' })
    .select('id')
    .single();
  if (runErr || !run) return fail(null, `Could not open sync run: ${runErr?.message ?? 'unknown'}`);
  const runId = (run as { id: string }).id;

  try {
    const syncedAt = new Date().toISOString();
    const wbsDtos = await connector.fetchWbs(project.code);
    const costDtos = await connector.fetchCostActuals(project.code);

    const wbs = mapSapWbs(wbsDtos, project.id, syncedAt);
    const cost = mapSapCost(costDtos, project.id, syncedAt);
    const allExceptions = [...wbs.exceptions, ...cost.exceptions];

    // Insert vs update accounting against existing WBS codes.
    const { data: existing } = await supabase.from('work_packages').select('wbs_code').eq('project_id', project.id);
    const existingSet = new Set((existing ?? []).map((r) => (r as { wbs_code: string }).wbs_code));
    let inserted = 0, updated = 0;
    for (const row of wbs.rows) { if (existingSet.has(row.wbs_code)) updated++; else inserted++; }

    if (wbs.rows.length > 0) {
      const { error } = await supabase.from('work_packages').upsert(wbs.rows, { onConflict: 'project_id,wbs_code' });
      if (error) throw new Error(`work_packages upsert: ${error.message}`);
    }

    // cost_actuals are replace-by-source (no natural upsert key in schema).
    await supabase.from('cost_actuals').delete().eq('project_id', project.id).eq('source_system', 'SAP_PS');
    if (cost.rows.length > 0) {
      const { error } = await supabase.from('cost_actuals').insert(cost.rows);
      if (error) throw new Error(`cost_actuals insert: ${error.message}`);
    }

    // Provenance: the project is now SAP-sourced.
    await supabase.from('projects').update({ source_system: 'SAP_PS', external_id: project.code, last_synced_at: syncedAt }).eq('id', project.id);

    // Open exceptions reflect the CURRENT source state: clear this source's open
    // ones, then re-insert what's still failing — so re-syncing the same data
    // shows one row per real problem, not one per run. Resolved/ignored are kept.
    await supabase.from('sync_exceptions').delete().eq('project_id', project.id).eq('source_system', 'SAP_PS').eq('status', 'open');
    if (allExceptions.length > 0) {
      const exRows = allExceptions.map((e) => ({
        sync_run_id: runId, project_id: project.id, source_system: 'SAP_PS',
        kind: e.kind, external_id: e.external_id, reason: e.reason, payload: e.payload as object,
      }));
      await supabase.from('sync_exceptions').insert(exRows);
    }

    const status = allExceptions.length > 0 ? 'partial' : 'success';
    await supabase.from('sync_runs').update({
      finished_at: new Date().toISOString(),
      rows_inserted: inserted, rows_updated: updated, rows_skipped: 0,
      exceptions: allExceptions.length, status,
      message: `WBS ${wbs.rows.length} (${inserted} new / ${updated} updated), cost ${cost.rows.length}, exceptions ${allExceptions.length}`,
    }).eq('id', runId);

    return {
      ok: true, run_id: runId, source_system: 'SAP_PS',
      rows_inserted: inserted, rows_updated: updated, rows_skipped: 0,
      exceptions: allExceptions.length,
      message: `Synced from SAP PS (mock): ${wbs.rows.length} WBS, ${cost.rows.length} cost rows, ${allExceptions.length} exception(s).`,
    };
  } catch (e) {
    await supabase.from('sync_runs').update({ finished_at: new Date().toISOString(), status: 'failed', message: String(e) }).eq('id', runId);
    return fail(runId, String(e));
  }
}


export async function ingestSchedulerProject(
  supabase: Supabase,
  project: { id: string; code: string },
  connector: SchedulerConnector,
  channel: IngestChannel = 'api',
): Promise<SyncResult> {
  const source: SourceSystem = connector.source;
  const fail = (run_id: string | null, message: string): SyncResult => ({
    ok: false, run_id, source_system: source, rows_inserted: 0, rows_updated: 0, rows_skipped: 0, exceptions: 0, message,
  });

  const { data: run, error: runErr } = await supabase
    .from('sync_runs')
    .insert({ project_id: project.id, source_system: source, channel, status: 'success' })
    .select('id')
    .single();
  if (runErr || !run) return fail(null, `Could not open sync run: ${runErr?.message ?? 'unknown'}`);
  const runId = (run as { id: string }).id;

  try {
    const syncedAt = new Date().toISOString();

    // The WBS join target — codes that came from SAP for this project.
    const { data: wps } = await supabase.from('work_packages').select('wbs_code').eq('project_id', project.id);
    const validWbs = new Set((wps ?? []).map((w) => (w as { wbs_code: string }).wbs_code));

    const taskDtos = await connector.fetchTasks(project.code);
    const resDtos = await connector.fetchResourceAssignments(project.code);

    const tasks = mapSchedulerTasks(taskDtos, project.id, validWbs, source, syncedAt);
    const res = mapSchedulerResources(resDtos, project.id, validWbs, source, syncedAt);
    const allExceptions = [...tasks.exceptions, ...res.exceptions];

    // tasks + resource_assignments are replace-by-source (no natural upsert key).
    const { count: priorTasks } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('project_id', project.id).eq('source_system', source);
    await supabase.from('tasks').delete().eq('project_id', project.id).eq('source_system', source);
    if (tasks.rows.length > 0) {
      const { error } = await supabase.from('tasks').insert(tasks.rows);
      if (error) throw new Error(`tasks insert: ${error.message}`);
    }
    await supabase.from('resource_assignments').delete().eq('project_id', project.id).eq('source_system', source);
    if (res.rows.length > 0) {
      const { error } = await supabase.from('resource_assignments').insert(res.rows);
      if (error) throw new Error(`resource_assignments insert: ${error.message}`);
    }

    await supabase.from('projects').update({ last_synced_at: syncedAt }).eq('id', project.id);

    // dedupe: open exceptions reflect current source state
    await supabase.from('sync_exceptions').delete().eq('project_id', project.id).eq('source_system', source).eq('status', 'open');
    if (allExceptions.length > 0) {
      const exRows = allExceptions.map((e) => ({
        sync_run_id: runId, project_id: project.id, source_system: source,
        kind: e.kind, external_id: e.external_id, reason: e.reason, payload: e.payload as object,
      }));
      await supabase.from('sync_exceptions').insert(exRows);
    }

    const firstLoad = (priorTasks ?? 0) === 0;
    const inserted = firstLoad ? tasks.rows.length : 0;
    const updated = firstLoad ? 0 : tasks.rows.length;
    const status = allExceptions.length > 0 ? 'partial' : 'success';
    await supabase.from('sync_runs').update({
      finished_at: new Date().toISOString(),
      rows_inserted: inserted, rows_updated: updated, rows_skipped: 0,
      exceptions: allExceptions.length, status,
      message: `Tasks ${tasks.rows.length}, resources ${res.rows.length}, exceptions ${allExceptions.length}`,
    }).eq('id', runId);

    return {
      ok: true, run_id: runId, source_system: source,
      rows_inserted: inserted, rows_updated: updated, rows_skipped: 0,
      exceptions: allExceptions.length,
      message: `Synced from ${source} (mock): ${tasks.rows.length} tasks, ${res.rows.length} resource rows, ${allExceptions.length} exception(s).`,
    };
  } catch (e) {
    await supabase.from('sync_runs').update({ finished_at: new Date().toISOString(), status: 'failed', message: String(e) }).eq('id', runId);
    return fail(runId, String(e));
  }
}
