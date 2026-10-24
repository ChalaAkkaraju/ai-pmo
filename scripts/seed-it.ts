/**
 * IT PMO workspace seed — allocations, stage-template lookup, ~15 IT projects
 * with business cases, gate history and sanction events, plus a few risks,
 * issues and change orders so the workspace has something to reason about.
 *
 * Idempotent: projects upsert on code; allocations on (type, fy, bucket);
 * gate decisions / sanction events are keyed on external_id and re-created
 * only when missing; registers upsert on their natural keys.
 *
 * Run with:  pnpm seed:it     (after migration 0045 is applied)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './lib/supabase-admin';
import { log, section } from './lib/log';

const FY_NOW = 2026;
const FY_NEXT = 2027;

type Cat = 'design_development' | 'deployment' | 'maintenance_upgrade';
type Bucket = 'infrastructure' | 'applications' | 'security' | 'compliance';
type VT = 'hard_savings' | 'soft_benefit' | 'risk_reduction' | 'enablement' | 'compliance';

interface Seed {
  code: string; name: string; sponsor: string; category: Cat; bucket: Bucket; fiscal_year: number;
  requested: number; value_type: VT; benefit: string; annual_benefit: number | null; strategic: number; owner: string; capex: number;
  lifecycle: 'proposed' | 'approved' | 'deferred' | 'active' | 'on_hold' | 'cancelled' | 'closed';
  approved_years: number[]; stage: number; baseline: number | null; deadline?: string;
  history?: Array<{ seq: number; decision: 'go' | 'hold' | 'kill' | 'recycle' | 'defer'; on: string; by: string; notes?: string; hold_until?: string }>;
  envelope?: Array<{ fy: number; amount: number; kind: 'waterline_envelope' | 'continuation'; on: string }>;
  problem?: string; outcome?: string; systems?: string;
}

const P: Seed[] = [
  // ---- FY2026 running, seeking FY2027 continuation ----
  { code: 'NW-IT-0001', name: 'Data-centre network refresh', sponsor: 'VP Infrastructure', category: 'deployment', bucket: 'infrastructure', fiscal_year: FY_NEXT, requested: 1_100_000, value_type: 'risk_reduction', benefit: 'Retires end-of-support core switching across both data centres; removes the single unsupported failure domain behind SAP and the schedulers.', annual_benefit: 650_000, strategic: 74, owner: 'Head of Data-centre Operations', capex: 85,
    lifecycle: 'active', approved_years: [FY_NOW], stage: 2, baseline: 2_400_000, systems: 'Core network, SAP PS hosting, MS Project Server',
    history: [{ seq: 0, decision: 'go', on: '2026-02-10', by: 'Priya Raman', notes: 'Scope: both DCs, 14 core switches. Baseline locked at $2.4M, capital share 85%.' }, { seq: 1, decision: 'go', on: '2026-05-22', by: 'Priya Raman', notes: 'Pilot on DC-B passed; rollout approved.' }],
    envelope: [{ fy: FY_NOW, amount: 2_400_000, kind: 'waterline_envelope', on: '2025-12-05' }] },
  { code: 'NW-IT-0002', name: 'ERP finance-close automation', sponsor: 'Group Financial Controller', category: 'design_development', bucket: 'applications', fiscal_year: FY_NEXT, requested: 1_600_000, value_type: 'hard_savings', benefit: 'Automates the month-end close journals and reconciliations in SAP; removes ~3.5 FTE of manual effort and cuts close from 8 to 5 working days.', annual_benefit: 1_250_000, strategic: 82, owner: 'Group Financial Controller', capex: 75,
    lifecycle: 'active', approved_years: [FY_NOW], stage: 3, baseline: 3_200_000, systems: 'SAP FI/CO, SAP PS',
    history: [{ seq: 0, decision: 'go', on: '2026-01-20', by: 'Priya Raman' }, { seq: 1, decision: 'go', on: '2026-03-14', by: 'Priya Raman', notes: 'Scope confirmed with Finance; estimate $3.2M bottom-up; capital share 75%.' }, { seq: 2, decision: 'go', on: '2026-06-30', by: 'Daniel Osei', notes: 'Design review passed; security sign-off obtained.' }],
    envelope: [{ fy: FY_NOW, amount: 3_200_000, kind: 'waterline_envelope', on: '2025-12-05' }] },
  { code: 'NW-IT-0003', name: 'Endpoint detection & response rollout', sponsor: 'CISO', category: 'deployment', bucket: 'security', fiscal_year: FY_NOW, requested: 1_400_000, value_type: 'risk_reduction', benefit: 'EDR on all 6,200 endpoints incl. site laptops; closes the top finding from the 2025 external audit.', annual_benefit: 400_000, strategic: 88, owner: 'CISO', capex: 30,
    lifecycle: 'active', approved_years: [FY_NOW], stage: 3, baseline: 1_400_000, systems: 'Endpoint estate, SIEM',
    history: [{ seq: 0, decision: 'go', on: '2026-01-15', by: 'Priya Raman', notes: 'Locked at $1.4M; capital share 30% (licences expensed).' }, { seq: 1, decision: 'go', on: '2026-03-02', by: 'Daniel Osei' }, { seq: 2, decision: 'go', on: '2026-07-18', by: 'Daniel Osei', notes: '5,900 of 6,200 endpoints migrated; legacy AV decommission scheduled.' }],
    envelope: [{ fy: FY_NOW, amount: 1_400_000, kind: 'waterline_envelope', on: '2025-12-05' }] },
  { code: 'NW-IT-0004', name: 'SOX access-control remediation', sponsor: 'Head of Internal Audit', category: 'maintenance_upgrade', bucket: 'compliance', fiscal_year: FY_NEXT, requested: 600_000, value_type: 'compliance', benefit: 'Remediates segregation-of-duties conflicts in SAP flagged by the auditors; required before the FY2027 audit cycle.', annual_benefit: null, strategic: 60, owner: 'Head of Internal Audit', capex: 20,
    lifecycle: 'on_hold', approved_years: [FY_NOW], stage: 2, baseline: 900_000, deadline: 'Auditor deadline: remediation evidenced before FY2027 interim audit (Q2 2027)',
    history: [{ seq: 0, decision: 'go', on: '2026-02-01', by: 'Priya Raman', notes: 'Locked at $0.9M.' }, { seq: 1, decision: 'go', on: '2026-04-11', by: 'Daniel Osei' }, { seq: 2, decision: 'hold', on: '2026-08-05', by: 'Priya Raman', notes: 'Hold: SAP basis engineer pulled onto the S/4HANA year-end support-pack cut-over (P1 run work). Time box: 1 quarter.', hold_until: '2026-11-05' }],
    envelope: [{ fy: FY_NOW, amount: 900_000, kind: 'waterline_envelope', on: '2025-12-05' }] },
  { code: 'NW-IT-0005', name: 'Legacy CRM decommission', sponsor: 'VP Sales Operations', category: 'maintenance_upgrade', bucket: 'applications', fiscal_year: FY_NOW, requested: 350_000, value_type: 'hard_savings', benefit: 'Switches off the legacy CRM after the Cora migration; saves licence and hosting run-rate.', annual_benefit: 420_000, strategic: 50, owner: 'VP Sales Operations', capex: 0,
    lifecycle: 'closed', approved_years: [FY_NOW], stage: 4, baseline: 350_000, systems: 'Legacy CRM, Cora PPM',
    history: [{ seq: 0, decision: 'go', on: '2026-01-15', by: 'Priya Raman' }, { seq: 1, decision: 'go', on: '2026-02-20', by: 'Daniel Osei' }, { seq: 2, decision: 'go', on: '2026-04-30', by: 'Daniel Osei' }, { seq: 3, decision: 'go', on: '2026-06-15', by: 'Daniel Osei' }, { seq: 4, decision: 'go', on: '2026-07-31', by: 'Priya Raman', notes: 'Closed; expense posted; run-rate saving verified by Finance.' }],
    envelope: [{ fy: FY_NOW, amount: 350_000, kind: 'waterline_envelope', on: '2025-12-05' }] },
  // ---- FY2027 new submissions ----
  { code: 'NW-IT-0006', name: 'Field-service mobile app', sponsor: 'VP Service Operations', category: 'design_development', bucket: 'applications', fiscal_year: FY_NEXT, requested: 2_900_000, value_type: 'hard_savings', benefit: 'Replaces paper job cards for 480 field technicians; cuts admin time 25% and invoice lag from 9 to 2 days.', annual_benefit: 1_900_000, strategic: 78, owner: 'VP Service Operations', capex: 80, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null, problem: 'Job completion is captured on paper and re-keyed; invoicing lags and disputes rise.', outcome: 'Technicians close jobs on-device; invoices raised same day.' },
  { code: 'NW-IT-0007', name: 'Customer portal re-platform', sponsor: 'Chief Commercial Officer', category: 'design_development', bucket: 'applications', fiscal_year: FY_NEXT, requested: 3_400_000, value_type: 'enablement', benefit: 'Enables the FY2027 revenue programme (self-service ordering for the water segment); current portal cannot support it.', annual_benefit: 1_400_000, strategic: 85, owner: 'Chief Commercial Officer', capex: 85, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null },
  { code: 'NW-IT-0008', name: 'Project analytics lakehouse (SAP PS + Cora)', sponsor: 'PMO Director', category: 'design_development', bucket: 'applications', fiscal_year: FY_NEXT, requested: 2_200_000, value_type: 'soft_benefit', benefit: 'One reconciled dataset across SAP PS cost and Cora PPM schedule for portfolio analytics; frees PMO analysts from manual reconciliation.', annual_benefit: 600_000, strategic: 70, owner: 'PMO Director', capex: 70, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null },
  { code: 'NW-IT-0009', name: 'Wi-Fi 7 plant upgrade', sponsor: 'VP Manufacturing', category: 'deployment', bucket: 'infrastructure', fiscal_year: FY_NEXT, requested: 1_900_000, value_type: 'soft_benefit', benefit: 'Plant-floor wireless for handhelds and AGVs at three sites; fewer scan failures and line stops.', annual_benefit: 500_000, strategic: 55, owner: 'VP Manufacturing', capex: 90, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null },
  { code: 'NW-IT-0010', name: 'Backup & disaster-recovery modernisation', sponsor: 'VP Infrastructure', category: 'deployment', bucket: 'infrastructure', fiscal_year: FY_NEXT, requested: 2_600_000, value_type: 'risk_reduction', benefit: 'Immutable backups and a tested 4-hour RTO for SAP and the schedulers; current RTO is unverified.', annual_benefit: 800_000, strategic: 72, owner: 'VP Infrastructure', capex: 80, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null },
  { code: 'NW-IT-0011', name: 'Identity governance (IGA)', sponsor: 'CISO', category: 'design_development', bucket: 'security', fiscal_year: FY_NEXT, requested: 2_100_000, value_type: 'risk_reduction', benefit: 'Joiner-mover-leaver automation and access certification across SAP, Cora, Sopheon and EcoSys.', annual_benefit: 700_000, strategic: 80, owner: 'CISO', capex: 65, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null },
  { code: 'NW-IT-0012', name: 'Privileged access management', sponsor: 'CISO', category: 'deployment', bucket: 'security', fiscal_year: FY_NEXT, requested: 1_300_000, value_type: 'risk_reduction', benefit: 'Vaulted, session-recorded admin access for the SAP and network estates.', annual_benefit: 350_000, strategic: 66, owner: 'CISO', capex: 60, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null },
  { code: 'NW-IT-0013', name: 'Data-privacy regulation readiness', sponsor: 'General Counsel', category: 'maintenance_upgrade', bucket: 'compliance', fiscal_year: FY_NEXT, requested: 900_000, value_type: 'compliance', benefit: 'Consent, retention and subject-access tooling required by the regulation effective Q3 2027.', annual_benefit: null, strategic: 65, owner: 'General Counsel', capex: 40, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null, deadline: 'Regulation effective 1 July 2027' },
  { code: 'NW-IT-0014', name: 'E-invoicing mandate', sponsor: 'Group Financial Controller', category: 'design_development', bucket: 'compliance', fiscal_year: FY_NEXT, requested: 1_200_000, value_type: 'compliance', benefit: 'Statutory e-invoicing format and clearance integration for two jurisdictions from January 2028.', annual_benefit: null, strategic: 60, owner: 'Group Financial Controller', capex: 70, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null, deadline: 'Mandate effective 1 January 2028' },
  { code: 'NW-IT-0015', name: 'Warehouse handheld replacement', sponsor: 'VP Supply Chain', category: 'deployment', bucket: 'infrastructure', fiscal_year: FY_NEXT, requested: 1_500_000, value_type: 'hard_savings', benefit: 'Replaces 900 end-of-life scanners; removes the repair contract and reduces pick errors.', annual_benefit: 450_000, strategic: 60, owner: 'VP Supply Chain', capex: 95, lifecycle: 'proposed', approved_years: [], stage: 0, baseline: null },
];

const ALLOCATIONS: Array<{ fy: number; bucket: Bucket; allocated: number; reserve: number; mandatory: boolean }> = [
  { fy: FY_NOW, bucket: 'infrastructure', allocated: 5_500_000, reserve: 450_000, mandatory: false },
  { fy: FY_NOW, bucket: 'applications', allocated: 7_000_000, reserve: 600_000, mandatory: false },
  { fy: FY_NOW, bucket: 'security', allocated: 3_000_000, reserve: 250_000, mandatory: false },
  { fy: FY_NOW, bucket: 'compliance', allocated: 1_500_000, reserve: 150_000, mandatory: true },
  { fy: FY_NEXT, bucket: 'infrastructure', allocated: 6_000_000, reserve: 500_000, mandatory: false },
  { fy: FY_NEXT, bucket: 'applications', allocated: 8_000_000, reserve: 800_000, mandatory: false },
  { fy: FY_NEXT, bucket: 'security', allocated: 3_500_000, reserve: 300_000, mandatory: false },
  { fy: FY_NEXT, bucket: 'compliance', allocated: 2_000_000, reserve: 200_000, mandatory: true },
];

function roi(budget: number, annual: number | null): { roi_pct: number | null; payback_months: number | null } {
  if (!annual || !budget) return { roi_pct: null, payback_months: null };
  // 3-year ROI, matching lib/it-portfolio recomputeCase
  return { roi_pct: Math.round(((annual * 3 - budget) / budget) * 1000) / 10, payback_months: Math.round((budget / annual) * 120) / 10 };
}

async function seedAllocations(sb: SupabaseClient) {
  const rows = ALLOCATIONS.map((a) => ({ project_type: 'it', fiscal_year: a.fy, bucket: a.bucket, allocated_amount: a.allocated, reserve_amount: a.reserve, is_mandatory_lane: a.mandatory }));
  const { error } = await sb.from('portfolio_allocations').upsert(rows, { onConflict: 'project_type,fiscal_year,bucket' });
  if (error) throw new Error(`allocations: ${error.message}`);
  return rows.length;
}

type Tpl = { id: string; category: string; stages: Array<{ seq: number; gate_name: string; is_commit: boolean; exit_criteria?: string[] }> };

async function seedProjects(sb: SupabaseClient) {
  const { data: tpls, error: tErr } = await sb.from('stage_templates').select('id, category, stages').eq('project_type', 'it');
  if (tErr) throw new Error(`templates: ${tErr.message}`);
  const tplByCat = new Map((tpls ?? []).map((t) => [(t as Tpl).category, t as Tpl]));
  let upserted = 0, decisions = 0, events = 0;

  for (const s of P) {
    const tpl = tplByCat.get(s.category);
    if (!tpl) throw new Error(`no template for ${s.category}`);
    const r = roi(s.baseline ?? s.requested, s.annual_benefit);
    const row = {
      name: s.name, code: s.code, client: s.sponsor,
      contract_value_initial: 0, contract_value_current: 0,
      approved_budget_initial: s.baseline ?? 0, approved_budget_current: s.baseline ?? 0, contingency: 0,
      segment: null, status: s.lifecycle === 'closed' || s.lifecycle === 'cancelled' ? 'Closed' : 'Active', current_week: 0,
      hard_deadline_description: s.deadline ?? null,
      intake_json: { sponsor: s.sponsor, problem: s.problem ?? null, outcome: s.outcome ?? null, systems: s.systems ?? null },
      created_via: 'seed', created_by_role_type: 'it_portfolio_manager', source_system: 'APP',
      project_type: 'it', project_category: s.category, portfolio_bucket: s.bucket, fiscal_year: s.fiscal_year,
      fiscal_years_approved: s.approved_years, lifecycle_status: s.lifecycle, stage_template_id: tpl.id, current_stage: s.stage,
      business_case: { value_type: s.value_type, benefit_summary: s.benefit, annual_benefit: s.annual_benefit, roi_pct: r.roi_pct, payback_months: r.payback_months, strategic_score: s.strategic, benefits_owner: s.owner, capex_share_pct: s.capex, is_mandatory: s.value_type === 'compliance' },
      requested_budget: s.requested,
    };
    const { data: proj, error } = await sb.from('projects').upsert(row, { onConflict: 'code' }).select('id').maybeSingle();
    if (error || !proj) throw new Error(`${s.code}: ${error?.message ?? 'no id'}`);
    upserted++;
    const pid = (proj as { id: string }).id;

    for (const h of s.history ?? []) {
      const stage = tpl.stages.find((x) => x.seq === h.seq);
      const ext = `seed:${s.code}:gate:${h.seq}:${h.on}`;
      const { data: exists } = await sb.from('gate_decisions').select('id').eq('external_id', ext).maybeSingle();
      if (exists) await sb.from('gate_decisions').update({ hold_until: h.hold_until ?? null, notes: h.notes ?? null }).eq('id', (exists as { id: string }).id);
      if (!exists) {
        const { error: gErr } = await sb.from('gate_decisions').insert({
          project_id: pid, stage_seq: h.seq, gate_name: stage?.gate_name ?? `Gate ${h.seq}`, decision: h.decision, decided_on: h.on, decided_by: h.by,
          decided_by_role_type: h.by === 'Priya Raman' ? 'it_portfolio_manager' : 'it_pm', notes: h.notes ?? null, source_system: 'APP', external_id: ext,
          hold_until: h.hold_until ?? null,
          criteria_scores: h.decision === 'go' ? { must_meet: (stage?.exit_criteria ?? []).map((c) => ({ criterion: c, met: true })) } : null,
          case_snapshot: stage?.is_commit && s.baseline ? { budget: s.baseline, capex_share_pct: s.capex } : null,
        });
        if (gErr) throw new Error(`${s.code} gate ${h.seq}: ${gErr.message}`);
        decisions++;
      }
      if (stage?.is_commit && h.decision === 'go' && s.baseline) {
        const ext2 = `seed:${s.code}:sg1`;
        const { data: e2 } = await sb.from('sanction_events').select('id').eq('external_id', ext2).maybeSingle();
        if (!e2) {
          const { error: sErr } = await sb.from('sanction_events').insert({ project_id: pid, kind: 'sg1_baseline', version: 1, amount: s.baseline, fiscal_year: s.approved_years[0] ?? s.fiscal_year, authorised_by: h.by, authorised_on: h.on, notes: `Scope and budget locked at ${stage.gate_name} · capital share ${s.capex}%`, source_system: 'APP', external_id: ext2 });
          if (sErr) throw new Error(`${s.code} sg1: ${sErr.message}`);
          events++;
        }
      }
    }
    for (const e of s.envelope ?? []) {
      const ext = `seed:${s.code}:${e.kind}:${e.fy}`;
      const { data: ex } = await sb.from('sanction_events').select('id').eq('external_id', ext).maybeSingle();
      if (ex) continue;
      const { error: sErr } = await sb.from('sanction_events').insert({ project_id: pid, kind: e.kind, version: 1, amount: e.amount, fiscal_year: e.fy, authorised_by: 'IT portfolio board', authorised_on: e.on, notes: `FY${e.fy} envelope granted at the waterline`, source_system: 'APP', external_id: ext });
      if (sErr) throw new Error(`${s.code} envelope: ${sErr.message}`);
      events++;
    }
  }
  return { upserted, decisions, events };
}

async function seedRegisters(sb: SupabaseClient) {
  const { data: rows } = await sb.from('projects').select('id, code').in('code', ['NW-IT-0001', 'NW-IT-0002', 'NW-IT-0004']);
  const id = new Map((rows ?? []).map((r) => [(r as { code: string }).code, (r as { id: string }).id]));
  let n = 0;
  const risks = [
    { code: 'NW-IT-0002', risk_id: 'R-001', category: 'Resource', description: 'SAP basis and ABAP engineers are shared with run & maintenance; a major incident or support-pack cut-over pulls them for 4-6 weeks.', probability: 'H', impact: 'H', score: 9, response: 'Named-resource commitment at each gate; displacement logged and attributed; buffer in Build stage.', owner: 'Daniel Osei', trigger: 'P1 incident or support-pack window declared on the SAP estate', status: 'Active', cross_cutting_class: 'Resource / labour scarcity' },
    { code: 'NW-IT-0002', risk_id: 'R-002', category: 'Scope', description: 'Finance requests additional reconciliation types after design review (scope creep post-SG1).', probability: 'M', impact: 'M', score: 4, response: 'Route as change orders; fund from project contingency first, bucket reserve second.', owner: 'Group Financial Controller', trigger: 'New reconciliation type requested', status: 'Active', cross_cutting_class: 'Client-driven scope or sequence changes' },
    { code: 'NW-IT-0001', risk_id: 'R-001', category: 'Technical', description: 'Core-switch firmware defect on the selected model delays DC-A cut-over.', probability: 'M', impact: 'H', score: 6, response: 'Vendor escalation; DC-B first; cut-over window held in reserve.', owner: 'Head of Data-centre Operations', trigger: 'Vendor advisory issued', status: 'Active', cross_cutting_class: 'Vendor / supplier concentration' },
  ];
  for (const r of risks) {
    const pid = id.get(r.code); if (!pid) continue;
    const { code: _c, ...rest } = r;
    const { error } = await sb.from('risks').upsert({ project_id: pid, ...rest }, { onConflict: 'project_id,risk_id' });
    if (!error) n++; else log.warn(`risk ${r.code}/${r.risk_id}: ${error.message}`);
  }
  const issues = [
    { code: 'NW-IT-0004', issue_id: 'I-001', description: 'SAP basis engineer reassigned to the S/4HANA support-pack cut-over (run work); SoD remediation stalled.', category: 'Resource', severity: 'H', owner: 'Priya Raman', status: 'Open', linked_wbs: [], linked_risk: null, opened_week: 30 },
    { code: 'NW-IT-0002', issue_id: 'I-001', description: 'Bank-statement interface test data not available from treasury until October.', category: 'Dependency', severity: 'M', owner: 'Daniel Osei', status: 'In progress', linked_wbs: [], linked_risk: null, opened_week: 28 },
  ];
  for (const i of issues) {
    const pid = id.get(i.code); if (!pid) continue;
    const { code: _c, ...rest } = i;
    const { error } = await sb.from('issues').upsert({ project_id: pid, ...rest }, { onConflict: 'project_id,issue_id' });
    if (!error) n++; else log.warn(`issue ${i.code}/${i.issue_id}: ${error.message}`);
  }
  const cos = [
    { code: 'NW-IT-0002', co_id: 'CO-001', driver: 'Scope clarification', scope_summary: 'Add intercompany reconciliation to the automation scope (requested by Finance after design review).', cost_impact_m: 0.18, revenue_impact_m: 0, schedule_impact_days: 15, margin_realized_pct: 0, status: 'Approved', approval_routing: 'Sponsor (within project contingency) → bucket owner (draws $80k on Applications reserve)', executed_week: 27, funding_source: 'bucket_reserve' },
    { code: 'NW-IT-0001', co_id: 'CO-001', driver: 'Northwood-driven', scope_summary: 'Extend refresh to the DR site core pair (2 additional switches).', cost_impact_m: 0.22, revenue_impact_m: 0, schedule_impact_days: 20, margin_realized_pct: 0, status: 'Submitted to client', approval_routing: 'Exceeds contingency and reserve → portfolio board (would displace NW-IT-0015 if approved in FY2027)', executed_week: null, funding_source: 'displacement' },
  ];
  for (const c of cos) {
    const pid = id.get(c.code); if (!pid) continue;
    const { code: _c, ...rest } = c;
    const { error } = await sb.from('change_orders').upsert({ project_id: pid, ...rest }, { onConflict: 'project_id,co_id' });
    if (!error) n++; else log.warn(`change order ${c.code}/${c.co_id}: ${error.message}`);
  }
  return n;
}

// ---------------------------------------------------------------------------
// Governance: decision-body memberships, pending decisions, displacements, benefits
// ---------------------------------------------------------------------------
type RoleRow = { id: string; name: string; role_type: string };
type ProjRow = { id: string; code: string; name: string; portfolio_bucket: string | null; requested_budget: number | null };

async function seedGovernance(sb: SupabaseClient) {
  const out = { members: 0, records: 0, displacements: 0, benefits: 0 };
  const { data: roleRows } = await sb.from('roles').select('id, name, role_type')
    .in('role_type', ['it_board_member', 'it_finance', 'it_bucket_owner', 'it_portfolio_manager', 'it_sponsor']);
  const byType = new Map<string, RoleRow>();
  for (const r of (roleRows ?? []) as RoleRow[]) if (!byType.has(r.role_type)) byType.set(r.role_type, r);
  const board = byType.get('it_board_member'); const finance = byType.get('it_finance');
  const owner = byType.get('it_bucket_owner'); const pmo = byType.get('it_portfolio_manager');
  if (!board || !finance || !owner || !pmo) { log.warn('IT governance roles missing — apply migration 0046 first'); return out; }

  // 1. Memberships (role-type bodies — sponsor, finance — need no rows)
  const { data: bodyRows } = await sb.from('decision_bodies').select('id, key').eq('project_type', 'it');
  const body = new Map((bodyRows ?? []).map((b) => [(b as { key: string }).key, (b as { id: string }).id]));
  const memberships: Array<{ key: string; role: RoleRow; chair?: boolean; voting?: boolean }> = [
    { key: 'investment_board', role: board, chair: true },
    { key: 'investment_board', role: finance },
    { key: 'investment_board', role: owner },
    { key: 'investment_board', role: pmo, voting: false },          // PMO attends as secretary, non-voting
    { key: 'cio', role: board },
    { key: 'architecture', role: owner },
    ...(['infrastructure', 'applications', 'security', 'compliance'] as const).map((b) => ({ key: `bucket_owner:${b}`, role: owner })),
  ];
  for (const m of memberships) {
    const bid = body.get(m.key); if (!bid) { log.warn(`decision body ${m.key} missing`); continue; }
    const { error } = await sb.from('decision_body_members').upsert(
      { body_id: bid, role_id: m.role.id, is_chair: m.chair ?? false, is_voting: m.voting ?? true }, { onConflict: 'body_id,role_id' });
    if (!error) out.members++; else log.warn(`member ${m.key}/${m.role.name}: ${error.message}`);
  }

  // 2. Pending decisions in the queue (one per body, so each role has something to decide)
  const { data: projRows } = await sb.from('projects').select('id, code, name, portfolio_bucket, requested_budget').eq('project_type', 'it');
  const proj = new Map((projRows ?? []).map((p) => [(p as ProjRow).code, p as ProjRow]));
  const { data: coRows } = await sb.from('change_orders').select('id, project_id, co_id').eq('co_id', 'CO-001');
  const co0001 = (coRows ?? []).find((c) => (c as { project_id: string }).project_id === proj.get('NW-IT-0001')?.id) as { id: string } | undefined;
  const p12 = proj.get('NW-IT-0012'); const p11 = proj.get('NW-IT-0011'); const p02 = proj.get('NW-IT-0002'); const p01 = proj.get('NW-IT-0001');
  const records: Array<Record<string, unknown>> = [];
  // Retire the earlier draft of this proposal (superseded by the ranked version below).
  await sb.from('decision_records').delete().contains('proposal', { seed_ref: 'gov-waterline-security' }).eq('status', 'proposed');
  if (p12 && p11) records.push({
    project_type: 'it', decision_kind: 'waterline_approval', project_id: null, fiscal_year: FY_NEXT, amount: 2_100_000,
    title: `FY${FY_NEXT} Security waterline — approve 1, defer 1`,
    proposal: { seed_ref: 'gov-waterline-security-v2', bucket: 'security', decisions: [
      { project_id: p11.id, project_code: p11.code, outcome: 'approve', amount: 2_100_000, is_continuation: false },
      { project_id: p12.id, project_code: p12.code, outcome: 'defer', amount: 1_300_000, is_continuation: false },
    ], rationale: 'IGA ranks first on risk reduction per dollar and fits the fundable line; PAM is $200k short of the line — deferred unless the board re-phases the unallocated Applications balance.' },
    proposed_by_role_id: pmo.id, proposed_by_name: pmo.name, required_body_key: 'investment_board', required_concurrences: [],
  });
  if (p02) records.push({
    project_type: 'it', decision_kind: 'continuation', project_id: p02.id, fiscal_year: FY_NEXT, amount: 900_000,
    title: `FY${FY_NEXT} continuation — ${p02.code} ${p02.name}`,
    proposal: { seed_ref: 'gov-continuation-0002', bucket: 'applications', decisions: [
      { project_id: p02.id, project_code: p02.code, outcome: 'approve', amount: 900_000, is_continuation: true },
    ], cost_to_complete: 900_000, remaining_benefit: 1_100_000, note: 'Build 70% complete; remaining work is bank-interface testing and cut-over. Cost-to-complete $0.9M against $1.1M/yr remaining benefit.' },
    proposed_by_role_id: pmo.id, proposed_by_name: pmo.name, required_body_key: 'cio', required_concurrences: ['finance'],
  });
  if (p01 && co0001) records.push({
    project_type: 'it', decision_kind: 'change_order', project_id: p01.id, fiscal_year: FY_NEXT, amount: 220_000,
    title: `Change order CO-001 — ${p01.code} DR-site core pair (displacement)`,
    proposal: { seed_ref: 'gov-co-0001', change_order_id: co0001.id, funding_source: 'displacement', displaces: 'NW-IT-0015', note: 'Exceeds contingency and the Infrastructure reserve; funding would displace the Wi-Fi 6E refresh in FY2027.' },
    proposed_by_role_id: pmo.id, proposed_by_name: pmo.name, required_body_key: 'investment_board', required_concurrences: [],
  });
  for (const r of records) {
    const ref = (r.proposal as { seed_ref: string }).seed_ref;
    const { data: existing } = await sb.from('decision_records').select('id').contains('proposal', { seed_ref: ref }).limit(1);
    if (existing && existing.length) continue;
    const { error } = await sb.from('decision_records').insert(r);
    if (!error) out.records++; else log.warn(`decision record ${ref}: ${error.message}`);
  }

  // 3. Resource displacement — people pulled off the project to run work / another project
  const p04 = proj.get('NW-IT-0004');
  if (p04) {
    const row = {
      from_project_id: p04.id, to_project_id: null, to_project_code: null,
      resource_name: 'SAP basis engineer', skill: 'SAP Basis / GRC', from_date: `${FY_NOW}-07-20`, to_date: null, fte: 1.0, schedule_impact_days: 30,
      reason: 'incident_run', notes: 'Pulled onto the S/4HANA year-end support-pack cut-over (P1 run work). SoD remediation on hold until the engineer returns; audit deadline at risk.',
      logged_by_role_id: pmo.id, logged_by_name: pmo.name,
    };
    // Replace the earlier draft of this row (it pointed at a revenue project).
    await sb.from('resource_displacements').delete().eq('from_project_id', p04.id).eq('resource_name', row.resource_name).eq('from_date', row.from_date).in('reason', ['revenue_ld_exposure', 'revenue_priority']);
    const { data: existing } = await sb.from('resource_displacements').select('id').eq('from_project_id', p04.id).eq('resource_name', row.resource_name).eq('from_date', row.from_date).limit(1);
    if (!existing || !existing.length) {
      const { error } = await sb.from('resource_displacements').insert(row);
      if (!error) out.displacements++; else log.warn(`displacement: ${error.message}`);
    }
  }

  // 4. Benefits realisation for the closed decommission project
  const p05 = proj.get('NW-IT-0005');
  if (p05) {
    const reports = [
      { period: `${FY_NOW}-Q3`, planned_benefit: 105_000, realised_benefit: 92_000, commentary: 'One legacy licence renewal could not be cancelled until October; hosting savings on plan.', reported_by: 'VP Sales Operations' },
      { period: `${FY_NOW}-Q4`, planned_benefit: 105_000, realised_benefit: 110_000, commentary: 'Full run-rate achieved; residual backup storage decommissioned early.', reported_by: 'VP Sales Operations' },
    ];
    for (const b of reports) {
      const { error } = await sb.from('benefits_reports').upsert({ project_id: p05.id, ...b }, { onConflict: 'project_id,period' });
      if (!error) out.benefits++; else log.warn(`benefit ${b.period}: ${error.message}`);
    }
  }
  return out;
}

async function main() {
  log.header('AI PMO — IT PMO workspace seed');
  const sb = getServiceClient();
  const { error: probe } = await sb.from('stage_templates').select('id', { count: 'exact', head: true });
  if (probe) { log.error(`stage_templates not found — apply migration 0045 first (${probe.message})`); process.exit(1); }
  section('1. Portfolio allocations');
  log.success(`${await seedAllocations(sb)} allocation rows`);
  section('2. IT projects, gate history, sanction events');
  const r = await seedProjects(sb);
  log.success(`${r.upserted} projects · ${r.decisions} new gate decisions · ${r.events} new sanction events`);
  section('3. Risks, issues, change orders');
  log.success(`${await seedRegisters(sb)} register rows`);
  section('4. Governance — bodies, pending decisions, displacements, benefits');
  const g = await seedGovernance(sb);
  log.success(`${g.members} memberships · ${g.records} new pending decisions · ${g.displacements} new displacements · ${g.benefits} benefits reports`);
  log.info('Done. After `pnpm seed:users` sign in as p.raman (IT PMO), d.osei (IT PM), e.novak (sponsor), s.whitaker (bucket owner), a.chen (CIO / board chair) or m.lopez (Finance).');
}

main().catch((e) => { log.error(String(e)); process.exit(1); });
