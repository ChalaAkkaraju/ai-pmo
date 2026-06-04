/**
 * SapPsMockAdapter — implements the SapConnector port against canned fixtures
 * shaped like an S/4HANA Enterprise Project OData response. Swap this for a
 * live BTP adapter (same interface) when a real tenant is available; the
 * mapper, ingestion service and UI never change.
 *
 * The fixture deliberately includes ONE malformed WBS element (no external
 * code) so the ingestion exception queue can be demonstrated end-to-end.
 */

import type { SapConnector, SapWbsElementDTO, SapCostActualDTO, ConnectionStatus } from '../types';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

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
}
