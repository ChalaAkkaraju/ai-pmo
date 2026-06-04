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
import type { SapConnector, SyncResult, IngestChannel } from './types';

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
