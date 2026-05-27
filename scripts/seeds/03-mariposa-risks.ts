/**
 * Mariposa risks — 12 entries reflecting the Week 78 closeout state.
 *
 * Data extracted from runs/run27_risk_register_mariposa_week78.md §1.
 * Final closeout disposition applies the three-category closeout taxonomy:
 *   - Realised (3 risks): R-007 CO-001 contained, R-009 sub-grade contained,
 *     R-010 one weather event absorbed
 *   - Mitigated (8 risks): R-001, R-002, R-003, R-004, R-005, R-006, R-008, R-011
 *   - Not Materialised (1 risk): R-012 (no opposition signal)
 *
 * Cross-cutting class assignments follow Iteration-3 portfolio review §2.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface MariposaRisk {
  risk_id: string;
  category: string;
  description: string;
  probability: 'L' | 'M' | 'H';
  impact: 'L' | 'M' | 'H';
  score: number;
  response: string;
  owner: string;
  trigger: string;
  status: string;
  cross_cutting_class:
    | 'Vendor / supplier concentration'
    | 'Regulatory / external deadline'
    | 'Site-conditions variance'
    | 'Resource / labour scarcity'
    | 'Client-driven scope or sequence changes'
    | 'Weather / climate-sensitive construction'
    | 'Project-specific';
  pattern_link: string | null;
}

const risks: MariposaRisk[] = [
  {
    risk_id: 'R-001',
    category: 'Procurement',
    description:
      'Single-OEM turbine supply concentration across 80 units may produce delivery slip, FAT failure, or OEM financial distress that cascades across the fleet and erodes the 30-day energisation buffer.',
    probability: 'L',
    impact: 'M',
    score: 2,
    response:
      'Mitigate — PO released Week 18 at $66.4M (favourable $0.6M); FAT clear Week 33; all 80 deliveries complete Week 50 with no slip; performance-test re-calibration on 2 of 80 closed under OEM warranty Week 75 (I-029); expediter demobilised Week 50; monthly OEM financial-health monitoring continues through 24-month warranty tail; performance bond active through warranty. Residual exposure on warranty-tail commitments only.',
    owner: 'Procurement Manager',
    trigger:
      'OEM financial-health adverse signal during warranty tail, OR warranty-claim refusal or delay > 4 weeks on any unit',
    status: 'Mitigated',
    cross_cutting_class: 'Vendor / supplier concentration',
    pattern_link: 'Pattern 1',
  },
  {
    risk_id: 'R-002',
    category: 'Schedule / Commercial',
    description:
      'Federal tax-credit deadline 30 December year+1 is a hard client commitment; schedule slip past this date erodes client tax-credit-tier economics and exposes Northwood to LD cap ($11.84M) and claim risk.',
    probability: 'L',
    impact: 'H',
    score: 3,
    response:
      'Mitigate — SC achieved on contractual date Week 78 (30 November year+1); 30-day SC-to-energisation buffer intact at SC handover; grid energisation forecast Week 82 (30 December year+1) within deadline; commissioning-stage utility coordination sequenced Weeks 80-82 with no anomaly indicators; no LD exposure crystallised. Residual exposure limited to energisation-event coordination through Week 82.',
    owner: 'Project Manager',
    trigger:
      'Utility-coordination anomaly during energisation event Weeks 80-82, OR commissioning-stage issue forcing energisation re-attempt',
    status: 'Mitigated',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
  {
    risk_id: 'R-003',
    category: 'Regulatory',
    description:
      'Migratory bird flyway permit conditions may impose construction blackout periods that compress the productive construction window.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — both blackout windows (15 Mar-15 May, 15 Sep-15 Nov year+1) successfully observed with bid-stage Chain D sequencing holding; no construction conflict in either window; Officer Whitlock final compliance call Week 76 confirmed compliance; permit closed at SC.',
    owner: 'PM with QA/QC Lead support',
    trigger: 'n/a — risk closed at SC; no warranty-tail exposure',
    status: 'Mitigated',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
  {
    risk_id: 'R-004',
    category: 'Schedule / Stakeholder',
    description:
      'Rural-road upgrades across two counties required for turbine component delivery may produce DOT coordination or condition-survey scope-growth disruption.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — both county DOTs complete Week 35; all 80 turbine-component heavy-hauls completed Weeks 38-65 without incident beyond minor crane-pad repair (I-025 closed Week 39, <$10k); Logistics Lead A. Patel demobilised Week 65; no further DOT dependencies.',
    owner: 'Logistics Lead with PM support',
    trigger: 'n/a — risk closed at SC',
    status: 'Mitigated',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
  {
    risk_id: 'R-005',
    category: 'People',
    description: 'Rural labour market shortage may reduce productivity across on-site work packages.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — recruitment held on plan throughout 18-month execution; site headcount stable at 142-145 against plan; final $50k retention bonus drawdown at Week 78 against $500k R5 allocation (90% R5 reserve untouched); camp lease $1.55M against $1.7M budget (favourable $0.15M); regional trades partnership stable through demobilisation.',
    owner: 'Construction Manager with PM',
    trigger: 'n/a — risk closed at SC; demobilisation complete',
    status: 'Mitigated',
    cross_cutting_class: 'Resource / labour scarcity',
    pattern_link: 'Candidate (pending placeholder confirmation)',
  },
  {
    risk_id: 'R-006',
    category: 'Technical',
    description:
      'First-of-its-kind 80-unit single-OEM PO may produce design-interface surprises at the OEM-foundation-tower-electrical boundary that propagate as rework.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — formal OEM design-interface review Week 19; FAT findings remediated Week 33 (I-024); first-turbine erection validated procedure Week 47 (I-027); remaining 79 erections completed without further design-interface findings; performance-test re-calibration on 2 of 80 (I-029) was a wear-in calibration drift, not a design-interface mismatch — closed under OEM warranty discipline Week 75. Design-interface risk demonstrably contained across full fleet.',
    owner: 'Engineering Lead',
    trigger: 'Design-interface issue surfacing during warranty tail at any unit',
    status: 'Mitigated',
    cross_cutting_class: 'Vendor / supplier concentration',
    pattern_link: 'Pattern 1',
  },
  {
    risk_id: 'R-007',
    category: 'Commercial',
    description:
      'Client-driven mid-construction scope additions on fixed-price IPP contract with tax-credit-driven capital plan are structurally predicted per Pattern 3.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — CO-001 SCADA portfolio integration realised Week 40 at $850k via four-frame commercial dynamics analysis (I-026); margin-neutral at 8.2% protected base contract economics; CO-001 integration complete Week 65 with OPCO acceptance Week 66 after I-030 data-tag remediation (<$30k absorbed); no CO-002 surfaced through erection, commissioning, or performance testing; four-frame discipline established as standard practice for any warranty-tail change. Structurally-predicted pattern produced one correctly-anticipated realisation.',
    owner: 'PM with Project Director',
    trigger: 'Warranty-tail client-initiated scope-addition request',
    status: 'Realised (once, contained)',
    cross_cutting_class: 'Client-driven scope or sequence changes',
    pattern_link: 'Pattern 3',
  },
  {
    risk_id: 'R-008',
    category: 'Schedule / Regulatory',
    description:
      'Regional utility interconnection study delay or protection-coordination dispute could push energisation past 30 December year+1.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — study complete Week 38; interconnection agreement signed Week 44; protection-coordination signed off Week 46; commissioning-stage utility coordination on energisation event sequenced Weeks 80-82; no anomaly indicators at SC.',
    owner: 'Project Manager',
    trigger: 'Energisation-event coordination anomaly Weeks 80-82',
    status: 'Mitigated',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
  {
    risk_id: 'R-009',
    category: 'Technical / Schedule',
    description:
      'Variable-terrain greenfield sub-grade variance at turbine positions could require foundation redesign and erode schedule float.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — sub-grade variance at Plot B positions 16, 23, 41 realised Week 27; remediated Week 30; extended geotechnical investigation Weeks 29-31 confirmed no further variance; foundations 100% complete Week 38 on schedule (I-021 closed Week 31); commissioning-stage settlement monitoring at remediated positions Weeks 65-78 showed no anomaly; total absorbed cost $0.18M. Localised-and-contained variance arc empirically identical to Skyhawk Plot B NW quadrant.',
    owner: 'Engineering Lead with Construction Manager',
    trigger: 'Warranty-tail settlement anomaly at remediated positions 16/23/41',
    status: 'Realised (contained at three positions)',
    cross_cutting_class: 'Site-conditions variance',
    pattern_link: 'Pattern 4 (elevated candidate → confirmed at Iteration 3)',
  },
  {
    risk_id: 'R-010',
    category: 'Schedule',
    description:
      'Outdoor nacelle and rotor erection is weather-window sensitive; high-wind or icing events may delay sequential erection.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — Week 49 4-day weather stand-down realised, triggered R-010 threshold, Sponsor briefed (I-028); $0.20M absorbed within Chain E float and R5/unallocated reserve; remaining erection season Weeks 50-70 saw no further multi-day stand-down events; weather-window discipline held through Week 70 final erection; R5-pooled-reserve approach validated.',
    owner: 'Construction Manager',
    trigger: 'n/a — risk closed at SC; all 80 erections complete',
    status: 'Realised (one event, absorbed)',
    cross_cutting_class: 'Weather / climate-sensitive construction',
    pattern_link: 'Candidate (pending placeholder confirmation)',
  },
  {
    risk_id: 'R-011',
    category: 'Safety / HSE',
    description:
      'Heavy-lift turbine erection at 110 m hub height across 80 positions, combined with rural-site emergency-response distances, increases consequence severity of any incident.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — all 80 turbine erections completed with no near-misses, no lost-time events, no working-at-height first-aid events; daily JSA and toolbox-talk discipline held throughout; pre-arranged regional medical evacuation never activated; HSE Lead demobilised Week 78 with clean record; competency verification discipline held across all crane and rigging crew.',
    owner: 'HSE Lead',
    trigger: 'n/a — risk closed at SC; erection complete',
    status: 'Mitigated',
    cross_cutting_class: 'Project-specific',
    pattern_link: null,
  },
  {
    risk_id: 'R-012',
    category: 'Stakeholder',
    description:
      'Organised local landowner opposition may emerge during construction; if a vocal group forms, permit standing, county-council support, or press environment could shift adversely.',
    probability: 'L',
    impact: 'L',
    score: 1,
    response:
      'Mitigate — quarterly community newsletter cadence held throughout (Weeks 12, 24, 36, 48, 60, 72); 48-hour complaint response procedure never activated for opposition; no organised opposition signals across 18-month execution; Officer Whitlock final positive engagement Week 76; client-led community engagement model proven effective.',
    owner: 'Client Lead D. Bridges with Northwood PM support',
    trigger: 'n/a — risk closed at SC; no signals across execution',
    status: 'Not Materialised',
    cross_cutting_class: 'Project-specific',
    pattern_link: null,
  },
];

export async function seedMariposaRisks(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ inserted: number; updated: number }> {
  const rows = risks.map((risk) => ({
    project_id: projectId,
    risk_id: risk.risk_id,
    category: risk.category,
    description: risk.description,
    probability: risk.probability,
    impact: risk.impact,
    score: risk.score,
    response: risk.response,
    owner: risk.owner,
    trigger: risk.trigger,
    status: risk.status,
    cross_cutting_class: risk.cross_cutting_class,
    pattern_link: risk.pattern_link,
    updated_at: new Date().toISOString(),
  }));

  const { error, count } = await supabase
    .from('risks')
    .upsert(rows, { onConflict: 'project_id,risk_id', count: 'exact' });

  if (error) {
    throw new Error(`Failed to upsert Mariposa risks: ${error.message}`);
  }

  return { inserted: count ?? rows.length, updated: 0 };
}
