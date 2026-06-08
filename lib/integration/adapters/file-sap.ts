/**
 * FileSapAdapter — a SapConnector backed by rows parsed from an uploaded CSV.
 * Empty arrays mean "this upload doesn't carry that object", so the ingestion
 * service leaves the untouched type alone (the route scopes the sync with
 * `only`). The mapper + exception pipeline are identical to the API channel.
 */
import type {
  SapConnector,
  SapWbsElementDTO,
  SapCostActualDTO,
  SapPurchaseOrderDTO,
  SapBillingDTO,
  SapResultsAnalysisDTO,
  ConnectionStatus,
} from '../types';

export class FileSapAdapter implements SapConnector {
  readonly source = 'SAP_PS' as const;
  constructor(
    private readonly wbs: SapWbsElementDTO[] = [],
    private readonly cost: SapCostActualDTO[] = [],
    private readonly pos: SapPurchaseOrderDTO[] = [],
    private readonly billing: SapBillingDTO[] = [],
    private readonly ra: SapResultsAnalysisDTO[] = [],
  ) {}
  async testConnection(): Promise<ConnectionStatus> {
    return { ok: true, message: `Parsed ${this.wbs.length} WBS / ${this.cost.length} cost rows from file` };
  }
  async fetchWbs(): Promise<SapWbsElementDTO[]> { return this.wbs; }
  async fetchCostActuals(): Promise<SapCostActualDTO[]> { return this.cost; }
  async fetchPurchaseOrders(): Promise<SapPurchaseOrderDTO[]> { return this.pos; }
  async fetchBilling(): Promise<SapBillingDTO[]> { return this.billing; }
  async fetchResultsAnalysis(): Promise<SapResultsAnalysisDTO[]> { return this.ra; }
}
