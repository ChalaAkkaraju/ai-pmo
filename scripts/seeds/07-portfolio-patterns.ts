/**
 * Portfolio patterns — 4 cross-cutting patterns.
 *
 * Reflects the closeout-grade portfolio state at Iteration 3 (Mariposa SC).
 * Pattern movements at Iteration 3:
 *   - Pattern 4: candidate → confirmed (two-of-two greenfield realisations)
 *   - Pattern 3: strengthening continues with renewables-scale quantitative anchor
 *   - Pattern 1: strengthening continues with most complete renewables-scale validation
 *   - Pattern 2: confirmed (held at threshold throughout)
 *
 * Data extracted from runs/run31_portfolio_mariposa_week78.md §5.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface PortfolioPattern {
  pattern_id: string;
  name: string;
  cross_cutting_class: string;
  status: 'candidate' | 'confirmed' | 'firm-level standard';
  evidence_md: string;
  threshold_projects: number;
  supporting_projects: string[];
  recommended_action: string;
}

const patterns: PortfolioPattern[] = [
  {
    pattern_id: 'Pattern 1',
    name: 'Sole-source critical equipment dependency',
    cross_cutting_class: 'Vendor / supplier concentration',
    status: 'confirmed',
    evidence_md:
      'Held at threshold from Iteration-1 baseline (Skyhawk BESS, Riverside blowers realised at 14-week slip, Ironvale furnace OEM mitigated through MC). Strengthened at Iteration 3 by Mariposa execution arc: $66.4M PO release Week 18 → FAT clear Week 33 → all 80 deliveries Week 50 → first-turbine erection validated Week 47 → fleet performance test passed Week 75 under OEM warranty discipline. R1 contingency drawn: $0 of $1.8M. **The most complete renewables-scale validation of post-Ironvale discipline to date.**',
    threshold_projects: 4,
    supporting_projects: ['NW-REN-2511', 'Skyhawk', 'Riverside', 'Ironvale'],
    recommended_action:
      'Firm-level Operations Standards elevation for all single-OEM PO above $20M. Codifies monthly financial-health monitoring + FAT-on-lead-units + on-site expediter + lead-unit-erection-as-precedent + fleet performance-test contingency window of 7-10 working days at 168-hour availability test stage on projects above 50 units.',
  },
  {
    pattern_id: 'Pattern 2',
    name: 'Regulator-imposed external deadlines',
    cross_cutting_class: 'Regulatory / external deadline',
    status: 'confirmed',
    evidence_md:
      "Held at threshold from Iteration-1 baseline across three sub-classes (utility interconnection, state environmental, state air quality). Mariposa contributes four sub-classes within one project (R-002 federal tax-credit, R-003 wildlife permit, R-004 county DOT, R-008 utility interconnection). **Mariposa's 30-day SC-to-energisation buffer survived three material in-construction events without erosion** (I-021 sub-grade, I-028 weather, Chain E float consumption). SC achieved on contractual date; energisation forecast within deadline.",
    threshold_projects: 4,
    supporting_projects: ['NW-REN-2511', 'Skyhawk', 'Riverside', 'Ironvale'],
    recommended_action:
      'Firm-level Commercial / Proposal Standards codification of the 30-day SC-to-energisation buffer as the validated minimum on tax-credit-deadline renewables projects. Buffer-sufficiency-against-mid-construction-shocks is a firm-level lesson confirmed at closeout.',
  },
  {
    pattern_id: 'Pattern 3',
    name: 'Client-driven mid-construction scope additions on fixed-price contracts',
    cross_cutting_class: 'Client-driven scope or sequence changes',
    status: 'confirmed',
    evidence_md:
      "Held at threshold from Iteration-1 baseline (Riverside CO-003 UV at 6.7% realised margin pre-discipline; Skyhawk CO-003 SCADA projected). **Mariposa CO-001 closes the loop at Iteration 3: 8.2% realised margin via four-frame commercial dynamics discipline vs Riverside CO-003 pre-discipline 6.7% = 1.5 percentage-point margin protection on the closed CO event.** First portfolio-validated application at renewables scale and first quantitative anchor for the discipline.",
    threshold_projects: 3,
    supporting_projects: ['NW-REN-2511', 'Skyhawk', 'Riverside'],
    recommended_action:
      'Firm-level Commercial / Contract Standards elevation of the four-frame discipline from "applies to fixed-price strategic-value-client changes" (Iteration-1 standard) to "mandatory standard practice on all client-driven mid-construction scope additions on fixed-price contracts above $250k" with the quantitative anchor cited.',
  },
  {
    pattern_id: 'Pattern 4',
    name: 'Variable-terrain greenfield site-conditions variance',
    cross_cutting_class: 'Site-conditions variance',
    status: 'confirmed',
    evidence_md:
      "**Elevated from candidate to confirmed at Iteration 3.** At Iteration 1 the pattern was at threshold (Ironvale brownfield Realised, Skyhawk Plot B NW greenfield Realised) but interpreted as brownfield-specific because Riverside was the structural exception. At Iteration 2 Mariposa's variable-terrain greenfield class was Active with no realised events; pattern held provisional. At Iteration 3, Mariposa R-009 produces a three-position localised-and-contained sub-grade variance arc at Plot B (positions 16, 23, 41) **empirically identical to Skyhawk Plot B NW quadrant** — two-of-two greenfield wind realisations following the same localised-and-contained arc with no fleet-wide propagation and no settlement anomaly through commissioning-phase monitoring.",
    threshold_projects: 2,
    supporting_projects: ['NW-REN-2511', 'Skyhawk'],
    recommended_action:
      'Firm-level Engineering Standards adoption of a greenfield-wind variant of the Ironvale Q1-post-closeout uniform-density geotechnical investigation grid standard. Variable-terrain greenfield wind sites require geotechnical investigation grid density at proposal stage exceeding standard greenfield grid.',
  },
];

export async function seedPortfolioPatterns(
  supabase: SupabaseClient,
): Promise<{ inserted: number }> {
  const rows = patterns.map((p) => ({
    pattern_id: p.pattern_id,
    name: p.name,
    cross_cutting_class: p.cross_cutting_class,
    status: p.status,
    evidence_md: p.evidence_md,
    threshold_projects: p.threshold_projects,
    supporting_projects: p.supporting_projects,
    recommended_action: p.recommended_action,
    updated_at: new Date().toISOString(),
  }));

  const { error, count } = await supabase
    .from('portfolio_patterns')
    .upsert(rows, { onConflict: 'pattern_id', count: 'exact' });

  if (error) {
    throw new Error(`Failed to upsert portfolio patterns: ${error.message}`);
  }

  return { inserted: count ?? rows.length };
}
