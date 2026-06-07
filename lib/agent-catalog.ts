/**
 * Agent catalog — plain-English descriptions of each of the 13 specialists.
 *
 * Used by the public /access/<token>/agents page so colleagues can browse
 * what each agent can and can't do before invoking one.
 *
 * Each entry follows the same shape so the catalog page can render uniformly:
 *   - purpose: one-line tagline (card header / quick scan)
 *   - plain: 2-3 sentence plain-English explanation for business users —
 *            what the agent does, why you'd use it, what you get back.
 *            No AI jargon; PM domain terms (charter, WBS, etc.) are fine
 *            because the audience are PMs/program managers.
 *   - scope: 'project' | 'portfolio' | 'single-item'
 *   - does: 3-5 things the agent does well
 *   - doesNot: 1-3 things the agent does NOT do (helps calibrate)
 *   - samplePrompt: a concrete example you can paste straight into Ask AI Assistant
 *   - methodology: the standard the agent follows, in plain language with the
 *                  formal reference kept for credibility.
 *
 * Accuracy note: every quantitative claim here is grounded against the agent's
 * own system prompt in lib/agent-prompts/ and the worked examples in
 * scripts/seed-content/archive/. See docs/interview-prep.md Q16 for why.
 */

import type { AgentType } from './types';

export type AgentScope = 'project' | 'portfolio' | 'single-item';

export interface AgentCatalogEntry {
  agent_type: AgentType;
  name: string;
  /** Short tagline shown in the card header. */
  purpose: string;
  /** 2-3 sentence plain-English explanation for business users. */
  plain: string;
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
    plain:
      'Every project starts with a charter — the founding document that sets out what you’re delivering, what’s in and out of scope, the major milestones, and who’s accountable. Instead of starting from a blank page, this agent writes a complete first-draft charter from your project’s intake information, ready for you to review and refine. Anywhere it had to make an assumption, it marks it clearly as "NEEDS PM REVIEW" so nothing slips through unchecked.',
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
    methodology:
      'Follows the PMBOK standard for developing a project charter (§4.1), using Northwood’s charter template.',
  },
  {
    agent_type: 'stakeholder_analyst',
    name: 'Stakeholder Analyst',
    purpose: 'Produces the stakeholder register + engagement strategy.',
    plain:
      'Knowing who has a stake in your project — and how much influence and interest each one holds — shapes how you communicate and where you spend your attention. This agent builds your stakeholder register: it identifies the people and groups involved across the client, regulators, the community, vendors, and your own team, and classifies each by how much sway they hold and how closely they’re watching. You get a ready-to-review register plus a first cut at how to engage each group.',
    scope: 'project',
    does: [
      'Identifies 10-18 stakeholder roles across client, regulator, community, vendor, internal',
      'Classifies by influence and interest',
      'Recommends engagement cadence and channels per role',
    ],
    doesNot: [
      'Doesn\'t make political judgements about specific named individuals',
      'Doesn\'t draft the comms plan itself (use Communications Planner)',
    ],
    samplePrompt: 'Build the stakeholder register for this project.',
    methodology:
      'Follows the PMBOK standard for stakeholder management (Knowledge Area 13), using Northwood’s stakeholder-register template.',
  },
  {
    agent_type: 'wbs_builder',
    name: 'WBS Builder',
    purpose: 'Builds the Work Breakdown Structure with deliverable-oriented decomposition.',
    plain:
      'Before you can schedule or budget anything, you need to break the project into manageable pieces of deliverable work — the Work Breakdown Structure. This agent builds that breakdown from your charter and scope, organising the work into major phases (project management, engineering, procurement, construction, commissioning, close) and then into the work packages beneath them. It follows the discipline that every piece of scope appears exactly once — nothing missed, nothing double-counted.',
    scope: 'project',
    does: [
      'Level-2 phase branches (PM, engineering, procurement, construction, commissioning, close), decomposed to Level 3',
      'Applies PMBOK 100% rule',
      'Adds a dictionary entry for the top 5+ work packages',
    ],
    doesNot: [
      'Doesn\'t generate Gantt charts or schedule dates',
      'Doesn\'t do effort estimation',
    ],
    samplePrompt: 'Build the WBS for this project at Level 1-3.',
    methodology:
      'Follows the PMBOK standard for breaking work into deliverables (§5.4, the "100% rule" — all scope, counted once).',
  },
  {
    agent_type: 'schedule_reasoner',
    name: 'Schedule Reasoner',
    purpose: 'Reasons about the project schedule — critical path, milestones, float, sequencing risk.',
    plain:
      'The critical path is the chain of work that determines your finish date — if anything on it slips, the whole project slips. This agent reads your schedule and explains where that critical path runs, which sequences gate each other, where you have slack (float), and which deliverables carry the most timing risk. It’s here to help you see what’s really driving the end date — not to replace your scheduling software.',
    scope: 'project',
    does: [
      'Identifies the critical path as 3-7 sequential chains with convergence points',
      'Calls out float and sequencing logic',
      'Flags schedule risks tied to specific deliverables',
    ],
    doesNot: [
      'Doesn\'t produce Primavera/MS Project schedules with actual dates',
      'Doesn\'t commit owners or durations without PM input',
    ],
    samplePrompt: 'What\'s the critical path through this project? What\'s most at risk?',
    methodology:
      'Follows the PMBOK schedule-management standard (Knowledge Area 6), using critical-path analysis.',
  },
  {
    agent_type: 'budget_builder',
    name: 'Budget Builder',
    purpose: 'Builds the cost breakdown structure with category allocation and cost-loading.',
    plain:
      'This agent lays out where the money goes — allocating your approved budget across the major cost categories: engineering, procurement, construction, commissioning, plus contingency and management reserve. It also documents the assumptions behind how spending is expected to flow over time, and flags any allocation it had to estimate so you can confirm it. You get a clear cost breakdown to review — not a finished financial model.',
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
    methodology: 'Follows the PMBOK cost-management standard, using Northwood’s cost-breakdown template.',
  },
  {
    agent_type: 'communications_planner',
    name: 'Communications Planner',
    purpose: 'Produces the communications management plan.',
    plain:
      'Projects fail on poor communication as often as on technical problems. This agent builds your communications plan: it maps who needs to hear what, recommends how often and through which channels, sets escalation paths for when things go wrong, and suggests reporting formats tailored to each audience. It plans the communication — it doesn’t send the emails or run the meetings for you.',
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
    methodology:
      'Follows the PMBOK communications-management standard (Knowledge Area 10), using Northwood’s comms-plan template.',
  },
  {
    agent_type: 'issue_logger',
    name: 'Issue Logger',
    purpose: 'Reviews the issue log and prioritises outstanding items.',
    plain:
      'Open issues pile up, and it’s easy to lose track of which ones actually matter. This agent reviews your issue log and tells you what deserves attention — sorting by how severe and how old each item is, pointing out issues where it’s unclear who owns them, and highlighting anything that’s blocking project closeout. It surfaces and prioritises the issues; resolving them stays with your team.',
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
    methodology: 'Follows standard PMBOK issue-log practice.',
  },
  {
    agent_type: 'variance_analyst',
    name: 'Variance Analyst',
    purpose: 'Analyses CPI/SPI, cost & schedule variance, contingency consumption.',
    plain:
      'Are you on budget and on schedule? This agent reads your project’s variance reports and answers that in plain terms — summarising the latest cost and schedule performance, showing how the trend has moved over recent reporting periods, and flagging where you’re crossing thresholds or where projected margin is at risk. It’s a fast read on project health between the formal monthly reviews, not a replacement for them.',
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
    methodology:
      'Uses Earned Value Management — the PMBOK method for measuring cost and schedule performance against plan (CPI/SPI).',
  },
  {
    agent_type: 'change_order_reviewer',
    name: 'Change Order Reviewer',
    purpose: 'Reviews a single change order with four-frame commercial analysis.',
    plain:
      'When a change order lands, the question is always: are we still protected commercially? This agent reviews one change order from four angles — the scope change, the schedule impact, the cost impact, and the contractual basis — assesses whether the margin is adequately protected, and recommends the right approval path. It reviews and advises on a change order; it doesn’t create one or negotiate the terms.',
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
    methodology: 'Uses Northwood’s four-frame commercial analysis (scope, schedule, cost, contract).',
  },
  {
    agent_type: 'risk_analyst',
    name: 'Risk Analyst',
    purpose: 'Project risk register narrative — classification, status, response stance.',
    plain:
      'This agent works through your project’s risk register and makes it current and readable — classifying each risk by type (vendor, regulatory, site conditions, and so on), describing each in a single clear cause-and-consequence sentence, noting what would trigger it and whether its status has changed, and surfacing the handful you should be watching most closely. It works within one project; for patterns that span many projects, that’s the Portfolio Risk Reviewer.',
    scope: 'project',
    does: [
      'Assigns cross-cutting risk class (vendor, regulatory, site-conditions, etc.)',
      'Writes a one-sentence cause→event→consequence description per risk',
      'Identifies trigger conditions and status changes',
      'Surfaces the top three risks to watch',
    ],
    doesNot: [
      'Doesn\'t do cross-portfolio pattern analysis (use Portfolio Risk Reviewer)',
      'Doesn\'t recommend mitigations without project context',
    ],
    samplePrompt: 'Review the current risk register; flag the top three to watch through the warranty tail.',
    methodology:
      'Follows the PMBOK 7 risk-management standard, plus Northwood’s six-class cross-cutting risk taxonomy.',
  },
  {
    agent_type: 'lessons_learned_synthesiser',
    name: 'Lessons-Learned Synthesiser',
    purpose: 'Synthesises lessons learned using situation / action / outcome / generalisation.',
    plain:
      'Lessons learned are only valuable if they’re captured clearly and can actually change how the firm works. This agent reads across your project’s records, organises what was learned into themes, and surfaces the headline lessons worth adopting firm-wide — each tied to a recommendation for how to put it into practice. Where the cause of an outcome is uncertain, it flags it for your review rather than asserting it. It works from what’s in the data — it can’t capture the team’s unwritten, in-the-room knowledge.',
    scope: 'project',
    does: [
      'Organises lessons across 4-6 themes; surfaces 3-7 headline lessons for firm-level adoption',
      'Maps lessons to adoption pathway recommendations',
      'Hedges uncertain causation with PM-review flags',
    ],
    doesNot: [
      'Doesn\'t replace post-mortem facilitation',
      'Doesn\'t have the team\'s tacit knowledge — only what\'s in the data',
    ],
    samplePrompt: 'Identify the top three firm-level lessons from this project.',
    methodology:
      'Uses Northwood’s lessons template: situation → action → outcome → generalised lesson.',
  },
  {
    agent_type: 'closeout_reporter',
    name: 'Closeout Reporter',
    purpose: 'Drafts the project closeout report.',
    plain:
      'When a project finishes, the closeout report is the record of how it actually went. This agent drafts it — comparing final cost and schedule against the original baseline, recounting the scope changes and how risks were closed out, and capturing lessons and any items still outstanding. It writes the report; it doesn’t trigger the contractual closeout steps or settle warranty claims.',
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
    methodology: 'Follows the PMBOK "Close Project" standard, using Northwood’s closeout template.',
  },
  {
    agent_type: 'portfolio_risk_reviewer',
    name: 'Portfolio Risk Reviewer',
    purpose: 'Cross-portfolio risk pattern emergence — sees patterns across projects, not within one.',
    plain:
      'Some risks only become visible when you look across the whole portfolio rather than one project at a time. This agent does that — spotting when the same kind of risk shows up in two or more active projects (the point at which it becomes a pattern worth managing centrally), grouping risks by type, and recommending mitigation at the portfolio level. It also maintains the firm’s running catalogue of these patterns. For a deep look inside any single project, that’s the Risk Analyst.',
    scope: 'portfolio',
    does: [
      'Detects patterns that appear in 2+ projects (pattern-emergence threshold)',
      'Aggregates by cross-cutting class (vendor, regulatory, site-conditions, etc.)',
      'Recommends portfolio-level mitigation strategies',
      'Maintains the firm-level pattern catalogue',
    ],
    doesNot: [
      'Doesn\'t do single-project deep dives (use Risk Analyst)',
      'Doesn\'t produce a project risk register',
    ],
    samplePrompt: 'Across the active portfolio, which vendor categories appear in the most realised risks?',
    methodology:
      'Uses Northwood’s cross-cutting risk taxonomy with a pattern-emergence threshold of two or more projects.',
  },
  {
    agent_type: 'status_reporter',
    name: 'Status Reporter',
    purpose: 'Produces the one-page weekly status report — RAG status, progress, risks, asks — tailored to the audience.',
    plain:
      'When you need to tell people where the project stands, this agent writes a one-page status report from your notes and the project data: an overall RAG (red/amber/green) status with the headline reason, progress against milestones, the cost and schedule position, the live risks and issues, and the asks. It tailors the report to who is reading it — full detail for the internal team, exception-based for the sponsor, milestones-and-change-orders for the client. Anywhere a number or fact is missing it writes "[NEEDS PM INPUT: …]" rather than inventing it.',
    scope: 'project',
    does: [
      'Writes a one-page RAG status report from PM notes + project data',
      'Tailors depth to the audience (internal team / sponsor / client)',
      'Always surfaces active change orders for pipeline visibility',
      'Substantiates Amber/Red with a one-line reason; flags gaps with "[NEEDS PM INPUT: …]"',
    ],
    doesNot: [
      'Doesn\'t invent percentages, dates, costs or incidents not in the input',
      'Doesn\'t compute earned value (use Variance Analyst)',
      'Doesn\'t decide the RAG colour for you — it substantiates the one you set',
    ],
    samplePrompt: 'Write this week\'s status report for the sponsor.',
    methodology:
      'Follows PMBOK performance-reporting practice, using Northwood’s one-page status template, audience-adapted.',
  },
  {
    agent_type: 'cost_controller',
    name: 'Cost Controller',
    purpose: 'Controls commitment, cost-to-date, cost by element, labour productivity and billed-vs-earned revenue.',
    plain:
      'How much have you really spent, and how much have you locked in? This agent owns the SAP PS cost lifecycle — budget, then commitment (open purchase orders), then actual cost — and reports cost-to-date as actual plus open commitment, not actual alone. It breaks actual cost down by element (labour, materials, subcontract, travel), reads labour productivity from planned-vs-actual hours, and on the revenue side compares what you\'ve earned with what you\'ve billed to show net unbilled work-in-progress. It complements the Variance Analyst: where that agent measures CPI/SPI variance, this one controls commitment, cash and cost composition.',
    scope: 'project',
    does: [
      'Reports cost-to-date = actual + open commitment, and a commitment-aware EAC',
      'Breaks actual cost down by element with open commitment per category',
      'Reads labour productivity (planned vs actual hours, rate, efficiency)',
      'Compares earned vs billed revenue and flags net unbilled (WIP) or over-billing',
    ],
    doesNot: [
      'Doesn\'t compute the EVM variance indices in depth (use Variance Analyst)',
      'Doesn\'t raise or approve POs, invoices or change orders',
    ],
    samplePrompt: 'Give me the cost and commitment position with cost-to-date, open commitment by category, and net unbilled.',
    methodology:
      'Follows the SAP PS cost lifecycle (Budget → Commitment → Actual) and earned-vs-billed revenue (results-analysis / WIP), reconciled to the WBS.',
  },
];

/** Lookup helper. */
export function getCatalogEntry(agentType: AgentType): AgentCatalogEntry | undefined {
  return AGENT_CATALOG.find((e) => e.agent_type === agentType);
}
