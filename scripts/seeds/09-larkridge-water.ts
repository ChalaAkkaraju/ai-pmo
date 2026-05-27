/**
 * Larkridge Water Treatment Upgrade (NW-WTR-2412) — water-brownfield placeholder.
 *
 * T&M-with-cap contract structure (different from Mariposa's fixed-price) per
 * the post-Ironvale water-segment standard. Mid-execution at Week 28.
 * Includes a realised client-driven CO (Pattern 3 evidence).
 *
 * Cross-cutting pattern contribution:
 *   - Pattern 1 (Vendor concentration): single-source UV disinfection unit
 *   - Pattern 2 (Regulatory deadline): NPDES permit compliance deadline
 *   - Pattern 3 (Client-driven CO): CO-001 ozone-pretreatment scope addition
 *   - Pattern 4 (Site-conditions variance): NOT in scope — water-treatment
 *     brownfield, confirming Riverside's structural-exception status
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const PROJECT_CODE = 'NW-WTR-2412';

const project = {
  name: 'Larkridge Water Treatment Upgrade',
  code: PROJECT_CODE,
  client: 'Larkridge Regional Water District',
  contract_value_initial: 42_000_000.0,
  contract_value_current: 43_200_000.0, // post-CO-001
  approved_budget_initial: 38_500_000.0,
  approved_budget_current: 39_600_000.0, // post-CO-001 cost-side
  contingency: 1_800_000.0,
  segment: 'water' as const,
  status: 'Active' as const,
  current_week: 28,
  hard_deadline_description:
    'NPDES permit compliance deadline 15 October year+1 (~Week 60). State regulatory.',
};

const issues = [
  {
    issue_id: 'I-001',
    description: 'UV disinfection unit OEM PO release',
    category: 'Schedule / Commercial',
    severity: 'H' as const,
    owner: 'Procurement Lead',
    status: 'Closed' as const,
    linked_wbs: ['3.4'],
    linked_risk: 'R-001',
    opened_week: 0,
    closed_week: 12,
    closure_narrative:
      'UV-unit PO released Week 12 at $4.2M; sole-source vendor with 18-month lead time; performance bond signed.',
  },
  {
    issue_id: 'I-002',
    description: 'NPDES permit submission and acceptance',
    category: 'Regulatory',
    severity: 'H' as const,
    owner: 'PM with QA/QC Lead',
    status: 'Closed' as const,
    linked_wbs: ['2.10'],
    linked_risk: 'R-002',
    opened_week: 0,
    closed_week: 8,
    closure_narrative:
      'NPDES submission accepted Week 8; state regulator confirmed compliance plan; no conditions.',
  },
  {
    issue_id: 'I-003',
    description:
      'Client request for ozone-pretreatment scope addition (outside original WBS)',
    category: 'Commercial',
    severity: 'H' as const,
    owner: 'PM with Commercial Manager',
    status: 'Closed' as const,
    linked_wbs: ['8.2'],
    linked_risk: 'R-007',
    opened_week: 18,
    closed_week: 24,
    closure_narrative:
      'Four-frame commercial dynamics analysis prepared Weeks 18-20; pricing issued Week 22 at $1.2M scope-additive, schedule-neutral, margin-neutral; CO-001 executed Week 24; ozone unit ordered Week 25.',
  },
  {
    issue_id: 'I-004',
    description: 'Plant-shutdown coordination for tie-in works',
    category: 'Schedule / Stakeholder',
    severity: 'M' as const,
    owner: 'Construction Manager',
    status: 'In progress' as const,
    linked_wbs: ['5.6'],
    linked_risk: null,
    opened_week: 22,
    closed_week: null,
    closure_narrative:
      'Tie-in window negotiation with client operations team; expected confirmation Week 32 ahead of tie-in Week 38.',
  },
  {
    issue_id: 'I-005',
    description: 'Existing-plant hidden-infrastructure mapping',
    category: 'Technical',
    severity: 'L' as const,
    owner: 'Engineering Lead',
    status: 'Closed' as const,
    linked_wbs: ['2.7'],
    linked_risk: null,
    opened_week: 5,
    closed_week: 10,
    closure_narrative:
      'As-built drawings + ground-penetrating-radar survey complete; no surprises beyond bid assumption.',
  },
  {
    issue_id: 'I-006',
    description: 'Operator-training scope confirmation post-CO-001',
    category: 'Stakeholder',
    severity: 'L' as const,
    owner: 'PM',
    status: 'In progress' as const,
    linked_wbs: ['9.7'],
    linked_risk: 'R-007',
    opened_week: 25,
    closed_week: null,
    closure_narrative:
      'Ozone-system operator training scope (post-CO-001) under negotiation; expected close Week 32.',
  },
];

const risks = [
  {
    risk_id: 'R-001',
    category: 'Procurement',
    description:
      'Single-source UV disinfection unit at $4.2M PO; 18-month lead time creates fleet-cascade exposure on delivery or quality.',
    probability: 'L' as const,
    impact: 'H' as const,
    score: 3,
    response:
      'Mitigate — PO released Week 12 (I-001); performance bond active; monthly OEM financial-health monitoring per post-Ironvale standard; FAT scheduled Week 50.',
    owner: 'Procurement Manager',
    trigger: 'OEM delivery slip > 4 weeks, OR adverse financial signal',
    status: 'Active — mitigated to date',
    cross_cutting_class: 'Vendor / supplier concentration',
    pattern_link: 'Pattern 1',
  },
  {
    risk_id: 'R-002',
    category: 'Schedule / Regulatory',
    description:
      'NPDES permit compliance deadline 15 October year+1 — state regulator can issue notice-of-violation on slip.',
    probability: 'L' as const,
    impact: 'H' as const,
    score: 3,
    response:
      'Mitigate — submission accepted Week 8 (I-002); compliance-milestone tracking established; quarterly engagement with state regulator.',
    owner: 'Project Manager',
    trigger: 'State regulator issues compliance concern, OR critical path slips toward 15 October',
    status: 'Active — mitigated',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
  {
    risk_id: 'R-007',
    category: 'Commercial',
    description:
      'Client-driven mid-construction scope additions on T&M-with-cap contract may erode margin if not disciplined per Pattern 3.',
    probability: 'L' as const,
    impact: 'M' as const,
    score: 2,
    response:
      'Mitigate — CO-001 ozone pretreatment realised Week 24 at $1.2M via four-frame analysis (I-003); margin-neutral; established four-frame discipline for any further client request through commissioning.',
    owner: 'PM with Project Director',
    trigger: 'Second client-initiated scope request, OR cumulative CO margin projecting below 7.0%',
    status: 'Realised (once, contained)',
    cross_cutting_class: 'Client-driven scope or sequence changes',
    pattern_link: 'Pattern 3',
  },
  {
    risk_id: 'R-008',
    category: 'Operational',
    description:
      'Client plant-shutdown coordination for tie-in works (Week 38) — client operational pressure may compress tie-in window.',
    probability: 'M' as const,
    impact: 'M' as const,
    score: 4,
    response:
      'Mitigate — tie-in window negotiation under way Weeks 22-32 (I-004); fallback shutdown sequence pre-priced; contingency reserved against operational compression.',
    owner: 'Construction Manager with PM',
    trigger: 'Client compresses tie-in window below 14 days, OR scheduling conflict at Week 38',
    status: 'Active — under negotiation',
    cross_cutting_class: 'Project-specific',
    pattern_link: null,
  },
  {
    risk_id: 'R-009',
    category: 'Technical',
    description:
      'Water-treatment brownfield site-conditions exposure — typically benign per Riverside precedent (structural exception to Pattern 4).',
    probability: 'L' as const,
    impact: 'L' as const,
    score: 1,
    response:
      'Mitigate — as-built + GPR survey complete (I-005); no surprises expected; foundations on schedule.',
    owner: 'Engineering Lead',
    trigger: 'Hidden infrastructure discovered during civil works, OR contamination indicator',
    status: 'Active — mitigated',
    cross_cutting_class: 'Site-conditions variance',
    pattern_link: null, // Riverside structural exception — not Pattern 4 evidence
  },
];

const changeOrder = {
  co_id: 'CO-001',
  driver: 'Client-driven',
  scope_summary:
    'Ozone-pretreatment scope addition — pre-UV ozone contactor + dosing skid + monitoring + integration. Outside original WBS 8.2 scope; required for client to meet new state cyanotoxin standards effective year+2.',
  cost_impact_m: 1.1,
  revenue_impact_m: 1.2,
  schedule_impact_days: 0,
  margin_realized_pct: 8.3,
  status: 'Complete' as const,
  approval_routing:
    'Director (per charter §11; cost $1.1M within Director authority). Sponsor notified.',
  executed_week: 24,
  four_frame_analysis: {
    vendor_leverage:
      'Favourable. Ozone equipment vendor offers standard skid product; competitive secondary vendor available.',
    client_leverage:
      'Low. Cyanotoxin standard is a hard regulatory commitment; refusal would not break the base contract but client would procure separately at higher cost.',
    client_position:
      'Strong willingness to pay. State cyanotoxin standard drives compliance economics.',
    northwood_acceptance:
      'Acceptable margin against acceptable risk. 8.3% realised margin matches base contract economics. Scope in Northwood treatment-process strength area.',
  },
};

const varianceReport = {
  report_week: 28,
  cpi: 0.99,
  spi: 0.98,
  cost_variance_m: -0.1, // minor schedule slip absorbed
  schedule_variance_days: 4,
  contingency_consumed_m: 0.12,
  projected_margin_pct: 9.0,
  buffer_intact_days: null,
  full_report_md: `# Variance Analysis Report — Larkridge Water Treatment Upgrade (Week 28 of ~75)

## 1. Executive summary

Larkridge is tracking at CPI 0.99, SPI 0.98 at Week 28 — within tolerance. CO-001 ozone pretreatment realised Week 24 at $1.2M via four-frame analysis (margin-neutral). 4-day schedule slip from tie-in coordination (I-004) is within float; under negotiation with client operations team.

## 2. Variance metrics

- **CPI:** 0.99
- **SPI:** 0.98 (4-day slip from plant-tie-in coordination)
- **Cost variance:** -$0.1M
- **Contingency consumed:** $0.12M of $1.8M (6.7%)
- **Projected margin at SC:** 9.0% (vs 9.5% bid)
- **CO-001 commercial integration:** +$1.2M revenue / +$1.1M cost / 8.3% margin

## 3. Watch items

- Plant-shutdown tie-in window confirmation (I-004); critical for Week 38 tie-in
- UV-unit FAT Week 50
- NPDES compliance milestone Week 55
`,
};

export async function seedLarkridgeWater(supabase: SupabaseClient): Promise<{
  project: number;
  issues: number;
  risks: number;
  change_orders: number;
  variance: number;
}> {
  const { data: projData, error: projErr } = await supabase
    .from('projects')
    .upsert(project, { onConflict: 'code' })
    .select('id')
    .single();
  if (projErr || !projData) throw new Error(`Larkridge project upsert: ${projErr?.message}`);
  const projectId = projData.id;

  const issueRows = issues.map((i) => ({
    project_id: projectId,
    ...i,
    updated_at: new Date().toISOString(),
  }));
  const { error: issErr, count: issCount } = await supabase
    .from('issues')
    .upsert(issueRows, { onConflict: 'project_id,issue_id', count: 'exact' });
  if (issErr) throw new Error(`Larkridge issues upsert: ${issErr.message}`);

  const riskRows = risks.map((r) => ({
    project_id: projectId,
    ...r,
    updated_at: new Date().toISOString(),
  }));
  const { error: rskErr, count: rskCount } = await supabase
    .from('risks')
    .upsert(riskRows, { onConflict: 'project_id,risk_id', count: 'exact' });
  if (rskErr) throw new Error(`Larkridge risks upsert: ${rskErr.message}`);

  const { error: coErr, count: coCount } = await supabase
    .from('change_orders')
    .upsert(
      { project_id: projectId, ...changeOrder },
      { onConflict: 'project_id,co_id', count: 'exact' },
    );
  if (coErr) throw new Error(`Larkridge change-order upsert: ${coErr.message}`);

  const { error: varErr, count: varCount } = await supabase
    .from('variance_reports')
    .upsert(
      { project_id: projectId, ...varianceReport },
      { onConflict: 'project_id,report_week', count: 'exact' },
    );
  if (varErr) throw new Error(`Larkridge variance upsert: ${varErr.message}`);

  return {
    project: 1,
    issues: issCount ?? issueRows.length,
    risks: rskCount ?? riskRows.length,
    change_orders: coCount ?? 1,
    variance: varCount ?? 1,
  };
}
