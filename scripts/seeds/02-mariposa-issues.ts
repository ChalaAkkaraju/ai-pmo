/**
 * Mariposa issues — 31 entries reflecting the Week 78 closeout state.
 *
 * Data extracted from runs/run26_issue_log_mariposa_week78.md §2.
 * Every issue is Closed at Week 78; closure_narrative captures the
 * disposition language from the source.
 *
 * Lifecycle: Iteration-0 baseline (I-001 to I-020 opened Week 0;
 * I-021 opened Week 27; I-022 opened Week 18; I-023 opened Week 25),
 * Iteration-1 carry-overs (I-005, I-019, I-021 closed in Iteration 2-3),
 * Iteration-2 new (I-024 through I-028), Iteration-3 closeout (I-029 to I-031).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface MariposaIssue {
  issue_id: string;
  description: string;
  category: string;
  severity: 'L' | 'M' | 'H';
  owner: string;
  linked_wbs: string[];
  linked_risk: string | null;
  opened_week: number;
  closed_week: number;
  closure_narrative: string;
}

const issues: MariposaIssue[] = [
  {
    issue_id: 'I-001',
    description: 'Client Lead name and engagement preferences confirmation',
    category: 'Stakeholder',
    severity: 'H',
    owner: 'PM',
    linked_wbs: ['1.6'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 2,
    closure_narrative:
      'D. Bridges named Client Lead at kickoff; engagement preferences confirmed (monthly written, weekly voice, biweekly site walks post-mobilisation).',
  },
  {
    issue_id: 'I-002',
    description: 'Long-lead turbine OEM PO release date',
    category: 'Schedule / Commercial',
    severity: 'H',
    owner: 'Procurement Lead',
    linked_wbs: ['3.1'],
    linked_risk: 'R-001',
    opened_week: 0,
    closed_week: 18,
    closure_narrative:
      'PO released at $66.4M against $67.0M budget line (favourable $0.6M); contracted cadence with escalation rights; performance bond signed.',
  },
  {
    issue_id: 'I-003',
    description: 'Migratory bird permit blackout windows',
    category: 'Regulatory / Schedule',
    severity: 'H',
    owner: 'PM with QA/QC Lead',
    linked_wbs: ['5.2', '2.10'],
    linked_risk: 'R-003',
    opened_week: 0,
    closed_week: 5,
    closure_narrative:
      'Client confirmed blackouts 15 Mar-15 May and 15 Sep-15 Nov year+1; matches bid assumption.',
  },
  {
    issue_id: 'I-004',
    description: 'Camp accommodation build-vs-lease decision',
    category: 'Commercial / Stakeholder',
    severity: 'H',
    owner: 'PM',
    linked_wbs: ['1.8', '3.12'],
    linked_risk: 'R-005',
    opened_week: 0,
    closed_week: 6,
    closure_narrative:
      'Lease arrangement selected; modular camp $1.55M against $1.7M budget (favourable $0.15M).',
  },
  {
    issue_id: 'I-005',
    description: 'Interconnection study status and utility coordinator name',
    category: 'Regulatory / Schedule',
    severity: 'H',
    owner: 'PM',
    linked_wbs: ['2.7', '6.6', '9.2'],
    linked_risk: 'R-002, R-008',
    opened_week: 0,
    closed_week: 38,
    closure_narrative:
      'Study completed on forecast; interconnection agreement signed Week 44; protection-coordination signed off Week 46.',
  },
  {
    issue_id: 'I-006',
    description: 'County 1 and County 2 Roads Leads identification',
    category: 'Stakeholder',
    severity: 'M',
    owner: 'PM',
    linked_wbs: ['4.2', '4.3'],
    linked_risk: 'R-004',
    opened_week: 0,
    closed_week: 8,
    closure_narrative:
      'T. Caldwell (Apache County DOT) and R. Holstein (Navajo County DOT) named and engaged.',
  },
  {
    issue_id: 'I-007',
    description: 'Turbine OEM organisation and account lead name',
    category: 'Stakeholder',
    severity: 'M',
    owner: 'Procurement Lead',
    linked_wbs: ['3.1', '2.11'],
    linked_risk: 'R-001',
    opened_week: 0,
    closed_week: 18,
    closure_narrative:
      'OEM account lead K. Tanaka confirmed at PO release; on-site expediter deployed Week 22.',
  },
  {
    issue_id: 'I-008',
    description: 'Permitting Authority agency and assigned officer',
    category: 'Regulatory / Stakeholder',
    severity: 'M',
    owner: 'PM with QA/QC Lead',
    linked_wbs: ['2.10'],
    linked_risk: 'R-003',
    opened_week: 0,
    closed_week: 9,
    closure_narrative: 'US Fish and Wildlife Service Regional Office; Officer J. Whitlock assigned.',
  },
  {
    issue_id: 'I-009',
    description: 'Construction Manager assignment confirmation',
    category: 'Stakeholder',
    severity: 'M',
    owner: 'PM',
    linked_wbs: ['1.3', '1.8'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 4,
    closure_narrative: 'M. Nakamura assigned.',
  },
  {
    issue_id: 'I-010',
    description: 'Logistics Lead assignment confirmation',
    category: 'Stakeholder',
    severity: 'M',
    owner: 'PM',
    linked_wbs: ['4.0', '3.10', '7.1'],
    linked_risk: 'R-004',
    opened_week: 0,
    closed_week: 4,
    closure_narrative: 'A. Patel assigned.',
  },
  {
    issue_id: 'I-011',
    description: 'Commercial Manager assignment confirmation',
    category: 'Stakeholder',
    severity: 'M',
    owner: 'PM',
    linked_wbs: ['1.2', '1.5'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 4,
    closure_narrative: 'D. Reeves assigned.',
  },
  {
    issue_id: 'I-012',
    description: 'Civil, electrical, turbine-erection subcontractor selection',
    category: 'Commercial',
    severity: 'M',
    owner: 'PM',
    linked_wbs: ['3.7', '3.8', '3.9'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 18,
    closure_narrative: 'Weeks 14/16/18 — subcontracts awarded within bid-stage pricing.',
  },
  {
    issue_id: 'I-013',
    description: 'Charter §6 milestone dates lock',
    category: 'Schedule',
    severity: 'M',
    owner: 'PM',
    linked_wbs: ['1.1'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 12,
    closure_narrative: 'Schedule baseline locked.',
  },
  {
    issue_id: 'I-014',
    description: 'Change-order approval thresholds and pre-agreed unit rates',
    category: 'Commercial',
    severity: 'M',
    owner: 'PM with Project Director',
    linked_wbs: ['1.5'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 8,
    closure_narrative: 'Thresholds confirmed (PM $100k / Director $1M / Sponsor above); pre-agreed unit rates negotiated.',
  },
  {
    issue_id: 'I-015',
    description: 'CFO escalation trigger threshold and CFO name',
    category: 'Commercial / Stakeholder',
    severity: 'M',
    owner: 'Project Director',
    linked_wbs: ['1.6'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 8,
    closure_narrative: '$20M trigger confirmed; CFO M. Hartford named.',
  },
  {
    issue_id: 'I-016',
    description: 'Client status reporting cadence confirmation',
    category: 'Stakeholder',
    severity: 'L',
    owner: 'PM',
    linked_wbs: ['1.6'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 2,
    closure_narrative: 'Standard Northwood cadence accepted.',
  },
  {
    issue_id: 'I-017',
    description: 'Client Executive Sponsor existence and identity',
    category: 'Stakeholder',
    severity: 'L',
    owner: 'Sponsor via Project Director',
    linked_wbs: ['1.6'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 4,
    closure_narrative: 'G. Castillo (VP Operations, Mariposa) named.',
  },
  {
    issue_id: 'I-018',
    description: 'Press-engagement protocol and community-engagement split',
    category: 'Stakeholder',
    severity: 'L',
    owner: 'Project Director',
    linked_wbs: ['1.6'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 6,
    closure_narrative: 'Client-led-with-Northwood-support model confirmed.',
  },
  {
    issue_id: 'I-019',
    description: 'Performance test duration and acceptance criteria against OEM warranty',
    category: 'Technical / Commercial',
    severity: 'L',
    owner: 'Engineering Lead',
    linked_wbs: ['9.5', '9.6'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 32,
    closure_narrative: 'OEM availability test terms confirmed at FAT closure.',
  },
  {
    issue_id: 'I-020',
    description: 'Milestone invoicing weights against signed contract schedule',
    category: 'Commercial',
    severity: 'L',
    owner: 'PM with Commercial Manager',
    linked_wbs: ['1.2'],
    linked_risk: null,
    opened_week: 0,
    closed_week: 4,
    closure_narrative: 'Contract milestone weights signed.',
  },
  {
    issue_id: 'I-021',
    description:
      'Sub-grade soil-bearing variance at turbine positions 16, 23, 41 (Plot B north-west quadrant)',
    category: 'Technical / Schedule',
    severity: 'H',
    owner: 'PM with Construction Manager',
    linked_wbs: ['5.4', '2.7'],
    linked_risk: 'R-009',
    opened_week: 27,
    closed_week: 31,
    closure_narrative:
      'Remedial piling and structural fill complete; extended geotechnical investigation found no further variance; $0.18M absorbed within R5 reserve; foundations on schedule.',
  },
  {
    issue_id: 'I-022',
    description: 'Wildlife officer additional pre-construction avian survey request',
    category: 'Regulatory',
    severity: 'M',
    owner: 'QA/QC Lead with Client environmental consultant',
    linked_wbs: ['2.10', '5.2'],
    linked_risk: 'R-003',
    opened_week: 18,
    closed_week: 20,
    closure_narrative: 'Survey conducted; no protected species nesting in construction footprint.',
  },
  {
    issue_id: 'I-023',
    description: 'Civil subcontractor rebar delivery delay (~10 days slip on Plot A foundations)',
    category: 'Schedule',
    severity: 'L',
    owner: 'Construction Manager with Procurement Lead',
    linked_wbs: ['3.7', '5.4'],
    linked_risk: null,
    opened_week: 25,
    closed_week: 26,
    closure_narrative: 'Secondary supplier sourced; no critical-path impact.',
  },
  {
    issue_id: 'I-024',
    description:
      'FAT on lead OEM unit surfaced two findings: rotor-hub torque procedure refinement; blade-pitch calibration drift',
    category: 'Technical',
    severity: 'M',
    owner: 'Procurement Lead with OEM',
    linked_wbs: ['3.11', '9.3'],
    linked_risk: 'R-006',
    opened_week: 32,
    closed_week: 33,
    closure_narrative:
      'OEM remediated both findings; refined torque procedure adopted fleet-wide; one punch-list item carried to first-turbine erection.',
  },
  {
    issue_id: 'I-025',
    description:
      'First heavy-haul arrival; minor crane-pad damage from oversize-load tractor manoeuvre at position 12 site access',
    category: 'Construction',
    severity: 'L',
    owner: 'Construction Manager',
    linked_wbs: ['4.5', '5.5'],
    linked_risk: 'R-004',
    opened_week: 38,
    closed_week: 39,
    closure_narrative: 'Civil subcontractor repaired; <$10k absorbed within Branch 4.0 tolerance.',
  },
  {
    issue_id: 'I-026',
    description:
      'Client request for SCADA portfolio integration with client OPCO; outside original WBS 8.3 scope',
    category: 'Commercial',
    severity: 'H',
    owner: 'PM with Commercial Manager',
    linked_wbs: ['8.3'],
    linked_risk: 'R-007',
    opened_week: 34,
    closed_week: 40,
    closure_narrative:
      'Four-frame commercial dynamics analysis; CO-001 executed at $850k schedule-neutral, margin-neutral; integration complete Week 65.',
  },
  {
    issue_id: 'I-027',
    description: 'First-turbine erection at position 1 took 5 working days against 4-day plan',
    category: 'Construction',
    severity: 'L',
    owner: 'Construction Manager',
    linked_wbs: ['9.3'],
    linked_risk: 'R-006, R-011',
    opened_week: 47,
    closed_week: 48,
    closure_narrative:
      'Lessons captured; subsequent erections steady at 1.5/week, recovered to 1.7/week from Week 60.',
  },
  {
    issue_id: 'I-028',
    description:
      'Four-day weather stand-down event (sustained high-wind window beyond lift-criteria threshold)',
    category: 'Schedule / Weather',
    severity: 'M',
    owner: 'Construction Manager with PM',
    linked_wbs: ['9.3'],
    linked_risk: 'R-010',
    opened_week: 49,
    closed_week: 50,
    closure_narrative:
      'R-010 threshold triggered; Sponsor briefed; $0.20M absorbed within Chain E float and R5/unallocated reserve.',
  },
  {
    issue_id: 'I-029',
    description:
      'Performance test on 80 turbines: 78 pass first attempt; 2 turbines (positions 47 and 62) fail OEM availability test on first attempt due to blade-pitch calibration drift during 168-hour test — distinct wear-in drift, not the FAT design-interface mode of I-024',
    category: 'Technical',
    severity: 'M',
    owner: 'Engineering Lead with OEM',
    linked_wbs: ['9.5', '9.6'],
    linked_risk: 'R-001, R-006',
    opened_week: 73,
    closed_week: 75,
    closure_narrative:
      'OEM re-calibrated both turbines under warranty terms; both passed availability test on second attempt within OEM PO warranty obligations; no Northwood cost; finding fed back into OEM-side QA standard for fleet-level wear-in calibration monitoring.',
  },
  {
    issue_id: 'I-030',
    description:
      'CO-001 OPCO acceptance test first attempt: data-tag mismatch on 12 of 1,400 mapped tags between Mariposa SCADA point list and client OPCO data model',
    category: 'Technical / Commercial',
    severity: 'L',
    owner: 'Engineering Lead with Lead Controls Engineer',
    linked_wbs: ['8.3'],
    linked_risk: 'R-007',
    opened_week: 65,
    closed_week: 66,
    closure_narrative:
      'Northwood and client engineering jointly remediated 12 tags; re-test passed; <$30k absorbed within Branch 8.0 CO-001 budget tolerance; data-model snapshot at CO-001 signature condition honoured.',
  },
  {
    issue_id: 'I-031',
    description:
      'Pre-SC walkdown identified capacitor bank labelling discrepancy at substation: 8 of 24 capacitor units carried interim hand-written labels rather than final etched plates per Northwood standard',
    category: 'Quality',
    severity: 'L',
    owner: 'QA/QC Lead with Construction Manager',
    linked_wbs: ['6.4'],
    linked_risk: null,
    opened_week: 77,
    closed_week: 78,
    closure_narrative:
      'Labelling rectified within 48 hours; <$10k absorbed within Branch 6.0; no commissioning impact; SC walkdown sign-off completed.',
  },
];

export async function seedMariposaIssues(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ inserted: number; updated: number }> {
  const rows = issues.map((issue) => ({
    project_id: projectId,
    issue_id: issue.issue_id,
    description: issue.description,
    category: issue.category,
    severity: issue.severity,
    owner: issue.owner,
    status: 'Closed' as const,
    linked_wbs: issue.linked_wbs,
    linked_risk: issue.linked_risk,
    opened_week: issue.opened_week,
    closed_week: issue.closed_week,
    closure_narrative: issue.closure_narrative,
    updated_at: new Date().toISOString(),
  }));

  const { error, count } = await supabase
    .from('issues')
    .upsert(rows, { onConflict: 'project_id,issue_id', count: 'exact' });

  if (error) {
    throw new Error(`Failed to upsert Mariposa issues: ${error.message}`);
  }

  return { inserted: count ?? rows.length, updated: 0 };
}
