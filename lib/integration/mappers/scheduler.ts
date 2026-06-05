/**
 * Scheduler mapper — neutral scheduler DTO → canonical tasks / resource
 * assignments. Pure functions. Shared across Microsoft Project and P6 because the hard
 * part is the same: JOIN each task on its WBS code against the WBS that came
 * from SAP. A task whose WBS code matches no work package is an `unmapped_wbs`
 * exception (queued, never ingested with a dangling reference).
 */

import type {
  SchedulerTaskDTO,
  SchedulerResourceDTO,
  TaskRow,
  ResourceRow,
  MapResult,
  SourceSystem,
} from '../types';
import { normalizeWbs } from './sap-ps';

const ROLE_SET = new Set([
  'pm', 'engineering_manager', 'construction_manager', 'procurement',
  'commercial', 'project_controls', 'hse_manager', 'program_manager', 'risk',
]);

export function mapSchedulerTasks(
  dtos: SchedulerTaskDTO[],
  projectId: string,
  validWbs: Set<string>,
  source: SourceSystem,
  syncedAt: string,
): MapResult<TaskRow> {
  const rows: TaskRow[] = [];
  const exceptions: MapResult<TaskRow>['exceptions'] = [];

  for (const d of dtos) {
    const code = d.wbs_code ? normalizeWbs(d.wbs_code) : '';
    if (!code) {
      exceptions.push({ kind: 'unmapped_wbs', external_id: d.external_id, reason: `Task "${d.name}" has no WBS code`, payload: d });
      continue;
    }
    if (!validWbs.has(code)) {
      exceptions.push({ kind: 'unmapped_wbs', external_id: d.external_id, reason: `Task "${d.name}" references WBS ${code}, which is not in the SAP WBS`, payload: d });
      continue;
    }
    rows.push({
      project_id: projectId,
      wbs_code: code,
      name: d.name,
      start_date: d.start ?? null,
      finish_date: d.finish ?? null,
      percent_complete: Math.max(0, Math.min(100, Number(d.percent_complete) || 0)),
      owner_role_type: null,
      source_system: source,
      external_id: d.external_id,
      synced_at: syncedAt,
      is_app_native: false,
    });
  }
  return { rows, exceptions };
}

export function mapSchedulerResources(
  dtos: SchedulerResourceDTO[],
  projectId: string,
  validWbs: Set<string>,
  source: SourceSystem,
  syncedAt: string,
): MapResult<ResourceRow> {
  const rows: ResourceRow[] = [];
  const exceptions: MapResult<ResourceRow>['exceptions'] = [];

  for (const d of dtos) {
    const code = d.wbs_code ? normalizeWbs(d.wbs_code) : '';
    if (code && !validWbs.has(code)) {
      exceptions.push({ kind: 'unmapped_wbs', external_id: d.external_id, reason: `Resource assignment references WBS ${code}, not in the SAP WBS`, payload: d });
      continue;
    }
    rows.push({
      project_id: projectId,
      resource_name: d.resource_name,
      resource_role: d.resource_role && ROLE_SET.has(d.resource_role) ? d.resource_role : null,
      period: d.period,
      planned_work_hours: d.hours ?? null,
      source_system: source,
      external_id: d.external_id,
      synced_at: syncedAt,
    });
  }
  return { rows, exceptions };
}
