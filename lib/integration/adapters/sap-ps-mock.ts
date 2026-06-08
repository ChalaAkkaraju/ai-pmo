/**
 * SapPsMockAdapter — implements the SapConnector port against canned fixtures
 * shaped like an S/4HANA Enterprise Project OData response. Swap this for a
 * live BTP adapter (same interface) when a real tenant is available; the
 * mapper, ingestion service and UI never change.
 *
 * The fixture deliberately includes ONE malformed WBS element (no external
 * code) so the ingestion exception queue can be demonstrated end-to-end.
 */

import type { SapConnector, SapWbsElementDTO, SapCostActualDTO, SapPurchaseOrderDTO, SapBillingDTO, SapResultsAnalysisDTO, ConnectionStatus } from '../types';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const PHASES: Array<[string, number]> = [['1', 0.10], ['2', 0.15], ['3', 0.42], ['4', 0.23], ['5', 0.05]];

export class SapPsMockAdapter implements SapConnector {
  readonly source = 'SAP_PS' as const;

  async testConnection(): Promise<ConnectionStatus> {
    await new Promise((r) => setTimeout(r, 250));
    return { ok: true, message: 'Mock SAP PS connection OK (BTP destination simulated)' };
  }

  async fetchWbs(projectExternalId: string): Promise<SapWbsElementDTO[]> {
    await new Promise((r) => setTimeout(r, 600)); // simulate latency
    const bac = 40_000_000 + (hash(projectExternalId) % 60) * 1_000_000; // 40–100M
    const leaf = (code: string, parent: string, name: string, role: string, weight: number, billing = false): SapWbsElementDTO => ({
      WBSElementExternalID: code,
      ParentWBSElement: parent,
      WBSElementDescription: name,
      PersonResponsible: role,
      IsBillingElement: billing,
      Budget: r2(weight * bac),
      BudgetBaseline: r2(weight * bac * 0.96),
      LatestFinishDate: null,
      WBSElementInternalID: `${projectExternalId}-${code}`,
    });
    const phase = (code: string, name: string): SapWbsElementDTO => ({
      WBSElementExternalID: code, ParentWBSElement: null, WBSElementDescription: name,
      PersonResponsible: null, IsBillingElement: false, Budget: null, BudgetBaseline: null,
      LatestFinishDate: null, WBSElementInternalID: `${projectExternalId}-${code}`,
    });

    return [
      phase('1', 'Development & permits'),
      leaf('1.1', '1', 'Permits & approvals', 'PM', 0.05),
      leaf('1.2', '1', 'Land & grid rights', 'COMM', 0.05),
      phase('2', 'Engineering'),
      leaf('2.1', '2', 'Detailed design', 'ENG', 0.15),
      phase('3', 'Procurement'),
      leaf('3.1', '3', 'Major equipment supply', 'PROC', 0.32, true),
      leaf('3.2', '3', 'Balance-of-plant procurement', 'PROC', 0.10),
      phase('4', 'Construction'),
      leaf('4.1', '4', 'Civil & foundations', 'CON', 0.10),
      leaf('4.2', '4', 'Mechanical & electrical', 'CON', 0.13, true),
      phase('5', 'Commissioning & handover'),
      leaf('5.1', '5', 'Testing & commissioning', 'ENG', 0.05),
      // Deliberately malformed element — no external WBS code → exception queue.
      { WBSElementExternalID: '', ParentWBSElement: '5', WBSElementDescription: 'Unmapped legacy element', PersonResponsible: 'PM', IsBillingElement: false, Budget: 100000, BudgetBaseline: null, LatestFinishDate: null, WBSElementInternalID: `${projectExternalId}-OBSOLETE` },
    ];
  }

  async fetchCostActuals(projectExternalId: string): Promise<SapCostActualDTO[]> {
    await new Promise((r) => setTimeout(r, 400));
    const bac = 40_000_000 + (hash(projectExternalId) % 60) * 1_000_000;
    const leaves: Array<[string, number]> = [
      ['1.1', 0.05], ['1.2', 0.05], ['2.1', 0.15], ['3.1', 0.32], ['3.2', 0.10],
      ['4.1', 0.10], ['4.2', 0.13], ['5.1', 0.05],
    ];
    const out: SapCostActualDTO[] = [];
    for (const [code, w] of leaves) {
      const leafBac = w * bac;
      // one cumulative period row per leaf (kept simple for the mock)
      out.push({
        WBSElementExternalID: code,
        FiscalPeriod: '2026-05-01',
        ActualAmount: r2(leafBac * 0.55),
        CommitmentAmount: r2(leafBac * 0.15),
        PlannedAmount: r2(leafBac * 0.60),
      });
    }
    return out;
  }

  async fetchPurchaseOrders(projectExternalId: string): Promise<SapPurchaseOrderDTO[]> {
    await new Promise((r) => setTimeout(r, 350));
    const bac = 40_000_000 + (hash(projectExternalId) % 60) * 1_000_000;
    const vendors = ['Siemens Energy', 'GE Vernova', 'Hitachi Energy', 'Bechtel', 'ABB', 'Voith Hydro'];
    const defs: Array<[string, number, string]> = [
      ['3.1', 0.32, 'Materials/Equipment'], ['3.2', 0.10, 'Materials/Equipment'],
      ['4.1', 0.10, 'Subcontract'], ['4.2', 0.13, 'Subcontract'],
    ];
    const out: SapPurchaseOrderDTO[] = defs.map(([code, w, cat], i) => {
      const value = r2(w * bac * 0.7);
      return {
        PurchaseOrder: `45${(hash(projectExternalId + code) % 100000).toString().padStart(5, '0')}`,
        WBSElementExternalID: code, Supplier: vendors[(hash(code) + i) % vendors.length],
        ValueCategory: cat, NetOrderValue: value, DeliveredValue: r2(value * 0.4),
        PurchaseOrderStatus: 'Partially received', CreatedPeriodWeek: 8 + i * 3,
      };
    });
    // Malformed PO — no document number → exception queue.
    out.push({ PurchaseOrder: '', WBSElementExternalID: '3.1', Supplier: 'Unknown', ValueCategory: 'Other', NetOrderValue: 50000, DeliveredValue: 0, PurchaseOrderStatus: 'Open', CreatedPeriodWeek: null });
    return out;
  }

  async fetchBilling(projectExternalId: string): Promise<SapBillingDTO[]> {
    await new Promise((r) => setTimeout(r, 300));
    const contract = (40_000_000 + (hash(projectExternalId) % 60) * 1_000_000) * 1.10;
    const out: SapBillingDTO[] = [];
    PHASES.forEach(([code, w], i) => {
      const amount = r2(w * contract * 0.85);
      if (amount < 10000) return;
      out.push({
        BillingDocument: `90${(hash(projectExternalId + 'bill' + code) % 100000).toString().padStart(5, '0')}`,
        WBSElementExternalID: code, BillingCategory: i === 0 ? 'Advance' : (i % 2 ? 'Progress' : 'Milestone'),
        NetAmount: amount, BilledPeriodWeek: 6 + i * 4, BillingStatus: i < 2 ? 'Paid' : 'Invoiced',
      });
    });
    return out;
  }

  async fetchResultsAnalysis(projectExternalId: string): Promise<SapResultsAnalysisDTO[]> {
    await new Promise((r) => setTimeout(r, 300));
    const bac = 40_000_000 + (hash(projectExternalId) % 60) * 1_000_000;
    const contract = bac * 1.10;
    return PHASES.map(([code, w]) => {
      const plannedCost = r2(w * bac), plannedRev = r2(w * contract);
      const poc = clamp(0.40 + (hash(projectExternalId + code) % 50) / 100, 0, 1);
      const recognised = r2(poc * plannedRev), cos = r2(poc * plannedCost);
      return {
        WBSElementExternalID: code, FiscalPeriod: '2026-05-01', RAMethod: 'Cost-based POC',
        PercentageOfCompletion: r2(poc * 100), PlannedCost: plannedCost, PlannedRevenue: plannedRev,
        CostOfSales: cos, CalculatedRevenue: recognised, RecognizedMargin: r2(recognised - cos), Reserve: 0,
      };
    });
  }
}
