/**
 * Phase 2.4 portfolio expansion — step 1 of 3.
 *
 * Calls Opus 4.7 once to produce 10 realistic EPC project archetypes covering:
 *   - 4 renewables (onshore wind, utility solar, hydro, geothermal)
 *   - 3 water (treatment/wastewater, desalination, conveyance)
 *   - 2 industrial (steel, chemical)
 *   - 1 power (CCGT)
 *
 * Each archetype is a parameterised template that the next step (procedural
 * variation) consumes to spawn ~10 distinct project variants. Output written
 * to scripts/seed-content/archetypes/{index.json, <id>.json...}.
 *
 * Run from pmo-llm-demo/:
 *   npx tsx scripts/generators/01-archetypes.ts
 *
 * Cost: ~$1.50-2.00 (one Opus 4.7 call, ~6-8K output tokens, ~2K input).
 * Time: ~30-90 seconds.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { invokeModel } from '../../lib/openrouter';
import { log, section } from '../lib/log';
import {
  REQUIRED_SEGMENT_COUNTS,
  type ProjectArchetype,
  type Segment,
} from '../lib/archetype-types';

const SYSTEM_PROMPT = `You are an expert EPC (engineering, procurement, construction) project director with 20+ years of cross-portfolio delivery experience across renewables, water infrastructure, heavy industrial, and power generation. You author project archetypes that serve as parameterised templates for realistic test data generation.

You think in PMBOK terms (charter, WBS, risk register with cross-cutting classification) and EPC-commercial terms (fixed-price with shared contingency, LDs, retention, change-order four-frame analysis). You are precise with regulatory framings (federal tax credits, IRA, NEPA, NPDES, FERC, OSHA, EPA, state PUC), realistic with contract sizing, and disciplined about distinguishing what's typical from what's edge-case.`;

const USER_MESSAGE = `Produce a JSON array of EXACTLY 10 EPC project archetypes following the schema below.

REQUIRED segment distribution:
- 4 renewables: onshore-wind-utility, utility-scale-solar, run-of-river-hydro, geothermal-binary-cycle
- 3 water: water-treatment-municipal, seawater-desalination, large-diameter-conveyance
- 2 industrial: steel-mill-modernisation, specialty-chemicals-plant
- 1 power: combined-cycle-gas-turbine

Each archetype represents a CLASS of similar projects, parameterised so that procedural variation can spawn ~10 distinct variants per archetype. Variants share an archetype but differ in location, contract size within range, schedule, status, and specific risk/issue instantiations.

REALISM REQUIREMENTS:
- Use North American EPC terminology and contract conventions
- Contract values: realistic ranges for the archetype's typical project size (e.g., utility-scale solar 30-200 MW projects in the $40-200M range; CCGT 500MW+ in the $400-700M range)
- Hard-deadline themes specific to the archetype (tax credit windows for renewables; permit compliance for water; turnaround windows for industrial; interconnection queue dates for power)
- Risk categories that map cleanly to the seven cross_cutting_class values from the methodology
- Realistic regulatory acronyms: NEPA, NPDES, FERC, OSHA, EPA, USACE, MMS/BOEM, state PUC, AHJ, etc.

SCHEMA — each archetype must conform to:
{
  "archetype_id": "kebab-case-id",
  "segment": "renewables" | "water" | "industrial" | "power",
  "subsegment": "Plain-English description e.g., 'Onshore wind farm — utility-scale (60-100 turbines)'",
  "description": "1-2 sentence positioning of this archetype within the EPC portfolio",
  "name_pattern": "{location} <type> Phase {phase}",
  "client_pattern": "{location} {client_suffix}",
  "client_suffixes": ["5 realistic client-name suffixes specific to this archetype"],
  "contract_value_min_m": <number, in $M>,
  "contract_value_max_m": <number, in $M>,
  "contingency_pct_typical": <number, 3-8 typical>,
  "margin_pct_typical": <number, 6-14 typical>,
  "duration_weeks_min": <number>,
  "duration_weeks_max": <number>,
  "hard_deadline_themes": ["2-4 archetype-specific regulatory/commercial deadline themes"],
  "typical_risks": [
    {
      "category": "Short label e.g., 'Vendor concentration — turbines'",
      "description_template": "Sentence describing the risk; may include {placeholders}",
      "cross_cutting_class": "one of the 7 enum values",
      "likely_probability": "L" | "M" | "H",
      "likely_impact": "L" | "M" | "H"
    }
    // 6-8 typical risks for this archetype, distributed across cross-cutting classes
  ],
  "typical_issues": [
    {
      "category": "Short label e.g., 'Permit timing'",
      "description_template": "Sentence describing the issue",
      "typical_severity": "L" | "M" | "H"
    }
    // 8-10 typical issues
  ],
  "typical_co_drivers": ["4-5 realistic CO driver descriptions for this archetype"]
}

The 7 valid cross_cutting_class values are EXACTLY:
- "Vendor / supplier concentration"
- "Regulatory / external deadline"
- "Site-conditions variance"
- "Resource / labour scarcity"
- "Client-driven scope or sequence changes"
- "Weather / climate-sensitive construction"
- "Project-specific"

OUTPUT FORMAT: Return ONLY the JSON array. No preamble, no postamble, no markdown code fence. Start your response with [ and end with ].`;

interface Stats {
  tokens_used: number | null;
  cost_usd: number | null;
  elapsed_s: number;
}

function stripCodeFence(s: string): string {
  let raw = s.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return raw.trim();
}

function validateArchetypes(archetypes: unknown): ProjectArchetype[] {
  if (!Array.isArray(archetypes)) {
    throw new Error(`Expected an array, got ${typeof archetypes}`);
  }
  if (archetypes.length !== 10) {
    throw new Error(`Expected 10 archetypes, got ${archetypes.length}`);
  }

  const counts: Record<string, number> = {};
  for (const a of archetypes) {
    if (typeof a.archetype_id !== 'string' || !a.archetype_id) {
      throw new Error(`Archetype missing archetype_id: ${JSON.stringify(a).slice(0, 100)}`);
    }
    if (!['renewables', 'water', 'industrial', 'power'].includes(a.segment)) {
      throw new Error(`Archetype ${a.archetype_id} has invalid segment: ${a.segment}`);
    }
    counts[a.segment] = (counts[a.segment] ?? 0) + 1;
  }

  for (const [seg, expected] of Object.entries(REQUIRED_SEGMENT_COUNTS)) {
    const actual = counts[seg] ?? 0;
    if (actual !== expected) {
      log.warn(`Segment ${seg}: expected ${expected}, got ${actual}`);
    } else {
      log.info(`Segment ${seg}: ${actual} ✓`);
    }
  }

  return archetypes as ProjectArchetype[];
}

async function main() {
  log.header('PMO LLM — Phase 2.4 portfolio expansion · step 1: archetypes');

  log.info(`Calling Opus 4.7 for 10 archetypes...`);
  log.info(`Expect ~30-90 seconds and ~$1.50-2.00 in inference cost.`);

  const t0 = Date.now();
  const result = await invokeModel({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: USER_MESSAGE,
  });
  const elapsed_s = (Date.now() - t0) / 1000;

  const stats: Stats = {
    tokens_used: result.tokens_used,
    cost_usd: result.cost_usd,
    elapsed_s,
  };

  log.success(
    `Generated in ${elapsed_s.toFixed(1)}s · ${stats.tokens_used ?? '?'} tokens · $${stats.cost_usd?.toFixed(4) ?? '?'}`,
  );

  section('Parsing & validating');
  const raw = stripCodeFence(result.output_md);
  let archetypes: ProjectArchetype[];
  try {
    archetypes = validateArchetypes(JSON.parse(raw));
  } catch (e) {
    log.error(`Validation failed: ${(e as Error).message}`);
    // Dump raw output so the user can inspect / fix
    const dumpPath = path.join(__dirname, '..', 'seed-content', 'archetypes-raw-failed.txt');
    mkdirSync(path.dirname(dumpPath), { recursive: true });
    writeFileSync(dumpPath, result.output_md);
    log.error(`Raw response dumped to ${dumpPath}`);
    throw e;
  }

  log.success(`All 10 archetypes valid.`);

  section('Writing to disk');
  const outDir = path.join(__dirname, '..', 'seed-content', 'archetypes');
  mkdirSync(outDir, { recursive: true });

  const indexPath = path.join(outDir, 'index.json');
  writeFileSync(indexPath, JSON.stringify(archetypes, null, 2));
  log.success(`Index: ${indexPath}`);

  for (const a of archetypes) {
    const file = path.join(outDir, `${a.archetype_id}.json`);
    writeFileSync(file, JSON.stringify(a, null, 2));
    log.info(`  ${a.archetype_id} (${a.segment}) → ${a.subsegment}`);
  }

  log.header('Step 1 complete. Inspect the archetypes, then run step 2.');
  log.info(`Next: npx tsx scripts/generators/02-procedural.ts`);
}

main().catch((err) => {
  log.error(`Archetype generation failed: ${(err as Error).stack ?? err}`);
  process.exit(1);
});
