/**
 * Phase 2.4 portfolio expansion — step 2 of 3 (procedural variation).
 *
 * Reads the 10 archetypes produced by step 1 and procedurally generates 96
 * distinct project specifications, each with project row + ~5 risks + ~8 issues
 * + 0-1 CO + 1-2 variance reports. Output is a single JSON file at
 * scripts/seed-content/generated-projects.json that step 3 (DB insert) reads.
 *
 * Sub-allocation per archetype (totals 96):
 *   onshore-wind-utility 9 · utility-scale-solar 9 · run-of-river-hydro 8 ·
 *   geothermal-binary-cycle 7 · water-treatment-municipal 9 ·
 *   seawater-desalination 8 · large-diameter-conveyance 7 ·
 *   steel-mill-modernisation 12 · specialty-chemicals-plant 12 ·
 *   combined-cycle-gas-turbine 15
 *
 * Lifecycle distribution across the 96 (matches user-confirmed even spread):
 *   33 active-early (weeks 5-30) · 30 active-late (weeks 30-70) ·
 *   16 SC (weeks 75-85) · 17 closed (weeks 90-130)
 *
 * Run from pmo-llm-demo/:  ./node_modules/.bin/tsx scripts/generators/02-procedural.ts
 *
 * NO inference cost — pure procedural code. Output is deterministic given
 * the same archetype input (seedable RNG keyed off archetype_id).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { log, section } from '../lib/log';
import type {
  ProjectArchetype,
  ArchetypeRiskTemplate,
  ArchetypeIssueTemplate,
  Severity,
} from '../lib/archetype-types';

// =============================================================================
// Configuration: per-archetype variant counts (sum = 96)
// =============================================================================

const VARIANTS_PER_ARCHETYPE: Record<string, number> = {
  'onshore-wind-utility': 9,
  'utility-scale-solar': 9,
  'run-of-river-hydro': 8,
  'geothermal-binary-cycle': 7,
  'water-treatment-municipal': 9,
  'seawater-desalination': 8,
  'large-diameter-conveyance': 7,
  'steel-mill-modernisation': 12,
  'specialty-chemicals-plant': 12,
  'combined-cycle-gas-turbine': 15,
};

// =============================================================================
// Lifecycle status buckets (across the 96 new projects)
// =============================================================================

type LifecycleBucket = 'active-early' | 'active-late' | 'sc' | 'closed';

const LIFECYCLE_TARGETS: Record<LifecycleBucket, number> = {
  'active-early': 33,
  'active-late': 30,
  'sc': 16,
  'closed': 17,
};

const LIFECYCLE_WEEK_RANGES: Record<LifecycleBucket, [number, number]> = {
  'active-early': [5, 30],
  'active-late': [30, 70],
  'sc': [75, 85],
  'closed': [90, 130],
};

const LIFECYCLE_TO_STATUS: Record<LifecycleBucket, 'Active' | 'SC' | 'Closed'> = {
  'active-early': 'Active',
  'active-late': 'Active',
  'sc': 'SC',
  'closed': 'Closed',
};

// =============================================================================
// Location pool — 100 distinct North American place names
// =============================================================================

const LOCATIONS = [
  'Riverbend', 'Pine Hollow', 'Cedar Falls', 'Mount Pleasant', 'Ridgeway',
  'Stone Creek', 'Willow Run', 'Eagle Ridge', 'Sand Hills', 'Iron Mountain',
  'Bear Lake', 'Coyote Springs', 'Saltgrass', 'Twin Buttes', 'Coal Valley',
  'Glass Mountain', 'Long Prairie', 'Round Rock', 'Spring Hollow', 'Tall Pine',
  'Lone Star', 'Black Hills', 'Red Bluff', 'Granite Pass', 'Silver Creek',
  'Bayou Vista', 'Marsh Landing', 'Cypress Bayou', 'Salt Marsh', 'Crystal Springs',
  'Willow Bend', 'Oak Ridge', 'Maple Hollow', 'Birch Grove', 'Aspen Heights',
  'Foxglove Ridge', 'Sage Valley', 'Mesa Verde', 'Antelope Junction', 'High Plains',
  'Painted Rock', 'Mustang Flats', 'Buffalo Creek', 'Elk Mountain', 'Caribou Pass',
  'Whitewater', 'Blackstone', 'Goldfield', 'Copper Hills', 'Sierra Madre',
  'Cottonwood', 'Tamarack', 'Sequoia Bend', 'Juniper Mesa', 'Sycamore Reach',
  'Bristlecone', 'Sagebrush Plain', 'Saguaro Junction', 'Mesquite Wash', 'Yucca Valley',
  'Northpoint', 'Southfork', 'Eastgate', 'Westbridge', 'Centerline',
  'Lakeshore', 'Highview', 'Lowfield', 'Skyharbor', 'Deepwell',
  'Frontier', 'Pioneer', 'Heritage', 'Liberty', 'Beacon',
  'Summit', 'Plateau', 'Mesa Grande', 'Ridgecrest', 'Verde Valley',
  'Cascade', 'Glacier Pass', 'Boreal Ridge', 'Northwind', 'Cold Creek',
  'Sun Valley', 'Solar Flat', 'Windward', 'Leeward', 'Stormbreak',
  'Iron Forge', 'Steelyard', 'Foundry Hills', 'Mill Creek', 'Smeltworks',
  'Hydroline', 'Powerhouse', 'Voltbridge', 'Currentpoint', 'Megawatt',
  'Springwater', 'Cleartide', 'Brinepoint', 'Aqualine', 'Reservoir Heights',
];

// =============================================================================
// Seedable RNG for deterministic generation
// =============================================================================

function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

function pickN<T>(arr: T[], n: number, r: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(r() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function intInRange(min: number, max: number, r: () => number): number {
  return Math.floor(min + r() * (max - min + 1));
}

function floatInRange(min: number, max: number, r: () => number): number {
  return min + r() * (max - min);
}

function severityScore(p: Severity, i: Severity): number {
  const n = (s: Severity) => (s === 'L' ? 1 : s === 'M' ? 2 : 3);
  return n(p) * n(i);
}

// =============================================================================
// Lifecycle bucket assignment — return 96 buckets matching the target distribution
// =============================================================================

function makeLifecycleAssignments(total: number, r: () => number): LifecycleBucket[] {
  const out: LifecycleBucket[] = [];
  for (const [bucket, count] of Object.entries(LIFECYCLE_TARGETS) as Array<[LifecycleBucket, number]>) {
    for (let i = 0; i < count; i++) out.push(bucket);
  }
  if (out.length !== total) {
    throw new Error(`Lifecycle distribution sums to ${out.length}, expected ${total}`);
  }
  // Fisher-Yates shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// =============================================================================
// Project code generator — segment + sequence + checksum-ish suffix
// =============================================================================

const SEGMENT_CODE: Record<string, string> = {
  renewables: 'REN',
  water: 'WTR',
  industrial: 'IND',
  power: 'PWR',
};

function makeProjectCode(segment: string, seqGlobal: number): string {
  const seg = SEGMENT_CODE[segment] ?? 'GEN';
  // Format: NW-{SEG}-{4-digit seq} (NW prefix matches the existing anchor pattern)
  return `NW-${seg}-${String(2600 + seqGlobal).padStart(4, '0')}`;
}

// =============================================================================
// Placeholder substitution for templates
// =============================================================================

function fillPlaceholders(template: string, r: () => number): string {
  return template
    .replace(/\{n\}/g, () => String(intInRange(2, 12, r)))
    .replace(/\{parcel_id\}/g, () => `P-${String(intInRange(100, 999, r))}`)
    .replace(/\{location\}/g, () => pick(LOCATIONS, r))
    .replace(/\{phase\}/g, () => String(intInRange(1, 3, r)))
    .replace(/\{client_suffix\}/g, () => 'Holdings')
    .replace(/\{project\}/g, () => 'the project')
    .replace(/\{turbine_oem\}/g, () => pick(['Vestas', 'GE Vernova', 'Siemens Gamesa', 'Nordex'], r))
    .replace(/\{oem\}/g, () => pick(['the OEM', 'the equipment supplier'], r))
    .replace(/\{notice_ref\}/g, () => pick(['2018-59', '2021-41', '2022-44'], r))
    .replace(/\{ptc_deadline\}/g, () => pick(['31 December year+1', '30 June year+1', '31 December year+2'], r))
    .replace(/\{itc_deadline\}/g, () => pick(['31 December year+1', '30 June year+2'], r))
    .replace(/\{permit_authority\}/g, () => pick(['the AHJ', 'the state DEQ', 'EPA Region IX', 'the USACE'], r))
    .replace(/\{contractor\}/g, () => 'the EPC contractor')
    .replace(/\{utility\}/g, () => pick(['the local utility', 'the host utility', 'the IOU'], r))
    .replace(/\{permit\}/g, () => pick(['NPDES', 'Section 404', 'air-quality', 'wetlands'], r))
    .replace(/\{vendor\}/g, () => 'the vendor')
    .replace(/\{subcontractor\}/g, () => 'the subcontractor')
    .replace(/\{client\}/g, () => 'the client')
    .replace(/\{owner\}/g, () => 'the owner')
    // Generic fallback for any remaining placeholder: strip braces, convert underscores to spaces
    .replace(/\{([a-z_]+)\}/g, (_, name: string) => name.replace(/_/g, ' '));
}

// =============================================================================
// Per-variant generators
// =============================================================================

const RISK_OWNERS = [
  'PM',
  'Procurement Lead',
  'Construction Manager',
  'Commercial Manager',
  'Engineering Lead',
  'Risk Analyst',
];

const ISSUE_OWNERS = [
  'PM',
  'Procurement Lead',
  'Site Engineer',
  'Construction Manager',
  'QA/QC Lead',
];

function generateRisks(
  archetype: ProjectArchetype,
  bucket: LifecycleBucket,
  r: () => number,
): GeneratedRisk[] {
  // Pick 4-6 risks from the archetype's typical_risks pool
  const n = intInRange(4, Math.min(6, archetype.typical_risks.length), r);
  const picks = pickN(archetype.typical_risks, n, r);

  return picks.map((tmpl, idx) => {
    const status = pickRiskStatus(bucket, tmpl, r);
    const probability = tmpl.likely_probability;
    const impact = tmpl.likely_impact;
    return {
      risk_id: `R-${String(idx + 1).padStart(3, '0')}`,
      category: tmpl.category,
      description: fillPlaceholders(tmpl.description_template, r),
      probability,
      impact,
      score: severityScore(probability, impact),
      response: pick(
        ['Mitigate', 'Transfer', 'Avoid', 'Accept with monitoring'],
        r,
      ),
      owner: pick(RISK_OWNERS, r),
      trigger: 'See description',
      status,
      cross_cutting_class: tmpl.cross_cutting_class,
      pattern_link: null,
    };
  });
}

function pickRiskStatus(
  bucket: LifecycleBucket,
  tmpl: ArchetypeRiskTemplate,
  r: () => number,
): string {
  if (bucket === 'active-early') return 'Open';
  if (bucket === 'active-late') {
    return pick(['Open', 'Mitigated', 'Open'], r);
  }
  if (bucket === 'sc') {
    return pick(['Realised — managed', 'Mitigated', 'Not materialised', 'Mitigated'], r);
  }
  // closed
  return pick(['Realised — closed', 'Mitigated', 'Not materialised'], r);
}

function generateIssues(
  archetype: ProjectArchetype,
  currentWeek: number,
  bucket: LifecycleBucket,
  r: () => number,
): GeneratedIssue[] {
  const n = intInRange(6, Math.min(10, archetype.typical_issues.length), r);
  const picks = pickN(archetype.typical_issues, n, r);

  return picks.map((tmpl, idx) => {
    const opened_week = intInRange(0, Math.max(1, currentWeek - 1), r);
    const isClosed =
      bucket === 'closed' ||
      bucket === 'sc' ||
      (bucket === 'active-late' && r() < 0.6) ||
      (bucket === 'active-early' && r() < 0.3);
    const closed_week = isClosed
      ? Math.min(currentWeek, opened_week + intInRange(2, 12, r))
      : null;

    return {
      issue_id: `I-${String(idx + 1).padStart(3, '0')}`,
      description: fillPlaceholders(tmpl.description_template, r),
      category: tmpl.category,
      severity: tmpl.typical_severity,
      owner: pick(ISSUE_OWNERS, r),
      status: isClosed ? 'Closed' : pick(['Open', 'In progress'], r),
      linked_wbs: [`${intInRange(1, 7, r)}.${intInRange(1, 8, r)}`],
      linked_risk: r() < 0.3 ? `R-${String(intInRange(1, 5, r)).padStart(3, '0')}` : null,
      opened_week,
      closed_week,
      closure_narrative: isClosed ? 'Resolved through standard issue-management process.' : null,
    };
  });
}

function generateChangeOrder(
  archetype: ProjectArchetype,
  currentWeek: number,
  contractM: number,
  bucket: LifecycleBucket,
  r: () => number,
): GeneratedChangeOrder | null {
  // Only ~35% of active projects get a CO; higher for sc/closed
  const baseProb = bucket === 'active-early' ? 0.2 : bucket === 'active-late' ? 0.4 : 0.6;
  if (r() > baseProb) return null;

  const driver = pick(archetype.typical_co_drivers, r);
  const costImpactM = floatInRange(0.2, contractM * 0.04, r);
  const revenueImpactM = costImpactM * floatInRange(1.0, 1.15, r);
  const scheduleImpactDays = intInRange(-10, 30, r);
  const status =
    bucket === 'closed' || bucket === 'sc'
      ? 'Complete'
      : pick(['Under analysis', 'Priced', 'Executed', 'Executed'], r);

  return {
    co_id: 'CO-001',
    driver,
    scope_summary: driver,
    cost_impact_m: Number(costImpactM.toFixed(3)),
    revenue_impact_m: Number(revenueImpactM.toFixed(3)),
    schedule_impact_days: scheduleImpactDays,
    margin_realized_pct:
      status === 'Complete' || status === 'Executed'
        ? Number(floatInRange(5, 12, r).toFixed(2))
        : null,
    status,
    approval_routing: 'PM → Commercial Manager → Sponsor',
    executed_week:
      status === 'Complete' || status === 'Executed'
        ? Math.min(currentWeek, intInRange(10, Math.max(11, currentWeek), r))
        : null,
    four_frame_analysis: null,
  };
}

function generateVarianceReports(
  currentWeek: number,
  bucket: LifecycleBucket,
  contractM: number,
  r: () => number,
): GeneratedVarianceReport[] {
  const n = bucket === 'active-early' ? 1 : intInRange(1, 2, r);
  const out: GeneratedVarianceReport[] = [];
  const weeks: number[] = [];
  if (n === 1) {
    weeks.push(Math.max(2, currentWeek - intInRange(0, 4, r)));
  } else {
    weeks.push(Math.floor(currentWeek * 0.5));
    weeks.push(Math.max(2, currentWeek - intInRange(0, 4, r)));
  }

  for (const w of weeks) {
    const cpi = Number(floatInRange(0.92, 1.08, r).toFixed(3));
    const spi = Number(floatInRange(0.9, 1.1, r).toFixed(3));
    const cost_variance_m = Number(((cpi - 1) * contractM * 0.1).toFixed(3));
    const schedule_variance_days = intInRange(-14, 21, r);
    const contingency_consumed_m = Number(floatInRange(0, contractM * 0.025, r).toFixed(3));
    const projected_margin_pct = Number(floatInRange(5.5, 11.5, r).toFixed(2));
    const buffer_intact_days = Math.max(0, intInRange(0, 45, r));
    out.push({
      report_week: w,
      cpi,
      spi,
      cost_variance_m,
      schedule_variance_days,
      contingency_consumed_m,
      projected_margin_pct,
      buffer_intact_days,
      full_report_md: `### Variance — Week ${w}\n\nCPI ${cpi} · SPI ${spi}. Contingency consumed $${contingency_consumed_m.toFixed(2)}M of $${(contractM * 0.04).toFixed(1)}M. Projected margin ${projected_margin_pct.toFixed(1)}%. Buffer intact ${buffer_intact_days} days.`,
    });
  }
  return out;
}

// =============================================================================
// Types for the generated output
// =============================================================================

interface GeneratedRisk {
  risk_id: string;
  category: string;
  description: string;
  probability: Severity;
  impact: Severity;
  score: number;
  response: string;
  owner: string;
  trigger: string;
  status: string;
  cross_cutting_class: string;
  pattern_link: string | null;
}

interface GeneratedIssue {
  issue_id: string;
  description: string;
  category: string;
  severity: Severity;
  owner: string;
  status: string;
  linked_wbs: string[];
  linked_risk: string | null;
  opened_week: number;
  closed_week: number | null;
  closure_narrative: string | null;
}

interface GeneratedChangeOrder {
  co_id: string;
  driver: string;
  scope_summary: string;
  cost_impact_m: number;
  revenue_impact_m: number;
  schedule_impact_days: number;
  margin_realized_pct: number | null;
  status: string;
  approval_routing: string;
  executed_week: number | null;
  four_frame_analysis: null;
}

interface GeneratedVarianceReport {
  report_week: number;
  cpi: number;
  spi: number;
  cost_variance_m: number;
  schedule_variance_days: number;
  contingency_consumed_m: number;
  projected_margin_pct: number;
  buffer_intact_days: number;
  full_report_md: string;
}

interface GeneratedProject {
  archetype_id: string;
  name: string;
  code: string;
  client: string;
  contract_value_initial: number;
  contract_value_current: number;
  approved_budget_initial: number;
  approved_budget_current: number;
  contingency: number;
  segment: string;
  status: 'Active' | 'SC' | 'Closed';
  current_week: number;
  hard_deadline_description: string;
  risks: GeneratedRisk[];
  issues: GeneratedIssue[];
  change_order: GeneratedChangeOrder | null;
  variance_reports: GeneratedVarianceReport[];
}

// =============================================================================
// Main
// =============================================================================

function loadArchetypes(): ProjectArchetype[] {
  const indexPath = path.join(__dirname, '..', 'seed-content', 'archetypes', 'index.json');
  const raw = readFileSync(indexPath, 'utf8');
  const parsed = JSON.parse(raw) as ProjectArchetype[];
  log.info(`Loaded ${parsed.length} archetypes from ${indexPath}`);
  return parsed;
}

function main() {
  log.header('PMO LLM — Phase 2.4 portfolio expansion · step 2: procedural variation');

  const archetypes = loadArchetypes();
  const archetypeById = new Map(archetypes.map((a) => [a.archetype_id, a]));

  // Validate we have the expected 10
  const missing = Object.keys(VARIANTS_PER_ARCHETYPE).filter((id) => !archetypeById.has(id));
  if (missing.length > 0) {
    log.error(`Missing archetypes: ${missing.join(', ')}`);
    process.exit(1);
  }
  const total = Object.values(VARIANTS_PER_ARCHETYPE).reduce((s, n) => s + n, 0);
  log.info(`Target: generate ${total} project variants across ${archetypes.length} archetypes.`);

  const r = rng('pmo-llm-procedural-v1');

  // Lifecycle assignment shuffled once across all 96
  const lifecycleAssignments = makeLifecycleAssignments(total, r);

  // Location pool — shuffle and consume; phases used to break duplicates if needed
  const locationPool = [...LOCATIONS];
  for (let i = locationPool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [locationPool[i], locationPool[j]] = [locationPool[j], locationPool[i]];
  }

  const generated: GeneratedProject[] = [];
  let seqGlobal = 0;
  let lifecycleIdx = 0;

  section('Generating variants');

  for (const [archetypeId, count] of Object.entries(VARIANTS_PER_ARCHETYPE)) {
    const archetype = archetypeById.get(archetypeId)!;
    log.info(`  ${archetypeId}: ${count} variants`);

    for (let i = 0; i < count; i++) {
      const bucket = lifecycleAssignments[lifecycleIdx++];
      const [weekMin, weekMax] = LIFECYCLE_WEEK_RANGES[bucket];
      const currentWeek = intInRange(weekMin, weekMax, r);
      const status = LIFECYCLE_TO_STATUS[bucket];

      // Name + client
      const location =
        locationPool[seqGlobal % locationPool.length] +
        (seqGlobal >= locationPool.length ? ` ${Math.floor(seqGlobal / locationPool.length) + 1}` : '');
      const phase = intInRange(1, 3, r);
      const name = archetype.name_pattern
        .replace(/\{location\}/g, location)
        .replace(/\{phase\}/g, String(phase));
      const clientSuffix = pick(archetype.client_suffixes, r);
      const client = archetype.client_pattern
        .replace(/\{location\}/g, location)
        .replace(/\{client_suffix\}/g, clientSuffix);

      // Financials
      const contractM = floatInRange(archetype.contract_value_min_m, archetype.contract_value_max_m, r);
      const contractInitial = Number((contractM * 1_000_000).toFixed(0));
      const coAdj = 1 + floatInRange(-0.01, 0.04, r);
      const contractCurrent = Number((contractInitial * coAdj).toFixed(0));
      const marginPct = archetype.margin_pct_typical;
      const budgetInitial = Number((contractInitial * (1 - marginPct / 100)).toFixed(0));
      const budgetCurrent = Number((budgetInitial * coAdj).toFixed(0));
      const contingency = Number((budgetInitial * (archetype.contingency_pct_typical / 100)).toFixed(0));

      // Hard deadline — pick one theme from archetype
      const deadlineTheme = pick(archetype.hard_deadline_themes, r);
      const hardDeadlineDescription = deadlineTheme.endsWith('.') ? deadlineTheme : deadlineTheme + '.';

      // Sub-artefacts
      const risks = generateRisks(archetype, bucket, r);
      const issues = generateIssues(archetype, currentWeek, bucket, r);
      const change_order = generateChangeOrder(archetype, currentWeek, contractM, bucket, r);
      const variance_reports = generateVarianceReports(currentWeek, bucket, contractM, r);

      generated.push({
        archetype_id: archetypeId,
        name,
        code: makeProjectCode(archetype.segment, seqGlobal),
        client,
        contract_value_initial: contractInitial,
        contract_value_current: contractCurrent,
        approved_budget_initial: budgetInitial,
        approved_budget_current: budgetCurrent,
        contingency,
        segment: archetype.segment,
        status,
        current_week: currentWeek,
        hard_deadline_description: hardDeadlineDescription,
        risks,
        issues,
        change_order,
        variance_reports,
      });
      seqGlobal++;
    }
  }

  section('Summary');
  const bySegment: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalRisks = 0;
  let totalIssues = 0;
  let totalCos = 0;
  let totalVar = 0;
  for (const p of generated) {
    bySegment[p.segment] = (bySegment[p.segment] ?? 0) + 1;
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    totalRisks += p.risks.length;
    totalIssues += p.issues.length;
    totalCos += p.change_order ? 1 : 0;
    totalVar += p.variance_reports.length;
  }
  for (const [k, v] of Object.entries(bySegment)) log.info(`  Segment ${k}: ${v}`);
  for (const [k, v] of Object.entries(byStatus)) log.info(`  Status ${k}: ${v}`);
  log.info(`  Rows: ${generated.length} projects · ${totalRisks} risks · ${totalIssues} issues · ${totalCos} COs · ${totalVar} variance reports`);

  // Write to JSON
  const outPath = path.join(__dirname, '..', 'seed-content', 'generated-projects.json');
  writeFileSync(outPath, JSON.stringify(generated, null, 2));
  log.success(`Wrote ${generated.length} project specs to ${outPath}`);

  log.header('Step 2 complete. Inspect generated-projects.json, then we author step 3 (DB insert).');
}

main();
