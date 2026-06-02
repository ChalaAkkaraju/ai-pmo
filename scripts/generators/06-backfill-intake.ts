/**
 * Backfill project intake sheets (intake_json) across the whole portfolio.
 *
 * Pure data — NO LLM, NO cost. Writes a realistic, NAME-AWARE, per-project
 * "Project Data Sheet" into projects.intake_json so EVERY project becomes a
 * usable reference in the intake form's reference picker.
 *
 * Coherence rules:
 *   • Technology / asset type is read from the project NAME
 *     (geothermal/wind/solar/hydro; desalination/wastewater; steel/cement/
 *      refinery/chemical; combined-cycle/substation/transmission).
 *   • Dependent fields stay consistent: substations/transmission have no fuel,
 *     MW-gross, or steam-blow; BESS uses MWh; brownfield is inferred from
 *     "modernisation / upgrade / expansion / Phase 2+".
 *   • Currency leans USD (US-named portfolio).
 *
 * Values are deterministic per project (seeded from the project code).
 *
 * CLI (run from pmo-llm-demo/):
 *   ./node_modules/.bin/tsx scripts/generators/06-backfill-intake.ts          # fill projects missing a sheet
 *   ./node_modules/.bin/tsx scripts/generators/06-backfill-intake.ts --force  # overwrite existing sheets too
 *   ./node_modules/.bin/tsx scripts/generators/06-backfill-intake.ts --dry    # preview, write nothing
 *
 * Requires migration 0013 (intake_json column). Idempotent.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

type Segment = 'renewables' | 'water' | 'industrial' | 'power';

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  segment: Segment;
  contract_value_current: number;
  approved_budget_current: number;
  contingency: number;
  hard_deadline_description: string | null;
  intake_json: Record<string, unknown> | null;
}

// ---- deterministic RNG (mulberry32 seeded from the project code) ----------
function seedFromCode(code: string): number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function pickWeighted<T>(rng: () => number, pairs: ReadonlyArray<readonly [T, number]>): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of pairs) {
    if ((r -= w) <= 0) return v;
  }
  return pairs[0][0];
}

// ---- name parsing ---------------------------------------------------------
function phaseNum(name: string): number {
  const m = /phase\s*(\d+)/i.exec(name);
  return m ? parseInt(m[1], 10) : 0;
}
function isBrownfield(name: string): boolean {
  return /modernis|moderniz|upgrade|expansion|rehabilit|retrofit|revamp|debottleneck|replacement/i.test(name) || phaseNum(name) >= 2;
}
function renewTech(rng: () => number, name: string): string {
  const n = name.toLowerCase();
  if (/offshore/.test(n)) return 'Offshore wind';
  if (/wind/.test(n)) return 'Onshore wind';
  if (/solar|photovolta|\bpv\b/.test(n)) return 'Solar PV';
  if (/geotherm/.test(n)) return 'Geothermal';
  if (/hydro/.test(n)) return 'Hydro';
  if (/storage|battery|bess/.test(n)) return 'Battery storage (BESS)';
  return pick(rng, ['Onshore wind', 'Solar PV', 'Battery storage (BESS)', 'Hydro']);
}
function powerType(rng: () => number, name: string): string {
  const n = name.toLowerCase();
  if (/substation/.test(n)) return 'Substation';
  if (/transmission|\bline\b|interconnect/.test(n)) return 'Transmission';
  if (/simple[- ]cycle|peaker|peaking/.test(n)) return 'Simple-cycle';
  if (/combined[- ]cycle/.test(n)) return 'Combined-cycle';
  if (/storage|battery|bess/.test(n)) return 'Battery storage (BESS)';
  return pick(rng, ['Combined-cycle', 'Combined-cycle', 'Simple-cycle']);
}
function waterProcess(rng: () => number, name: string): string {
  const n = name.toLowerCase();
  if (/desal/.test(n)) return 'RO desalination';
  if (/wastewater|reclamation|reclaim/.test(n)) return 'Wastewater';
  if (/convey|pipeline|pump station|aqueduct/.test(n)) return 'Conveyance';
  if (/mbr/.test(n)) return 'MBR';
  if (/treatment|treat/.test(n)) return 'Conventional treatment';
  return pick(rng, ['RO desalination', 'Conventional treatment', 'MBR', 'Wastewater']);
}
function indFacility(rng: () => number, name: string): string {
  const n = name.toLowerCase();
  if (/steel/.test(n)) return 'Steel mill';
  if (/cement/.test(n)) return 'Cement plant';
  if (/refin/.test(n)) return 'Refinery';
  if (/chemical|petrochem/.test(n)) return 'Chemicals plant';
  return pick(rng, ['Steel mill', 'Chemicals plant', 'Refinery', 'Cement plant', 'Other heavy industrial']);
}
function brownGreen(rng: () => number, name: string): string {
  return isBrownfield(name) ? 'Brownfield' : pick(rng, ['Greenfield', 'Greenfield', 'Mixed']);
}

// ---- shared pools ---------------------------------------------------------
const CURRENCY: ReadonlyArray<readonly [string, number]> = [
  ['USD', 14], ['CAD', 2], ['GBP', 1], ['EUR', 1], ['AUD', 1],
];
const RISK_STATUS: ReadonlyArray<readonly [string, number]> = [
  ['Applies', 6], ['Not applicable', 2], ['Owner-side responsibility', 3],
];
const PAYMENT_TERMS = [
  'Milestone-based; 10% mobilisation, monthly progress against a schedule of values, 5% retention released at provisional acceptance.',
  'Monthly progress payments against measured work; 5% retention released at substantial completion, balance at final acceptance.',
  'Milestone-linked drawdowns tied to engineering, procurement and construction gates; 10% retention stepped down at mechanical completion.',
];
const APPROVALS = [
  'Commercial (VP), Legal, and Sponsor sign-off at contract execution.',
  'Division commercial review, Legal, Risk, and Sponsor authorisation at award.',
  'Bid-board approval, Legal, and executive Sponsor sign-off prior to NTP.',
];

interface SegSpec {
  contractType: ReadonlyArray<readonly [string, number]>;
  lds: readonly string[];
  deadlineGate: readonly string[];
  milestones: readonly string[];
  specific: (rng: () => number, p: ProjectRow) => Record<string, string>;
  risks: readonly string[];
}

const scaleMW = (p: ProjectRow, div: number, min = 20) =>
  Math.max(min, Math.round((p.contract_value_current / div) / 5) * 5);

const SEG: Record<Segment, SegSpec> = {
  renewables: {
    contractType: [['EPC lump-sum', 6], ['Unit-rate', 1], ['Cost-plus', 1]],
    lds: [
      'Delay LDs 0.5%/week of contract price capped 10%; performance LDs on guaranteed output capped 10%.',
      'Delay LDs at 0.4%/week capped 8%; availability/output guarantee LDs capped 12%.',
    ],
    deadlineGate: [
      'COD gated by ISO interconnection and the PPA guaranteed commercial operation date.',
      'Tax-credit safe-harbour / placed-in-service deadline.',
      'PPA milestone deadline with daily delay damages.',
    ],
    milestones: [
      'NTP; major equipment delivery; mechanical completion; substantial completion; COD.',
      'NTP; foundations complete; equipment energisation; backfeed; substantial completion; COD.',
    ],
    risks: [
      'Sole-source long-lead equipment (turbines, transformers, inverters)',
      'Interconnection queue / ISO-RTO deadline exposure',
      'Tax-credit qualification (domestic content, prevailing wage)',
      'Resource / yield variance vs P50',
      'Weather-sensitive construction windows',
    ],
    specific: (rng, p) => {
      const tech = renewTech(rng, p.name);
      const mw = scaleMW(p, 2.0e6);
      const storage = tech === 'Battery storage (BESS)';
      const capacity = storage
        ? `${mw} MW / ${mw * 4} MWh`
        : tech === 'Solar PV'
          ? `${mw} MWac / ${Math.round(mw * 1.3)} MWdc`
          : `${mw} MW`;
      const out: Record<string, string> = {
        gen_tech: tech,
        capacity_mw: capacity,
        offtake: pick(rng, ['PPA', 'Merchant', 'Hedge', 'Tolling', 'Capacity agreement']),
        interconnection: pick(rng, [
          'ISO queue cleared; LGIA executed; POI energisation scheduled pre-COD.',
          'Interconnection study in cluster; LGIA pending; network upgrades scoped.',
        ]),
        incentives: storage
          ? 'Standalone-storage ITC; domestic-content adder tracked.'
          : pick(rng, [
              'ITC with domestic-content adder; prevailing-wage and apprenticeship compliance required.',
              'PTC election; domestic-content tracking; energy-community bonus claimed.',
            ]),
        site_control: pick(rng, ['Lease', 'Easement', 'Owned', 'Mixed']),
      };
      if (!storage) out.pvalue = pick(rng, ['P50', 'P75', 'P90']);
      return out;
    },
  },
  water: {
    contractType: [['EPC lump-sum', 5], ['Unit-rate', 2], ['Target-cost (painshare)', 1]],
    lds: [
      'Delay LDs 0.5%/week capped 10%; water-quality and throughput performance LDs capped 15%.',
      'Delay LDs 0.4%/week capped 10%; effluent-quality guarantee LDs with step penalties.',
    ],
    deadlineGate: [
      'Regulatory deadline to meet the treated-water supply obligation under the water-purchase agreement.',
      'Consent-order compliance date for discharge quality.',
    ],
    milestones: [
      'NTP; intake works; process mechanical completion; commissioning; performance test; substantial completion.',
      'NTP; civil works; equipment installation; wet commissioning; reliability run; acceptance.',
    ],
    risks: [
      'Effluent / discharge permit exceedance',
      'Source-water quality variance (fouling, salinity)',
      'Environmental stand-downs (marine mammal, fish passage, turbidity)',
      'Membrane / equipment commissioning yield',
      'Outfall / brine-diffuser permitting',
    ],
    specific: (rng, p) => {
      const proc = waterProcess(rng, p.name);
      const desal = proc === 'RO desalination';
      return {
        water_process: proc,
        design_capacity: `${Math.max(5, Math.round(p.contract_value_current / 1.2e7))} MGD treated water`,
        treated_spec: desal ? 'Under 500 mg/L TDS; meets potable standard per state primacy.' : 'Effluent within NPDES limits for the receiving water.',
        outfall_permit: desal ? 'NPDES permit; brine diffuser with approved dilution modelling.' : 'Outfall permit with seasonal discharge limits.',
        offtake: pick(rng, ['Capacity agreement', 'PPA', 'Merchant']),
        source_water: desal ? 'Open seawater intake; seasonal salinity and turbidity variation.' : 'Surface/groundwater source; variable seasonal quality.',
        permits: 'USACE Section 404, state environmental, marine-mammal and fish-passage conditions.',
        commissioning: '14-day reliability run at guaranteed output and quality.',
      };
    },
  },
  industrial: {
    contractType: [['Target-cost (painshare)', 4], ['Cost-plus', 3], ['EPC lump-sum', 2]],
    lds: [
      'Schedule LDs on key tie-in milestones; performance guarantees on throughput and emissions.',
      'Turnaround-window LDs per day overrun; throughput guarantee with capped LDs.',
    ],
    deadlineGate: [
      'Owner-controlled shutdown window for tie-ins; immovable turnaround dates.',
      'Outage/turnaround slot fixed by plant production schedule.',
    ],
    milestones: [
      'NTP; detailed engineering; long-lead delivery; pre-outage readiness; tie-in/turnaround; start-up; performance test.',
      'NTP; demolition; module fabrication; outage tie-in; commissioning; demonstration run.',
    ],
    risks: [
      'High-energy piping / exotic-alloy weld NDE',
      'Process-safety (PSM) management-of-change backlog',
      'Brownfield demolition / existing-condition surprises',
      'Owner tie-in / shutdown-window slippage',
      'Air-permit deviation (Title V)',
    ],
    specific: (rng, p) => {
      const fac = indFacility(rng, p.name);
      const unit = fac === 'Steel mill' ? 'ktpa crude steel'
        : fac === 'Cement plant' ? 'Mtpa cement'
        : fac === 'Refinery' ? 'kbpd'
        : 'ktpa product';
      const mag = fac === 'Cement plant'
        ? `${(1 + (p.contract_value_current / 8e8)).toFixed(1)}`
        : fac === 'Refinery'
          ? `${Math.max(20, Math.round(p.contract_value_current / 5e6))}`
          : `${Math.max(50, Math.round(p.contract_value_current / 1.0e6))}`;
      return {
        facility_type: fac,
        throughput: `${mag} ${unit}`,
        brown_green: brownGreen(rng, p.name),
        psm: pick(rng, ['Applies (OSHA PSM)', 'Applies (OSHA PSM)', 'Not applicable']),
        acceptance: 'Throughput, yield and emissions guarantees with LDs; 30-day demonstration run.',
        hazmat: pick(rng, ['H2S service, exotic alloys, high-energy piping, refractory.', 'Acids and solvents; specialty alloys; confined-space tie-ins.']),
        shutdown: pick(rng, ['Two owner-controlled outage windows of 21 days each; firm dates.', 'Single 30-day turnaround window; no extension permitted.']),
        air_permit: 'Title V air permit; MOC required for any deviation.',
      };
    },
  },
  power: {
    contractType: [['EPC lump-sum', 6], ['Cost-plus', 1], ['Target-cost (painshare)', 1]],
    lds: [
      'Delay LDs 0.5%/week capped 10%; heat-rate and capacity performance LDs capped 15%.',
      'Delay LDs 0.4%/week capped 12%; capacity and heat-rate guarantee LDs.',
    ],
    deadlineGate: [
      'COD gated by ISO/RTO interconnection and the capacity-market obligation date.',
      'In-service / energisation deadline set by the utility interconnection agreement.',
    ],
    milestones: [
      'NTP; major equipment delivery; first-fire; steam-blow; backfeed/energisation; reliability run; COD.',
      'NTP; equipment delivery; backfeed; energisation; performance test; in-service.',
    ],
    risks: [
      'ISO/RTO interconnection-queue COD exposure',
      'Major-equipment (HRSG, generator stator, GSU) lead time',
      'Steam-blow / first-fire HSE',
      'Gas pipeline / substation tie-in coordination',
      'Commissioning / vendor FAT failures',
    ],
    specific: (rng, p) => {
      const type = powerType(rng, p.name);
      const kv = pick(rng, ['230', '345', '500']);
      if (type === 'Substation') {
        return {
          plant_type: type,
          capacity_mw: `${kv} kV; ${Math.max(300, scaleMW(p, 1.0e6) * 2)} MVA`,
          interconnection: 'New/expanded substation; utility tie-in and protection coordination; ISO/RTO study conditions.',
          lead_times: 'Power transformers, GIS and breakers 12-18 months long-lead.',
          commissioning: 'Protection & control checks, backfeed, energisation, and trip/relay testing.',
        };
      }
      if (type === 'Transmission') {
        return {
          plant_type: type,
          capacity_mw: `${kv} kV, ${Math.max(8, Math.round(p.contract_value_current / 4.0e6))} miles`,
          interconnection: 'Line route permitting and ROW; utility interconnection and tie-in points.',
          lead_times: 'Conductor, structures and large transformers 12-18 months.',
          commissioning: 'Stringing checks, insulation and relay testing, backfeed and energisation.',
        };
      }
      if (type === 'Battery storage (BESS)') {
        const mw = scaleMW(p, 1.0e6, 40);
        return {
          plant_type: type,
          capacity_mw: `${mw} MW / ${mw * 4} MWh`,
          offtake: pick(rng, ['Capacity agreement', 'Tolling', 'Merchant']),
          interconnection: 'ISO queue position; POI energisation and grid-code compliance.',
          lead_times: 'Battery modules and PCS 9-15 months; main transformer long-lead.',
          commissioning: 'Pre-energisation checks, grid-code testing, and round-trip-efficiency performance test.',
        };
      }
      const cc = type === 'Combined-cycle';
      const mw = scaleMW(p, 1.0e6, 40);
      return {
        plant_type: type,
        capacity_mw: `${mw} MW gross / ${Math.round(mw * 0.98)} MW net`,
        fuel: pick(rng, ['Natural gas', 'Dual-fuel', 'Hydrogen-blend ready']),
        offtake: pick(rng, ['Capacity agreement', 'PPA', 'Tolling', 'Merchant']),
        interconnection: 'ISO queue position secured; GSU and gen-tie scope; substation tie-in coordinated with utility.',
        lead_times: cc ? 'CTG and HRSG 18-24 months; generator stator and GSU long-lead.' : 'CTG and generator 16-22 months; GSU long-lead.',
        commissioning: cc
          ? 'First-fire, steam-blow, energisation, then a reliability run at guaranteed heat rate.'
          : 'First-fire, energisation, then a reliability run at guaranteed heat rate.',
      };
    },
  },
};

function buildIntake(p: ProjectRow): Record<string, unknown> {
  const rng = makeRng(seedFromCode(p.code));
  const spec = SEG[p.segment];
  const risks = spec.risks.map((area) => ({ area, status: pickWeighted(rng, RISK_STATUS) }));
  return {
    currency: pickWeighted(rng, CURRENCY),
    contract_type: pickWeighted(rng, spec.contractType),
    payment_terms: pick(rng, PAYMENT_TERMS),
    lds: pick(rng, spec.lds),
    target_duration_weeks: String(70 + Math.floor(rng() * 70)),
    deadline_gate: p.hard_deadline_description?.trim() || pick(rng, spec.deadlineGate),
    milestones: pick(rng, spec.milestones),
    approvals: pick(rng, APPROVALS),
    ...spec.specific(rng, p),
    risks,
    backfilled: true,
  };
}

function hasSheet(p: ProjectRow): boolean {
  return !!p.intake_json && typeof p.intake_json === 'object' && Object.keys(p.intake_json).length > 0;
}

async function main() {
  const force = process.argv.includes('--force');
  const dry = process.argv.includes('--dry');
  log.header('Backfill intake sheets (intake_json)');
  if (dry) log.warn('DRY RUN — no writes');
  if (force) log.warn('FORCE — overwriting existing sheets');

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, code, name, segment, contract_value_current, approved_budget_current, contingency, hard_deadline_description, intake_json')
    .order('code', { ascending: true });
  if (error) {
    log.error(`Could not load projects: ${error.message}`);
    process.exit(1);
  }
  const projects = (data ?? []) as ProjectRow[];
  log.info(`Loaded ${projects.length} projects`);

  const bySeg: Record<string, number> = {};
  let written = 0, skipped = 0;
  for (const p of projects) {
    if (!force && hasSheet(p)) {
      skipped++;
      continue;
    }
    const intake = buildIntake(p);
    bySeg[p.segment] = (bySeg[p.segment] ?? 0) + 1;
    if (!dry) {
      const { error: upErr } = await supabase.from('projects').update({ intake_json: intake }).eq('id', p.id);
      if (upErr) {
        log.error(`${p.code}: ${upErr.message}`);
        continue;
      }
    }
    written++;
    if (written % 20 === 0) log.info(`… ${written} written`);
  }

  section('Summary');
  for (const seg of Object.keys(bySeg).sort()) log.info(`${seg}: ${bySeg[seg]} filled`);
  log.success(`${written} project sheet(s) ${dry ? 'would be ' : ''}written; ${skipped} skipped (already had one)`);
}

main().catch((e) => {
  log.error(String(e));
  process.exit(1);
});
