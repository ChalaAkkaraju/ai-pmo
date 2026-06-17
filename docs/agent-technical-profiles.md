# AI PMO — Agent Technical Profiles

For each of the 15 specialist agents: what it needs as **input**, where the app **grounds** it, the methodology **rules** it follows, and what it **refuses** to do.

Each profile *summarises* the agent's prompt file (`lib/agent-prompts/<agent>.md`), which is the **authoritative source** — consult the prompt for the full rules. (Keeping these as summaries of the prompt, not a parallel spec, is deliberate: it stops the documentation drifting from the prompts — see interview‑prep Q16.)

---

## Authoring & planning agents (Initiation → Planning)

These six produce the upstream PM artefacts. All are *reference‑grounded* — when a project was created from a comparable "similar project," that project's matching artefact is pulled in as an exemplar.

### Charter Drafter — Project-level
- **Inputs:** The intake form plus the project header — objectives, scope and the commercial baseline.
- **Grounding:** Project header (SAP‑sourced) + a comparable past project's charter (reference grounding) + the Northwood charter worked example.
- **Rules:** PMBOK §4.1 charter, the 12‑section Northwood template; every inferred value is flagged `[NEEDS PM REVIEW]`.
- **Boundary:** Does not analyse schedule detail or build the WBS; nothing is left for the model to decide later.
- *Source of truth:* `lib/agent-prompts/charter_drafter.md`

### Stakeholder Analyst — Project-level
- **Inputs:** Intake form + approved Charter.
- **Grounding:** Project header + a reference project's stakeholder register + the worked example.
- **Rules:** PMBOK KA 13; influence/interest classification; 10–18 roles across client, regulator, community, vendor and internal.
- **Boundary:** No political judgements on named individuals; does not write the comms plan.
- *Source of truth:* `lib/agent-prompts/stakeholder_analyst.md`

### WBS Builder — Project-level
- **Inputs:** Intake + approved Charter + scope.
- **Grounding:** Project header + a reference project's WBS + the worked example.
- **Rules:** PMBOK §5.4 — the 100% rule (all scope, counted once); Level‑2 phase branches decomposed to Level 3; dictionary for the top work packages.
- **Boundary:** No Gantt charts or dates; no effort estimation. Authors the WBS that is then booked to SAP.
- *Source of truth:* `lib/agent-prompts/wbs_builder.md`

### Schedule Reasoner — Project-level
- **Inputs:** Intake + Charter + the approved WBS; on the consume side, the scheduler's tasks/milestones and the contractual window.
- **Grounding:** Project header + WBS + a reference project's schedule + worked example; reads the canonical tasks/milestones and the project start/contract‑finish for critical‑path and window checks.
- **Rules:** PMBOK KA 6 critical‑path analysis; the critical path as 3–7 sequential chains; reconciles the forecast against the contractual window.
- **Boundary:** Never produces dated P6 / MS Project schedules; does not commit durations or owners without PM input.
- *Source of truth:* `lib/agent-prompts/schedule_reasoner.md`

### Cost Planner — Project-level
- **Inputs:** Intake + Charter §7 commercial baseline + the approved WBS + Schedule Analysis. **Authoritative (never invented):** contract value, target margin, approved budget, contingency, contract type.
- **Grounding:** Project header (the control totals — the SAP/CPQ shell) + the canonical WBS + a reference project's cost baseline + the Northwood cost‑baseline worked example + the risk register (for contingency mapping).
- **Rules:** PMBOK cost management; one P50 cost line per WBS Level‑2 branch, totalling to the approved budget; contingency mapped to charter risks; cash flow tied to milestones.
- **Boundary:** Does not estimate the cost total from scratch (that comes from the quotation/estimate), forecast actuals (no forecast engine) or generate ERP cost codes; flags inferred lines `[NEEDS PM REVIEW]`.
- *Source of truth:* `lib/agent-prompts/budget_builder.md`

### Communications Planner — Project-level
- **Inputs:** Intake + Charter + Stakeholder Register + WBS + Schedule + Cost Baseline.
- **Grounding:** Project header + a reference project's comms plan + the worked example.
- **Rules:** PMBOK KA 10; maps who‑needs‑what; cadence, channels and escalation paths; reporting templates per audience.
- **Boundary:** Does not send emails or run meetings; plans the communication, people deliver it.
- *Source of truth:* `lib/agent-prompts/communications_planner.md`

---

## Execution, monitoring & closeout agents

These read the live project data (the canonical model + the domain tables) and synthesise — read‑only.

### Issue Logger — Project-level
- **Inputs:** The project's issue log plus project context.
- **Grounding:** The canonical `issues` table (the live issue log) + the project header.
- **Rules:** Severity × age prioritisation; ownership‑gap detection; flags items blocking closeout.
- **Boundary:** Does not resolve issues or assign new owners.
- *Source of truth:* `lib/agent-prompts/issue_logger.md`

### Variance Analyst — Project-level
- **Inputs:** The computed earned‑value figures plus the variance‑report history.
- **Grounding:** Structured facts — PV/EV/AC → CPI/SPI/EAC/VAC computed *in code* from the canonical WBS + cost + progress (not by the model) — plus the `variance_reports` table.
- **Rules:** Earned Value Management (PMBOK); summarise the latest position + trend across reporting weeks; flag thresholds and projected margin.
- **Boundary:** Does not compute portfolio‑wide trend; does not replace the monthly variance committee.
- *Source of truth:* `lib/agent-prompts/variance_analyst.md`

### Cost Controller — Project-level
- **Inputs:** The project's cost-to-cash picture — budget, open purchase-order commitment, actual cost by element, labour hours, billing events.
- **Grounding:** Structured facts computed *in code* from `cost_actuals` (by element), the PO commitment ledger, labour planned-vs-actual hours and `billing_events` — cost-to-date = actual **+ open commitment**, commitment-aware EAC, earned-vs-billed and net unbilled (WIP).
- **Rules:** SAP PS cost-lifecycle discipline (budget → commitment → actual → billed); breaks cost down by element (labour, materials, subcontract, travel); reads labour productivity from hours, not spend; flags over-billing as well as under-billing.
- **Boundary:** Does not measure schedule performance or CPI/SPI variance — that is the Variance Analyst; the two are complementary (variance measures, this one controls commitment, cash and cost composition).
- *Source of truth:* `lib/agent-prompts/cost_controller.md`

### Change Order Reviewer — Single-item
- **Inputs:** One change order + Charter + WBS + Cost Baseline + project.
- **Grounding:** The selected `change_orders` row + the project header + the canonical structure.
- **Rules:** Northwood four‑frame analysis (scope / schedule / cost / contract); assess margin protection; recommend the approval routing.
- **Boundary:** Does not create change orders or negotiate commercial terms.
- *Source of truth:* `lib/agent-prompts/change_order_reviewer.md`

### Risk Analyst — Project-level
- **Inputs:** The project's risk register (or a project brief).
- **Grounding:** The canonical `risks` table + project context.
- **Rules:** PMBOK 7 risk management + Northwood's six‑class cross‑cutting taxonomy; one cause→event→consequence sentence per risk; surfaces the top three to watch.
- **Boundary:** No cross‑portfolio patterns (that is the Portfolio Risk Reviewer); no mitigations without project context.
- *Source of truth:* `lib/agent-prompts/risk_analyst.md`

### Lessons-Learned Synthesiser — Project-level
- **Inputs:** The project's records — risks, issues, change orders, variance and the planning artefacts.
- **Grounding:** The canonical domain tables (`risks` / `issues` / `change_orders` / `variance_reports`) + project context.
- **Rules:** Northwood situation→action→outcome→generalisation; 4–6 themes; 3–7 firm‑level lessons each mapped to an adoption pathway; hedges uncertain causation.
- **Boundary:** Does not replace post‑mortem facilitation; works only from what is in the data (no tacit knowledge).
- *Source of truth:* `lib/agent-prompts/lessons_learned_synthesiser.md`

### Closeout Reporter — Project-level
- **Inputs:** The full project record — baseline vs actual cost/schedule, scope changes, risk closeout, lessons, outstanding items.
- **Grounding:** Project header (baseline) + the canonical cost / schedule / change / risk data + `variance_reports`.
- **Rules:** PMBOK Close Project; final outcome vs the original baseline; scope‑change history and risk closeout; Northwood closeout template.
- **Boundary:** Does not trigger contractual closeout activities or settle warranty claims.
- *Source of truth:* `lib/agent-prompts/closeout_reporter.md`

---

## Portfolio & reporting

### Portfolio Risk Reviewer — Portfolio-level
- **Inputs:** Risks across multiple active projects in the portfolio.
- **Grounding:** The `risks` table across all active projects + the firm‑level pattern catalogue (`portfolio_patterns`).
- **Rules:** Northwood cross‑cutting taxonomy with a pattern‑emergence threshold of 2+ projects; aggregate by class; recommend portfolio‑level mitigation.
- **Boundary:** No single‑project deep dives (that is the Risk Analyst); does not produce a project risk register.
- *Source of truth:* `lib/agent-prompts/portfolio_risk_reviewer.md`

### Status Reporter — Project-level
- **Inputs:** PM notes and observations + project data; plus the audience to tailor to.
- **Grounding:** The project data — variance, risks, issues, change orders, milestones — plus whatever the PM provides.
- **Rules:** PMBOK performance reporting; a one‑page RAG report, audience‑adapted (team / sponsor / client); always surfaces active change orders; substantiates the RAG the PM set.
- **Boundary:** Does not invent percentages, dates or costs; does not compute earned value (that is the Variance Analyst); does not pick the RAG colour for you.
- *Source of truth:* `lib/agent-prompts/status_reporter.md`

---

*The cross‑cutting design throughout: every agent is grounded in real data (project header, canonical model, domain tables, a comparable past project, or the worked‑example library); the figures it must not invent are handed in; anything it had to estimate is flagged for human review. The agents read and draft — a human approves. This profile set is a summary; the prompt files are authoritative.*
