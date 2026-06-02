/**
 * Per-segment intake-form configuration — the web equivalent of the printed
 * "Project Data Sheet" templates. Drives both the segment intake pages and the
 * generic <IntakeForm> renderer so the two never drift.
 *
 * A field's `core` key (when present) means its value is sent as a TOP-LEVEL
 * field to POST /api/projects (and lands in a typed projects column). Every
 * other field is collected into the `intake` object (stored in intake_json).
 */

import type { Segment } from './types';

export type FieldType = 'text' | 'number' | 'money' | 'select' | 'date' | 'textarea';

export type CoreKey =
  | 'name'
  | 'client'
  | 'contract_value'
  | 'approved_budget'
  | 'contingency'
  | 'start_week'
  | 'hard_deadline';

export interface IntakeField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  hint?: string;
  required?: boolean;
  /** Span both columns in the two-column grid. */
  wide?: boolean;
  /** If set, this value is sent top-level to the API (typed column). */
  core?: CoreKey;
}

export interface IntakeSection {
  title: string;
  blurb?: string;
  fields: IntakeField[];
}

// ---- shared option sets --------------------------------------------------
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Other'];
const CONTRACT_TYPES = [
  'EPC lump-sum',
  'Cost-plus',
  'Target-cost (painshare)',
  'T&M with cap',
  'Unit-rate',
  'Other',
];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'Other'];
const OFFTAKE = ['PPA', 'Merchant', 'Hedge', 'Tolling', 'Capacity agreement', 'Other'];
const PVALUE = ['P50', 'P75', 'P90', 'Other'];
const SITE_CONTROL = ['Lease', 'Easement', 'Owned', 'Mixed', 'TBC'];

export const RISK_OPTIONS = ['Applies', 'Not applicable', 'Owner-side responsibility'];

// ---- sections common to every segment ------------------------------------
const IDENTITY: IntakeSection = {
  title: '1. Project identity',
  fields: [
    { key: 'name', label: 'Project name', type: 'text', required: true, wide: true, core: 'name', hint: 'Working title for the project' },
    { key: 'client', label: 'Customer / client', type: 'text', required: true, core: 'client', hint: 'Legal counterparty name' },
    { key: 'sponsor', label: 'Project sponsor (owner side)', type: 'text', hint: 'Customer signatory / sponsor' },
    { key: 'site_city', label: 'Site — city', type: 'text' },
    { key: 'site_state', label: 'Site — state / region', type: 'text' },
    { key: 'site_country', label: 'Site — country', type: 'select', options: COUNTRIES },
    { key: 'site_postcode', label: 'Site — postal code', type: 'text' },
  ],
};

const COMMERCIAL: IntakeSection = {
  title: '2. Commercial terms',
  fields: [
    { key: 'contract_value', label: 'Contract value (total)', type: 'money', required: true, core: 'contract_value', hint: 'Total signed contract price' },
    { key: 'approved_budget', label: 'Approved budget', type: 'money', required: true, core: 'approved_budget', hint: 'Internal approved delivery budget' },
    { key: 'contingency', label: 'Contingency', type: 'money', core: 'contingency', hint: 'Amount held as contingency' },
    { key: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
    { key: 'contract_type', label: 'Contract type', type: 'select', options: CONTRACT_TYPES, hint: 'Commercial model' },
    { key: 'payment_terms', label: 'Payment / milestone terms', type: 'textarea', wide: true, hint: 'Payment schedule basis; retention %' },
    { key: 'lds', label: 'Liquidated damages (LDs)', type: 'textarea', wide: true, hint: 'Delay and performance LD rates and caps' },
  ],
};

const SCHEDULE: IntakeSection = {
  title: '3. Schedule & key dates',
  fields: [
    { key: 'ntp_date', label: 'Contract effective date / NTP', type: 'date', hint: 'Notice-to-proceed date' },
    { key: 'start_week', label: 'Programme start (week 0 basis)', type: 'number', core: 'start_week', hint: 'Usually 0 for a new project' },
    { key: 'target_duration_weeks', label: 'Target duration (weeks)', type: 'number', hint: 'Estimated total programme length' },
    { key: 'hard_deadline', label: 'Hard deadline', type: 'date', core: 'hard_deadline', hint: 'The immovable date (e.g. COD)' },
    { key: 'deadline_gate', label: 'Hard deadline — what gates it', type: 'text', wide: true, hint: 'e.g. COD via interconnection' },
    { key: 'milestones', label: 'Key contractual milestones', type: 'textarea', wide: true, hint: 'Named milestones, dates, any milestone LDs' },
  ],
};

const GOVERNANCE: IntakeSection = {
  title: '5. Governance & ownership',
  fields: [
    { key: 'pm_proposed', label: 'Proposed delivery PM', type: 'text', hint: 'PMO to confirm' },
    { key: 'bid_ref', label: 'Estimating reference / bid no.', type: 'text', hint: 'Link back to the priced estimate' },
    { key: 'sales_owner', label: 'Sales owner', type: 'text', hint: 'Account / capture owner' },
    { key: 'approvals', label: 'Approvals required at signing', type: 'textarea', wide: true, hint: 'Commercial, legal, sponsor sign-offs' },
  ],
};

// ---- segment-specific section 4 + risk list ------------------------------
interface SegmentConfig {
  blurb: string;
  specific: IntakeField[];
  risks: string[];
}

const SEGMENTS: Record<Segment, SegmentConfig> = {
  renewables: {
    blurb: 'Wind, solar, hydro, geothermal and storage generation projects.',
    specific: [
      { key: 'gen_tech', label: 'Generation technology', type: 'select', options: ['Onshore wind', 'Offshore wind', 'Solar PV', 'Battery storage (BESS)', 'Hydro', 'Geothermal'] },
      { key: 'capacity_mw', label: 'Nameplate capacity (MW)', type: 'text', hint: 'AC and DC where applicable' },
      { key: 'offtake', label: 'Offtake / PPA structure', type: 'select', options: OFFTAKE },
      { key: 'cod_date', label: 'Commercial Operation Date (COD)', type: 'date', hint: 'Contractual COD — the hard deadline' },
      { key: 'interconnection', label: 'Interconnection / ISO-RTO status', type: 'text', hint: 'Queue position, study stage, POI' },
      { key: 'incentives', label: 'Tax-credit / incentive basis', type: 'text', hint: 'ITC / PTC / domestic-content / prevailing-wage' },
      { key: 'site_control', label: 'Site control', type: 'select', options: SITE_CONTROL },
      { key: 'pvalue', label: 'Resource assessment P-value', type: 'select', options: PVALUE },
    ],
    risks: [
      'Sole-source long-lead equipment (turbines, transformers, inverters)',
      'Interconnection queue / ISO-RTO deadline exposure',
      'Tax-credit qualification (domestic content, prevailing wage)',
      'Resource / yield variance vs P50',
      'Weather-sensitive construction windows',
    ],
  },
  water: {
    blurb: 'Water treatment, desalination, conveyance and wastewater projects.',
    specific: [
      { key: 'water_process', label: 'Process type', type: 'select', options: ['RO desalination', 'MBR', 'Conventional treatment', 'Conveyance', 'Wastewater', 'Other'] },
      { key: 'design_capacity', label: 'Design capacity (MGD or m3/day)', type: 'text', hint: 'Treated-water output basis' },
      { key: 'treated_spec', label: 'Treated-water specification', type: 'text', hint: 'Product/effluent quality standard' },
      { key: 'outfall_permit', label: 'Discharge / outfall permit basis', type: 'text', hint: 'Permit no., conditions, brine/diffuser' },
      { key: 'offtake', label: 'Offtake / take-or-pay terms', type: 'select', options: OFFTAKE },
      { key: 'source_water', label: 'Source-water characterisation', type: 'text', hint: 'Intake source, salinity/quality, seasonality' },
      { key: 'permits', label: 'Regulatory / environmental permits', type: 'text', hint: 'USACE, state, fish-passage, cultural-resource' },
      { key: 'commissioning', label: 'Commissioning / acceptance basis', type: 'text', hint: 'Performance-test and reliability-run criteria' },
    ],
    risks: [
      'Effluent / discharge permit exceedance',
      'Source-water quality variance (fouling, salinity)',
      'Environmental stand-downs (marine mammal, fish passage, turbidity)',
      'Membrane / equipment commissioning yield',
      'Outfall / brine-diffuser permitting',
    ],
  },
  industrial: {
    blurb: 'Process plants, mills, refineries and heavy-industrial modernisation.',
    specific: [
      { key: 'facility_type', label: 'Facility / process type', type: 'select', options: ['Steel mill', 'Chemicals plant', 'Refinery', 'Cement plant', 'Other heavy industrial'] },
      { key: 'throughput', label: 'Production capacity / throughput', type: 'text', hint: 'Output basis and units' },
      { key: 'brown_green', label: 'Brownfield vs greenfield', type: 'select', options: ['Brownfield', 'Greenfield', 'Mixed'] },
      { key: 'psm', label: 'Process-safety scope (PSM / MOC)', type: 'select', options: ['Applies (OSHA PSM)', 'Not applicable', 'TBC'] },
      { key: 'acceptance', label: 'Performance / acceptance criteria', type: 'textarea', wide: true, hint: 'Throughput, yield, emissions guarantees, LDs' },
      { key: 'hazmat', label: 'Hazardous-materials handling', type: 'text', hint: 'H2S, exotic alloys, refractory, HE piping' },
      { key: 'shutdown', label: 'Shutdown / tie-in windows', type: 'text', hint: 'Owner-controlled outage dates and durations' },
      { key: 'air_permit', label: 'Emissions / air-permit basis', type: 'text', hint: 'Title V / air-permit conditions' },
    ],
    risks: [
      'High-energy piping / exotic-alloy weld NDE',
      'Process-safety (PSM) management-of-change backlog',
      'Brownfield demolition / existing-condition surprises',
      'Owner tie-in / shutdown-window slippage',
      'Air-permit deviation (Title V)',
    ],
  },
  power: {
    blurb: 'Thermal generation, combined-cycle, substations and transmission.',
    specific: [
      { key: 'plant_type', label: 'Plant / asset type', type: 'select', options: ['Combined-cycle', 'Simple-cycle', 'Substation', 'Transmission', 'Battery storage (BESS)'] },
      { key: 'capacity_mw', label: 'Gross / net capacity (MW)', type: 'text', hint: 'Plant rating and net export' },
      { key: 'fuel', label: 'Fuel / heat-rate basis', type: 'select', options: ['Natural gas', 'Dual-fuel', 'Hydrogen-blend ready', 'Other'] },
      { key: 'cod_date', label: 'Commercial Operation Date (COD)', type: 'date', hint: 'COD gated by interconnection — hard deadline' },
      { key: 'interconnection', label: 'Interconnection / transmission scope', type: 'text', hint: 'ISO/RTO queue, GSU, gen-tie, tie-in' },
      { key: 'lead_times', label: 'Major-equipment lead times', type: 'text', hint: 'CTG / STG / HRSG / stator / transformer' },
      { key: 'offtake', label: 'Offtake / capacity agreement', type: 'select', options: OFFTAKE },
      { key: 'commissioning', label: 'Commissioning sequence', type: 'text', hint: 'First-fire, steam-blow, energisation, reliability' },
    ],
    risks: [
      'ISO/RTO interconnection-queue COD exposure',
      'Major-equipment (HRSG, generator stator, GSU) lead time',
      'Steam-blow / first-fire HSE',
      'Gas pipeline / substation tie-in coordination',
      'Commissioning / vendor FAT failures',
    ],
  },
};

export function segmentBlurb(segment: Segment): string {
  return SEGMENTS[segment].blurb;
}

export function segmentRisks(segment: Segment): string[] {
  return SEGMENTS[segment].risks;
}

/** Full ordered section list for a segment (identity → governance). */
export function intakeSections(segment: Segment): IntakeSection[] {
  const seg = SEGMENTS[segment];
  return [
    IDENTITY,
    COMMERCIAL,
    SCHEDULE,
    {
      title: `4. ${labelFor(segment)}-specific technical & commercial facts`,
      blurb: 'The facts an agent can’t invent — fill what is known at signing.',
      fields: seg.specific,
    },
    GOVERNANCE,
  ];
}

function labelFor(segment: Segment): string {
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * A candidate "similar project" the PM can pick as a reference on the intake
 * form. Same-segment projects are offered; selecting one pre-fills the
 * commercial + segment-specific fields (identity stays blank) and records the
 * link in intake_json.reference_project_code for later Charter grounding.
 */
export interface ReferenceProject {
  code: string;
  name: string;
  client: string;
  contract_value_initial: number;
  approved_budget_initial: number;
  contingency: number;
  hard_deadline_description: string | null;
  intake_json: Record<string, unknown> | null;
}

/** Field keys NOT copied from a reference (deal-specific identity / ownership). */
export const REFERENCE_SKIP_KEYS = new Set<string>([
  'name',
  'client',
  'sponsor',
  'site_city',
  'site_state',
  'site_country',
  'site_postcode',
  'pm_proposed',
  'bid_ref',
  'sales_owner',
  'start_week',
]);
