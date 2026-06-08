/**
 * FileSchedulerAdapter — a SchedulerConnector backed by rows parsed from an
 * uploaded CSV (tasks and/or resources). Uploaded schedule data is treated as
 * coming from the scheduler (MS_PROJECT) via the file channel.
 */
import type { SchedulerConnector, SchedulerTaskDTO, SchedulerResourceDTO, SchedulerMilestoneDTO, ConnectionStatus } from '../types';

export class FileSchedulerAdapter implements SchedulerConnector {
  readonly source = 'MS_PROJECT' as const;
  constructor(private readonly tasks: SchedulerTaskDTO[] = [], private readonly resources: SchedulerResourceDTO[] = [], private readonly milestones: SchedulerMilestoneDTO[] = []) {}
  async testConnection(): Promise<ConnectionStatus> {
    return { ok: true, message: `Parsed ${this.tasks.length} tasks / ${this.resources.length} resource rows from file` };
  }
  async fetchTasks(): Promise<SchedulerTaskDTO[]> { return this.tasks; }
  async fetchResourceAssignments(): Promise<SchedulerResourceDTO[]> { return this.resources; }
  async fetchMilestones(): Promise<SchedulerMilestoneDTO[]> { return this.milestones; }
}
