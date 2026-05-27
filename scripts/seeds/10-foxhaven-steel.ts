/**
 * Foxhaven Steel Mill Expansion (NW-IND-2508) — industrial-brownfield placeholder.
 *
 * T&M-with-cap contract structure (Ironvale-pattern). Mid-execution at Week 52.
 * Pattern 4 industrial-brownfield evidence: R-009 partially realised at one
 * foundation position during the EAF expansion bay civil works.
 *
 * Cross-cutting pattern contribution:
 *   - Pattern 1 (Vendor concentration): single-OEM electric-arc-furnace controls
 *   - Pattern 2 (Regulatory deadline): state air-quality permit milestone
 *   - Pattern 4 (Site-conditions variance): brownfield latent-condition realisation
 *     (Ironvale-pattern industrial brownfield)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const PROJECT_CODE = 'NW-IND-2508';

const project = {
  name: 'Foxhaven Steel Mill Expansion',
  code: PROJECT_CODE,
  client: 'Foxhaven Steel Industries',
  contract_value_initial: 120_000_000.0,
  contract_value_current: 120_000_000.0,
  approved_budget_initial: 108_000_000.0,
  approved_budget_current: 108_000_000.0,
  contingency: 5_400_000.0,
  segment: 'industrial' as const,
  status: 'Active' as const,
  current_week: 52,
  hard_deadline_description:
    'State air-quality permit operational-startup milestone 30 June year+1 (~Week 85). State EPA-imposed.',
};

const issues = [
  {
    issue_id: 'I-001',
    description: 'EAF controls OEM PO release coordination',
    category: 'Schedule / Commercial',
    severity: 'H' as const,
    owner: 'Procurement Lead',
    status: 'Closed' as const,
    linked_wbs: ['3.2'],
    linked_risk: 'R-001',
    opened_week: 0,
    closed_week: 16,
    closure_narrative:
      'Single-OEM EAF controls PO released Week 16 at $18M; specialised vendor; contracted cadence; performance bond signed.',
  },
  {
    issue_id: 'I-002',
    description: 'State air-quality permit milestone confirmation',
    category: 'Regulatory',
    severity: 'H' as const,
    owner: 'PM with QA/QC Lead',
    status: 'Closed' as const,
    linked_wbs: ['2.10'],
    linked_risk: 'R-002',
    opened_week: 0,
    closed_week: 12,
    closure_narrative:
      'State EPA confirmed 30 June year+1 operational-startup milestone; compliance plan accepted; quarterly engagement scheduled.',
  },
  {
    issue_id: 'I-003',
    description:
      'Latent-condition encounter at EAF expansion bay foundation position 6 (Pattern 4 brownfield realisation)',
    category: 'Technical / Schedule',
    severity: 'H' as const,
    owner: 'PM with Construction Manager',
    status: 'In progress' as const,
    linked_wbs: ['5.4', '2.7'],
    linked_risk: 'R-009',
    opened_week: 44,
    closed_week: null,
    closure_narrative:
      'Unmapped 1960s foundation footprint discovered at position 6 during EAF expansion-bay excavation Week 44; remedial demolition and structural redesign in execution; estimated $0.4M absorption; Pattern 4 industrial-brownfield consistent with Ironvale precedent.',
  },
  {
    issue_id: 'I-004',
    description: 'Heavy-lift crane mobilisation for EAF tower installation',
    category: 'Schedule',
    severity: 'M' as const,
    owner: 'Construction Manager',
    status: 'Closed' as const,
    linked_wbs: ['9.2'],
    linked_risk: null,
    opened_week: 30,
    closed_week: 38,
    closure_narrative:
      'Crane mobilised Week 38; lift plans signed off; first tower lift completed Week 42 without incident.',
  },
  {
    issue_id: 'I-005',
    description: 'Cooling-water system tie-in coordination with existing mill operations',
    category: 'Schedule / Stakeholder',
    severity: 'M' as const,
    owner: 'Construction Manager with Client Operations',
    status: 'In progress' as const,
    linked_wbs: ['6.3'],
    linked_risk: null,
    opened_week: 35,
    closed_week: null,
    closure_narrative:
      'Cooling-water tie-in window negotiated with client operations; scheduled Week 60; backup cooling provisioned.',
  },
  {
    issue_id: 'I-006',
    description: 'OEM design-interface change request post-FAT',
    category: 'Technical',
    severity: 'M' as const,
    owner: 'Engineering Lead with OEM',
    status: 'Closed' as const,
    linked_wbs: ['3.11'],
    linked_risk: 'R-006',
    opened_week: 42,
    closed_week: 46,
    closure_narrative:
      'OEM-side refractory-liner specification refinement post-FAT; absorbed within PO warranty; no Northwood cost.',
  },
  {
    issue_id: 'I-007',
    description: 'Client request for SCADA integration with existing mill control room',
    category: 'Commercial',
    severity: 'H' as const,
    owner: 'PM with Commercial Manager',
    status: 'Closed' as const,
    linked_wbs: ['8.3'],
    linked_risk: 'R-007',
    opened_week: 38,
    closed_week: 44,
    closure_narrative:
      'Four-frame commercial dynamics analysis prepared Weeks 38-40; pricing issued Week 42 at $1.4M scope-additive, schedule-neutral; CO-001 executed Week 44.',
  },
];

const risks = [
  {
    risk_id: 'R-001',
    category: 'Procurement',
    description:
      'Single-OEM EAF controls supply at $18M PO; specialised vendor; cascade exposure on quality or delivery.',
    probability: 'L' as const,
    impact: 'H' as const,
    score: 3,
    response:
      'Mitigate — PO released Week 16 (I-001); on-site expediter at OEM factory; FAT clear Week 40; monthly OEM financial-health monitoring per post-Ironvale standard.',
    owner: 'Procurement Manager',
    trigger: 'OEM delivery slip > 4 weeks, OR FAT failure on remaining commissioning, OR adverse financial signal',
    status: 'Active — mitigated to date',
    cross_cutting_class: 'Vendor / supplier concentration',
    pattern_link: 'Pattern 1',
  },
  {
    risk_id: 'R-002',
    category: 'Schedule / Regulatory',
    description:
      'State air-quality permit operational-startup milestone 30 June year+1 — slip exposes Northwood to compliance LDs and state EPA notice-of-violation.',
    probability: 'L' as const,
    impact: 'H' as const,
    score: 3,
    response:
      'Mitigate — compliance plan accepted Week 12 (I-002); quarterly state EPA engagement; 4-week buffer designed in.',
    owner: 'Project Manager',
    trigger: 'State EPA issues compliance concern, OR critical path slips toward 30 June',
    status: 'Active — buffer intact',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
  {
    risk_id: 'R-006',
    category: 'Technical',
    description:
      'Single-OEM EAF design-interface surprises at controls/mechanical/electrical boundary.',
    probability: 'L' as const,
    impact: 'M' as const,
    score: 2,
    response:
      'Mitigate — OEM design review at WBS 2.11; refractory specification refinement absorbed under warranty (I-006); no further interface issues at first commissioning checkpoints.',
    owner: 'Engineering Lead',
    trigger: 'Design-interface change request after Week 60, OR rework during commissioning',
    status: 'Active — mitigated to date',
    cross_cutting_class: 'Vendor / supplier concentration',
    pattern_link: 'Pattern 1',
  },
  {
    risk_id: 'R-007',
    category: 'Commercial',
    description:
      'Client-driven mid-construction scope additions on T&M-with-cap contract — Pattern 3 structural prediction.',
    probability: 'L' as const,
    impact: 'M' as const,
    score: 2,
    response:
      'Mitigate — CO-001 SCADA-to-existing-mill integration realised Week 44 (I-007) at $1.4M via four-frame analysis; margin-neutral at 8.5%; four-frame discipline established for any further request.',
    owner: 'PM with Project Director',
    trigger: 'Second client-initiated scope request, OR cumulative CO margin projecting below 7.0%',
    status: 'Realised (once, contained)',
    cross_cutting_class: 'Client-driven scope or sequence changes',
    pattern_link: 'Pattern 3',
  },
  {
    risk_id: 'R-009',
    category: 'Technical / Schedule',
    description:
      'Brownfield site-conditions latent conditions — unmapped 1960s foundation discovered at EAF expansion bay position 6 (I-003); ongoing remediation and risk of further encounters at remaining positions.',
    probability: 'M' as const,
    impact: 'M' as const,
    score: 4,
    response:
      'Mitigate — remedial demolition + structural redesign in execution Weeks 44-52; extended subsurface survey at remaining positions Weeks 48-54; standby remediation subcontract pre-priced; $0.4M absorbed within R5 reserve to date. Pattern 4 industrial-brownfield consistent with Ironvale precedent.',
    owner: 'Engineering Lead with Construction Manager',
    trigger: 'Latent conditions encountered at > 2 additional positions, OR cumulative remediation > $1.0M',
    status: 'Active — partially realised',
    cross_cutting_class: 'Site-conditions variance',
    pattern_link: 'Pattern 4',
  },
  {
    risk_id: 'R-011',
    category: 'Safety / HSE',
    description:
      'Heavy-lift EAF tower installation + crane operations near active mill — consequence severity on lifting or working-at-height incident.',
    probability: 'L' as const,
    impact: 'H' as const,
    score: 3,
    response:
      'Mitigate — lift plans signed by Construction Manager for each lift class; first lift completed without incident (I-004); daily JSA; HSE Lead on site full-time during tower campaign.',
    owner: 'HSE Lead',
    trigger: 'Any lifting or working-at-height near-miss, OR weather-criteria override request',
    status: 'Active — partial test passed',
    cross_cutting_class: 'Project-specific',
    pattern_link: null,
  },
];

const changeOrder = {
  co_id: 'CO-001',
  driver: 'Client-driven',
  scope_summary:
    'SCADA integration of new EAF controls with existing Foxhaven mill control room — Modbus/TCP gateway + integration to existing PI historian + operator-console additions + commissioning support. Outside original WBS 8.3 scope which assumed standalone EAF control room.',
  cost_impact_m: 1.28,
  revenue_impact_m: 1.4,
  schedule_impact_days: 0,
  margin_realized_pct: 8.5,
  status: 'Complete' as const,
  approval_routing: 'Director (per charter §11; cost $1.28M within Director authority).',
  executed_week: 44,
  four_frame_analysis: {
    vendor_leverage:
      'Favourable. SCADA vendor offers standard PI-integration module; not accelerated sole-source.',
    client_leverage:
      'Low. Integration essential to operational continuity but refusal would not break base contract.',
    client_position:
      'Strong willingness to pay. Mill operational economics on rapid commissioning.',
    northwood_acceptance:
      'Acceptable margin against acceptable risk. 8.5% realised margin matches base economics.',
  },
};

const varianceReport = {
  report_week: 52,
  cpi: 0.98,
  spi: 0.97,
  cost_variance_m: -0.5, // brownfield latent conditions absorbed
  schedule_variance_days: 9,
  contingency_consumed_m: 0.55,
  projected_margin_pct: 8.8,
  buffer_intact_days: 28,
  full_report_md: `# Variance Analysis Report — Foxhaven Steel Mill Expansion (Week 52 of ~85)

## 1. Executive summary

Foxhaven is tracking at CPI 0.98, SPI 0.97 at Week 52 — outside green band, within tolerance. R-009 partially realised at EAF expansion bay position 6 (I-003); ongoing remediation. CO-001 SCADA integration to existing mill executed Week 44 (I-007 / R-007) at $1.4M, margin-neutral. State air-quality 30 June year+1 milestone tracking within 4-week buffer.

## 2. Variance metrics

- **CPI:** 0.98 (R-009 latent-condition absorption + minor commissioning items)
- **SPI:** 0.97 (9-day slip from EAF bay remediation, within Chain D float)
- **Cost variance:** -$0.5M
- **Contingency consumed:** $0.55M of $5.4M (10.2%)
- **Projected margin at SC:** 8.8% (vs 9.5% bid; below target but well above 5.7% floor)

## 3. Watch items

- Extended brownfield survey at remaining EAF bay positions (R-009 trigger)
- Cooling-water tie-in coordination (I-005); critical at Week 60
- State EPA quarterly engagement Q3
- Pattern 4 cross-portfolio resonance: brownfield (Foxhaven, Ironvale) plus greenfield (Mariposa, Skyhawk) — two-of-two each segment confirms pattern segment-specificity
`,
};

export async function seedFoxhavenSteel(supabase: SupabaseClient): Promise<{
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
  if (projErr || !projData) throw new Error(`Foxhaven project upsert: ${projErr?.message}`);
  const projectId = projData.id;

  const issueRows = issues.map((i) => ({
    project_id: projectId,
    ...i,
    updated_at: new Date().toISOString(),
  }));
  const { error: issErr, count: issCount } = await supabase
    .from('issues')
    .upsert(issueRows, { onConflict: 'project_id,issue_id', count: 'exact' });
  if (issErr) throw new Error(`Foxhaven issues upsert: ${issErr.message}`);

  const riskRows = risks.map((r) => ({
    project_id: projectId,
    ...r,
    updated_at: new Date().toISOString(),
  }));
  const { error: rskErr, count: rskCount } = await supabase
    .from('risks')
    .upsert(riskRows, { onConflict: 'project_id,risk_id', count: 'exact' });
  if (rskErr) throw new Error(`Foxhaven risks upsert: ${rskErr.message}`);

  const { error: coErr, count: coCount } = await supabase
    .from('change_orders')
    .upsert(
      { project_id: projectId, ...changeOrder },
      { onConflict: 'project_id,co_id', count: 'exact' },
    );
  if (coErr) throw new Error(`Foxhaven change-order upsert: ${coErr.message}`);

  const { error: varErr, count: varCount } = await supabase
    .from('variance_reports')
    .upsert(
      { project_id: projectId, ...varianceReport },
      { onConflict: 'project_id,report_week', count: 'exact' },
    );
  if (varErr) throw new Error(`Foxhaven variance upsert: ${varErr.message}`);

  return {
    project: 1,
    issues: issCount ?? issueRows.length,
    risks: rskCount ?? riskRows.length,
    change_orders: coCount ?? 1,
    variance: varCount ?? 1,
  };
}
