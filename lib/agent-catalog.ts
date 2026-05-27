/**
 * Agent catalog — plain-English descriptions of each of the 13 specialists.
 *
 * Used by the public /access/<token>/agents page so colleagues can browse
 * what each agent can and can't do before invoking one.
 *
 * Each entry follows the same shape so the catalog page can render uniformly:
 *   - purpose: one-line statement of what the agent produces
 *   - scope: 'project' | 'portfolio' | 'single-item'
 *   - does: 3-5 things the agent does well
 *   - doesNot: 1-3 things the agent does NOT do (helps calibrate)
 *   - samplePrompt: a concrete example you can paste straight into Ask agent
 *   - methodology: short reference for what the agent's prompt is anchored to
 */

import type { AgentType } from './types';

export type AgentScope = 'project' | 'portfolio' | 'single-item';

export interface AgentCatalogEntry {
  agent_type: AgentType;
  name: string;
  /** Short tagline shown in the card header. */
  purpose: string;
  scope: AgentScope;
  does: string[];
  doesNot: string[];
  samplePrompt: string;
  methodology: string;
}

export const AGENT_CATALOG: AgentCatalogEntry[] = [
  {
    agent_type: 'charter_drafter',
    name: 'Charter Drafter',
    purpose: 'Drafts the foundational project charter — scope, deliverables, milestones, governance.',
    scope: 'project',
    does: [
      'Composes the 12-section Northwood charter from intake data',
      'Defines in-scope / out-of-scope boundaries',
      'Documents milestones, governance, and assumptions',
      'Flags inferred values with "[NEEDS PM REVIEW: …]"',
    ],
    doesNot: [
      'Doesn\'t analyse schedule detail (use Schedule Reasoner)',
      'Doesn\'t generate the WBS (use WBS Builder)',
    ],
    samplePrompt: 'Draft the charter for our new utility-scale solar project.',
    methodology: 'Northwood charter template · PMBOK Section 4.1 Develop Project Charter',
  },
  {
    agent_type: 'stakeholder_analyst',
    name: 'Stakeholder Analyst',
    purpose: 'Produces the stakeholder register + engagement strategy.',
    scope: 'project',
    does: [
      'Identifies 12-15 stakeholder roles across client, regulator, community, vendor, internal',
      'Classifies by influence and interest',
      'Recommends engagement cadence and channels per role',
    ],
    doesNot: [
      'Doesn\'t make political judgements about specific named individuals',
      'Doesn\'t draft the comms plan itself (use Communications Planner)',
    ],
    samplePrompt: 'Build the stakeholder register for this project.',
    methodology: 'Northwood stakeholder template · PMBOK 13 Stakeholder Management',
  },
  {
    agent_type: 'wbs_builder',
    name: 'WBS Builder',
    purpose: 'Builds the Work Breakdown Structure with deliverable-oriented decomposition.',
    scope: 'project',
    does: [
      '7-9 Level-1 branches, Level-2 and Level-3 decomposition',
      'Applies PMBOK 100% rule',
      'Adds a dictionary entry for the top 5+ work packages',
    ],
    doesNot: [
      'Doesn\'t generate Gantt charts or schedule dates',
      'Doesn\'t do effort estimation',
    ],
    samplePrompt: 'Build the WBS for this project at Level 1-3.',
    methodology: 'PMBOK 5.4 Create WBS · deliverable-oriented · 100% rule',
  },
  {
    agent_type: 'schedule_reasoner',
    name: 'Schedule Reasoner',
    purpose: 'Reasons about the project schedule — critical path, milestones, float, sequencing risk.',
    scope: 'project',
    does: [
      'Identifies the critical path (~6-9 milestones)',
      'Calls out float and sequencing logic',
      'Flags schedule risks tied to specific deliverables',
    ],
    doesNot: [
      'Doesn\'t produce Primavera/MS Project schedules with actual dates',
      'Doesn\'t commit owners or durations without PM input',
    ],
    samplePrompt: 'What\'s the critical path through this project? What\'s most at risk?',
    methodology: 'PMBOK 6 Schedule Management · critical path analysis',
  },
  {
    agent_type: 'budget_builder',
    name: 'Budget Builder',
    purpose: 'Builds the cost breakdown structure with category allocation and cost-loading.',
    scope: 'project',
    does: [
      'Allocates budget across engineering / procurement / construction / commissioning / contingency / management reserve',
      'Documents cost-loading curve assumptions',
      'Flags inferred allocations for PM review',
    ],
    doesNot: [
      'Doesn\'t generate ERP cost codes',
      'Doesn\'t model future actuals (no forecast engine)',
    ],
    samplePrompt: 'Build the cost breakdown structure for this project — allocate budget across major categories.',
    methodology: 'Northwood CBS template · PMBOK Cost Management',
  },
  {
    agent_type: 'communications_planner',
    name: 'Communications Planner',
    purpose: 'Produces the communications management plan.',
    scope: 'project',
    does: [
      'Maps stakeholder communication needs',
      'Recommends cadence, channels, and escalation paths',
      'Provides reporting templates per audience',
    ],
    doesNot: [
      'Doesn\'t send actual emails or schedule meetings',
      'Doesn\'t replace stakeholder facilitation',
    ],
    samplePrompt: 'Build the comms plan for this project.',
    methodology: 'Northwood comms-plan template · PMBOK 10 Communications Management',
  },
  {
    agent_type: 'issue_logger',
    name: 'Issue Logger',
    purpose: 'Reviews the issue log and prioritises outstanding items.',
    scope: 'project',
    does: [
      'Severity and age analysis',
      'Identifies ownership clarity gaps',
      'Highlights items blocking closeout',
    ],
    doesNot: [
      'Doesn\'t resolve issues itself',
      'Doesn\'t assign new owners',
    ],
    samplePrompt: 'Summarise the open issue log; flag H-severity items still outstanding.',
    methodology: 'PMBOK Issue Log practice',
  },
  {
    agent_type: 'variance_analyst',
    name: 'Variance Analyst',
    purpose: 'Analyses CPI/SPI, cost & schedule variance, contingency consumption.',
    scope: 'project',
    does: [
      'Summarises the latest variance report',
      'Shows trend across reporting weeks',
      'Flags threshold concerns and projected margin',
    ],
    doesNot: [
      'Doesn\'t produce portfolio-wide trend (use Portfolio Risk Reviewer for that)',
      'Doesn\'t replace formal monthly variance committee review',
    ],
    samplePrompt: 'Summarise the variance position at the most recent reporting week and flag threshold concerns.',
    methodology: 'PMBOK Earned Value Management (EVM)',
  },
  {
    agent_type: 'change_order_reviewer',
    name: 'Change Order Reviewer',
    purpose: 'Reviews a single change order with four-frame commercial analysis.',
    scope: 'single-item',
    does: [
      'Scope / schedule / cost / contractual basis analysis',
      'Assesses margin protection adequacy',
      'Recommends approval routing',
    ],
    doesNot: [
      'Doesn\'t generate new change orders',
      'Doesn\'t negotiate commercial terms',
    ],
    samplePrompt: 'Review CO-001 — assess whether margin protection was sufficient.',
    methodology: 'Northwood four-frame commercial analysis',
  },
  {
    agent_type: 'risk_analyst',
    name: 'Risk Analyst',
    purpose: 'Project risk register narrative — classification, status, response stance.',
    scope: 'project',
    does: [
      'Assigns cross-cutting risk class (vendor, regulatory, site-conditions, etc.)',
      'Writes 2-4 sentence analysis per risk',
      'Identifies trigger conditions and status changes',
      'Surfaces the top three risks to watch',
    ],
    doesNot: [
      'Doesn\'t do cross-portfolio pattern analysis (use Portfolio Risk Reviewer)',
      'Doesn\'t recommend mitigations without project context',
    ],
    samplePrompt: 'Review the current risk register; flag the top three to watch through the warranty tail.',
    methodology: 'PMBOK 7 Risk Management · Northwood cross-cutting taxonomy (6 classes)',
  },
  {
    agent_type: 'lessons_learned_synthesiser',
    name: 'Lessons-Learned Synthesiser',
    purpose: 'Synthesises lessons learned using situation / action / outcome / generalisation.',
    scope: 'project',
    does: [
      'Identifies 6-10 lessons across technical / commercial / schedule / stakeholder themes',
      'Maps lessons to adoption pathway recommendations',
      'Hedges uncertain causation with PM-review flags',
    ],
    doesNot: [
      'Doesn\'t replace post-mortem facilitation',
      'Doesn\'t have the team\'s tacit knowledge — only what\'s in the data',
    ],
    samplePrompt: 'Identify the top three firm-level lessons from this project.',
    methodology: 'Northwood lessons template (situation → action → outcome → generalised lesson)',
  },
  {
    agent_type: 'closeout_reporter',
    name: 'Closeout Reporter',
    purpose: 'Drafts the project closeout report.',
    scope: 'project',
    does: [
      'Final cost & schedule outcome vs baseline',
      'Scope-change history and risk closeout',
      'Lessons captured and outstanding items',
    ],
    doesNot: [
      'Doesn\'t trigger contract closeout activities',
      'Doesn\'t close out warranty claims',
    ],
    samplePrompt: 'Draft the executive summary for the closeout report based on current project state.',
    methodology: 'Northwood closeout template · PMBOK Close Project',
  },
  {
    agent_type: 'portfolio_risk_reviewer',
    name: 'Portfolio Risk Reviewer',
    purpose: 'Cross-portfolio risk pattern emergence — sees patterns across projects, not within one.',
    scope: 'portfolio',
    does: [
      'Detects patterns that appear in 3+ projects',
      'Aggregates by cross-cutting class (vendor, regulatory, site-conditions, etc.)',
      'Recommends portfolio-level mitigation strategies',
      'Maintains the firm-level pattern catalogue',
    ],
    doesNot: [
      'Doesn\'t do single-project deep dives (use Risk Analyst)',
      'Doesn\'t produce a project risk register',
    ],
    samplePrompt: 'Across the active portfolio, which vendor categories appear in the most realised risks?',
    methodology: 'Northwood cross-cutting taxonomy · pattern-threshold analytic (2+ project rule)',
  },
];

/** Lookup helper. */
export function getCatalogEntry(agentType: AgentType): AgentCatalogEntry | undefined {
  return AGENT_CATALOG.find((e) => e.agent_type === agentType);
}
