/**
 * MsProjectMockAdapter — implements SchedulerConnector against fixtures shaped
 * like Microsoft Project (msdyn_projecttask, mapped to the
 * neutral SchedulerTaskDTO). Tasks are tagged with a WBS code via the custom
 * column cr_wbscode. One task references a WBS code that is NOT in the SAP WBS,
 * to demonstrate the unmapped_wbs (join) exception end-to-end.
 *
 * Swap for a live Microsoft Project Web API adapter behind the same interface.
 */

import type { SchedulerConnector, SchedulerTaskDTO, SchedulerResourceDTO, SchedulerMilestoneDTO, ConnectionStatus } from '../types';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function addMonths(base: Date, m: number): string {
  const d = new Date(base.getFullYear(), base.getMonth() + m, 15);
  return d.toISOString().slice(0, 10);
}

export class MsProjectMockAdapter implements SchedulerConnector {
  readonly source = 'MS_PROJECT' as const;

  async testConnection(): Promise<ConnectionStatus> {
    await new Promise((r) => setTimeout(r, 250));
    return { ok: true, message: 'Mock Microsoft Project connection OK (Entra ID service principal simulated)' };
  }

  async fetchTasks(projectExternalId: string): Promise<SchedulerTaskDTO[]> {
    await new Promise((r) => setTimeout(r, 600));
    const start = new Date(2025, (hash(projectExternalId) % 6), 1);
    const t = (id: string, name: string, wbs: string | null, m0: number, m1: number, pct: number): SchedulerTaskDTO => ({
      external_id: `${projectExternalId}-T-${id}`,
      name,
      wbs_code: wbs,
      start: addMonths(start, m0),
      finish: addMonths(start, m1),
      percent_complete: pct,
    });
    return [
      t('01', 'Obtain permits', '1.1', 0, 3, 100),
      t('02', 'Secure land & grid rights', '1.2', 0, 4, 100),
      t('03', 'Detailed design', '2.1', 2, 8, 80),
      t('04', 'Procure major equipment', '3.1', 5, 14, 55),
      t('05', 'Procure balance of plant', '3.2', 8, 14, 40),
      t('06', 'Civil & foundations', '4.1', 10, 18, 30),
      t('07', 'Mechanical & electrical', '4.2', 14, 22, 10),
      t('08', 'Testing & commissioning', '5.1', 22, 25, 0),
      // Task tagged to a WBS code that does NOT exist in the SAP WBS → unmapped_wbs.
      t('99', 'Owner scope change (untagged)', '9.9', 12, 15, 0),
    ];
  }

  async fetchResourceAssignments(projectExternalId: string): Promise<SchedulerResourceDTO[]> {
    await new Promise((r) => setTimeout(r, 400));
    const start = new Date(2025, (hash(projectExternalId) % 6), 1);
    // hours = planned; actual = timesheet to date; rate = blended discipline rate.
    const a = (id: string, wbs: string, role: string, name: string, m: number, hours: number, actual: number, rate: number): SchedulerResourceDTO => ({
      external_id: `${projectExternalId}-RA-${id}`, wbs_code: wbs, resource_role: role, resource_name: name, period: addMonths(start, m), hours, actual_hours: actual, hourly_rate: rate,
    });
    return [
      a('01', '2.1', 'engineering_manager', 'Engineering pool', 3, 320, 290, 145),
      a('02', '3.1', 'procurement', 'Procurement pool', 6, 480, 410, 120),
      a('03', '4.1', 'construction_manager', 'Construction pool', 11, 640, 700, 110),
      a('04', '4.2', 'construction_manager', 'Construction pool', 16, 520, 480, 110),
    ];
  }

  async fetchMilestones(projectExternalId: string): Promise<SchedulerMilestoneDTO[]> {
    await new Promise((r) => setTimeout(r, 300));
    const start = new Date(2025, (hash(projectExternalId) % 6), 1);
    const m = (id: string, name: string, wbs: string | null, month: number, contractual: boolean, achieved: boolean): SchedulerMilestoneDTO => ({
      external_id: `${projectExternalId}-MS-${id}`, name, wbs_code: wbs,
      due_date: addMonths(start, month), is_contractual: contractual, achieved,
      achieved_date: achieved ? addMonths(start, month) : null,
    });
    return [
      m('01', 'Notice to proceed (NTP)', null, 0, true, true),
      m('02', 'Detailed design complete', '2.1', 8, false, true),
      m('03', 'Major equipment delivered', '3.1', 14, true, false),
      m('04', 'Commercial operation (COD)', null, 25, true, false),
      // Milestone tagged to a WBS code not in the SAP WBS -> unmapped_wbs exception.
      m('99', 'Owner acceptance (untagged scope)', '9.9', 15, false, false),
    ];
  }
}
