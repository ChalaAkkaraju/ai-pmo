/**
 * Canonical issue category buckets.
 *
 * The seeded issue log uses ~99 highly specific free-text categories
 * ("Water-treatment startup", "GT rotor handling", "DCS configuration delay",
 * "Marine mammal observer stand-down" …) which are too granular for an
 * analytics breakdown. We roll them up to a standard PMO set, used both for
 * display and (via migration 0012) for the underlying data.
 *
 * Rule ORDER matters — first match wins. The order below was tuned against the
 * full distinct-category list so e.g. "First-fire delay" → Commissioning (not
 * Schedule), "OEM commissioning engineer shortage" → Resource (not
 * Commissioning), and "Generator stator delivery" → Procurement (not Technical).
 * Migration 0012 mirrors this order exactly.
 */

export type CanonicalIssueCategory =
  | 'Commissioning & startup'
  | 'Technical / engineering'
  | 'Procurement & vendor'
  | 'Site & geotechnical'
  | 'HSE & environmental'
  | 'Permitting & regulatory'
  | 'Quality & compliance'
  | 'Schedule & delays'
  | 'Stakeholder & communications'
  | 'Resource & labour'
  | 'Weather'
  | 'Commercial & change'
  | 'Other';

/** Display order for charts/legends. */
export const CANONICAL_ISSUE_CATEGORIES: CanonicalIssueCategory[] = [
  'Commissioning & startup',
  'Technical / engineering',
  'Procurement & vendor',
  'Site & geotechnical',
  'HSE & environmental',
  'Permitting & regulatory',
  'Quality & compliance',
  'Schedule & delays',
  'Stakeholder & communications',
  'Resource & labour',
  'Weather',
  'Commercial & change',
  'Other',
];

// Ordered keyword rules. FIRST match wins — keep this order in sync with 0012.
const RULES: Array<[RegExp, CanonicalIssueCategory]> = [
  // 1. Resource/labour signals first (so "commissioning engineer shortage" → Resource)
  [/attrition|shortage|manpower|staffing|recruit|turnover|\bcraft\b|\blabou?r\b|personnel/i, 'Resource & labour'],
  // 2. Permit-to-work is a SAFETY system → HSE (before the generic permit rule)
  [/permit.?to.?work/i, 'HSE & environmental'],
  // 3. Commissioning / startup / testing
  [/commission|startup|start-up|start up|first.?fire|energis|energiz|punch.?list|hand.?over|hydrotest|leak test|refractory|\bcure\b|charging|working.?fluid|membrane fouling|\btraining\b/i, 'Commissioning & startup'],
  // 4. HSE / safety / environmental
  [/\bhse\b|safety|\bh&s\b|\behs\b|incident|injur|near.?miss|spill|environment|marine\s*mammal|wildlife|avian|mortality|\bfish\b|emission|noise|dust|odou?r|ecolog|contaminat|hazardous|\bwaste\b|h2s|turbidity|sediment|stormwater|\bbmp\b|containment/i, 'HSE & environmental'],
  // 5. Permitting / regulatory
  [/permit|regulat|consent|licen[cs]e|statutory|notice to proceed|\bntp\b|usace|title v|cultural resource|archaeolog|railroad|crossing/i, 'Permitting & regulatory'],
  // 6. Procurement / vendor / logistics
  [/procure|vendor|supplier|supply|delivery|lead\s*time|sole.?source|purchase\s*order|expedit|logistic|shipment|customs|transit|transport|\bblade\b/i, 'Procurement & vendor'],
  // 7. Site / geotechnical / civil
  [/geotech|soil|ground\s*condition|excavat|demolition|site\s*condition|condition\s*surprise|civil|foundation|piling|\bpile\b|dewater|earthwork|access\s*road|laydown|trench|\bhdd\b|frac.?out|hdpe|pipe pull|cofferdam|utility strike|\bstrike\b|clearing|gen-tie|wellpad/i, 'Site & geotechnical'],
  // 8. Quality / NDE / inspection
  [/quality|\bnde\b|\bndt\b|non.?conformance|\bncr\b|defect|rework|weld|inspection|qa.?qc|material\s*cert|welder/i, 'Quality & compliance'],
  // 9. Commercial / change / claims
  [/commercial|change\s*order|variation|claim|contract|painshare|liquidated|\bld\b|scope\s*change|baseline\s*change|buy america|domestic content/i, 'Commercial & change'],
  // 10. Stakeholder / communications
  [/stakeholder|communicat|client\s*relation|community|public|engagement|landowner|dispute|complaint/i, 'Stakeholder & communications'],
  // 11. Technical / engineering (broad)
  [/technical|engineer|design|\bdcs\b|control\s*system|software|configurat|rotor|turbine|\bgt\b|\bgsu\b|electrical|mechanical|piping|\bpipe\b|coating|tie-?in|tie outage|transmission|instrument|scada|interface|specification|drawing|\brfi\b|p&id|revision|process\s*safety|\bpsm\b|\bmoc\b|tracker|torque|vibration|\berd\b|\bpump\b|\bvfd\b|corrosion|cooling|brine|diffuser|insulation|intake|membrane|inverter/i, 'Technical / engineering'],
  // 12. Weather
  [/weather|storm|rain|wind|flood|snow|\bice\b|heat|\bcold\b|climate|seasonal|winter/i, 'Weather'],
  // 13. Schedule / delays (last)
  [/schedul|delay|slip|critical\s*path|float|milestone|sequenc|timing|behind\s*plan|overrun|congestion/i, 'Schedule & delays'],
];

export function canonicalIssueCategory(raw: string | null | undefined): CanonicalIssueCategory {
  const s = (raw ?? '').trim();
  if (!s) return 'Other';
  for (const [re, group] of RULES) {
    if (re.test(s)) return group;
  }
  return 'Other';
}
