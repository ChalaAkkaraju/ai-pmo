/**
 * Worked examples library — 16 entries.
 *
 * Loads the past-project worked examples from scripts/seed-content/archive/
 * into the worked_examples table. Each entry maps an agent type to its
 * canonical worked example (per the Build Rulebook §2.1 pairing).
 *
 * Three additional "context_brief" entries for the past-project briefs (which
 * are not worked examples themselves but provide the project background each
 * agent uses when reasoning about Northwood firm conventions).
 *
 * The `embedding` column is left NULL — Phase 2.2 sub-task 3 deliberately
 * skips embedding generation. Semantic retrieval is not needed for agent
 * invocation because the lifecycle simulation uses deterministic
 * agent → worked-example pairing. Embeddings can be added later when a
 * spending decision on an embedding API is taken.
 *
 * Data extracted from PMO_LLM_Test_Pack/archive/ (copied at seed time).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

const ARCHIVE_DIR = join(__dirname, '..', 'seed-content', 'archive');

interface WorkedExample {
  agent_type: string;
  past_project: string;
  artefact_name: string;
  archive_path: string;
}

const workedExamples: WorkedExample[] = [
  // Context briefs (background for each past project)
  {
    agent_type: 'context_brief',
    past_project: 'Skyhawk Solar',
    artefact_name: 'Project brief',
    archive_path: 'p2_skyhawk_solar/00_brief.md',
  },
  {
    agent_type: 'context_brief',
    past_project: 'Riverside Water',
    artefact_name: 'Project brief',
    archive_path: 'p1_riverside_water/00_brief.md',
  },
  {
    agent_type: 'context_brief',
    past_project: 'Ironvale Smelter',
    artefact_name: 'Project brief',
    archive_path: 'p3_ironvale_smelter/00_brief.md',
  },

  // Charter Drafter — Skyhawk canonical (v4-style inline annotation)
  {
    agent_type: 'charter_drafter',
    past_project: 'Skyhawk Solar',
    artefact_name: 'Project charter',
    archive_path: 'p2_skyhawk_solar/01_charter.md',
  },

  // Stakeholder Analyst — Riverside
  {
    agent_type: 'stakeholder_analyst',
    past_project: 'Riverside Water',
    artefact_name: 'Stakeholder register',
    archive_path: 'p1_riverside_water/01b_stakeholder_register.md',
  },

  // WBS Builder — Ironvale
  {
    agent_type: 'wbs_builder',
    past_project: 'Ironvale Smelter',
    artefact_name: 'Work Breakdown Structure',
    archive_path: 'p3_ironvale_smelter/01c_wbs.md',
  },

  // Schedule Reasoner — Riverside
  {
    agent_type: 'schedule_reasoner',
    past_project: 'Riverside Water',
    artefact_name: 'Schedule analysis',
    archive_path: 'p1_riverside_water/01d_schedule_analysis.md',
  },

  // Budget Builder — Skyhawk
  {
    agent_type: 'budget_builder',
    past_project: 'Skyhawk Solar',
    artefact_name: 'Budget baseline',
    archive_path: 'p2_skyhawk_solar/01e_budget_baseline.md',
  },

  // Communications Planner — Riverside
  {
    agent_type: 'communications_planner',
    past_project: 'Riverside Water',
    artefact_name: 'Communications plan',
    archive_path: 'p1_riverside_water/01f_communications_plan.md',
  },

  // Issue Logger — Ironvale (closeout-state log)
  {
    agent_type: 'issue_logger',
    past_project: 'Ironvale Smelter',
    artefact_name: 'Issue log (closeout state)',
    archive_path: 'p3_ironvale_smelter/01g_issue_log.md',
  },

  // Variance Analyst — Skyhawk (mid-execution Week 28 of 60)
  {
    agent_type: 'variance_analyst',
    past_project: 'Skyhawk Solar',
    artefact_name: 'Variance analysis (Week 28 mid-execution)',
    archive_path: 'p2_skyhawk_solar/01h_variance_analysis.md',
  },

  // Change Order Reviewer — Riverside (documented mid-construction CO-003)
  {
    agent_type: 'change_order_reviewer',
    past_project: 'Riverside Water',
    artefact_name: 'Change order analysis (UV CO-003)',
    archive_path: 'p1_riverside_water/01i_change_order_analysis.md',
  },

  // Lessons-Learned Synthesiser — Ironvale (closeout synthesis)
  {
    agent_type: 'lessons_learned_synthesiser',
    past_project: 'Ironvale Smelter',
    artefact_name: 'Lessons-learned synthesis',
    archive_path: 'p3_ironvale_smelter/01j_lessons_learned.md',
  },

  // Closeout Reporter — Skyhawk (closeout report)
  {
    agent_type: 'closeout_reporter',
    past_project: 'Skyhawk Solar',
    artefact_name: 'Project closeout report',
    archive_path: 'p2_skyhawk_solar/01k_closeout_report.md',
  },

  // Risk Analyst (v3) — Ironvale risk register
  {
    agent_type: 'risk_analyst',
    past_project: 'Ironvale Smelter',
    artefact_name: 'Project risk register',
    archive_path: 'p3_ironvale_smelter/04_risk_register.md',
  },

  // Portfolio Risk Reviewer — notional Q2 last-fiscal-year portfolio review
  {
    agent_type: 'portfolio_risk_reviewer',
    past_project: 'Northwood Portfolio (Q2 prior fiscal year)',
    artefact_name: 'Quarterly portfolio risk review',
    archive_path: '_portfolio/00_portfolio_risk_review.md',
  },
];

export async function seedWorkedExamples(
  supabase: SupabaseClient,
): Promise<{ inserted: number }> {
  const rows = workedExamples.map((we) => {
    const filePath = join(ARCHIVE_DIR, we.archive_path);
    const content_md = readFileSync(filePath, 'utf-8');
    return {
      agent_type: we.agent_type,
      past_project: we.past_project,
      artefact_name: we.artefact_name,
      content_md,
      embedding: null, // deferred — agent invocation uses deterministic pairing, not semantic retrieval
    };
  });

  const { error, count } = await supabase
    .from('worked_examples')
    .upsert(rows, {
      onConflict: 'agent_type,past_project,artefact_name',
      count: 'exact',
    });

  if (error) {
    throw new Error(`Failed to upsert worked examples: ${error.message}`);
  }

  return { inserted: count ?? rows.length };
}
