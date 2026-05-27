/**
 * Mariposa change orders — 1 entry (CO-001).
 *
 * Data extracted from runs/run25_co001_mariposa_week52.md.
 * CO-001 is the structurally-predicted R-007 client-driven mid-construction
 * scope addition (SCADA portfolio integration to client OPCO).
 * Four-frame commercial dynamics analysis preserved 8.2% margin on the CO
 * scope vs Riverside CO-003 pre-discipline 6.7% (1.5pp margin protection).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const CO001 = {
  co_id: 'CO-001',
  driver: 'Client-driven',
  scope_summary:
    'SCADA portfolio integration to client operations centre (OPCO). Modbus TCP gateway + secure site-to-OPCO VPN + portfolio-dashboard API data-tag mapping (~1,400 tags) + factory and site integration testing + OPCO-acceptance test. Integration required for client tax-credit-tier dispatch verification. Outside original WBS 8.3 scope which assumed Mariposa-only plant-control SCADA.',
  cost_impact_m: 0.78,
  revenue_impact_m: 0.85,
  schedule_impact_days: 0,
  margin_realized_pct: 8.2,
  status: 'Complete' as const,
  approval_routing:
    'Director (per charter §11: PM up to $100k, Director up to $1M, Sponsor above; CO-001 cost-side $0.78M sits within Director authority). Sponsor notified for monthly portfolio dashboard awareness; CFO not in routing path.',
  executed_week: 40,
  four_frame_analysis: {
    vendor_leverage:
      'Favourable. SCADA vendor offered a standard portfolio-integration module with established pricing and integration playbook — Northwood priced from vendor standard quote with modest engineering overlay. Not accelerated sole-source (contrast Riverside CO-003 UV equipment, Pattern 1 leverage). Standardised vendor portfolio-integration module is an exception to the dominant Pattern 1 leverage dynamic.',
    client_leverage:
      'Low. Integration was essential to client tax-credit-tier dispatch verification, with no realistic alternative routing through plant-level SCADA alone. Refusal would not break the base contract.',
    client_position:
      'Strong willingness to pay. Tax-credit-tier economics on client side dwarfed the $850k integration cost. Phase 2 prospect dimension named explicitly per post-Ironvale Commercial Standards discipline.',
    northwood_acceptance:
      'Acceptable margin against acceptable risk. 8.2% realised margin sits 1.3pp below the 9.5% bid margin and well above the 5.7% margin floor. Scope is in Northwood electrical/controls strength area. Schedule absorbs cleanly inside existing WBS 8.5 ~45-day float. Technical risk low (standard vendor module, mature interface).',
  },
};

export async function seedMariposaChangeOrders(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ inserted: number; updated: number }> {
  const row = {
    project_id: projectId,
    ...CO001,
  };

  const { error, count } = await supabase
    .from('change_orders')
    .upsert(row, { onConflict: 'project_id,co_id', count: 'exact' });

  if (error) {
    throw new Error(`Failed to upsert Mariposa change orders: ${error.message}`);
  }

  return { inserted: count ?? 1, updated: 0 };
}
