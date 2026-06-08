/**
 * Ingestion service — the source-agnostic core (Phase 6).
 *
 * fetch (via a connector) → map (DTO → canonical) → idempotent upsert → stamp
 * provenance → queue exceptions → write a sync-run log. PER OBJECT: each
 * canonical entity comes from its own SAP OData service / scheduler API, so we
 * open one sync_run per entity (tagged with the endpoint) even though a single
 * "Sync now" triggers them together. That mirrors reality — feeds drift out of
 * step — and lets the UI show per-feed freshness.
 */

import type { createSupabaseServiceClient } from '@/lib/supabase';
import { mapSapWbs, mapSapCost, mapSapPurchaseOrders, mapSapBilling, mapSapResultsAnalysis } from './mappers/sap-ps';
import { mapSchedulerTasks, mapSchedulerResources } from './mappers/scheduler';
import type { SapConnector, SchedulerConnector, SyncResult, IngestChannel, SourceSystem, MappedException } from './types';

type Supabase = ReturnType<typeof createSupabaseServiceClient>;

interface ObjectOutcome {
  inserted: number;
  updated: number;
  exceptions: MappedException[];
  count: number;
  label: string;
}

/** Open a per-entity sync_run, run the work, log rows/exceptions, close it. */
async function runObject(
  supabase: Supabase,
  project: { id: string },
  source: SourceSystem,
  channel: IngestChannel,
  entity: string,
  endpoint: string,
  totals: { inserted: number; updated: number; exceptions: number; messages: string[] },
  work: () => Promise<ObjectOutcome>,
): Promise<void> {
  const { data: run } = await supabase
    .from('sync_runs')
    .insert({ project_id: project.id, source_system: source, channel, entity, api_endpoint: endpoint, status: 'success' })
    .select('id').single();
  const runId = (run as { id: string } | null)?.id ?? null;
  try {
    const r = await work();
    // This object's exceptions reflect the current source state — clear just
    // this (source, entity) and requeue what's still failing.
    await supabase.from('sync_exceptions').delete().eq('project_id', project.id).eq('source_system', source).eq('entity', entity).eq('status', 'open');
    if (r.exceptions.length > 0 && runId) {
      await supabase.from('sync_exceptions').insert(r.exceptions.map((e) => ({
        sync_run_id: runId, project_id: project.id, source_system: source, entity,
        kind: e.kind, external_id: e.external_id, reason: e.reason, payload: e.payload as object,
      })));
    }
    totals.inserted += r.inserted; totals.updated += r.updated; totals.exceptions += r.exceptions.length;
    totals.messages.push(`${r.label} ${r.count}`);
    if (runId) {
      await supabase.from('sync_runs').update({
        finished_at: new Date().toISOString(), rows_inserted: r.inserted, rows_updated: r.updated, rows_skipped: 0,
        exceptions: r.exceptions.length, status: r.exceptions.length > 0 ? 'partial' : 'success',
        message: `${r.label} ${r.count}, exceptions ${r.exceptions.length}`,
      }).eq('id', runId);
    }
  } catch (e) {
    if (runId) await supabase.from('sync_runs').update({ finished_at: new Date().toISOString(), status: 'failed', message: String(e) }).eq('id', runId);
    throw e;
  }
}

export async function ingestSapProject(
  supabase: Supabase,
  project: { id: string; code: string },
  connector: SapConnector,
  channel: IngestChannel = 'api',
  only?: string,
): Promise<SyncResult> {
  const syncedAt = new Date().toISOString();
  const totals = { inserted: 0, updated: 0, exceptions: 0, messages: [] as string[] };

  try {
    // WBS structure — Enterprise Project OData (upsert by project+wbs).
    if (!only || only === 'wbs') await runObject(supabase, project, 'SAP_PS', channel, 'wbs', 'API_ENTERPRISE_PROJECT_SRV', totals, async () => {
      const m = mapSapWbs(await connector.fetchWbs(project.code), project.id, syncedAt);
      const { data: existing } = await supabase.from('work_packages').select('wbs_code').eq('project_id', project.id);
      const set = new Set((existing ?? []).map((r) => (r as { wbs_code: string }).wbs_code));
      let ins = 0, upd = 0;
      for (const row of m.rows) { if (set.has(row.wbs_code)) upd++; else ins++; }
      if (m.rows.length > 0) {
        const { error } = await supabase.from('work_packages').upsert(m.rows, { onConflict: 'project_id,wbs_code' });
        if (error) throw new Error(`work_packages: ${error.message}`);
      }
      return { inserted: ins, updated: upd, exceptions: m.exceptions, count: m.rows.length, label: 'WBS' };
    });

    // Replace-by-source objects, each from its own API.
    const replace = async (table: string, rows: Record<string, unknown>[], any: boolean) => {
      if (!any) return;
      await supabase.from(table).delete().eq('project_id', project.id).eq('source_system', 'SAP_PS');
      if (rows.length > 0) { const { error } = await supabase.from(table).insert(rows); if (error) throw new Error(`${table}: ${error.message}`); }
    };

    if (!only || only === 'cost') await runObject(supabase, project, 'SAP_PS', channel, 'cost', 'API_JOURNALENTRYITEMBASIC_SRV', totals, async () => {
      const dtos = await connector.fetchCostActuals(project.code);
      const m = mapSapCost(dtos, project.id, syncedAt);
      await replace('cost_actuals', m.rows as unknown as Record<string, unknown>[], dtos.length > 0);
      return { inserted: m.rows.length, updated: 0, exceptions: m.exceptions, count: m.rows.length, label: 'Cost' };
    });

    if (!only || only === 'commitment') await runObject(supabase, project, 'SAP_PS', channel, 'commitment', 'API_PURCHASEORDER_PROCESS_SRV', totals, async () => {
      const dtos = await connector.fetchPurchaseOrders(project.code);
      const m = mapSapPurchaseOrders(dtos, project.id, syncedAt);
      await replace('purchase_orders', m.rows as unknown as Record<string, unknown>[], dtos.length > 0);
      return { inserted: m.rows.length, updated: 0, exceptions: m.exceptions, count: m.rows.length, label: 'POs' };
    });

    if (!only || only === 'billing') await runObject(supabase, project, 'SAP_PS', channel, 'billing', 'API_BILLING_DOCUMENT_SRV', totals, async () => {
      const dtos = await connector.fetchBilling(project.code);
      const m = mapSapBilling(dtos, project.id, syncedAt);
      await replace('billing_events', m.rows as unknown as Record<string, unknown>[], dtos.length > 0);
      return { inserted: m.rows.length, updated: 0, exceptions: m.exceptions, count: m.rows.length, label: 'Billing' };
    });

    if (!only || only === 'results_analysis') await runObject(supabase, project, 'SAP_PS', channel, 'results_analysis', 'C_ProjResultsAnalysis (CDS)', totals, async () => {
      const dtos = await connector.fetchResultsAnalysis(project.code);
      const m = mapSapResultsAnalysis(dtos, project.id, syncedAt);
      await replace('results_analysis', m.rows as unknown as Record<string, unknown>[], dtos.length > 0);
      return { inserted: m.rows.length, updated: 0, exceptions: m.exceptions, count: m.rows.length, label: 'RA' };
    });

    await supabase.from('projects').update({ source_system: 'SAP_PS', external_id: project.code, last_synced_at: syncedAt }).eq('id', project.id);

    return {
      ok: true, run_id: null, source_system: 'SAP_PS',
      rows_inserted: totals.inserted, rows_updated: totals.updated, rows_skipped: 0, exceptions: totals.exceptions,
      message: `Synced from SAP PS (mock): ${totals.messages.join(', ')}, ${totals.exceptions} exception(s).`,
    };
  } catch (e) {
    return { ok: false, run_id: null, source_system: 'SAP_PS', rows_inserted: totals.inserted, rows_updated: totals.updated, rows_skipped: 0, exceptions: totals.exceptions, message: String(e) };
  }
}

export async function ingestSchedulerProject(
  supabase: Supabase,
  project: { id: string; code: string },
  connector: SchedulerConnector,
  channel: IngestChannel = 'api',
  only?: string,
): Promise<SyncResult> {
  const source: SourceSystem = connector.source;
  const taskEndpoint = source === 'P6' ? 'P6 EPPM · /activities' : 'Dataverse · msdyn_projecttask';
  const resEndpoint = source === 'P6' ? 'P6 EPPM · /resourceassignments' : 'Dataverse · msdyn_resourceassignment';
  const syncedAt = new Date().toISOString();
  const totals = { inserted: 0, updated: 0, exceptions: 0, messages: [] as string[] };

  // WBS join target — codes that came from SAP for this project.
  const { data: wps } = await supabase.from('work_packages').select('wbs_code').eq('project_id', project.id);
  const validWbs = new Set((wps ?? []).map((w) => (w as { wbs_code: string }).wbs_code));

  try {
    if (!only || only === 'tasks') await runObject(supabase, project, source, channel, 'tasks', taskEndpoint, totals, async () => {
      const dtos = await connector.fetchTasks(project.code);
      const m = mapSchedulerTasks(dtos, project.id, validWbs, source, syncedAt);
      if (dtos.length > 0) {
        await supabase.from('tasks').delete().eq('project_id', project.id).eq('source_system', source);
        if (m.rows.length > 0) { const { error } = await supabase.from('tasks').insert(m.rows); if (error) throw new Error(`tasks: ${error.message}`); }
      }
      return { inserted: m.rows.length, updated: 0, exceptions: m.exceptions, count: m.rows.length, label: 'Tasks' };
    });

    if (!only || only === 'resources') await runObject(supabase, project, source, channel, 'resources', resEndpoint, totals, async () => {
      const dtos = await connector.fetchResourceAssignments(project.code);
      const m = mapSchedulerResources(dtos, project.id, validWbs, source, syncedAt);
      if (dtos.length > 0) {
        await supabase.from('resource_assignments').delete().eq('project_id', project.id).eq('source_system', source);
        if (m.rows.length > 0) { const { error } = await supabase.from('resource_assignments').insert(m.rows); if (error) throw new Error(`resource_assignments: ${error.message}`); }
      }
      return { inserted: m.rows.length, updated: 0, exceptions: m.exceptions, count: m.rows.length, label: 'Resources' };
    });

    await supabase.from('projects').update({ last_synced_at: syncedAt }).eq('id', project.id);

    return {
      ok: true, run_id: null, source_system: source,
      rows_inserted: totals.inserted, rows_updated: totals.updated, rows_skipped: 0, exceptions: totals.exceptions,
      message: `Synced from ${source} (mock): ${totals.messages.join(', ')}, ${totals.exceptions} exception(s).`,
    };
  } catch (e) {
    return { ok: false, run_id: null, source_system: source, rows_inserted: totals.inserted, rows_updated: totals.updated, rows_skipped: 0, exceptions: totals.exceptions, message: String(e) };
  }
}
