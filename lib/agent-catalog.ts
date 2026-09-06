/**
 * Agent catalog — plain-English descriptions of each specialist agent.
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
    name: 'Cost Planner',
    purpose: 'Builds the project cost plan — allocates an approved or quoted cost total across the WBS and time-phases it.',
    plain:
      'This agent lays out where the money goes. Taking the project’s approved or quoted cost total as the control figure, it allocates that total across the major cost categories — engineering, procurement, construction, commissioning, plus contingency and management reserve — and documents how spend is expected to flow over time (the cost baseline). It does not estimate the total from scratch: in a revenue project that figure comes from the quotation, so the agent structures and time-phases it for review and flags any allocation it had to infer. You get a clear cost plan to review — not a finished financial model, and not a substitute for the estimate.',
    scope: 'project',
    does: [
      'Allocates the approved or quoted cost total across categories and WBS branches',
      'Time-phases the plan into a cost baseline (cost-loading curve)',
      'Reasons contingency against the risk register',
      'Flags inferred allocations for PM review',
    ],
    doesNot: [
      'Does not estimate the cost total from scratch (that comes from the quotation or estimate)',
      'Does not generate ERP cost codes',
      'Does not model future actuals (no forecast engine)',
    ],
    samplePrompt: 'Allocate the approved budget across the major cost categories and time-phase it.',
    methodology:
      'Follows the PMBOK cost-management standard; turns an approved or quoted total into a time-phased cost plan (cost baseline), using Northwood’s cost-plan template.',
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
  // ---- IT PMO / portfolio agents (added with the project-type extension) ----
  {
    agent_type: 'business_case_reviewer',
    name: 'Business Case Reviewer',
    purpose: 'Challenges an IT business case before it is ranked — value type, numbers, completeness.',
    plain:
      'IT projects are overhead, so the CFO only trusts a case that says plainly what kind of value it claims. This agent reads a submitted business case and asks the questions a sceptical reviewer would: is this a hard saving or a soft benefit dressed as one, do the budget, benefit, ROI and payback agree with each other, and is everything the commit package needs actually there? It recommends whether the case is ready to rank, needs corrections, is not ready, or belongs in the mandatory compliance lane.',
    scope: 'project',
    does: [
      'Classifies the value claim (hard savings / soft benefit / risk reduction / enablement / compliance) and tests the evidence for it',
      'Recomputes ROI and payback from budget and benefit and flags disagreements',
      'Lists missing commit-package items (sponsor, benefits owner, category, bucket, fiscal year)',
      'Names the assumptions that would change the ranking if wrong',
    ],
    doesNot: [
      'Doesn\'t approve or reject the project — the portfolio board does that at the waterline',
      'Doesn\'t invent benefits, owners or figures that are not in the case',
    ],
    samplePrompt: 'Review this business case — is the value claim honest, do the numbers hold, and is it ready to rank?',
    methodology:
      'Follows the IT PMO business-case standard: value-type classification, marginal-numbers check, commit-package completeness; compliance work is judged on cost-to-comply rather than ROI.',
  },
  {
    agent_type: 'waterline_ranker',
    name: 'Waterline Ranker',
    purpose: 'Ranks IT projects within each bucket for a fiscal year and draws the waterline.',
    plain:
      'Each year the IT envelope is split into buckets — infrastructure, applications, security, compliance — and projects compete inside their bucket, not across buckets. This agent ranks every project in a bucket on its score, walks down the list allocating money until the bucket is spent, and draws the line. It shows what is funded, what is deferred, what sits just below the line and how far short it is, and it flags continuations — projects asking for their next-year slice — which are judged on cost-to-complete against remaining benefit rather than on their original case.',
    scope: 'portfolio',
    does: [
      'Ranks within bucket on strategic score and ROI; mandatory lanes on deadline and cost-to-comply',
      'Draws the waterline by money against the bucket allocation less reserve',
      'Flags continuations and ranks them on the marginal case',
      'Lists the board decisions: envelopes to approve, projects to defer, continuations to call',
    ],
    doesNot: [
      'Doesn\'t compare projects across buckets or sum value across them',
      'Doesn\'t decide the size of the envelope — it shows where the line falls given the envelope',
    ],
    samplePrompt: 'Rank the FY2027 IT portfolio within each bucket and show me the waterline and what sits just below it.',
    methodology:
      'Follows the IT PMO annual-planning process: bucketed allocation with reserve, within-bucket ranking, per-bucket waterline, continuation judged on cost-to-complete vs benefit still achievable.',
  },
  {
    agent_type: 'gate_reviewer',
    name: 'Gate Reviewer',
    purpose: 'Assembles the gate package for the project\'s current stage gate and scores the exit criteria.',
    plain:
      'Every IT project runs through a stage template chosen by its category, with one commit gate (Stage Gate 1) where scope, budget and the capital-versus-expense split are locked, and later gates that decide go, hold or cancel. Before a gate meeting, this agent reads the template\'s exit criteria for the gate the project is at, scores each one against the evidence in the workspace — charter, estimate, risk register, issues, sanction events — and recommends a decision with the evidence beside it. At the commit gate it is deliberately strict; at later gates it asks whether cost-to-complete is still justified by the benefit still achievable.',
    scope: 'project',
    does: [
      'Scores every exit criterion of the current gate: met / partly / not met / no evidence',
      'Checks the estimate against the portfolio envelope and flags a return to portfolio beyond tolerance',
      'Recommends GO / GO WITH CONDITIONS / HOLD (with trigger and time box) / RECYCLE / CANCEL / RETURN TO PORTFOLIO',
      'States exactly what a GO would lock as the SG1 baseline sanction event',
    ],
    doesNot: [
      'Doesn\'t take the decision — the gate attendees do',
      'Doesn\'t invent criteria or evidence; missing evidence is scored as missing',
    ],
    samplePrompt: 'Prepare the Stage Gate 1 package for this project and score the exit criteria.',
    methodology:
      'Follows the stage-gate discipline (must-meet / should-meet criteria, go-hold-kill-recycle outcomes) as configured in the project\'s stage template.',
  },
  {
    agent_type: 'continuation_reviewer',
    name: 'Continuation Reviewer',
    purpose: 'Judges a multi-year IT project\'s next-fiscal-year slice on cost-to-complete vs benefit still achievable.',
    plain:
      'IT budgets are approved by year, so a project that runs into next year has to be re-approved for its next slice. The honest test is not the original business case but whether the remaining spend still buys the remaining benefit — sunk cost does not count. This agent restates the baseline from the sanction events and gate history, computes cost-to-complete and the benefit still achievable, attributes any slippage to its real causes (including people pulled to revenue work), checks that the business need still exists, and recommends continue, reduce scope, defer, cancel, or re-baseline through the commit gate.',
    scope: 'project',
    does: [
      'Restates the SG1 baseline, change orders, fiscal years approved and spend to date',
      'Computes cost-to-complete and benefit still achievable, and the marginal ROI or payback',
      'Attributes slippage to named causes, separating resource displacement',
      'States the consequence for the bucket at next year\'s waterline',
    ],
    doesNot: [
      'Doesn\'t re-underwrite the original case — it judges the marginal one',
      'Doesn\'t invent actuals or benefits; where none are supplied it says so',
    ],
    samplePrompt: 'Should this project be funded for next fiscal year? Judge the remaining spend against the remaining benefit.',
    methodology:
      'Follows the IT PMO continuation-gate rule: cost-to-complete vs benefit still achievable, sunk cost excluded, resource displacement attributed rather than absorbed.',
  },
  {
    agent_type: 'executive_briefing_writer',
    name: 'Executive Briefing Writer',
    purpose: 'Writes the one-page board pack across every PMO on the platform — each in its own terms, never summed.',
    plain:
      'Before a leadership meeting someone in the CFO\'s office assembles a summary from several PMO decks. This agent writes that page from the live data: what changed, which decisions are waiting and with whom, where buffers are thinning, and the few questions worth asking. It never adds revenue money to IT money or compares one PMO\'s indices with another\'s.',
    scope: 'portfolio',
    does: [
      'Leads with what changed and what needs a decision, naming the body and the rule that routed it there',
      'Clusters attention signals into patterns rather than listing projects; names at most five items worth a question',
      'States each PMO\'s position in its own terms — margin sold vs forecast for revenue, envelope committed and headroom for IT',
      'Says plainly which project types are not yet on the platform',
    ],
    doesNot: [
      'Doesn\'t produce a single money total across project types, or rank one PMO\'s performance index against another\'s',
      'Doesn\'t invent prior-period figures or benchmarks; where no comparison exists it says so',
    ],
    samplePrompt: 'Write this month\'s enterprise portfolio brief for the leadership meeting.',
    methodology:
      'Applies the cross-type layer rule from the AI PMO architecture: counts, dates, states, ratios and people movement travel across types; money and performance indices stay inside each PMO.',
  },
  {
    agent_type: 'governance_health_reviewer',
    name: 'Governance Health Reviewer',
    purpose: 'Audits the delegation of authority itself from the decision records: is governance working as designed?',
    plain:
      'A governance model can look right on paper and drift in practice — a board that never says no, a Finance concurrence that becomes the bottleneck, holds that quietly expire. This agent reads the decision records, holds, continuations and displacement log and rates each control: working, watch, or not working, with the figure that proves it and the fix.',
    scope: 'portfolio',
    does: [
      'Rates each control — right body, concurrence before approval, quorum, no self-approval, time-boxed holds, continuations requested, challenge rate — with a figure',
      'Shows cycle time by body and says whether concurrence or decision is the slow step',
      'Treats returned and rejected decisions, and holds lifted on time, as signs of health',
      'Recommends at most five changes, each naming the rule or body it alters',
    ],
    doesNot: [
      'Doesn\'t judge projects or people — bodies and roles only',
      'Doesn\'t guess where a control has not yet been exercised; it says "not assessable yet"',
    ],
    samplePrompt: 'Is our delegation of authority working? Review the last 90 days of decisions.',
    methodology:
      'Checks the operating evidence against COBIT / PMI-style delegation-of-authority principles: decisions at the designed level, separation of proposer and decider, quorum, concurrence, time-boxed holds, and a non-zero challenge rate.',
  },
];

/** Lookup helper. */
export function getCatalogEntry(agentType: AgentType): AgentCatalogEntry | undefined {
  return AGENT_CATALOG.find((e) => e.agent_type === agentType);
}
