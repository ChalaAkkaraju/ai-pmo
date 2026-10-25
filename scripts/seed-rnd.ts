/**
 * R&D / NPI workspace seed — bucket allocations, twelve programmes across the
 * three stage templates, gate history, gate budgets, versioned business cases
 * and posted spend, so the workspace has something real to reason about.
 *
 * The population is chosen to make the R&D-specific measures visible:
 *   • NW-RD-0003 is an EARLY KILL — stopped at the first gate, cheap, exactly
 *     what the screens exist to do. A pipeline with none of these is not
 *     screening, so the seed must contain one.
 *   • NW-RD-0004 is a LATE KILL — stopped after commit with most of the money
 *     spent. The contrast is the point: same decision, very different cost.
 *   • NW-RD-0001 carries three case versions with adverse drift since commit —
 *     the Business Case Reconciler's worked example.
 *   • NW-RD-0010 has slipped its launch date twice while staying inside its
 *     gate budget: on cost it looks fine, on cycle time it does not.
 *   • NW-RD-0009 is platform research with no NPV at all, so the pipeline
 *     ranking has to handle a case that cannot be scored on ECV.
 *
 * Idempotent: projects upsert on code; allocations on (type, fy, bucket);
 * gate decisions, sanction events, case versions and cost rows are keyed on
 * external_id and created only when missing.
 *
 * Run with:  pnpm seed:rnd     (after migration 0050 is applied)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './lib/supabase-admin';
import { log, section } from './lib/log';

const FY_NOW = 2026;
const FY_NEXT = 2027;

type Cat = 'new_product' | 'derivative' | 'platform_research';
type Bucket = 'new_products' | 'platform' | 'sustaining' | 'regulatory';
type Life = 'proposed' | 'approved' | 'deferred' | 'active' | 'on_hold' | 'cancelled' | 'closed' | 'terminated';

type CaseV = {
  v: number; gate: number | null; on: string; by: string;
  npv: number | null; irr?: number | null; payback?: number | null;
  peak: number | null; launch: string | null;
  dev: number | null; launch_cost?: number | null;
  pts: number | null; pcs: number | null;
  current?: boolean; note?: string;
};

interface Seed {
  code: string; name: string; sponsor: string; category: Cat; bucket: Bucket;
  fiscal_year: number; requested: number; lifecycle: Life; stage: number;
  approved_years: number[]; owner: string; problem?: string; outcome?: string; deadline?: string;
  history?: Array<{ seq: number; decision: 'go' | 'hold' | 'kill' | 'recycle' | 'defer'; on: string; by: string; notes?: string; hold_until?: string }>;
  /** Budget released at a gate — sanction_events.kind = 'gate_budget'. */
  budgets?: Array<{ v: number; amount: number; on: string; by: string; note: string }>;
  cases?: CaseV[];
  /** Monthly posted spend: [YYYY-MM-DD, amount]. */
  spend?: Array<[string, number]>;
}

const P: Seed[] = [
  // ---------------------------------------------------------------- new products
  {
    code: 'NW-RD-0001', name: 'Next-generation flow sensor platform', sponsor: 'VP Product — Measurement',
    category: 'new_product', bucket: 'new_products', fiscal_year: FY_NEXT, requested: 4_200_000,
    lifecycle: 'active', stage: 3, approved_years: [FY_NOW], owner: 'VP Product — Measurement',
    problem: 'The current sensor line cannot meet the accuracy class two major customers now specify, and the platform is at the end of its component roadmap.',
    outcome: 'A new measurement platform at the higher accuracy class, with a component roadmap good for ten years.',
    history: [
      { seq: 0, decision: 'go', on: '2025-03-12', by: 'Yuki Tanaka', notes: 'Idea screen passed. Unmet need evidenced by two lost tenders.' },
      { seq: 1, decision: 'go', on: '2025-06-18', by: 'Yuki Tanaka', notes: 'Preliminary assessment: technically hard, commercially clear.' },
      { seq: 2, decision: 'go', on: '2025-11-05', by: 'Yuki Tanaka', notes: 'COMMIT. Feasibility demonstrated on the bench prototype at 0.2% accuracy. Finance concurred on the capitalisation basis; development cost capitalises from this date.' },
    ],
    budgets: [
      { v: 1, amount: 180_000, on: '2025-03-12', by: 'Gate board', note: 'Scoping allowance released at Gate 1.' },
      { v: 2, amount: 640_000, on: '2025-06-18', by: 'Gate board', note: 'Case-building and prototype budget released at Gate 2.' },
      { v: 3, amount: 3_400_000, on: '2025-11-05', by: 'Gate board', note: 'Development budget released at Gate 3 (commit).' },
    ],
    cases: [
      { v: 1, gate: null, on: '2025-02-20', by: 'Tomas Ferreira', npv: 9_400_000, peak: 6_100_000, launch: '2027-04-01', dev: 3_000_000, launch_cost: 700_000, pts: 55, pcs: 70, note: 'Original case, written before any gate.' },
      { v: 2, gate: 2, on: '2025-11-05', by: 'Tomas Ferreira', npv: 8_800_000, peak: 5_800_000, launch: '2027-06-30', dev: 3_400_000, launch_cost: 750_000, pts: 80, pcs: 70, note: 'Re-underwritten at the commit gate. Feasibility proven, so technical probability up; cost and date both moved out.' },
      { v: 3, gate: 4, on: '2026-08-14', by: 'Tomas Ferreira', npv: 6_200_000, peak: 4_400_000, launch: '2028-01-31', dev: 4_600_000, launch_cost: 900_000, pts: 85, pcs: 55, current: true, note: 'A competitor launched at the same accuracy class in May, and the ASIC redesign added seven months. Commercial probability cut; development cost up 35% on the commit case.' },
    ],
    spend: [['2025-04-30', 62_000], ['2025-07-31', 210_000], ['2025-10-31', 340_000], ['2026-01-31', 610_000], ['2026-04-30', 880_000], ['2026-07-31', 1_020_000]],
  },
  {
    code: 'NW-RD-0002', name: 'Hydrogen-ready burner head', sponsor: 'VP Product — Combustion',
    category: 'new_product', bucket: 'new_products', fiscal_year: FY_NEXT, requested: 2_800_000,
    lifecycle: 'approved', stage: 2, approved_years: [], owner: 'VP Product — Combustion',
    problem: 'Customers converting to hydrogen blends have no compliant burner head in our range; every enquiry currently goes to a competitor.',
    outcome: 'A burner head certified for 100% hydrogen and for blends, on the existing body casting.',
    history: [
      { seq: 0, decision: 'go', on: '2026-01-22', by: 'Yuki Tanaka', notes: 'Idea screen passed; regulatory tailwind is clear.' },
      { seq: 1, decision: 'go', on: '2026-05-14', by: 'Yuki Tanaka', notes: 'Second screen passed. Case-building budget released; commit gate expected Q4.' },
    ],
    budgets: [
      { v: 1, amount: 120_000, on: '2026-01-22', by: 'Gate board', note: 'Scoping allowance released at Gate 1.' },
      { v: 2, amount: 480_000, on: '2026-05-14', by: 'Gate board', note: 'Case-building and rig-test budget released at Gate 2.' },
    ],
    cases: [
      { v: 1, gate: null, on: '2026-01-10', by: 'Tomas Ferreira', npv: 5_600_000, peak: 3_900_000, launch: '2028-03-31', dev: 2_300_000, launch_cost: 500_000, pts: 60, pcs: 75, current: true, note: 'Case built for the Gate 2 screen; to be re-underwritten at commit.' },
    ],
    spend: [['2026-02-28', 38_000], ['2026-05-31', 96_000], ['2026-08-31', 171_000]],
  },
  {
    code: 'NW-RD-0004', name: 'Solid-state pressure transducer', sponsor: 'VP Product — Measurement',
    category: 'new_product', bucket: 'new_products', fiscal_year: FY_NOW, requested: 3_100_000,
    lifecycle: 'terminated', stage: 3, approved_years: [FY_NOW], owner: 'VP Product — Measurement',
    problem: 'A solid-state replacement for the mechanical transducer line, targeting lower unit cost at equal accuracy.',
    outcome: 'Stopped at Gate 4. The accuracy target proved unreachable with the chosen die at any viable cost.',
    history: [
      { seq: 0, decision: 'go', on: '2024-09-10', by: 'Yuki Tanaka' },
      { seq: 1, decision: 'go', on: '2025-01-28', by: 'Yuki Tanaka' },
      { seq: 2, decision: 'go', on: '2025-05-20', by: 'Yuki Tanaka', notes: 'COMMIT. Feasibility argued from simulation rather than a built part — noted as a condition at the time.' },
      { seq: 3, decision: 'kill', on: '2026-06-11', by: 'Nina Kowalski', notes: 'KILLED at Gate 4. Three die revisions failed to hold accuracy over temperature; the fourth would need a new foundry process and 14 months. Capitalised development cost written off, Finance concurring. The condition raised at commit — feasibility from simulation, not a built part — is the lesson.' },
    ],
    budgets: [
      { v: 1, amount: 150_000, on: '2024-09-10', by: 'Gate board', note: 'Scoping allowance released at Gate 1.' },
      { v: 2, amount: 520_000, on: '2025-01-28', by: 'Gate board', note: 'Case-building budget released at Gate 2.' },
      { v: 3, amount: 2_400_000, on: '2025-05-20', by: 'Gate board', note: 'Development budget released at Gate 3 (commit).' },
    ],
    cases: [
      { v: 1, gate: null, on: '2024-08-15', by: 'Tomas Ferreira', npv: 6_800_000, peak: 4_200_000, launch: '2026-09-30', dev: 2_200_000, launch_cost: 450_000, pts: 50, pcs: 80 },
      { v: 2, gate: 2, on: '2025-05-20', by: 'Tomas Ferreira', npv: 6_400_000, peak: 4_000_000, launch: '2027-01-31', dev: 2_400_000, launch_cost: 480_000, pts: 70, pcs: 80, current: true, note: 'Commit case. Never re-underwritten: the programme was killed before Gate 4 produced a new version — itself a finding.' },
    ],
    spend: [['2024-10-31', 48_000], ['2025-01-31', 119_000], ['2025-04-30', 260_000], ['2025-07-31', 520_000], ['2025-10-31', 690_000], ['2026-01-31', 820_000], ['2026-04-30', 610_000]],
  },
  {
    code: 'NW-RD-0008', name: 'Edge analytics module', sponsor: 'VP Product — Digital',
    category: 'new_product', bucket: 'new_products', fiscal_year: FY_NEXT, requested: 1_900_000,
    lifecycle: 'proposed', stage: 0, approved_years: [], owner: 'VP Product — Digital',
    problem: 'Customers want anomaly detection at the asset rather than in our cloud; latency and data-residency rules block the current architecture.',
    outcome: 'An on-device analytics module that runs the existing models at the edge.',
    cases: [{ v: 1, gate: null, on: '2026-08-30', by: 'Tomas Ferreira', npv: 4_100_000, peak: 2_600_000, launch: '2028-09-30', dev: 1_700_000, launch_cost: 350_000, pts: 65, pcs: 60, current: true, note: 'Idea-screen case; nothing validated yet.' }],
  },
  {
    code: 'NW-RD-0010', name: 'Wireless mesh instrumentation', sponsor: 'VP Product — Measurement',
    category: 'new_product', bucket: 'new_products', fiscal_year: FY_NEXT, requested: 3_600_000,
    lifecycle: 'active', stage: 4, approved_years: [FY_NOW, FY_NEXT], owner: 'VP Product — Measurement',
    problem: 'Wired instrumentation dominates retrofit cost on brownfield sites; a mesh option opens a market we cannot currently quote.',
    outcome: 'A certified wireless mesh instrument family for retrofit applications.',
    history: [
      { seq: 0, decision: 'go', on: '2024-11-14', by: 'Yuki Tanaka' },
      { seq: 1, decision: 'go', on: '2025-02-25', by: 'Yuki Tanaka' },
      { seq: 2, decision: 'go', on: '2025-08-19', by: 'Yuki Tanaka', notes: 'COMMIT. Mesh stack proven on a 40-node pilot.' },
      { seq: 3, decision: 'go', on: '2026-05-28', by: 'Yuki Tanaka', notes: 'Go to testing. Inside budget; eleven weeks late against the stage benchmark, driven by the radio certification queue.' },
    ],
    budgets: [
      { v: 1, amount: 140_000, on: '2024-11-14', by: 'Gate board', note: 'Scoping allowance released at Gate 1.' },
      { v: 2, amount: 560_000, on: '2025-02-25', by: 'Gate board', note: 'Case-building budget released at Gate 2.' },
      { v: 3, amount: 2_300_000, on: '2025-08-19', by: 'Gate board', note: 'Development budget released at Gate 3 (commit).' },
      { v: 4, amount: 900_000, on: '2026-05-28', by: 'Gate board', note: 'Test and validation budget released at Gate 4.' },
    ],
    cases: [
      { v: 1, gate: null, on: '2024-10-20', by: 'Tomas Ferreira', npv: 7_200_000, peak: 4_800_000, launch: '2026-11-30', dev: 2_600_000, launch_cost: 620_000, pts: 60, pcs: 75 },
      { v: 2, gate: 2, on: '2025-08-19', by: 'Tomas Ferreira', npv: 7_000_000, peak: 4_700_000, launch: '2027-03-31', dev: 2_900_000, launch_cost: 640_000, pts: 82, pcs: 75, note: 'Commit case.' },
      { v: 3, gate: 3, on: '2026-05-28', by: 'Tomas Ferreira', npv: 6_600_000, peak: 4_600_000, launch: '2027-09-30', dev: 3_050_000, launch_cost: 660_000, pts: 90, pcs: 72, current: true, note: 'Cost essentially held; the launch date has now moved ten months from the original case. Certification queue, not engineering.' },
    ],
    spend: [['2025-01-31', 52_000], ['2025-04-30', 128_000], ['2025-10-31', 430_000], ['2026-01-31', 760_000], ['2026-04-30', 820_000], ['2026-07-31', 390_000]],
  },
  {
    code: 'NW-RD-0012', name: 'Digital twin calibration engine', sponsor: 'VP Product — Digital',
    category: 'new_product', bucket: 'new_products', fiscal_year: FY_NEXT, requested: 2_400_000,
    lifecycle: 'proposed', stage: 0, approved_years: [], owner: 'VP Product — Digital',
    problem: 'Field calibration is a truck roll; a model-based calibration would remove most visits.',
    outcome: 'A calibration engine that keeps instruments in specification from process data alone.',
    cases: [{ v: 1, gate: null, on: '2026-09-02', by: 'Tomas Ferreira', npv: 5_300_000, peak: 3_100_000, launch: '2029-01-31', dev: 2_100_000, launch_cost: 400_000, pts: 45, pcs: 65, current: true, note: 'Ambitious technically; the commercial side is the stronger half of this case.' }],
  },

  // ------------------------------------------------------------------- platform
  {
    code: 'NW-RD-0003', name: 'Membrane fouling inhibitor', sponsor: 'Director — Materials Research',
    category: 'platform_research', bucket: 'platform', fiscal_year: FY_NOW, requested: 260_000,
    lifecycle: 'terminated', stage: 0, approved_years: [FY_NOW], owner: 'Director — Materials Research',
    problem: 'Membrane fouling drives the service interval on the water treatment line; an inhibitor coating could double it.',
    outcome: 'Stopped at the feasibility screen. The hypothesis was disproven cleanly and cheaply — a valid result.',
    history: [
      { seq: 0, decision: 'kill', on: '2026-04-09', by: 'Yuki Tanaka', notes: 'KILLED at Gate A, inside the agreed spend ceiling. Bench work showed the inhibitor degrades at operating pH within six weeks; no formulation route stays stable. Kill criteria had been agreed in advance and were met exactly. Findings written up and shelved; the degradation data is reusable.' },
    ],
    budgets: [{ v: 1, amount: 260_000, on: '2025-12-04', by: 'Gate board', note: 'Explore allowance released with a spend ceiling and pre-agreed kill criteria.' }],
    cases: [{ v: 1, gate: null, on: '2025-11-28', by: 'Tomas Ferreira', npv: null, peak: null, launch: null, dev: 260_000, launch_cost: null, pts: 35, pcs: null, current: true, note: 'Research case: no NPV by construction. Judged on feasibility and knowledge, with a stated spend ceiling.' }],
    spend: [['2026-01-31', 74_000], ['2026-03-31', 98_000]],
  },
  {
    code: 'NW-RD-0009', name: 'Advanced catalyst coating', sponsor: 'Director — Materials Research',
    category: 'platform_research', bucket: 'platform', fiscal_year: FY_NEXT, requested: 740_000,
    lifecycle: 'active', stage: 1, approved_years: [FY_NOW], owner: 'Director — Materials Research',
    problem: 'A coating that holds catalytic activity at lower temperature would open three product routes at once.',
    outcome: 'Feasibility established or disproven at the agreed confidence, with the receiving programme named.',
    history: [{ seq: 0, decision: 'go', on: '2026-02-19', by: 'Yuki Tanaka', notes: 'Feasibility screen passed; hypothesis is testable and the IP position is clear.' }],
    budgets: [
      { v: 1, amount: 180_000, on: '2025-11-20', by: 'Gate board', note: 'Explore allowance released.' },
      { v: 2, amount: 560_000, on: '2026-02-19', by: 'Gate board', note: 'Investigate budget released at Gate A.' },
    ],
    cases: [{ v: 1, gate: 0, on: '2026-02-19', by: 'Tomas Ferreira', npv: null, peak: null, launch: null, dev: 740_000, launch_cost: null, pts: 50, pcs: null, current: true, note: 'No NPV: three possible product routes, none committed. Ranked on strategic fit, not ECV.' }],
    spend: [['2026-03-31', 61_000], ['2026-06-30', 148_000], ['2026-08-31', 122_000]],
  },

  // ------------------------------------------------------ sustaining / derivative
  {
    code: 'NW-RD-0006', name: 'Compact actuator line extension', sponsor: 'VP Product — Control',
    category: 'derivative', bucket: 'sustaining', fiscal_year: FY_NEXT, requested: 1_150_000,
    lifecycle: 'active', stage: 2, approved_years: [FY_NOW], owner: 'VP Product — Control',
    problem: 'The actuator range stops one size short of a segment three distributors keep asking for.',
    outcome: 'A compact variant on the existing platform, sharing the control board.',
    history: [
      { seq: 0, decision: 'go', on: '2026-01-15', by: 'Yuki Tanaka', notes: 'Screen passed; demand evidenced by distributor forecasts.' },
      { seq: 1, decision: 'go', on: '2026-04-30', by: 'Yuki Tanaka', notes: 'COMMIT. Design delta agreed; 70% carry-over from the parent platform. Finance concurred on capitalisation.' },
    ],
    budgets: [
      { v: 1, amount: 90_000, on: '2026-01-15', by: 'Gate board', note: 'Scoping allowance released at Gate 1.' },
      { v: 2, amount: 980_000, on: '2026-04-30', by: 'Gate board', note: 'Development budget released at Gate 2 (commit).' },
    ],
    cases: [
      { v: 1, gate: 1, on: '2026-04-30', by: 'Tomas Ferreira', npv: 2_400_000, peak: 1_500_000, launch: '2027-07-31', dev: 980_000, launch_cost: 180_000, pts: 88, pcs: 80, current: true, note: 'Built on incremental volume net of cannibalisation of the parent size, not total volume.' },
    ],
    spend: [['2026-05-31', 118_000], ['2026-08-31', 246_000]],
  },
  {
    code: 'NW-RD-0011', name: 'Valve body casting cost-down', sponsor: 'VP Operations',
    category: 'derivative', bucket: 'sustaining', fiscal_year: FY_NOW, requested: 620_000,
    lifecycle: 'closed', stage: 3, approved_years: [FY_NOW], owner: 'VP Operations',
    problem: 'The valve body is machined from billet; a cast blank would remove most of the machining time.',
    outcome: 'Launched. Unit cost down 19%, slightly ahead of the case.',
    history: [
      { seq: 0, decision: 'go', on: '2025-06-03', by: 'Yuki Tanaka' },
      { seq: 1, decision: 'go', on: '2025-09-17', by: 'Yuki Tanaka', notes: 'COMMIT. Foundry qualified; first articles passed.' },
      { seq: 2, decision: 'go', on: '2026-03-25', by: 'Yuki Tanaka', notes: 'Go to launch. Validation complete across all three sizes.' },
      { seq: 3, decision: 'go', on: '2026-07-10', by: 'Ingrid Halvorsen', notes: 'Post-launch review. Realised unit cost saving 19% against 17% in the case; capitalised cost settled and amortisation started.' },
    ],
    budgets: [
      { v: 1, amount: 60_000, on: '2025-06-03', by: 'Gate board', note: 'Scoping allowance released at Gate 1.' },
      { v: 2, amount: 520_000, on: '2025-09-17', by: 'Gate board', note: 'Development budget released at Gate 2 (commit).' },
    ],
    cases: [
      { v: 1, gate: 1, on: '2025-09-17', by: 'Tomas Ferreira', npv: 1_900_000, peak: 1_100_000, launch: '2026-06-30', dev: 520_000, launch_cost: 90_000, pts: 90, pcs: 92, note: 'Commit case.' },
      { v: 2, gate: 2, on: '2026-03-25', by: 'Tomas Ferreira', npv: 2_050_000, peak: 1_180_000, launch: '2026-06-30', dev: 505_000, launch_cost: 88_000, pts: 96, pcs: 94, current: true, note: 'Re-underwritten at Gate 3: saving came in slightly better than cased and development landed under budget.' },
    ],
    spend: [['2025-07-31', 41_000], ['2025-10-31', 155_000], ['2026-01-31', 214_000], ['2026-04-30', 92_000]],
  },

  // ------------------------------------------------------------------ regulatory
  {
    code: 'NW-RD-0005', name: 'Controller firmware cyber-hardening', sponsor: 'VP Product — Control',
    category: 'derivative', bucket: 'regulatory', fiscal_year: FY_NEXT, requested: 1_450_000,
    lifecycle: 'active', stage: 2, approved_years: [FY_NOW], owner: 'VP Product — Control',
    deadline: 'IEC 62443 conformance required on all shipped controllers from 1 October 2027',
    problem: 'The installed controller firmware cannot meet the security level customers will be required to specify from October 2027.',
    outcome: 'Hardened firmware across the controller range, certified to the required security level.',
    history: [
      { seq: 0, decision: 'go', on: '2025-10-08', by: 'Yuki Tanaka', notes: 'Screen passed. Mandatory lane: judged on cost-to-comply and deadline, not on ECV.' },
      { seq: 1, decision: 'go', on: '2026-02-11', by: 'Yuki Tanaka', notes: 'COMMIT. Secure-boot approach proven on the current silicon.' },
    ],
    budgets: [
      { v: 1, amount: 110_000, on: '2025-10-08', by: 'Gate board', note: 'Scoping allowance released at Gate 1.' },
      { v: 2, amount: 1_260_000, on: '2026-02-11', by: 'Gate board', note: 'Development budget released at Gate 2 (commit).' },
    ],
    cases: [{ v: 1, gate: 1, on: '2026-02-11', by: 'Tomas Ferreira', npv: null, peak: null, launch: '2027-08-31', dev: 1_260_000, launch_cost: 140_000, pts: 85, pcs: null, current: true, note: 'Mandatory: no NPV claimed. The case is the cost of compliance against the cost of not shipping.' }],
    spend: [['2026-03-31', 186_000], ['2026-06-30', 342_000], ['2026-08-31', 291_000]],
  },
  {
    code: 'NW-RD-0007', name: 'Low-GWP refrigerant compatibility', sponsor: 'VP Product — Thermal',
    category: 'derivative', bucket: 'regulatory', fiscal_year: FY_NEXT, requested: 980_000,
    lifecycle: 'proposed', stage: 0, approved_years: [], owner: 'VP Product — Thermal',
    deadline: 'Refrigerant phase-down step effective 1 January 2029',
    problem: 'Seal and sensor materials in the thermal range are not qualified for the refrigerants replacing the current ones.',
    outcome: 'The thermal range qualified on the replacement refrigerants before the phase-down step.',
    cases: [{ v: 1, gate: null, on: '2026-08-21', by: 'Tomas Ferreira', npv: null, peak: null, launch: '2028-06-30', dev: 900_000, launch_cost: 80_000, pts: 80, pcs: null, current: true, note: 'Mandatory lane. Early submission: the qualification test campaign is the long pole, not the engineering.' }],
  },
];

const ALLOCATIONS: Array<{ fy: number; bucket: Bucket; allocated: number; reserve: number; mandatory: boolean }> = [
  { fy: FY_NOW, bucket: 'new_products', allocated: 9_000_000, reserve: 900_000, mandatory: false },
  { fy: FY_NOW, bucket: 'platform', allocated: 2_400_000, reserve: 300_000, mandatory: false },
  { fy: FY_NOW, bucket: 'sustaining', allocated: 2_000_000, reserve: 200_000, mandatory: false },
  { fy: FY_NOW, bucket: 'regulatory', allocated: 2_200_000, reserve: 250_000, mandatory: true },
  { fy: FY_NEXT, bucket: 'new_products', allocated: 10_500_000, reserve: 1_000_000, mandatory: false },
  { fy: FY_NEXT, bucket: 'platform', allocated: 2_800_000, reserve: 350_000, mandatory: false },
  { fy: FY_NEXT, bucket: 'sustaining', allocated: 2_200_000, reserve: 220_000, mandatory: false },
  { fy: FY_NEXT, bucket: 'regulatory', allocated: 2_600_000, reserve: 300_000, mandatory: true },
];

async function seedAllocations(sb: SupabaseClient) {
  const rows = ALLOCATIONS.map((a) => ({
    project_type: 'rnd', fiscal_year: a.fy, bucket: a.bucket,
    allocated_amount: a.allocated, reserve_amount: a.reserve, is_mandatory_lane: a.mandatory,
  }));
  const { error } = await sb.from('portfolio_allocations').upsert(rows, { onConflict: 'project_type,fiscal_year,bucket' });
  if (error) throw new Error(`allocations: ${error.message}`);
  return rows.length;
}

type Tpl = { id: string; category: string; stages: Array<{ seq: number; gate_name: string; is_commit: boolean; exit_criteria?: string[] }> };

function roleOf(name: string): string {
  if (name === 'Yuki Tanaka') return 'rnd_gatekeeper';
  if (name === 'Ingrid Halvorsen') return 'rnd_portfolio_manager';
  if (name === 'Nina Kowalski') return 'rnd_board_member';
  return 'rnd_pm';
}

async function seedProjects(sb: SupabaseClient) {
  const { data: tpls, error: tErr } = await sb.from('stage_templates').select('id, category, stages').eq('project_type', 'rnd');
  if (tErr) throw new Error(`templates: ${tErr.message}`);
  const tplByCat = new Map((tpls ?? []).map((t) => [(t as Tpl).category, t as Tpl]));
  if (tplByCat.size === 0) throw new Error('no rnd stage templates found — apply migration 0050 first');

  let upserted = 0, decisions = 0, events = 0, cases = 0, costRows = 0;

  for (const s of P) {
    const tpl = tplByCat.get(s.category);
    if (!tpl) throw new Error(`no template for ${s.category}`);
    const commit = tpl.stages.find((x) => x.is_commit) ?? null;
    const current = s.cases?.find((c) => c.current) ?? s.cases?.[(s.cases?.length ?? 1) - 1] ?? null;
    // The committed budget is whatever the commit gate released, if it has been passed.
    const commitOn = commit ? (s.history ?? []).find((h) => h.seq === commit.seq && h.decision === 'go')?.on ?? null : null;
    const committedBudget = commitOn ? (s.budgets ?? []).filter((b) => b.on === commitOn).reduce((a, b) => a + b.amount, 0) : 0;

    const row = {
      name: s.name, code: s.code, client: s.sponsor,
      contract_value_initial: 0, contract_value_current: 0,
      approved_budget_initial: committedBudget, approved_budget_current: committedBudget, contingency: 0,
      segment: null,
      status: s.lifecycle === 'closed' || s.lifecycle === 'cancelled' || s.lifecycle === 'terminated' ? 'Closed' : 'Active',
      current_week: 0,
      hard_deadline_description: s.deadline ?? null,
      intake_json: { sponsor: s.sponsor, problem: s.problem ?? null, outcome: s.outcome ?? null },
      created_via: 'seed', created_by_role_type: 'rnd_portfolio_manager', source_system: 'APP',
      project_type: 'rnd', project_category: s.category, portfolio_bucket: s.bucket, fiscal_year: s.fiscal_year,
      fiscal_years_approved: s.approved_years, lifecycle_status: s.lifecycle,
      stage_template_id: tpl.id, current_stage: s.stage,
      // The single business_case field carries a summary so cross-type and
      // portfolio views that read it keep working; the versioned truth lives
      // in business_case_versions and is what the R&D pages read.
      business_case: {
        value_type: s.bucket === 'regulatory' ? 'compliance' : s.bucket === 'sustaining' ? 'hard_savings' : 'soft_benefit',
        benefit_summary: s.outcome ?? s.name,
        annual_benefit: current?.peak ?? null,
        strategic_score: null,
        benefits_owner: s.owner,
        is_mandatory: s.bucket === 'regulatory',
      },
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
      if (exists) {
        await sb.from('gate_decisions').update({ notes: h.notes ?? null, hold_until: h.hold_until ?? null }).eq('id', (exists as { id: string }).id);
        continue;
      }
      const snap = (s.cases ?? []).filter((c) => c.gate !== null && (c.gate as number) <= h.seq).slice(-1)[0] ?? null;
      const { error: gErr } = await sb.from('gate_decisions').insert({
        project_id: pid, stage_seq: h.seq, gate_name: stage?.gate_name ?? `Gate ${h.seq}`,
        decision: h.decision, decided_on: h.on, decided_by: h.by, decided_by_role_type: roleOf(h.by),
        notes: h.notes ?? null, source_system: 'APP', external_id: ext, hold_until: h.hold_until ?? null,
        criteria_scores: h.decision === 'go' ? { must_meet: (stage?.exit_criteria ?? []).map((c) => ({ criterion: c, met: true })) } : null,
        case_snapshot: snap ? { npv: snap.npv, peak_annual_sales: snap.peak, development_cost_estimate: snap.dev, launch_date: snap.launch } : null,
      });
      if (gErr) throw new Error(`${s.code} gate ${h.seq}: ${gErr.message}`);
      decisions++;
    }

    for (const b of s.budgets ?? []) {
      const ext = `seed:${s.code}:gate_budget:${b.v}`;
      const { data: ex } = await sb.from('sanction_events').select('id').eq('external_id', ext).maybeSingle();
      if (ex) continue;
      const { error: sErr } = await sb.from('sanction_events').insert({
        project_id: pid, kind: 'gate_budget', version: b.v, amount: b.amount,
        fiscal_year: Number(b.on.slice(0, 4)), authorised_by: b.by, authorised_on: b.on,
        notes: b.note, source_system: 'APP', external_id: ext,
      });
      if (sErr) throw new Error(`${s.code} gate budget v${b.v}: ${sErr.message}`);
      events++;
    }

    for (const c of s.cases ?? []) {
      const ext = `seed:${s.code}:case:${c.v}`;
      const { data: ex } = await sb.from('business_case_versions').select('id').eq('external_id', ext).maybeSingle();
      if (ex) continue;
      const { error: cErr } = await sb.from('business_case_versions').insert({
        project_id: pid, version: c.v, gate_stage_seq: c.gate, authored_on: c.on, authored_by: c.by,
        npv: c.npv, irr_pct: c.irr ?? null, payback_months: c.payback ?? null,
        peak_annual_sales: c.peak, launch_date: c.launch,
        development_cost_estimate: c.dev, launch_cost: c.launch_cost ?? null,
        technical_success_pct: c.pts, commercial_success_pct: c.pcs,
        currency: 'USD', is_current: Boolean(c.current), notes: c.note ?? null,
        source_system: 'APP', external_id: ext,
      });
      if (cErr) throw new Error(`${s.code} case v${c.v}: ${cErr.message}`);
      cases++;
    }

    for (const [period, amount] of s.spend ?? []) {
      const ext = `seed:${s.code}:cost:${period}`;
      const { data: ex } = await sb.from('cost_actuals').select('id').eq('external_id', ext).maybeSingle();
      if (ex) continue;
      const { error: kErr } = await sb.from('cost_actuals').insert({
        project_id: pid, wbs_code: `${s.code}-1000`, period, actual_cost: amount, commitment: 0,
        source_system: 'SAP_PS', external_id: ext, synced_at: new Date().toISOString(),
      });
      if (kErr) throw new Error(`${s.code} cost ${period}: ${kErr.message}`);
      costRows++;
    }
  }
  return { upserted, decisions, events, cases, costRows };
}

async function main() {
  const sb = getServiceClient();
  section('R&D / NPI workspace seed');

  const allocs = await seedAllocations(sb);
  log.success(`portfolio allocations: ${allocs} rows (FY${FY_NOW} + FY${FY_NEXT} across four buckets)`);

  const r = await seedProjects(sb);
  log.success(`programmes: ${r.upserted}`);
  log.success(`gate decisions: ${r.decisions} new`);
  log.success(`gate budgets: ${r.events} new`);
  log.success(`business case versions: ${r.cases} new`);
  log.success(`posted cost rows: ${r.costRows} new`);

  section('Done');
  log.info('Sign in as i.halvorsen (R&D Portfolio Manager) or y.tanaka (Gatekeeper) after `pnpm seed:users`.');
  log.info('NW-RD-0003 is the early kill, NW-RD-0004 the late one — the contrast is the point of the seed.');
}

main().catch((e) => {
  log.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
