/**
 * Shared types for the portfolio-expansion generator chain.
 *
 * The archetype generator (01-archetypes.ts) produces N archetypes via Opus 4.7
 * conforming to this schema. The procedural variation generator (02-procedural.ts)
 * consumes them to spawn ~10 distinct project variants per archetype.
 */

export type Segment = 'renewables' | 'water' | 'industrial' | 'power';

export type CrossCuttingClass =
  | 'Vendor / supplier concentration'
  | 'Regulatory / external deadline'
  | 'Site-conditions variance'
  | 'Resource / labour scarcity'
  | 'Client-driven scope or sequence changes'
  | 'Weather / climate-sensitive construction'
  | 'Project-specific';

export type Severity = 'L' | 'M' | 'H';

export interface ArchetypeRiskTemplate {
  category: string;
  description_template: string;
  cross_cutting_class: CrossCuttingClass;
  likely_probability: Severity;
  likely_impact: Severity;
}

export interface ArchetypeIssueTemplate {
  category: string;
  description_template: string;
  typical_severity: Severity;
}

export interface ProjectArchetype {
  archetype_id: string;
  segment: Segment;
  subsegment: string;
  description: string;

  name_pattern: string;
  client_pattern: string;
  client_suffixes: string[];

  contract_value_min_m: number;
  contract_value_max_m: number;
  contingency_pct_typical: number;
  margin_pct_typical: number;

  duration_weeks_min: number;
  duration_weeks_max: number;

  hard_deadline_themes: string[];

  typical_risks: ArchetypeRiskTemplate[];
  typical_issues: ArchetypeIssueTemplate[];
  typical_co_drivers: string[];
}

/** Required segment distribution for the 10-archetype set. */
export const REQUIRED_SEGMENT_COUNTS: Record<Segment, number> = {
  renewables: 4,
  water: 3,
  industrial: 2,
  power: 1,
};
