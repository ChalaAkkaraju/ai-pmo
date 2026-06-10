/**
 * Build one user guide per role (md + docx). Each guide is grounded in the
 * same role->agent permissions the app enforces (lib/roles.ts) and the agent
 * catalog (lib/agent-catalog.ts), with hand-written remit, indicative prompts,
 * a worked example and hand-offs. Compiled with the compact guide reference doc.
 *
 *   node scripts/build-role-guides.mjs      (needs pandoc)
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const DOCS = path.resolve('docs');
const OUT = path.join(DOCS, 'role-guides');

const A = {
  charter_drafter: ['Charter Drafter', 'Drafts the project charter — scope, milestones, governance.', 'Draft the charter for this project.'],
  stakeholder_analyst: ['Stakeholder Analyst', 'Builds the stakeholder register and engagement approach.', 'Build the stakeholder register.'],
  wbs_builder: ['WBS Builder', 'Breaks scope into a deliverable WBS (Level 1–3).', 'Build the WBS to Level 1–3.'],
  schedule_reasoner: ['Schedule Reasoner', 'Reasons about the critical path, float and sequencing risk.', "What's the critical path, and what's most at risk?"],
  budget_builder: ['Budget Builder', 'Allocates budget across the cost categories.', 'Build the cost breakdown structure.'],
  communications_planner: ['Communications Planner', 'Builds the communications plan.', 'Build the comms plan.'],
  issue_logger: ['Issue Logger', 'Raises issues and triages the log (severity, age, ownership).', 'Summarise the open issues; flag overdue high-severity ones.'],
  variance_analyst: ['Variance Analyst', 'CPI/SPI, cost & schedule variance, contingency, projected margin.', 'Summarise the variance position and flag concerns.'],
  change_order_reviewer: ['Change Order Reviewer', 'Raises change/trend entries and reviews a CO four ways.', 'Review the open change orders — which threaten margin?'],
  risk_analyst: ['Risk Analyst', 'Raises risks and keeps the project risk register current.', 'What are the top risks to watch, and why?'],
  lessons_learned_synthesiser: ['Lessons-Learned Synthesiser', 'Synthesises lessons worth adopting firm-wide.', 'What are the top firm-level lessons here?'],
  closeout_reporter: ['Closeout Reporter', 'Drafts the closeout report against baseline.', 'Draft the closeout executive summary.'],
  portfolio_risk_reviewer: ['Portfolio Risk Reviewer', 'Spots risk patterns that span multiple projects.', 'Where is cross-cutting risk emerging across the portfolio?'],
  status_reporter: ['Status Reporter', 'Writes the one-page weekly status, tailored to the reader.', "Write this week's status report for the sponsor."],
  cost_controller: ['Cost Controller', 'Commitment, cost-to-date, cost by element, earned-vs-billed.', 'Give me the cost and commitment position.'],
};

const ROLES = [
  { key: 'pm', token: 'demo-pm', display: 'Senior PM (PMO Director)', write: true,
    agents: ['charter_drafter','stakeholder_analyst','wbs_builder','schedule_reasoner','budget_builder','communications_planner','issue_logger','variance_analyst','change_order_reviewer','risk_analyst','lessons_learned_synthesiser','closeout_reporter','portfolio_risk_reviewer','status_reporter','cost_controller'],
    remit: 'You hold the portfolio. You can run any of the fifteen agents, raise any entry, and assign work to anyone — the full toolkit.',
    create: ['Log a risk: a sole-source vendor may slip delivery by ~6 weeks.', 'Log an issue: the GSU transformer failed factory test, deferring delivery.', 'Add a change/trend entry: client-directed scope addition to the switchyard.', 'Assign a task to Procurement: pre-qualify a second transformer supplier — high urgency.'],
    ask: ["Summarise this project's health — cost, schedule, and what needs my attention.", 'Which three projects need attention this week, and why? Cite the variance reports.', "Write this week's status report for the sponsor.", 'Where is cross-cutting risk emerging across the portfolio?'],
    worked: 'Type *"log a vendor risk: the sole-source transformer supplier may slip delivery by six weeks."* The Risk Analyst drafts a structured risk — Probability H, Impact H, vendor-concentration class — and shows a confirm card. Review, **Add to register** (it becomes R-A01, agent-raised), then *"assign a task to Procurement: pre-qualify a second supplier — high urgency"* to put the mitigation in their queue.',
    handoffs: 'You can do everything, but delegate the deep work: cross-project risk patterns to the **Risk Analyst**, change-order commercial reviews to the **Commercial Manager**, site issues to the **Construction Manager**.' },

  { key: 'program_manager', token: 'demo-program-manager', display: 'Program Manager', write: true,
    agents: ['stakeholder_analyst','schedule_reasoner','budget_builder','communications_planner','issue_logger','variance_analyst','change_order_reviewer','risk_analyst','portfolio_risk_reviewer','closeout_reporter','status_reporter','cost_controller'],
    remit: 'You run a programme of related projects — execution health, escalations and patterns. You raise risks, issues and changes, and hand deep authoring (Charter, WBS) to engineering.',
    create: ['Log a risk: shared transmission-owner dependency threatens two projects.', 'Log an issue: a permit slip is blocking back-feed on the lead project.', 'Add a change/trend entry: client resequencing across the programme.', 'Assign a task to Construction: confirm the revised lift plan — medium urgency.'],
    ask: ['Which of the programme’s projects need attention this week, and why?', 'Summarise the variance position across the programme.', "Write this week's status report for the sponsor.", 'Where is cross-cutting risk emerging across my projects?'],
    worked: 'On a project page, type *"log an issue: the transmission-owner network upgrade slipped, deferring back-feed."* Confirm the card to file it, then *"assign a task to Project Controls: re-baseline the back-feed milestone — high urgency."*',
    handoffs: 'Hand Charter and WBS authoring to the **Engineering Manager**; route commercial change reviews to the **Commercial Manager**.' },

  { key: 'risk', token: 'demo-risk', display: 'Portfolio Risk Analyst', write: true,
    agents: ['risk_analyst','portfolio_risk_reviewer','lessons_learned_synthesiser','issue_logger'],
    remit: 'You own the risk register and the cross-cutting patterns. You raise risks and issues, and surface the patterns that only show up across projects.',
    create: ['Log a risk: vendor concentration on the GT/ST OEM slot.', 'Log an issue: a realised risk has now materialised as a live issue.', 'Assign a task to Procurement: secure a framework price for the alternate supplier — high urgency.'],
    ask: ['What are the top risks to watch on this project through the warranty tail?', 'Where is cross-cutting risk emerging across the portfolio?', 'What are the top firm-level lessons from this project?', 'Which vendor categories appear in the most realised risks?'],
    worked: 'Type *"log a risk: the GSU transformer vendor is fragile — delivery may slip and compress commissioning."* The Risk Analyst drafts it (and often cross-links to related issues); confirm to add R-A01. Then ask *"where is cross-cutting risk emerging across the portfolio?"* to flag it as a pattern candidate.',
    handoffs: 'Commercial impact of a risk → **Commercial Manager**; the field response → **Construction Manager**.' },

  { key: 'procurement', token: 'demo-procurement', display: 'Procurement Strategist', write: true,
    agents: ['risk_analyst','variance_analyst','change_order_reviewer','portfolio_risk_reviewer'],
    remit: 'You own vendor risk and procurement-driven change. You raise vendor risks and change/trend entries, and watch supplier patterns across the portfolio.',
    create: ['Log a risk: sole-source vendor may slip delivery by ~6 weeks.', 'Add a change/trend entry: supplier escalation passed through on bulks.', 'Assign a task to the Commercial Manager: confirm the pass-through clause — medium urgency.'],
    ask: ['Across the portfolio, which vendor categories appear in the most realised risks?', 'Review the open change orders — which are procurement-driven and threaten margin?', 'Summarise the variance attributable to procurement scope.'],
    worked: 'Type *"log a risk: sole-source transformer vendor may slip six weeks"* → confirm → R-A01. If the slip triggers a priced recovery, type *"add a change/trend entry: expedite premium for the transformer"* and confirm.',
    handoffs: 'Contractual terms and margin protection → **Commercial Manager**; the issue log → the **Risk Analyst** or **PM**.' },

  { key: 'commercial', token: 'demo-commercial', display: 'Commercial Manager', write: true,
    agents: ['change_order_reviewer','variance_analyst','cost_controller'],
    remit: 'You protect margin. You own change-order commercial reviews, raise change/trend entries, and watch the cost-to-cash position.',
    create: ['Add a change/trend entry: client-directed scope addition, recoverable.', 'Assign a task to Procurement: confirm vendor lead times for the change — high urgency.'],
    ask: ['Review CO-U01 — is margin protected, and what approval routing do you recommend?', 'Which change orders are dilutive to margin, and why?', "Summarise the change book: net margin add, absorbed cost, and revenue at risk.", 'Give me the cost and commitment position — cost-to-date, open commitment, net unbilled.', 'At the latest reporting week, is projected margin holding?'],
    worked: 'Type *"add a change/trend entry: client-directed switchyard addition"* → confirm. Then *"review the open change orders — which threaten margin?"* to get the four-frame read and approval routing.',
    handoffs: 'Vendor risk → **Procurement**; sponsor sign-off items → the **VP Sponsor**.' },

  { key: 'construction_manager', token: 'demo-construction-manager', display: 'Construction Manager', write: true,
    agents: ['issue_logger','variance_analyst','change_order_reviewer'],
    remit: 'You run site execution. You log construction issues, raise field-driven change entries, and track weekly variance impacts on the schedule.',
    create: ['Log an issue: a module arrived with shipping damage requiring on-site repair.', 'Add a change/trend entry: differing site conditions at the foundations.', 'Assign a task to Engineering: resolve the design clash at WBS 1.4.2 — high urgency.'],
    ask: ['Summarise the open issues; flag the overdue high-severity ones.', 'Is the project on schedule? Summarise the latest variance and what is slipping.', 'Review the open change orders affecting field execution.'],
    worked: 'On the project page, type *"log an issue: shipping damage on a module needs on-site repair"* → the Issue Logger drafts it → confirm (it becomes I-A01). Then *"assign a task to Engineering: confirm the repair procedure — high urgency."*',
    handoffs: 'Design questions → **Engineering Manager**; commercial recovery of a change → the **Commercial Manager**.' },

  { key: 'engineering_manager', token: 'demo-engineering-manager', display: 'Engineering Manager', write: true,
    agents: ['charter_drafter','stakeholder_analyst','wbs_builder','risk_analyst'],
    remit: 'You drive the early-phase authoring — Charter, Stakeholders, WBS — and engineering-driven risk identification.',
    create: ['Log a risk: an interface gap between two packages threatens the install sequence.', 'Assign a task to Construction: confirm the install sequence for WBS 1.4 — medium urgency.'],
    ask: ['Draft the charter for this project from the intake data.', 'Build the WBS to Level 1–3.', 'Build the stakeholder register and engagement approach.', 'What are the top engineering risks to watch?'],
    worked: 'Type *"build the WBS to Level 1–3"* — the WBS Builder proposes a deliverable-oriented breakdown you can review and book. If a technical interface looks risky, type *"log a risk: interface gap between the GSU and the switchyard scope"* and confirm.',
    handoffs: 'Field execution issues → **Construction Manager**; cost loading of the WBS → **Project Controls**.' },

  { key: 'hse_manager', token: 'demo-hse-manager', display: 'HSE Manager', write: true,
    agents: ['issue_logger','portfolio_risk_reviewer'],
    remit: 'You own health, safety and environment. You log safety incidents and watch for cross-cutting HSE patterns across the portfolio.',
    create: ['Log an issue: a near-miss during a heavy lift requires a stand-down and review.', 'Assign a task to Construction: stand down and re-inspect the lift plan — high urgency.'],
    ask: ['Summarise the open HSE issues; flag the overdue high-severity ones.', 'Across the portfolio, where are HSE patterns emerging (vendor, site-conditions, weather)?'],
    worked: 'Type *"log an issue: near-miss on a heavy lift — crane availability and rigging plan in question."* Confirm to file it (I-A01), then *"assign a task to Construction: stand down and re-inspect the lift plan — high urgency."*',
    handoffs: 'Cross-cutting safety patterns are best escalated to the **PM** or **Program Manager** for portfolio action.' },

  { key: 'project_controls', token: 'demo-project-controls', display: 'Project Controls Manager', write: true,
    agents: ['variance_analyst','schedule_reasoner','budget_builder','cost_controller'],
    remit: 'You own cost and schedule analytics — earned-value health, schedule baselines, budgets. You assign follow-ups; the risk/issue/change registers stay with their owners.',
    create: ['Assign a task to the PM: confirm the revised back-feed baseline — medium urgency.', 'Assign a task to Procurement: chase the open commitment on long-lead items — medium urgency.'],
    ask: ['Summarise the variance position and flag any threshold breaches.', "What's the critical path, and which deliverables carry the most schedule risk?", 'Give me the cost and commitment position — cost-to-date and open commitment.', 'Build the cost breakdown structure for this project.'],
    worked: 'Type *"summarise the variance position and flag concerns."* If CPI is sliding, raise the follow-up by delegation: *"assign a task to the PM: review the recovery plan for the back-feed milestone — high urgency."*',
    handoffs: 'You don’t own the registers — to get a risk or issue raised, **assign the task to the owning role** (Risk Analyst, Construction Manager) and they raise it.' },

  { key: 'sponsor', token: 'demo-sponsor', display: 'VP Sponsor', write: false,
    agents: ['closeout_reporter','portfolio_risk_reviewer'],
    remit: 'You consume status, variance and patterns across the portfolio. You are read-only — there are no create or assign actions — you ask, and the agents brief you.',
    create: [],
    ask: ['Give me a one-page executive briefing on portfolio health — what needs my attention?', 'Which projects need attention this week, and why?', 'Where is cross-cutting risk emerging across the portfolio?', 'Draft the closeout executive summary for this project.'],
    worked: 'From the portfolio dashboard, type *"give me a one-page executive briefing on portfolio health — what needs my attention?"* The assistant returns an exception-based read; pop it out to keep it beside you while you drill in.',
    handoffs: 'Anything that needs an action belongs with the **PM** or **Program Manager** — as Sponsor you direct, they execute.' },
];

function cap(role, agent) { return role.agents.includes(agent); }
const tick = (b) => (b ? '✓' : '—');

function agentsTable(role) {
  let md = '| Agent | What it does | Try asking |\n|---|---|---|\n';
  for (const a of role.agents) {
    const [name, does, ask] = A[a];
    md += `| **${name}** | ${does} | "${ask}" |\n`;
  }
  return md;
}

function buildMd(role) {
  const fig = `../book/figures/role-${role.token}-dashboard.png`;
  const canRisk = cap(role, 'risk_analyst'), canIssue = cap(role, 'issue_logger'), canChange = cap(role, 'change_order_reviewer');
  const create = role.create.length
    ? role.create.map((p) => `- "${p}"`).join('\n')
    : '_None — this role is read-only and does not create or assign. Use the Ask prompts below._';
  const ask = role.ask.map((p) => `- "${p}"`).join('\n');

  const assistantImg = path.join(OUT, `role-${role.token}-assistant-project.png`);
  const assistantFig = existsSync(assistantImg)
    ? `\n![The Ask AI Assistant — your role-aware starter prompts](../book/figures/role-${role.token}-assistant-project.png)\n`
    : '';
  return `---
title: "AI PMO — ${role.display}"
subtitle: "User guide · ${role.remit}"
---

# Your dashboard

When you sign in you land on a view weighted to your role. ${role.write ? 'You can read everything you have access to, and act through the assistant.' : 'You have a read-only, executive view across the portfolio.'}

![${role.display} — role dashboard](${fig})

# Your AI agents

You interact with everything through one place — the **Ask AI Assistant** (bottom-right). It auto-routes your request to the right specialist; you can override with the agent dropdown. These are the agents your role can call:

${agentsTable(role)}
${assistantFig}
# What you can do — and where

Your write actions, and the context each one needs:

| Action | Allowed | Where |
|---|:---:|---|
| Raise a risk | ${tick(canRisk)} | On a project page |
| Log an issue | ${tick(canIssue)} | On a project page |
| Raise a change / trend entry | ${tick(canChange)} | On a project page |
| Assign a task | ${tick(role.write)} | Project page or portfolio dashboard |
| Ask / analyse | ✓ | Project (this project) or portfolio (across projects) |

Risk, issue and change entries always attach to a **project**, so those actions appear only when you are inside one. Assigning a task and asking for analysis work on the **portfolio dashboard** too — the analysis just widens to the whole portfolio. Everything you create is tagged **agent-raised** and you confirm it before it is saved — risks and issues live in AI PMO’s own register; a change order stays provisional until it is booked into SAP PS.

# Indicative prompts

The assistant shows role-aware starter chips when the chat is empty; these are the kinds of things to type.

## Create / update / assign

${create}

## Ask the agent

${ask}

# A worked example

${role.worked}

# Tips & hand-offs

${role.handoffs}

> Every entry you raise and every task you assign is drafted by the agent and **confirmed by you** before it is saved — nothing is written silently. Risks and issues you raise live in AI PMO’s own register; a change order stays provisional until it is booked into SAP PS.
`;
}

async function main() {
  const hasPandoc = spawnSync('pandoc', ['--version'], { shell: process.platform === 'win32' }).status === 0;
  for (const role of ROLES) {
    const md = buildMd(role);
    const mdName = `${role.key}.md`;
    await writeFile(path.join(OUT, mdName), md);
    if (hasPandoc) {
      const r = spawnSync('pandoc', [mdName, '--reference-doc', '../_reference-guide.docx', '--lua-filter', '../_keyword.lua', '--lua-filter', '../_callouts.lua', '--lua-filter', '../_figures.lua', '-o', `${role.key}.docx`], { cwd: OUT, shell: process.platform === 'win32', stdio: 'inherit' });
      console.log(`  ${role.display}  -> ${role.key}.docx ${r.status === 0 ? 'ok' : 'FAILED'}`);
    } else {
      console.log(`  ${role.display}  -> ${role.key}.md (pandoc missing, docx skipped)`);
    }
  }
  console.log(`Done. ${ROLES.length} role guides in docs/role-guides/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
