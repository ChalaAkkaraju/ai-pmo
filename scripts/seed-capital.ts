/**
 * Capital workspace seed — the FY2026 and FY2027 capital plans by category,
 * eleven projects across front-end loading, execution and handover, with the
 * full SAP-side picture each one needs: WBS, monthly cost and open
 * commitment, settlement rules, settlement postings and fixed assets, plus
 * gate history, AFEs, supplementaries and the decisions that sanctioned them.
 *
 * The population is chosen so each capital control has a live example:
 *   • NW-CAP-0001 Boiler 3 — forecast 17% over its AFE and no supplementary
 *     raised: the supplementary trigger.
 *   • NW-CAP-0002 Wastewater — in service in under 60 days, two WBS
 *     elements carrying cost with no settlement rule and no asset record:
 *     settlement BLOCKED.
 *   • NW-CAP-0003 Packaging line 4 — at FEL3 with a $12.4M AFE waiting for
 *     Finance to concur and the capital committee to sanction.
 *   • NW-CAP-0004 Compressed air — in service since June, still in AuC: an
 *     asset running without depreciating.
 *   • NW-CAP-0007 Cooling tower — in-service slipped from December into the
 *     next fiscal year.
 *   • NW-CAP-0008 DCS migration — 27% expensed against a 10% assumption, and
 *     one WBS with rules totalling 90%.
 *   • NW-CAP-0010 Tank farm — a supplementary whose REVISED total crosses
 *     $1M, so it routes to the business-unit head, not the plant manager who
 *     approved the original AFE; committed already exceeds the appropriation.
 *   • NW-CAP-0011 Steam turbine — cancelled in FEL2 when the capex test showed
 *     like-for-like refurbishment: maintenance, not capital. Cheap and correct.
 *
 * Idempotent: projects upsert on code; allocations on (type, fy, bucket);
 * work packages on (project, wbs); everything else keyed on external_id (or
 * proposal.seed_ref for decision records) and created only when missing.
 *
 * Run with:  pnpm seed:capital     (after migration 0051 is applied)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './lib/supabase-admin';
import { log, section } from './lib/log';

const TODAY = '2026-10-23';
const LAST_PERIOD = '2026-10-01';

type Bucket = 'growth' | 'sustaining' | 'hse_regulatory' | 'cost_reduction';
type Life = 'proposed' | 'approved' | 'active' | 'on_hold' | 'cancelled' | 'closed';
type Rule = { type: 'auc' | 'fixed_asset' | 'cost_centre'; id: string; pct: number };
type Wbs = { code: string; name: string; weight: number; rules: Rule[] | null };
type Gate = { seq: number; decision: 'go' | 'hold' | 'kill'; on: string; by: string; notes?: string };
type Sanction = { kind: 'gate_budget' | 'afe' | 'supplementary_afe'; v: number; amount: number; on: string; by: string; body: string; note: string; attendees?: string[]; concur?: boolean };
type Pending = { kind: 'afe_approval' | 'supplementary_afe' | 'gate_decision'; amount: number; on: string; body: string; title: string; proposal: Record<string, unknown>; concurrences: string[] };
type Asset = { number: string; description: string; cls: string; life: number; value: number; capitalised_on?: string; status: 'auc' | 'capitalised' };

interface Seed {
  code: string; name: string; site: string; sponsor: string; bucket: Bucket; category: 'major' | 'minor';
  fiscal_year: number; lifecycle: Life; stage: number; requested: number;
  problem: string; outcome: string;
  case: { npv: number | null; irr: number | null; payback: number | null; annual: number | null; estimate_class: number; eac: number | null; planned_isd: string | null; isd: string | null; expected_expense_pct: number; asset_class: string; life: number;
    capex: { new_asset: boolean; extends_life: boolean; adds_capacity: boolean; like_for_like_repair: boolean } };
  gates: Gate[];
  sanctions: Sanction[];
  wbs: Wbs[];
  /** Spend window and total actual, spread on an S-curve across the WBS by weight. */
  spend?: { from: string; to: string; total: number; open_commitment: number };
  /** Settlement posts one period behind cost. Capitalise on this date if set. */
  capitalise_on?: string;
  assets?: Asset[];
  pending?: Pending[];
}

const AUC = (n: string): Rule[] => [{ type: 'auc', id: n, pct: 100 }];
const P: Seed[] = [
  {
    code: 'NW-CAP-0001', name: 'Boiler 3 replacement', site: 'Northwind Rotterdam', sponsor: 'Luis Moreno', bucket: 'sustaining', category: 'major',
    fiscal_year: 2026, lifecycle: 'active', stage: 3, requested: 17_800_000,
    problem: 'Boiler 3 (1987) has failed two statutory inspections; tube wastage limits it to 70% load and insurance cover lapses at the 2027 inspection.',
    outcome: 'A 120 t/h high-efficiency boiler with low-NOx burners, 4% fuel saving and a 30-year life.',
    case: { npv: 9_400_000, irr: 14.2, payback: 78, annual: 2_100_000, estimate_class: 3, eac: 21_600_000, planned_isd: '2027-03-31', isd: '2027-03-31', expected_expense_pct: 6, asset_class: 'Plant & machinery — steam', life: 30,
      capex: { new_asset: true, extends_life: false, adds_capacity: true, like_for_like_repair: false } },
    gates: [
      { seq: 0, decision: 'go', on: '2025-03-10', by: 'Luis Moreno', notes: 'Need confirmed by the inspection report; do-nothing is not an option past 2027.' },
      { seq: 1, decision: 'go', on: '2025-06-20', by: 'Helen Brooks', notes: 'Selected new-build over re-tubing: re-tubing buys 8 years for 55% of the cost.' },
      { seq: 2, decision: 'go', on: '2025-10-15', by: 'Helen Brooks', notes: 'AFE sanctioned on a class 3 estimate with 9% contingency. Refractory scope excluded pending survey — flagged as the main risk.' },
    ],
    sanctions: [
      { kind: 'gate_budget', v: 1, amount: 240_000, on: '2025-03-10', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL1 Appraise: study budget released for FEL2 Select' },
      { kind: 'gate_budget', v: 2, amount: 900_000, on: '2025-06-20', by: 'Helen Brooks', body: 'bu_head', note: 'FEL2 Select: FEED budget released for FEL3 Define' },
      { kind: 'afe', v: 1, amount: 18_500_000, on: '2025-10-15', by: 'Helen Brooks', body: 'capital_committee', note: 'AFE sanctioned at Gate 3 · capex test: capex', attendees: ['Helen Brooks', 'Omar Haddad', 'Victor Nguyen'], concur: true },
    ],
    wbs: [
      { code: '1100', name: 'Engineering & FEED close-out', weight: 0.08, rules: AUC('AUC-4100001') },
      { code: '1200', name: 'Boiler package (vendor supply)', weight: 0.52, rules: AUC('AUC-4100001') },
      { code: '1300', name: 'Civil works & foundations', weight: 0.14, rules: AUC('AUC-4100001') },
      { code: '1400', name: 'Mechanical & electrical installation', weight: 0.20, rules: AUC('AUC-4100001') },
      { code: '1500', name: 'Demolition of Boiler 3', weight: 0.06, rules: [{ type: 'cost_centre', id: 'CC-RTM-MAINT', pct: 100 }] },
    ],
    spend: { from: '2025-11-01', to: LAST_PERIOD, total: 11_200_000, open_commitment: 6_800_000 },
    assets: [{ number: 'AUC-4100001', description: 'Boiler 4 — under construction', cls: 'AuC', life: 30, value: 0, status: 'auc' }],
  },
  {
    code: 'NW-CAP-0002', name: 'Wastewater treatment upgrade', site: 'Northwind Baton Rouge', sponsor: 'Luis Moreno', bucket: 'hse_regulatory', category: 'major',
    fiscal_year: 2026, lifecycle: 'active', stage: 4, requested: 6_900_000,
    problem: 'The state discharge permit renewal tightens COD and ammonia limits from January 2027; the existing plant cannot meet them.',
    outcome: 'Membrane bioreactor stage and sludge dewatering that bring discharge inside the 2027 permit with 20% headroom.',
    case: { npv: null, irr: null, payback: null, annual: null, estimate_class: 2, eac: 8_000_000, planned_isd: '2026-12-15', isd: '2026-12-15', expected_expense_pct: 8, asset_class: 'Plant & machinery — utilities', life: 25,
      capex: { new_asset: true, extends_life: false, adds_capacity: true, like_for_like_repair: false } },
    gates: [
      { seq: 0, decision: 'go', on: '2024-11-04', by: 'Luis Moreno', notes: 'Mandatory: permit-driven. Ranked on cost-to-comply.' },
      { seq: 1, decision: 'go', on: '2025-01-28', by: 'Helen Brooks' },
      { seq: 2, decision: 'go', on: '2025-04-08', by: 'Helen Brooks', notes: 'AFE sanctioned; in-service must precede the permit date.' },
      { seq: 3, decision: 'go', on: '2026-09-30', by: 'Luis Moreno', notes: 'Mechanical completion certified; performance test scheduled for November.' },
    ],
    sanctions: [
      { kind: 'gate_budget', v: 1, amount: 150_000, on: '2024-11-04', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL1 Appraise: study budget released' },
      { kind: 'gate_budget', v: 2, amount: 420_000, on: '2025-01-28', by: 'Helen Brooks', body: 'bu_head', note: 'FEL2 Select: FEED budget released' },
      { kind: 'afe', v: 1, amount: 7_200_000, on: '2025-04-08', by: 'Helen Brooks', body: 'bu_head', note: 'AFE sanctioned at Gate 3 · capex test: capex', concur: true },
      { kind: 'supplementary_afe', v: 1, amount: 900_000, on: '2026-05-12', by: 'Helen Brooks', body: 'bu_head', note: 'Supplementary AFE +900,000 → revised total 8,100,000 · ground conditions under the MBR tanks required piling', concur: true },
    ],
    wbs: [
      { code: '1100', name: 'Engineering', weight: 0.09, rules: AUC('AUC-4200007') },
      { code: '1200', name: 'MBR tanks & membranes', weight: 0.41, rules: AUC('AUC-4200007') },
      { code: '1300', name: 'Civil works & piling', weight: 0.22, rules: AUC('AUC-4200007') },
      { code: '1400', name: 'Instrumentation & controls', weight: 0.14, rules: null },
      { code: '1500', name: 'Sludge dewatering skid', weight: 0.11, rules: null },
      { code: '1600', name: 'Operator training & permit fees', weight: 0.03, rules: [{ type: 'cost_centre', id: 'CC-BTR-HSE', pct: 100 }] },
    ],
    spend: { from: '2025-05-01', to: LAST_PERIOD, total: 7_400_000, open_commitment: 420_000 },
  },
  {
    code: 'NW-CAP-0003', name: 'Packaging line 4', site: 'Northwind Rotterdam', sponsor: 'Luis Moreno', bucket: 'growth', category: 'major',
    fiscal_year: 2027, lifecycle: 'approved', stage: 2, requested: 12_400_000,
    problem: 'Lines 1–3 run at 94% utilisation; the 2027 volume plan for the new retail contracts needs 18% more packing capacity.',
    outcome: 'A fourth high-speed line, 220 packs/min, in service for the Q4 2027 peak.',
    case: { npv: 15_800_000, irr: 21.5, payback: 46, annual: 3_900_000, estimate_class: 3, eac: null, planned_isd: null, isd: '2027-09-30', expected_expense_pct: 5, asset_class: 'Plant & machinery — packaging', life: 15,
      capex: { new_asset: true, extends_life: false, adds_capacity: true, like_for_like_repair: false } },
    gates: [
      { seq: 0, decision: 'go', on: '2026-02-16', by: 'Luis Moreno', notes: 'Volume case confirmed with Sales; alternatives: third shift (rejected — labour market), toll packing (kept as fallback).' },
      { seq: 1, decision: 'go', on: '2026-05-21', by: 'Helen Brooks', notes: 'Selected the same OEM as lines 2–3 for spares commonality.' },
    ],
    sanctions: [
      { kind: 'gate_budget', v: 1, amount: 180_000, on: '2026-02-16', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL1 Appraise: study budget released for FEL2 Select' },
      { kind: 'gate_budget', v: 2, amount: 650_000, on: '2026-05-21', by: 'Helen Brooks', body: 'bu_head', note: 'FEL2 Select: FEED budget released for FEL3 Define' },
    ],
    wbs: [
      { code: '1100', name: 'Front-end engineering (FEED)', weight: 1, rules: null },
    ],
    spend: { from: '2026-03-01', to: LAST_PERIOD, total: 610_000, open_commitment: 140_000 },
    pending: [{
      kind: 'afe_approval', amount: 12_400_000, on: '2026-10-14', body: 'capital_committee',
      title: 'NW-CAP-0003 Packaging line 4 — AFE $12.40M at Gate 3 - AFE sanction (commit)',
      proposal: { stage_seq: 2, capex_verdict: 'capex', estimate_class: 3, in_service_date: '2027-09-30', npv_amount: 15_800_000, irr_pct: 21.5, notes: 'Class 3 estimate (−10%/+15%) with 8% contingency. OEM quote valid to 30 November.' },
      concurrences: [],
    }],
  },
  {
    code: 'NW-CAP-0004', name: 'Compressed air efficiency', site: 'Northwind Antwerp', sponsor: 'Luis Moreno', bucket: 'cost_reduction', category: 'minor',
    fiscal_year: 2026, lifecycle: 'active', stage: 2, requested: 850_000,
    problem: 'Three fixed-speed compressors run unloaded 40% of the time; compressed air is 11% of site electricity.',
    outcome: 'Two variable-speed compressors, a central controller and leak repair: 1.9 GWh a year saved.',
    case: { npv: 1_150_000, irr: 31, payback: 34, annual: 300_000, estimate_class: 2, eac: 820_000, planned_isd: '2026-06-30', isd: '2026-06-30', expected_expense_pct: 8, asset_class: 'Plant & machinery — utilities', life: 15,
      capex: { new_asset: true, extends_life: false, adds_capacity: false, like_for_like_repair: true } },
    gates: [
      { seq: 0, decision: 'go', on: '2025-11-18', by: 'Luis Moreno', notes: 'AFE within plant-manager authority.' },
      { seq: 1, decision: 'go', on: '2026-06-30', by: 'Luis Moreno', notes: 'Commissioned and handed to utilities.' },
    ],
    sanctions: [
      { kind: 'afe', v: 1, amount: 850_000, on: '2025-11-18', by: 'Luis Moreno', body: 'plant_manager', note: 'AFE sanctioned at AFE sanction (commit) · capex test: mixed', concur: true },
    ],
    wbs: [
      { code: '1100', name: 'VSD compressors & controller', weight: 0.78, rules: AUC('AUC-4300012') },
      { code: '1200', name: 'Installation & pipework', weight: 0.14, rules: AUC('AUC-4300012') },
      { code: '1300', name: 'Leak survey & repair', weight: 0.08, rules: [{ type: 'cost_centre', id: 'CC-ANR-UTIL', pct: 100 }] },
    ],
    spend: { from: '2025-12-01', to: '2026-07-01', total: 810_000, open_commitment: 0 },
    assets: [{ number: 'AUC-4300012', description: 'Compressed air system — under construction', cls: 'AuC', life: 15, value: 0, status: 'auc' }],
  },
  {
    code: 'NW-CAP-0005', name: 'Warehouse automation', site: 'Northwind Baton Rouge', sponsor: 'Luis Moreno', bucket: 'growth', category: 'major',
    fiscal_year: 2027, lifecycle: 'approved', stage: 1, requested: 9_600_000,
    problem: 'Finished-goods warehouse is at 97% of pallet positions and relies on 14 FTE of overtime at peak.',
    outcome: 'Automated high-bay store with shuttle retrieval, +60% pallet positions on the same footprint.',
    case: { npv: 7_200_000, irr: 17.8, payback: 58, annual: 1_700_000, estimate_class: 4, eac: null, planned_isd: null, isd: '2028-03-31', expected_expense_pct: 5, asset_class: 'Buildings & warehouse systems', life: 20,
      capex: { new_asset: true, extends_life: false, adds_capacity: true, like_for_like_repair: false } },
    gates: [{ seq: 0, decision: 'go', on: '2026-07-09', by: 'Luis Moreno', notes: 'Appraise passed; three layouts to be compared in Select.' }],
    sanctions: [{ kind: 'gate_budget', v: 1, amount: 220_000, on: '2026-07-09', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL1 Appraise: study budget released for FEL2 Select' }],
    wbs: [{ code: '1100', name: 'Concept studies & layout options', weight: 1, rules: null }],
    spend: { from: '2026-08-01', to: LAST_PERIOD, total: 120_000, open_commitment: 60_000 },
  },
  {
    code: 'NW-CAP-0006', name: 'Fire suppression upgrade', site: 'Northwind Antwerp', sponsor: 'Luis Moreno', bucket: 'hse_regulatory', category: 'minor',
    fiscal_year: 2026, lifecycle: 'closed', stage: 2, requested: 640_000,
    problem: 'Insurer survey required foam suppression in the solvent store by May 2026.',
    outcome: 'Foam-water deluge system in the solvent store, accepted by the insurer.',
    case: { npv: null, irr: null, payback: null, annual: null, estimate_class: 2, eac: 640_000, planned_isd: '2026-04-30', isd: '2026-04-30', expected_expense_pct: 5, asset_class: 'Buildings — fire protection', life: 20,
      capex: { new_asset: true, extends_life: false, adds_capacity: false, like_for_like_repair: false } },
    gates: [
      { seq: 0, decision: 'go', on: '2025-09-22', by: 'Luis Moreno' },
      { seq: 1, decision: 'go', on: '2026-04-30', by: 'Luis Moreno', notes: 'Commissioned; insurer acceptance received.' },
      { seq: 2, decision: 'go', on: '2026-06-15', by: 'Luis Moreno', notes: 'Settled to fixed assets in May; final cost $640k against a $640k AFE.' },
    ],
    sanctions: [{ kind: 'afe', v: 1, amount: 640_000, on: '2025-09-22', by: 'Luis Moreno', body: 'plant_manager', note: 'AFE sanctioned at AFE sanction (commit) · capex test: capex', concur: true }],
    wbs: [
      { code: '1100', name: 'Deluge system supply & install', weight: 0.95, rules: AUC('AUC-4300009') },
      { code: '1200', name: 'Insurer survey & fees', weight: 0.05, rules: [{ type: 'cost_centre', id: 'CC-ANR-HSE', pct: 100 }] },
    ],
    spend: { from: '2025-10-01', to: '2026-04-01', total: 640_000, open_commitment: 0 },
    capitalise_on: '2026-05-01',
    assets: [{ number: '3000418', description: 'Foam-water deluge system — solvent store', cls: 'Buildings — fire protection', life: 20, value: 608_000, capitalised_on: '2026-05-01', status: 'capitalised' }],
  },
  {
    code: 'NW-CAP-0007', name: 'Cooling tower rebuild', site: 'Northwind Rotterdam', sponsor: 'Luis Moreno', bucket: 'sustaining', category: 'major',
    fiscal_year: 2026, lifecycle: 'active', stage: 3, requested: 4_100_000,
    problem: 'Timber-structure cooling tower CT-2 has structural decay; capacity derated 25% in summer.',
    outcome: 'FRP-structure tower with new fill and drift eliminators, full capacity restored with 25-year life.',
    case: { npv: 2_600_000, irr: 12.4, payback: 84, annual: 520_000, estimate_class: 3, eac: 4_600_000, planned_isd: '2026-12-15', isd: '2027-02-28', expected_expense_pct: 7, asset_class: 'Plant & machinery — utilities', life: 25,
      capex: { new_asset: false, extends_life: true, adds_capacity: true, like_for_like_repair: false } },
    gates: [
      { seq: 0, decision: 'go', on: '2025-04-14', by: 'Luis Moreno' },
      { seq: 1, decision: 'go', on: '2025-07-30', by: 'Luis Moreno' },
      { seq: 2, decision: 'go', on: '2025-12-05', by: 'Helen Brooks', notes: 'AFE sanctioned for a winter outage; FRP structure long-lead.' },
    ],
    sanctions: [
      { kind: 'gate_budget', v: 1, amount: 90_000, on: '2025-04-14', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL1 Appraise: study budget released' },
      { kind: 'gate_budget', v: 2, amount: 210_000, on: '2025-07-30', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL2 Select: FEED budget released' },
      { kind: 'afe', v: 1, amount: 4_300_000, on: '2025-12-05', by: 'Helen Brooks', body: 'bu_head', note: 'AFE sanctioned at Gate 3 · capex test: capex', concur: true },
    ],
    wbs: [
      { code: '1100', name: 'Engineering', weight: 0.07, rules: AUC('AUC-4100014') },
      { code: '1200', name: 'FRP structure & fill (supply)', weight: 0.48, rules: AUC('AUC-4100014') },
      { code: '1300', name: 'Demolition of timber structure', weight: 0.08, rules: [{ type: 'cost_centre', id: 'CC-RTM-MAINT', pct: 100 }] },
      { code: '1400', name: 'Erection & tie-ins', weight: 0.37, rules: AUC('AUC-4100014') },
    ],
    spend: { from: '2026-01-01', to: LAST_PERIOD, total: 2_900_000, open_commitment: 1_250_000 },
    assets: [{ number: 'AUC-4100014', description: 'Cooling tower CT-2 — under construction', cls: 'AuC', life: 25, value: 0, status: 'auc' }],
  },
  {
    code: 'NW-CAP-0008', name: 'DCS control system migration', site: 'Northwind Baton Rouge', sponsor: 'Luis Moreno', bucket: 'sustaining', category: 'major',
    fiscal_year: 2026, lifecycle: 'active', stage: 3, requested: 4_400_000,
    problem: 'The 2004 DCS is out of vendor support from 2027; spares are sourced second-hand.',
    outcome: 'Migration to the current DCS platform with a virtualised server room and new operator consoles.',
    case: { npv: 1_900_000, irr: 11.2, payback: 96, annual: 380_000, estimate_class: 3, eac: 4_900_000, planned_isd: '2027-05-31', isd: '2027-05-31', expected_expense_pct: 10, asset_class: 'IT & control systems', life: 12,
      capex: { new_asset: true, extends_life: false, adds_capacity: false, like_for_like_repair: true } },
    gates: [
      { seq: 0, decision: 'go', on: '2025-02-03', by: 'Luis Moreno' },
      { seq: 1, decision: 'go', on: '2025-05-12', by: 'Luis Moreno' },
      { seq: 2, decision: 'go', on: '2025-08-19', by: 'Helen Brooks', notes: 'AFE sanctioned. Finance: software licences capitalise, configuration labour capitalises, operator training and data migration are expensed.' },
    ],
    sanctions: [
      { kind: 'gate_budget', v: 1, amount: 80_000, on: '2025-02-03', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL1 Appraise: study budget released' },
      { kind: 'gate_budget', v: 2, amount: 240_000, on: '2025-05-12', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL2 Select: FEED budget released' },
      { kind: 'afe', v: 1, amount: 4_600_000, on: '2025-08-19', by: 'Helen Brooks', body: 'bu_head', note: 'AFE sanctioned at Gate 3 · capex test: mixed', concur: true },
    ],
    wbs: [
      { code: '1100', name: 'Hardware & licences', weight: 0.33, rules: AUC('AUC-4200021') },
      { code: '1200', name: 'Configuration & FAT', weight: 0.25, rules: AUC('AUC-4200021') },
      { code: '1300', name: 'Cut-over & commissioning', weight: 0.15, rules: [{ type: 'auc', id: 'AUC-4200021', pct: 90 }] },
      { code: '1400', name: 'Operator training & data migration', weight: 0.27, rules: [{ type: 'cost_centre', id: 'CC-BTR-OPS', pct: 100 }] },
    ],
    spend: { from: '2025-09-01', to: LAST_PERIOD, total: 3_100_000, open_commitment: 900_000 },
    assets: [{ number: 'AUC-4200021', description: 'DCS platform — under construction', cls: 'AuC', life: 12, value: 0, status: 'auc' }],
  },
  {
    code: 'NW-CAP-0009', name: 'Solar PV carport', site: 'Northwind Antwerp', sponsor: 'Luis Moreno', bucket: 'cost_reduction', category: 'major',
    fiscal_year: 2027, lifecycle: 'proposed', stage: 0, requested: 2_100_000,
    problem: 'Site electricity cost up 38% since 2023; the 600-space car park is unused roof area.',
    outcome: '1.8 MWp carport array, 1.7 GWh/yr self-consumed, with EV charging.',
    case: { npv: 1_400_000, irr: 10.8, payback: 92, annual: 260_000, estimate_class: 5, eac: null, planned_isd: null, isd: '2027-10-31', expected_expense_pct: 5, asset_class: 'Plant & machinery — energy', life: 25,
      capex: { new_asset: true, extends_life: false, adds_capacity: true, like_for_like_repair: false } },
    gates: [], sanctions: [],
    wbs: [],
    pending: [{
      kind: 'gate_decision', amount: 150_000, on: '2026-10-20', body: 'plant_manager',
      title: 'NW-CAP-0009 Solar PV carport — Gate 1 - Appraise: release $150k study budget',
      proposal: { stage_seq: 0, notes: 'Grid-connection study and structural survey of the car park; PPA alternative to be priced in Select.' },
      concurrences: [],
    }],
  },
  {
    code: 'NW-CAP-0010', name: 'Tank farm expansion', site: 'Northwind Baton Rouge', sponsor: 'Luis Moreno', bucket: 'growth', category: 'minor',
    fiscal_year: 2026, lifecycle: 'active', stage: 1, requested: 900_000,
    problem: 'Raw-material storage limits batch size on the new resin grade.',
    outcome: 'Two 250 m³ stainless tanks with bunding and transfer pumps.',
    case: { npv: 640_000, irr: 16.5, payback: 60, annual: 190_000, estimate_class: 2, eac: 1_150_000, planned_isd: '2026-12-20', isd: '2027-01-31', expected_expense_pct: 4, asset_class: 'Plant & machinery — storage', life: 25,
      capex: { new_asset: true, extends_life: false, adds_capacity: true, like_for_like_repair: false } },
    gates: [{ seq: 0, decision: 'go', on: '2026-03-17', by: 'Luis Moreno', notes: 'AFE within plant-manager authority.' }],
    sanctions: [{ kind: 'afe', v: 1, amount: 920_000, on: '2026-03-17', by: 'Luis Moreno', body: 'plant_manager', note: 'AFE sanctioned at AFE sanction (commit) · capex test: capex', concur: true }],
    wbs: [
      { code: '1100', name: 'Tanks (supply)', weight: 0.55, rules: AUC('AUC-4200030') },
      { code: '1200', name: 'Bunding & civil', weight: 0.25, rules: AUC('AUC-4200030') },
      { code: '1300', name: 'Pumps, piping & tie-in', weight: 0.20, rules: AUC('AUC-4200030') },
    ],
    spend: { from: '2026-04-01', to: LAST_PERIOD, total: 780_000, open_commitment: 300_000 },
    assets: [{ number: 'AUC-4200030', description: 'Tank farm T-41/T-42 — under construction', cls: 'AuC', life: 25, value: 0, status: 'auc' }],
    pending: [{
      kind: 'supplementary_afe', amount: 1_150_000, on: '2026-10-09', body: 'bu_head',
      title: 'NW-CAP-0010 Tank farm expansion — supplementary AFE +$230k (revised total $1.15M)',
      proposal: { increment_amount: 230_000, prior_total_amount: 920_000, eac_amount: 1_150_000, over_afe_pct: 25, reason: 'Bund wall redesigned after the soil report; stainless price escalation of 14% on the tank order.' },
      concurrences: [],
    }],
  },
  {
    code: 'NW-CAP-0011', name: 'Steam turbine refurbishment', site: 'Northwind Rotterdam', sponsor: 'Luis Moreno', bucket: 'sustaining', category: 'major',
    fiscal_year: 2026, lifecycle: 'cancelled', stage: 1, requested: 3_200_000,
    problem: 'Turbine T-1 is due its 100,000-hour overhaul.',
    outcome: 'Overhaul of T-1 to original condition.',
    case: { npv: null, irr: null, payback: null, annual: null, estimate_class: 4, eac: null, planned_isd: null, isd: null, expected_expense_pct: 100, asset_class: 'Plant & machinery — steam', life: 0,
      capex: { new_asset: false, extends_life: false, adds_capacity: false, like_for_like_repair: true } },
    gates: [
      { seq: 0, decision: 'go', on: '2025-10-06', by: 'Luis Moreno' },
      { seq: 1, decision: 'kill', on: '2026-04-22', by: 'Luis Moreno', notes: 'Finance review in Select: the scope restores original condition — like-for-like overhaul, maintenance, expensed. Moved to the FY2026 maintenance plan; study spend expensed.' },
    ],
    sanctions: [{ kind: 'gate_budget', v: 1, amount: 120_000, on: '2025-10-06', by: 'Luis Moreno', body: 'plant_manager', note: 'FEL1 Appraise: study budget released' }],
    wbs: [{ code: '1100', name: 'Condition survey & overhaul scope', weight: 1, rules: [{ type: 'cost_centre', id: 'CC-RTM-MAINT', pct: 100 }] }],
    spend: { from: '2025-11-01', to: '2026-04-01', total: 95_000, open_commitment: 0 },
  },
];

const ALLOCATIONS = [
  { fy: 2026, bucket: 'growth', allocated: 6_000_000, reserve: 500_000, mandatory: false },
  { fy: 2026, bucket: 'sustaining', allocated: 30_000_000, reserve: 2_000_000, mandatory: false },
  { fy: 2026, bucket: 'hse_regulatory', allocated: 10_000_000, reserve: 500_000, mandatory: true },
  { fy: 2026, bucket: 'cost_reduction', allocated: 4_000_000, reserve: 300_000, mandatory: false },
  { fy: 2027, bucket: 'growth', allocated: 24_000_000, reserve: 2_000_000, mandatory: false },
  { fy: 2027, bucket: 'sustaining', allocated: 26_000_000, reserve: 2_000_000, mandatory: false },
  { fy: 2027, bucket: 'hse_regulatory', allocated: 9_000_000, reserve: 500_000, mandatory: true },
  { fy: 2027, bucket: 'cost_reduction', allocated: 5_000_000, reserve: 300_000, mandatory: false },
];

// ---- helpers ------------------------------------------------------------------

function months(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7));
  const ty = Number(to.slice(0, 4)), tm = Number(to.slice(5, 7));
  while (y < ty || (y === ty && m <= tm)) { out.push(`${y}-${String(m).padStart(2, '0')}-01`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
/** S-curve weights for n periods (sum 1). */
function sCurve(n: number): number[] {
  if (n <= 1) return [1];
  const w = Array.from({ length: n }, (_, i) => Math.sin(((i + 0.5) / n) * Math.PI) + 0.25);
  const t = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / t);
}
const r2 = (n: number) => Math.round(n * 100) / 100;

async function roleIds(sb: SupabaseClient): Promise<Map<string, string>> {
  const { data } = await sb.from('roles').select('id, name').like('role_type', 'capital_%');
  return new Map(((data ?? []) as Array<{ id: string; name: string }>).map((r) => [r.name, r.id]));
}

const ROLE_OF: Record<string, string> = { 'Luis Moreno': 'capital_sponsor', 'Helen Brooks': 'capital_committee_member', 'Omar Haddad': 'capital_portfolio_manager', 'Rachel Kim': 'capital_pm', 'Victor Nguyen': 'capital_finance' };

// ---- seed -----------------------------------------------------------------------

async function seedAllocations(sb: SupabaseClient) {
  const rows = ALLOCATIONS.map((a) => ({ project_type: 'capital', fiscal_year: a.fy, bucket: a.bucket, allocated_amount: a.allocated, reserve_amount: a.reserve, is_mandatory_lane: a.mandatory, status: 'approved' }));
  const { error } = await sb.from('portfolio_allocations').upsert(rows, { onConflict: 'project_type,fiscal_year,bucket' });
  if (error) throw new Error(`allocations: ${error.message}`);
  return rows.length;
}

async function seedProjects(sb: SupabaseClient) {
  const { data: tpls, error: tErr } = await sb.from('stage_templates').select('id, category, stages').eq('project_type', 'capital');
  if (tErr) throw new Error(`templates: ${tErr.message}`);
  type Tpl = { id: string; category: string; stages: Array<{ seq: number; gate_name: string; is_commit: boolean; exit_criteria?: string[] }> };
  const tplByCat = new Map((tpls ?? []).map((t) => [(t as Tpl).category, t as Tpl]));
  if (tplByCat.size === 0) throw new Error('no capital stage templates found — apply migration 0051 first');
  const roles = await roleIds(sb);
  const n = { projects: 0, wbs: 0, gates: 0, sanctions: 0, costs: 0, rules: 0, settlements: 0, assets: 0, decisions: 0 };

  for (const s of P) {
    const tpl = tplByCat.get(s.category)!;
    const afe = s.sanctions.filter((x) => x.kind === 'afe').reduce((a, b) => a + b.amount, 0);
    const supp = s.sanctions.filter((x) => x.kind === 'supplementary_afe').reduce((a, b) => a + b.amount, 0);
    const years = Array.from(new Set(s.sanctions.filter((x) => x.kind === 'afe').map(() => s.fiscal_year)));
    const row = {
      name: s.name, code: s.code, client: s.sponsor,
      contract_value_initial: 0, contract_value_current: 0,
      approved_budget_initial: afe, approved_budget_current: afe + supp, contingency: 0,
      segment: null, status: s.lifecycle === 'closed' || s.lifecycle === 'cancelled' ? 'Closed' : 'Active', current_week: 0,
      hard_deadline_description: s.bucket === 'hse_regulatory' && s.lifecycle !== 'closed' ? `Regulatory date — in service by ${s.case.isd}` : null,
      intake_json: { sponsor: s.sponsor, site: s.site, problem: s.problem, outcome: s.outcome },
      created_via: 'seed', created_by_role_type: 'capital_pm', source_system: 'SAP_PS',
      project_type: 'capital', project_category: s.category, portfolio_bucket: s.bucket, fiscal_year: s.fiscal_year,
      fiscal_years_approved: years, lifecycle_status: s.lifecycle, stage_template_id: tpl.id, current_stage: s.stage,
      business_case: {
        value_type: s.bucket === 'hse_regulatory' ? 'compliance' : s.bucket === 'cost_reduction' ? 'hard_savings' : s.bucket === 'sustaining' ? 'risk_reduction' : 'enablement',
        benefit_summary: s.outcome, annual_benefit: s.case.annual, payback_months: s.case.payback, benefits_owner: s.sponsor,
        is_mandatory: s.bucket === 'hse_regulatory', capex_share_pct: 100 - s.case.expected_expense_pct,
        site: s.site, asset_class: s.case.asset_class, useful_life_years: s.case.life || null,
        npv: s.case.npv, irr_pct: s.case.irr, estimate_class: s.case.estimate_class, eac: s.case.eac,
        planned_in_service_date: s.case.planned_isd, in_service_date: s.case.isd, expected_expense_pct: s.case.expected_expense_pct,
        capex_test: s.case.capex,
      },
      requested_budget: s.requested,
    };
    const { data: proj, error } = await sb.from('projects').upsert(row, { onConflict: 'code' }).select('id').maybeSingle();
    if (error || !proj) throw new Error(`${s.code}: ${error?.message ?? 'no id'}`);
    const pid = (proj as { id: string }).id;
    n.projects++;

    // WBS: a root plus the leaves, mirrored from SAP PS.
    const total = s.spend?.total ?? 0;
    const bac = Math.max(s.case.eac ?? 0, afe + supp, s.requested);
    if (s.wbs.length) {
      const wp = [{ project_id: pid, wbs_code: `${s.code}`, parent_wbs_code: null, name: s.name, budget_bac: bac, status: 'active', source_system: 'SAP_PS', external_id: `seed:${s.code}:wbs:root`, is_app_native: false },
        ...s.wbs.map((w) => ({ project_id: pid, wbs_code: `${s.code}-${w.code}`, parent_wbs_code: s.code, name: w.name, budget_bac: r2(bac * w.weight), status: 'active', source_system: 'SAP_PS', external_id: `seed:${s.code}:wbs:${w.code}`, is_app_native: false }))];
      const { error: wErr } = await sb.from('work_packages').upsert(wp, { onConflict: 'project_id,wbs_code' });
      if (wErr) throw new Error(`${s.code} wbs: ${wErr.message}`);
      n.wbs += wp.length;
    }

    // Gate history.
    for (const g of s.gates) {
      const st = tpl.stages.find((x) => x.seq === g.seq);
      const ext = `seed:${s.code}:gate:${g.seq}:${g.on}`;
      const { data: ex } = await sb.from('gate_decisions').select('id').eq('external_id', ext).maybeSingle();
      if (ex) continue;
      const { error: gErr } = await sb.from('gate_decisions').insert({
        project_id: pid, stage_seq: g.seq, gate_name: st?.gate_name ?? `Gate ${g.seq}`, decision: g.decision, decided_on: g.on,
        decided_by: g.by, decided_by_role_type: ROLE_OF[g.by] ?? 'capital_sponsor', notes: g.notes ?? null, source_system: 'APP', external_id: ext,
        criteria_scores: g.decision === 'go' ? { must_meet: (st?.exit_criteria ?? []).map((c) => ({ criterion: c, met: true })) } : null,
      });
      if (gErr) throw new Error(`${s.code} gate ${g.seq}: ${gErr.message}`);
      n.gates++;
    }

    // Sanctions, each with the approved decision record that authorised it.
    for (const x of s.sanctions) {
      const ext = `seed:${s.code}:${x.kind}:${x.v}`;
      const { data: ex } = await sb.from('sanction_events').select('id').eq('external_id', ext).maybeSingle();
      if (ex) continue;
      const kind = x.kind === 'afe' ? 'afe_approval' : x.kind === 'supplementary_afe' ? 'supplementary_afe' : 'gate_decision';
      const priorTotal = x.kind === 'supplementary_afe' ? afe + s.sanctions.filter((y) => y.kind === 'supplementary_afe' && y.v < x.v).reduce((a, b) => a + b.amount, 0) : 0;
      const recAmount = x.kind === 'supplementary_afe' ? priorTotal + x.amount : x.amount;
      const at = `${x.on}T15:00:00Z`;
      const proposedAt = new Date(new Date(at).getTime() - 9 * 86_400_000).toISOString();
      const { data: rec, error: rErr } = await sb.from('decision_records').insert({
        project_type: 'capital', decision_kind: kind, project_id: pid, fiscal_year: s.fiscal_year, amount: recAmount,
        title: `${s.code} ${s.name} — ${x.kind === 'afe' ? `AFE $${(x.amount / 1e6).toFixed(2)}M` : x.kind === 'supplementary_afe' ? `supplementary AFE +$${Math.round(x.amount / 1000)}k (revised total $${(recAmount / 1e6).toFixed(2)}M)` : `release $${Math.round(x.amount / 1000)}k study budget`}`,
        proposal: { seed_ref: ext, ...(x.kind === 'supplementary_afe' ? { increment_amount: x.amount, prior_total_amount: priorTotal } : {}) },
        proposed_by_role_id: roles.get('Rachel Kim') ?? null, proposed_by_name: 'Rachel Kim', proposed_at: proposedAt,
        required_body_key: x.body, required_concurrences: x.kind === 'gate_budget' ? [] : ['finance'],
        concurrences: x.concur ? [{ body_key: 'finance', outcome: 'concur', by_name: 'Victor Nguyen', by_role_id: roles.get('Victor Nguyen') ?? null, at: new Date(new Date(at).getTime() - 3 * 86_400_000).toISOString(), notes: 'Classification and settlement basis agreed.' }] : [],
        status: 'approved', decided_body_key: x.body, decided_by_role_id: roles.get(x.by) ?? null, decided_by_name: x.by, decided_at: at,
        attendees: x.attendees ?? [x.by], minutes: null,
      }).select('id').maybeSingle();
      if (rErr) throw new Error(`${s.code} decision ${ext}: ${rErr.message}`);
      const recId = (rec as { id: string } | null)?.id ?? null;
      const { data: se, error: sErr } = await sb.from('sanction_events').insert({
        project_id: pid, kind: x.kind, version: x.v, amount: x.amount, fiscal_year: Number(x.on.slice(0, 4)), authorised_by: x.by, authorised_by_body: x.body,
        authorised_on: x.on, notes: x.note, source_system: 'APP', external_id: ext, decision_record_id: recId,
      }).select('id').maybeSingle();
      if (sErr) throw new Error(`${s.code} sanction ${ext}: ${sErr.message}`);
      if (recId) await sb.from('decision_records').update({ resulting_sanction_event_id: (se as { id: string } | null)?.id ?? null }).eq('id', recId);
      n.sanctions++; n.decisions++;
    }

    // Monthly cost by WBS, settlement one period behind, capitalisation at handover.
    if (s.spend && s.wbs.length) {
      const per = months(s.spend.from, s.spend.to);
      const curve = sCurve(per.length);
      const last = per[per.length - 1];
      for (const w of s.wbs) {
        const wbsCode = `${s.code}-${w.code}`;
        const capShare = (w.rules ?? []).filter((r) => r.type !== 'cost_centre').reduce((a, r) => a + r.pct, 0) / 100;
        const expShare = (w.rules ?? []).filter((r) => r.type === 'cost_centre').reduce((a, r) => a + r.pct, 0) / 100;
        for (let i = 0; i < per.length; i++) {
          const period = per[i];
          const amount = r2(total * w.weight * curve[i]);
          const ext = `seed:${s.code}:cost:${w.code}:${period}`;
          const { data: ex } = await sb.from('cost_actuals').select('id').eq('external_id', ext).maybeSingle();
          if (!ex) {
            const { error: cErr } = await sb.from('cost_actuals').insert({
              project_id: pid, wbs_code: wbsCode, period, actual_cost: amount, commitment: period === last ? r2(s.spend.open_commitment * w.weight) : 0,
              source_system: 'SAP_PS', external_id: ext, synced_at: new Date().toISOString(),
            });
            if (cErr) throw new Error(`${s.code} cost ${wbsCode} ${period}: ${cErr.message}`);
            n.costs++;
          }
          // Settlement runs at period close for the PREVIOUS period, so the latest month is unsettled — and only
          // WBS elements with a rule settle at all. A rule that totals 90% leaves 10% on the WBS.
          const settle = w.rules && (period < last || (s.lifecycle === 'closed') || (s.spend.to < LAST_PERIOD));
          if (settle && (capShare > 0 || expShare > 0)) {
            const sext = `seed:${s.code}:settle:${w.code}:${period}`;
            const { data: sx } = await sb.from('capital_settlements').select('id').eq('external_id', sext).maybeSingle();
            if (!sx) {
              const { error: stErr } = await sb.from('capital_settlements').insert({
                project_id: pid, wbs_code: wbsCode, period, settled_to_auc: r2(amount * capShare), capitalised_to_fa: 0, expensed: r2(amount * expShare),
                source_system: 'SAP_PS', external_id: sext, synced_at: new Date().toISOString(),
              });
              if (stErr) throw new Error(`${s.code} settlement: ${stErr.message}`);
              n.settlements++;
            }
          }
        }
      }
      // Final settlement: AuC -> fixed asset, posted in the capitalisation month on the main capital WBS.
      if (s.capitalise_on) {
        const capWbs = s.wbs.filter((w) => (w.rules ?? []).some((r) => r.type !== 'cost_centre'));
        const aucTotal = capWbs.reduce((a, w) => a + total * w.weight * ((w.rules ?? []).filter((r) => r.type !== 'cost_centre').reduce((x, r) => x + r.pct, 0) / 100), 0);
        const sext = `seed:${s.code}:capitalise:${s.capitalise_on}`;
        const { data: sx } = await sb.from('capital_settlements').select('id').eq('external_id', sext).maybeSingle();
        if (!sx) {
          await sb.from('capital_settlements').insert({ project_id: pid, wbs_code: `${s.code}-${capWbs[0].code}`, period: s.capitalise_on, settled_to_auc: 0, capitalised_to_fa: r2(aucTotal), expensed: 0, source_system: 'SAP_PS', external_id: sext, synced_at: new Date().toISOString() });
          n.settlements++;
        }
      }
    }

    // Settlement rules (mirrored from SAP PS).
    for (const w of s.wbs) {
      for (const [i, r] of (w.rules ?? []).entries()) {
        const ext = `seed:${s.code}:rule:${w.code}:${i}`;
        const { data: ex } = await sb.from('capital_settlement_rules').select('id').eq('external_id', ext).maybeSingle();
        if (ex) continue;
        const { error: rErr } = await sb.from('capital_settlement_rules').insert({ project_id: pid, wbs_code: `${s.code}-${w.code}`, receiver_type: r.type, receiver_id: r.id, percent: r.pct, valid_from: s.spend?.from ?? null, source_system: 'SAP_PS', external_id: ext, synced_at: new Date().toISOString() });
        if (rErr) throw new Error(`${s.code} rule: ${rErr.message}`);
        n.rules++;
      }
    }

    // Fixed assets (from the asset register).
    for (const a of s.assets ?? []) {
      const { error: aErr } = await sb.from('capital_assets').upsert({
        project_id: pid, asset_number: a.number, description: a.description, asset_class: a.cls, useful_life_years: a.life,
        acquisition_value: a.value, capitalisation_date: a.capitalised_on ?? null, status: a.status, source_system: 'SAP_PS', external_id: `seed:${s.code}:asset:${a.number}`, synced_at: new Date().toISOString(),
      }, { onConflict: 'project_id,asset_number' });
      if (aErr) throw new Error(`${s.code} asset: ${aErr.message}`);
      n.assets++;
    }

    // Open decisions — the inbox for the committee, Finance and the plant manager.
    for (const d of s.pending ?? []) {
      const ref = `seed:${s.code}:pending:${d.kind}`;
      const { data: ex } = await sb.from('decision_records').select('id').contains('proposal', { seed_ref: ref }).maybeSingle();
      if (ex) continue;
      const { error: pErr } = await sb.from('decision_records').insert({
        project_type: 'capital', decision_kind: d.kind, project_id: pid, fiscal_year: s.fiscal_year, amount: d.amount, title: d.title,
        proposal: { seed_ref: ref, ...d.proposal }, proposed_by_role_id: roles.get('Rachel Kim') ?? null, proposed_by_name: 'Rachel Kim', proposed_at: `${d.on}T10:00:00Z`,
        required_body_key: d.body, required_concurrences: d.kind === 'gate_decision' ? [] : ['finance'], concurrences: [], status: 'proposed',
      });
      if (pErr) throw new Error(`${s.code} pending: ${pErr.message}`);
      n.decisions++;
    }
  }
  return n;
}

async function main() {
  const sb = getServiceClient();
  section('Capital workspace seed');
  const allocs = await seedAllocations(sb);
  log.success(`capital plan allocations: ${allocs} rows (FY2026 + FY2027 across four categories)`);
  const r = await seedProjects(sb);
  log.success(`projects: ${r.projects}`);
  log.success(`WBS elements: ${r.wbs} · gate decisions: ${r.gates} new · sanctions: ${r.sanctions} new`);
  log.success(`cost rows: ${r.costs} new · settlement rules: ${r.rules} new · settlement postings: ${r.settlements} new · assets: ${r.assets}`);
  log.success(`decision records: ${r.decisions} new`);
  section('Done');
  log.info(`As of ${TODAY}. Sign in as o.haddad (Capital Portfolio Manager), r.kim (Capital PM), l.moreno (Plant Manager), h.brooks (Capital Committee) or v.nguyen (Finance) after \`pnpm seed:users\`.`);
  log.info('NW-CAP-0001 breaks AFE tolerance, NW-CAP-0002 is settlement-blocked, NW-CAP-0010 routes its supplementary to the BU head on the revised total.');
}

main().catch((e) => {
  log.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
