/**
 * Mariposa Wind Farm Phase 1 — project row.
 *
 * State seeded at the canonical Week 78 (Substantial Completion) reference
 * point. Reflects the post-CO-001 contract and budget values. The UI then
 * surfaces the lifecycle state across all four iterations (Week 0, 28, 52, 78)
 * via the variance reports + agent outputs tables seeded in 1b.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '../lib/log';

const PROJECT_CODE = 'NW-REN-2511';

const mariposaProject = {
  name: 'Mariposa Wind Farm Phase 1',
  code: PROJECT_CODE,
  client: 'Mariposa Renewables Holdings (IPP)',
  contract_value_initial: 148_000_000.0,
  contract_value_current: 148_850_000.0, // post-CO-001
  approved_budget_initial: 134_000_000.0,
  approved_budget_current: 134_780_000.0, // post-CO-001 cost-side
  contingency: 5_500_000.0,
  segment: 'renewables' as const,
  status: 'SC' as const, // Substantial Completion achieved Week 78
  current_week: 78,
  hard_deadline_description:
    'Federal tax-credit-tier energisation deadline 30 December year+1 (Week 82). 30-day SC-to-energisation buffer intact at SC handover.',
};

export async function seedMariposaProject(supabase: SupabaseClient): Promise<string> {
  // Upsert by project code (natural key)
  const { data, error } = await supabase
    .from('projects')
    .upsert(mariposaProject, { onConflict: 'code' })
    .select('id')
    .single();

  if (error) {
    log.error(`Failed to upsert Mariposa project row: ${error.message}`);
    throw error;
  }

  if (!data) {
    throw new Error('Upsert returned no row');
  }

  return data.id;
}

export { PROJECT_CODE };
