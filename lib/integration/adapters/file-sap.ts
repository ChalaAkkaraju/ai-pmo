/**
 * FileSapAdapter — a SapConnector backed by rows parsed from an uploaded CSV
 * (WBS and/or cost). Empty arrays mean "this upload doesn't carry that data",
 * so the ingestion service leaves the untouched type alone.
 */
import type { SapConnector, SapWbsElementDTO, SapCostActualDTO, ConnectionStatus } from '../types';

export class FileSapAdapter implements SapConnector {
  readonly source = 'SAP_PS' as const;
  constructor(private readonly wbs: SapWbsElementDTO[] = [], private readonly cost: SapCostActualDTO[] = []) {}
  async testConnection(): Promise<ConnectionStatus> {
    return { ok: true, message: `Parsed ${this.wbs.length} WBS / ${this.cost.length} cost rows from file` };
  }
  async fetchWbs(): Promise<SapWbsElementDTO[]> { return this.wbs; }
  async fetchCostActuals(): Promise<SapCostActualDTO[]> { return this.cost; }
}
