/**
 * Carmel Solar Phase 2 (NW-REN-2603) — renewables-greenfield placeholder.
 *
 * Distinct from Mariposa (wind) and Skyhawk (utility-scale solar past project).
 * Carmel is a 40-unit solar-tracker installation in mid-civil construction at
 * Week 35. State tax-credit deadline 31 December year+1.
 *
 * Cross-cutting pattern contribution:
 *   - Pattern 1 (Vendor concentration): single-source solar-tracker OEM PO ($22M)
 *   - Pattern 2 (Regulatory deadline): state tax-credit-tier deadline
 *   - Pattern 4 (Site-conditions variance): variable-terrain greenfield with R-009
 *     equivalent currently Active forward-looking (not yet realised)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const PROJECT_CODE = 'NW-REN-2603';

const project = {
  name: 'Carmel Solar Phase 2',
  code: PROJECT_CODE,
  client: 'Carmel Renewables Cooperative (IPP)',
  contract_value_initial: 95_000_000.0,
  contract_value_current: 95_000_000.0,
  approved_budget_initial: 86_000_000.0,
  approved_budget_current: 86_000_000.0,
  contingency: 3_500_000.0,
  segment: 'renewables' as const,
  status: 'Active' as const,
  current_week: 35,
  hard_deadline_description:
    'State tax-credit-tier energisation deadline 31 December year+1 (~Week 70). 20-day SC-to-energisation buffer.',
};

const issues = [
  {
    issue_id: 'I-001',
    description: 'Solar-tracker OEM PO release coordination',
    category: 'Schedule / Commercial',
    severity: 'H' as const,
    owner: 'Procurement Lead',
    status: 'Closed' as const,
    linked_wbs: ['3.1'],
    linked_risk: 'R-001',
    opened_week: 0,
    closed_week: 14,
    closure_narrative:
      'OEM PO released Week 14 at $22.4M (favourable $0.4M vs $22.8M budget); contracted cadence; performance bond signed.',
  },
  {
    issue_id: 'I-002',
    description: 'County permit + interconnection-study confirmation',
    category: 'Regulatory / Schedule',
    severity: 'H' as const,
    owner: 'PM',
    status: 'Closed' as const,
    linked_wbs: ['2.7', '6.6'],
    linked_risk: 'R-002, R-006',
    opened_week: 0,
    closed_week: 22,
    closure_narrative:
      'Interconnection study complete Week 22; agreement signed Week 28; county building permit issued Week 18 without conditions.',
  },
  {
    issue_id: 'I-003',
    description: 'Site-investigation findings on Plot C eastern slope',
    category: 'Technical / Schedule',
    severity: 'M' as const,
    owner: 'Engineering Lead',
    status: 'In progress' as const,
    linked_wbs: ['5.4', '2.7'],
    linked_risk: 'R-003',
    opened_week: 31,
    closed_week: null,
    closure_narrative:
      'Two of five Plot C eastern-slope geotechnical samples below original design assumption; extended investigation Weeks 33-36 in execution; remedial design under review; not yet on critical path.',
  },
  {
    issue_id: 'I-004',
    description: 'Local labour partnership and rural-camp arrangement',
    category: 'Commercial / Stakeholder',
    severity: 'M' as const,
    owner: 'Construction Manager',
    status: 'Closed' as const,
    linked_wbs: ['1.8', '3.12'],
    linked_risk: 'R-005',
    opened_week: 0,
    closed_week: 8,
    closure_narrative:
      'Lease arrangement selected Week 6; modular camp $0.85M against $0.95M budget; occupancy active Week 26.',
  },
  {
    issue_id: 'I-005',
    description: 'Tracker FAT on lead unit',
    category: 'Technical',
    severity: 'M' as const,
    owner: 'Procurement Lead with OEM',
    status: 'Closed' as const,
    linked_wbs: ['3.11', '9.3'],
    linked_risk: 'R-001',
    opened_week: 28,
    closed_week: 30,
    closure_narrative:
      'FAT cleared on second attempt; minor azimuth-encoder firmware refinement adopted fleet-wide; OEM remediated under warranty.',
  },
  {
    issue_id: 'I-006',
    description: 'County DOT haul-route condition survey',
    category: 'Schedule / Stakeholder',
    severity: 'L' as const,
    owner: 'Logistics Lead',
    status: 'In progress' as const,
    linked_wbs: ['4.2'],
    linked_risk: 'R-004',
    opened_week: 30,
    closed_week: null,
    closure_narrative:
      'Heavy-haul condition survey in progress; expected complete Week 38 ahead of first heavy-haul Week 42.',
  },
];

const risks = [
  {
    risk_id: 'R-001',
    category: 'Procurement',
    description:
      'Single-OEM solar-tracker supply concentration (40 units, $22.4M PO) creates fleet-cascade exposure on quality or delivery.',
    probability: 'L' as const,
    impact: 'H' as const,
    score: 3,
    response:
      'Mitigate — PO released Week 14 with cadence and performance bond; FAT clear Week 30 (I-005); monthly OEM financial-health monitoring per post-Ironvale standard.',
    owner: 'Procurement Manager',
    trigger: 'OEM delivery slip > 4 weeks, OR FAT failure on remaining lots, OR adverse financial signal',
    status: 'Active — mitigated to date',
    cross_cutting_class: 'Vendor / supplier concentration',
    pattern_link: 'Pattern 1',
  },
  {
    risk_id: 'R-002',
    category: 'Schedule / Commercial',
    description:
      'State tax-credit-tier deadline 31 December year+1 is a hard client commitment; slip exposes Northwood to LD cap.',
    probability: 'M' as const,
    impact: 'H' as const,
    score: 6,
    response:
      'Mitigate — 20-day SC-to-energisation buffer designed in; weekly critical-path tracking; acceleration channel pre-costed.',
    owner: 'Project Manager',
    trigger: 'Critical-path slip eroding the 20-day buffer at any weekly review',
    status: 'Active — buffer intact',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
  {
    risk_id: 'R-003',
    category: 'Technical / Schedule',
    description:
      'Variable-terrain greenfield sub-grade variance may require foundation re-engineering at Plot C eastern slope where two of five samples are below design assumption (I-003).',
    probability: 'M' as const,
    impact: 'M' as const,
    score: 4,
    response:
      'Mitigate — extended geotechnical investigation Weeks 33-36 in execution; remedial design under review; standby ground-improvement subcontract pre-priced. Drawing on Mariposa I-021 + Skyhawk Plot B NW precedent (Pattern 4 confirmed pattern).',
    owner: 'Engineering Lead',
    trigger: 'Variance confirmed at > 3 additional Plot C positions, OR foundation milestone slip > 7 days',
    status: 'Active — under investigation',
    cross_cutting_class: 'Site-conditions variance',
    pattern_link: 'Pattern 4',
  },
  {
    risk_id: 'R-004',
    category: 'Schedule / Stakeholder',
    description:
      'Heavy-haul tracker components on single-county route — condition survey + DOT scope-growth coordination.',
    probability: 'L' as const,
    impact: 'M' as const,
    score: 2,
    response:
      'Mitigate — condition survey in progress (I-006); DOT engagement from Week 8; haul-route alternates identified.',
    owner: 'Logistics Lead with PM',
    trigger: 'Survey reveals scope materially beyond bid, OR DOT delays approval past Week 40',
    status: 'Active — on track',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
  {
    risk_id: 'R-005',
    category: 'People',
    description:
      'Rural labour-market shortage may reduce productivity through erection season.',
    probability: 'L' as const,
    impact: 'L' as const,
    score: 1,
    response:
      'Mitigate — camp lease active Week 26 (I-004); regional trades partnership; productivity tracked weekly.',
    owner: 'Construction Manager',
    trigger: 'Recruitment > 15% behind plan at monthly review',
    status: 'Active — managed',
    cross_cutting_class: 'Resource / labour scarcity',
    pattern_link: 'Candidate (pending placeholder confirmation)',
  },
  {
    risk_id: 'R-006',
    category: 'Schedule / Regulatory',
    description:
      'Regional utility interconnection coordination through energisation event.',
    probability: 'L' as const,
    impact: 'M' as const,
    score: 2,
    response:
      'Mitigate — study complete Week 22 (I-002); agreement signed Week 28; protection-coordination scheduled Week 60.',
    owner: 'Project Manager',
    trigger: 'Protection-coordination dispute opens, OR utility delays energisation slot',
    status: 'Active — mitigated',
    cross_cutting_class: 'Regulatory / external deadline',
    pattern_link: 'Pattern 2',
  },
];

const varianceReport = {
  report_week: 35,
  cpi: 1.01,
  spi: 0.99,
  cost_variance_m: 0.4, // OEM PO favourable
  schedule_variance_days: 2,
  contingency_consumed_m: 0.05,
  projected_margin_pct: 9.6, // slightly favourable
  buffer_intact_days: 20,
  full_report_md: `# Variance Analysis Report — Carmel Solar Phase 2 (Week 35 of ~80)

## 1. Executive summary

Carmel is tracking at CPI 1.01, SPI 0.99 at Week 35 — within tolerance. Favourable OEM PO ($0.4M) provides modest cost headroom. One Active site-conditions issue (I-003 Plot C eastern slope) is under extended geotechnical investigation Weeks 33-36; outcome will determine R-003 disposition. 20-day SC-to-energisation buffer intact.

## 2. Variance metrics

- **CPI:** 1.01 (favourable OEM PO partly offset by minor schedule slip)
- **SPI:** 0.99 (2 days behind on foundations within float)
- **Cost variance:** +$0.4M favourable
- **Contingency consumed:** $0.05M of $3.5M (1.4%)
- **Projected margin at SC:** 9.6% (vs 9.5% bid)
- **30-day buffer:** 20 days intact (designed-in for state tax-credit-tier deadline 31 Dec year+1)

## 3. Watch items

- Extended geotechnical investigation result (Weeks 33-36); cross-portfolio Pattern 4 evidence (Mariposa + Skyhawk precedent)
- First heavy-haul Week 42; DOT condition-survey completion Week 38 (I-006)
- Erection sequence start Week 50

`,
};

export async function seedCarmelSolar(supabase: SupabaseClient): Promise<{
  project: number;
  issues: number;
  risks: number;
  variance: number;
}> {
  // Project row
  const { data: projData, error: projErr } = await supabase
    .from('projects')
    .upsert(project, { onConflict: 'code' })
    .select('id')
    .single();
  if (projErr || !projData) throw new Error(`Carmel project upsert: ${projErr?.message}`);
  const projectId = projData.id;

  // Issues
  const issueRows = issues.map((i) => ({
    project_id: projectId,
    ...i,
    updated_at: new Date().toISOString(),
  }));
  const { error: issErr, count: issCount } = await supabase
    .from('issues')
    .upsert(issueRows, { onConflict: 'project_id,issue_id', count: 'exact' });
  if (issErr) throw new Error(`Carmel issues upsert: ${issErr.message}`);

  // Risks
  const riskRows = risks.map((r) => ({
    project_id: projectId,
    ...r,
    updated_at: new Date().toISOString(),
  }));
  const { error: rskErr, count: rskCount } = await supabase
    .from('risks')
    .upsert(riskRows, { onConflict: 'project_id,risk_id', count: 'exact' });
  if (rskErr) throw new Error(`Carmel risks upsert: ${rskErr.message}`);

  // Variance
  const { error: varErr, count: varCount } = await supabase
    .from('variance_reports')
    .upsert(
      { project_id: projectId, ...varianceReport },
      { onConflict: 'project_id,report_week', count: 'exact' },
    );
  if (varErr) throw new Error(`Carmel variance upsert: ${varErr.message}`);

  return {
    project: 1,
    issues: issCount ?? issueRows.length,
    risks: rskCount ?? riskRows.length,
    variance: varCount ?? 1,
  };
}
