/**
 * FileSapAdapter — a SapConnector backed by rows parsed from an uploaded CSV
 * (the file / manual channel). Carries WBS only; cost is unaffected so a
 * structure upload does not wipe cost actuals from a prior API sync.
 */
import type { SapConnector, SapWbsElementDTO, SapCostActualDTO, ConnectionStatus } from '../types';

export class FileSapAdapter implements SapConnector {
  readonly source = 'SAP_PS' as const;
  constructor(private readonly wbs: SapWbsElementDTO[]) {}
  async testConnection(): Promise<ConnectionStatus> {
    return { ok: true, message: `Parsed ${this.wbs.length} WBS rows from file` };
  }
  async fetchWbs(): Promise<SapWbsElementDTO[]> { return this.wbs; }
  async fetchCostActuals(): Promise<SapCostActualDTO[]> { return []; }
}
