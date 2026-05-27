/**
 * Mariposa agent outputs — 26 audit-log entries.
 *
 * Seeds the agent_outputs table with the full 26-run Phase 1 lifecycle
 * simulation. Each entry maps a run file to its agent_type, iteration label,
 * user prompt, and full markdown output. Invoked-by-role defaults to the PM
 * (Senior PM role) since all 26 runs were executed by the project owner during
 * the lifecycle simulation.
 *
 * Timestamps are spaced sequentially across 2026-05-21 to 2026-05-24 to
 * preserve chronological order for UI sorting.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

const SEED_CONTENT_DIR = join(__dirname, '..', 'seed-content', 'mariposa', 'runs');

interface AgentRun {
  run_file: string;
  agent_type: string;
  iteration: 'Week 0' | 'Week 28' | 'Week 52' | 'Week 78';
  user_prompt: string;
  /** Minutes offset from BASE_TIMESTAMP for chronological ordering. */
  offset_min: number;
}

const BASE_TIMESTAMP = new Date('2026-05-21T08:00:00Z').getTime();

const runs: AgentRun[] = [
  // Phase 1 baseline (Week 0) — 13 agents
  {
    run_file: 'run01c_charter_mariposa_opus47_v4skyhawk.md',
    agent_type: 'charter_drafter',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa Wind Farm Phase 1 award-stage project charter from intake.',
    offset_min: 0,
  },
  {
    run_file: 'run07_stakeholder_mariposa.md',
    agent_type: 'stakeholder_analyst',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa stakeholder register with influence/interest mapping and engagement strategy.',
    offset_min: 60,
  },
  {
    run_file: 'run08_wbs_mariposa.md',
    agent_type: 'wbs_builder',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa Work Breakdown Structure with branch decomposition rationale.',
    offset_min: 120,
  },
  {
    run_file: 'run09_schedule_mariposa.md',
    agent_type: 'schedule_reasoner',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa schedule analysis with critical-path chain breakdown and convergence-point reasoning.',
    offset_min: 180,
  },
  {
    run_file: 'run10_budget_mariposa.md',
    agent_type: 'budget_builder',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa budget baseline with WBS-branch P50 figures and contingency allocation against the risk register.',
    offset_min: 240,
  },
  {
    run_file: 'run11_comms_mariposa.md',
    agent_type: 'communications_planner',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa communications plan with stakeholder cadences, escalation protocols, and crisis-class enumeration.',
    offset_min: 300,
  },
  {
    run_file: 'run12_issue_log_mariposa.md',
    agent_type: 'issue_logger',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa Week 0 issue log with the 20 baseline intake items and provisional lessons.',
    offset_min: 360,
  },
  {
    run_file: 'run13_variance_mariposa.md',
    agent_type: 'variance_analyst',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa Week 0 variance measurement framework (pre-execution; no populated variance yet).',
    offset_min: 420,
  },
  {
    run_file: 'run14_change_order_mariposa.md',
    agent_type: 'change_order_reviewer',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa Week 0 change-order framework with anticipated change-order categories.',
    offset_min: 480,
  },
  {
    run_file: 'run15_lessons_learned_mariposa.md',
    agent_type: 'lessons_learned_synthesiser',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa Week 0 lessons-learned framework with theme structure and lessons-to-track.',
    offset_min: 540,
  },
  {
    run_file: 'run16_closeout_mariposa.md',
    agent_type: 'closeout_reporter',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa Week 0 closeout-report framework (pre-execution scaffold).',
    offset_min: 600,
  },
  {
    run_file: 'run17_portfolio_review_mariposa.md',
    agent_type: 'portfolio_risk_reviewer',
    iteration: 'Week 0',
    user_prompt: 'Produce the Northwood portfolio risk review with Mariposa added at Week 0 baseline state.',
    offset_min: 660,
  },
  {
    run_file: 'run18_risk_register_mariposa.md',
    agent_type: 'risk_analyst',
    iteration: 'Week 0',
    user_prompt: 'Produce the Mariposa Week 0 risk register using Risk Analyst v3 with cross-cutting awareness.',
    offset_min: 720,
  },

  // Iteration 1 (Week 28) — 3 agents
  {
    run_file: 'run19_issue_log_mariposa_week28.md',
    agent_type: 'issue_logger',
    iteration: 'Week 28',
    user_prompt: 'Update the Mariposa issue log for Week 28 (mid-civil construction state) per the events brief.',
    offset_min: 1440 * 1,
  },
  {
    run_file: 'run20_risk_register_mariposa_week28.md',
    agent_type: 'risk_analyst',
    iteration: 'Week 28',
    user_prompt: 'Update the Mariposa risk register for Week 28 with R-009 partial-realisation discipline.',
    offset_min: 1440 * 1 + 60,
  },
  {
    run_file: 'run21_variance_mariposa_week28.md',
    agent_type: 'variance_analyst',
    iteration: 'Week 28',
    user_prompt: 'Produce the Mariposa Week 28 mid-civil populated variance report.',
    offset_min: 1440 * 1 + 120,
  },

  // Iteration 2 (Week 52) — 4 agents
  {
    run_file: 'run22_issue_log_mariposa_week52.md',
    agent_type: 'issue_logger',
    iteration: 'Week 52',
    user_prompt: 'Update the Mariposa issue log for Week 52 (mid-erection state).',
    offset_min: 1440 * 2,
  },
  {
    run_file: 'run23_risk_register_mariposa_week52.md',
    agent_type: 'risk_analyst',
    iteration: 'Week 52',
    user_prompt: 'Update the Mariposa risk register for Week 52 with four transitions and three partial-realisations.',
    offset_min: 1440 * 2 + 60,
  },
  {
    run_file: 'run24_variance_mariposa_week52.md',
    agent_type: 'variance_analyst',
    iteration: 'Week 52',
    user_prompt: 'Produce the Mariposa Week 52 mid-erection populated variance report.',
    offset_min: 1440 * 2 + 120,
  },
  {
    run_file: 'run25_co001_mariposa_week52.md',
    agent_type: 'change_order_reviewer',
    iteration: 'Week 52',
    user_prompt: 'Produce the CO-001 four-frame commercial dynamics analysis for the SCADA portfolio integration.',
    offset_min: 1440 * 2 + 180,
  },

  // Iteration 3 (Week 78 — Substantial Completion) — 6 agents
  {
    run_file: 'run26_issue_log_mariposa_week78.md',
    agent_type: 'issue_logger',
    iteration: 'Week 78',
    user_prompt: 'Update the Mariposa issue log for Week 78 closeout state.',
    offset_min: 1440 * 3,
  },
  {
    run_file: 'run27_risk_register_mariposa_week78.md',
    agent_type: 'risk_analyst',
    iteration: 'Week 78',
    user_prompt: 'Produce the Mariposa Week 78 closing-state risk register with the three-category closeout taxonomy.',
    offset_min: 1440 * 3 + 60,
  },
  {
    run_file: 'run28_variance_mariposa_week78.md',
    agent_type: 'variance_analyst',
    iteration: 'Week 78',
    user_prompt: 'Produce the Mariposa final SC variance report.',
    offset_min: 1440 * 3 + 120,
  },
  {
    run_file: 'run29_closeout_mariposa_week78.md',
    agent_type: 'closeout_reporter',
    iteration: 'Week 78',
    user_prompt: 'Produce the Mariposa Substantial Completion closeout report against the full execution arc.',
    offset_min: 1440 * 3 + 180,
  },
  {
    run_file: 'run30_lessons_mariposa_week78.md',
    agent_type: 'lessons_learned_synthesiser',
    iteration: 'Week 78',
    user_prompt: 'Produce the Mariposa Substantial Completion lessons-learned synthesis against the full execution arc.',
    offset_min: 1440 * 3 + 240,
  },
  {
    run_file: 'run31_portfolio_mariposa_week78.md',
    agent_type: 'portfolio_risk_reviewer',
    iteration: 'Week 78',
    user_prompt: 'Produce the Iteration 3 portfolio risk review with Mariposa closeout-grade evidence.',
    offset_min: 1440 * 3 + 300,
  },
];

export async function seedMariposaAgentOutputs(
  supabase: SupabaseClient,
  projectId: string,
  pmRoleId: string,
): Promise<{ inserted: number }> {
  // Clear existing Mariposa agent outputs first to keep the seed idempotent
  // (no natural-key unique constraint on this table so we delete + insert)
  const { error: deleteErr } = await supabase
    .from('agent_outputs')
    .delete()
    .eq('project_id', projectId);

  if (deleteErr) {
    throw new Error(`Failed to clear existing agent outputs: ${deleteErr.message}`);
  }

  const rows = runs.map((run) => {
    const filePath = join(SEED_CONTENT_DIR, run.run_file);
    const output_md = readFileSync(filePath, 'utf-8');
    const invoked_at = new Date(BASE_TIMESTAMP + run.offset_min * 60_000).toISOString();
    return {
      project_id: projectId,
      agent_type: run.agent_type,
      invoked_by_role_id: pmRoleId,
      invoked_at,
      user_prompt: run.user_prompt,
      input_payload: { iteration: run.iteration, run_file: run.run_file },
      output_md,
      tokens_used: null,
      cost_usd: null,
    };
  });

  const { error, count } = await supabase
    .from('agent_outputs')
    .insert(rows, { count: 'exact' });

  if (error) {
    throw new Error(`Failed to insert Mariposa agent outputs: ${error.message}`);
  }

  return { inserted: count ?? rows.length };
}
