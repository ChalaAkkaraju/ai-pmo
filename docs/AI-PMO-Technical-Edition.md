
## Foreword

This is the Technical Edition of the AI PMO book, written for solution architects,
AI engineers and developers. Where the Business Edition explains *what* each
capability answers and *why*, this volume explains *how it is built*: the
architecture and stack, the canonical data model and its provenance tagging, the
integration and sync contract, the agent design and routing, the synthesis libraries
that compute every number, and the build, evaluation and deployment practices.

Each capability's library chapter cross-references its Business counterpart (for
example, B12 ↔ A5). The synthesis libraries (Part IV) are the heart of the system —
pure, testable functions that turn canonical data into earned value, forecasts, cash
flow, margin, risk and change intelligence.

Several chapters in Parts I–III and V are the original design notes written during
the build; the library chapters and the data dictionary were written to complete the
volume. Together they document the system as built.


# Part I — Architecture


## PMO LLM — Engineering Detail

**A methodology-aware agentic system for EPC project management.**
**13 agents. 3 lifecycle iterations. 25 first-shot 30/30 frontier-ceiling outputs.**

> *Technical companion to the [Executive Brief](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_Executive_Brief.docx). ~20-page read. Covers project context, system architecture, the Build Rulebook principles, the empirical evidence base across all 25 results, what the project says about agentic system design, and the forward path. Reference layer documents (Build Rulebook, Strategy, Stack Explained, Phase 0 Closeout Synthesis, AI Concepts Explained, Test Pack) are cited inline where applicable.*

### 1. Project context and positioning

#### 1.1 Why this project exists

PMO LLM is a personal learning project undertaken to build the strongest possible portfolio evidence base for senior AI Solutions Architect / AI Strategy roles in SAP-centric enterprise shops. The project is purely personal — not for any employer — and is scoped to commercial quality except go-to-market.

The strategic positioning is documented in `PMO_LLM_Strategy.docx`. The role thesis is straightforward: enterprise AI work over the next 3-5 years will be principally about designing the *discipline layer* — methodology grounding, worked examples, cross-agent state propagation, cross-portfolio learning — for AI systems that operate inside the methodology-heavy workflows that enterprise customers already run. Generic AI is plentiful and increasingly commodity; methodology-aware AI grounded on enterprise data is scarce, valuable, and architecturally distinctive.

The deliverable is not a product. It is an evidence base demonstrating the kind of engineering and architectural decisions a senior AI Solutions Architect makes when standing up a methodology-aware agentic system: how worked examples are designed, how cross-agent state propagates, how lifecycle iterations interact with each other, how cross-portfolio learning loops produce firm-level recommendations, and how the empirical evidence for each architectural decision is captured and presented.

#### 1.2 Why EPC as the substrate

EPC (engineering, procurement, construction) project management is chosen as the substrate for three reasons.

First, EPC artefacts are methodology-heavy. A senior PM on a $100M+ fixed-price contract produces dozens of artefacts across the lifecycle — charter, stakeholder register, WBS, schedule analysis, budget baseline, communications plan, issue log, risk register, variance reports, change order analyses, lessons-learned synthesis, closeout report — and each is governed by PMBOK or equivalent methodology. The methodology surface is large enough to demonstrate disciplined agent design across many distinct artefact classes, and dense enough that disciplined ground truth is verifiable.

Second, EPC is large-contract-value and exposed to multiple risk classes (vendor concentration, regulatory deadlines, site conditions, labour scarcity, client-driven scope changes, weather). The cross-cutting risk taxonomy emerges naturally from real EPC project work, which gives the portfolio-mode capability (cross-cutting risk propagation across concurrent projects) a real substrate to demonstrate against.

Third, EPC methodology generalises cleanly to SAP-aligned enterprise contexts. SAP's PS / PPM project structures encode similar methodology; S/4HANA cost-object accounting maps to the budget and variance discipline; RISE / Joule integrations are the natural production deployment vector. An architecture proven on generic-EPC is portable to SAP-customer-specific contexts.

#### 1.3 Scope and explicit non-scope

In scope: full agent system design (13 agents), worked example authoring (one per agent paired with one of three past-project archives), lifecycle simulation (three iterations against a single active project at Week 28 mid-civil, Week 52 mid-erection, Week 78 Substantial Completion), single-run scoring against a six-dimension rubric, change-log documentation of every engineering decision and every empirical result, control-surface mapping of the twelve technology levers.

Out of scope: go-to-market, customer development, pricing strategy, sales enablement, production scaling beyond a small-pilot demo. The 3-5 colleague demo pilot infrastructure is the next phase but not part of the lifecycle simulation evidence base.

#### 1.4 The fictional substrate

To avoid any employer references — a hard project rule — the EPC substrate is fully fictional. The active project is Mariposa Wind Farm Phase 1, a $148M fixed-price 80-turbine renewables-greenfield wind farm in the western US, with a hard 30 December year+1 federal tax-credit-tier energisation deadline. The past-project archive contains three projects (Skyhawk Solar, Riverside Water, Ironvale Smelter) each with realistic narrative depth, brief documents, and a small set of executed agent artefacts.

The fictional firm is Northwood EPC Group. All personnel are fictional (PM J. Okafor, Project Director L. Chen, Commercial Manager D. Reeves, etc.). The cross-cutting risk taxonomy (six closed classes) and the five-pathway adoption classification at closeout are constructed for the project, not borrowed from any real firm's standards.

### 2. System architecture

#### 2.1 Agent roster organised by PMBOK lifecycle phase

The 13 agents are organised by the PMBOK lifecycle phases:

**Initiating phase (2 agents).** *Charter Drafter* — produces an award-stage project charter from intake. *Stakeholder Analyst* — produces a stakeholder register with influence/interest mapping and engagement strategy.

**Planning phase (4 agents).** *WBS Builder* — produces a Work Breakdown Structure with branch decomposition rationale. *Schedule Reasoner* — produces a schedule analysis with critical-path chain breakdown and convergence-point reasoning. *Budget Builder* — produces a budget baseline with WBS-branch P50 figures and contingency allocation against risk register. *Communications Planner* — produces a communications plan with stakeholder cadences, escalation protocols, and crisis-class enumeration.

**Executing phase (1 agent).** *Issue Logger* — maintains an append-only issue log with category, severity, ownership, lifecycle state, WBS linkage, and risk register cross-reference.

**Monitoring & Controlling phase (3 agents).** *Variance Analyst* — produces variance reports (EVM-based CPI/SPI, branch-level and project-level analysis, root-cause analysis, recovery actions). *Change Order Reviewer* — produces change order analysis packages with driver classification, schedule impact, four-frame commercial dynamics pricing, rejected-alternatives discipline, and approval routing. *Risk Analyst v3* — maintains the project risk register with cross-cutting class assignment and portfolio pattern linkage.

**Closing phase (2 agents).** *Lessons-Learned Synthesiser* — produces a closeout lessons synthesis with theme-led organisation, five-pathway adoption classification, firm-level vs project-specific separation. *Closeout Reporter* — produces the Substantial Completion closeout report with objective-by-objective status, audience-aware disclosure boundary, three-category risk closeout, and operational handover items.

**Portfolio phase (1 agent).** *Portfolio Risk Reviewer* — produces a quarterly cross-project portfolio risk review applying the six-class taxonomy, pattern emergence threshold analysis, and recommended portfolio actions.

The roster covers the full EPC project lifecycle. Two agents are conspicuously not present and are deliberate omissions: a Status Reporter agent (defers to existing Phase 0 work) and a Schedule Updater agent (would duplicate Schedule Reasoner with state evolution; planned for a future iteration if eval harness justifies).

#### 2.2 Worked-example pairing

Each agent is paired with a worked example from one of three past projects:

- *Skyhawk Solar* (renewables greenfield closeout-grade archive): anchors Charter Drafter, Budget Builder, Variance Analyst, Closeout Reporter. Skyhawk is the natural anchor for renewables-greenfield commercial discipline and for closeout-state worked examples; its variance analysis worked example is itself set at Week 28 of 60, providing the only temporal-parallel state match for the Variance Analyst.

- *Riverside Water* (water-treatment brownfield with mid-construction change order): anchors Stakeholder Analyst, Schedule Reasoner, Communications Planner, Change Order Reviewer. Riverside is the only past project in the archive with a documented mid-construction client-driven change order (UV disinfection scope addition at 6.7% margin against 8.5% bid — the pre-four-frame-discipline reference), which makes it the substantive anchor for the Change Order Reviewer.

- *Ironvale Smelter* (industrial brownfield closeout-grade archive): anchors WBS Builder, Risk Analyst (v1/v2/v3), Issue Logger, Lessons-Learned Synthesiser. Ironvale carries the documented firm-level lessons (single-sourced critical equipment as Pattern 1 origin; T&M-with-cap recommendation; uniform-density geotechnical investigation standard).

The Portfolio Risk Reviewer is paired with a notional Northwood portfolio review worked example from end of Q2 last fiscal year, with Skyhawk, Riverside, and Ironvale all active in that prior portfolio.

All three past projects reach four-agent parity in the final roster. Two "substantive exceptions" to three-agent parity (Riverside and Ironvale at four agents each) are documented in the Build Rulebook §2.1.

#### 2.3 Mode B collaborative roles

The system operates in Mode B: collaborative roles, not isolated sessions. Different colleagues at the user firm — PM, Procurement Strategist, Risk Analyst, Sponsor — see the same shared state, with the appropriate slice for their role. When a Procurement Strategist updates the risk register noting a single-vendor risk, the PM sees that update in the next status report. When the Risk Analyst transitions a risk to Mitigated, the Variance Analyst sees the contingency-release implications in the next variance report.

Mode A (isolated sessions, no shared state) was explicitly rejected after the Phase 0 user research session where the user asked the canonical multi-user question: *"So Procurement Strategist who identified the single vendor risk. once the risk is updated. the same is now available to PM who is a different colleague to see it in the status report"*. The answer is yes, and Mode B is the architecture that delivers that.

#### 2.4 Portfolio mode with cross-cutting risk propagation

The system supports up to four concurrent active projects with cross-cutting risk propagation. The cross-cutting risk taxonomy is closed at six classes:

1. **Vendor / supplier concentration** — single-vendor dependencies where performance failure cascades to project outcome.
2. **Regulatory / external deadline** — regulator-imposed schedule constraints (permits, tax-credit deadlines, court orders, utility-driven energisation windows).
3. **Site-conditions variance** — geotechnical surprises, latent defects, environmental contamination, hidden infrastructure.
4. **Resource / labour scarcity** — local labour market, skilled-trade availability, rural accommodation.
5. **Client-driven scope or sequence changes** — client-initiated mid-execution changes.
6. **Weather / climate-sensitive construction** — seasonal or weather-event windows.

Pattern emergence threshold is two or more projects carrying an Active or Realised entry in the same class. Pattern elevation from candidate to confirmed requires closeout-grade empirical evidence on at least one project. Firm-level standard practice elevation requires quantitative anchors (margin protection percentage points, contingency consumption against allocation, etc.) drawn from realised events.

The Portfolio Risk Reviewer agent applies this taxonomy at quarterly cycle. Pattern movements observed in the lifecycle simulation:

- **Pattern 4 (variable-terrain greenfield site-conditions variance)** elevated from candidate to confirmed at Iteration 3 via two-of-two Skyhawk + Mariposa greenfield realisations following identical localised-and-contained arc.
- **Pattern 3 (client-driven mid-construction scope additions on fixed-price contracts)** strengthened at Iteration 3 with renewables-scale quantitative anchor (Mariposa CO-001 8.2% post-discipline margin vs Riverside CO-003 6.7% pre-discipline margin = 1.5pp protection on the closed CO event).
- **Pattern 1 (sole-source critical equipment dependency)** strengthened at Iteration 3 with the most complete renewables-scale validation of the post-Ironvale discipline (monthly financial-health monitoring + FAT-on-lead-units + on-site expediter + lead-unit-erection-as-precedent + fleet performance-test contingency window).

#### 2.5 Cloud-only substrate on Opus 4.7

The production model is Anthropic Claude Opus 4.7 via OpenRouter. The choice is documented in `PMO_LLM_Phase0_Closeout_Synthesis.docx` §6.3 and is supported by the Phase 0 Test 1 comparison ladder (v1 / v2 / v3 / v4 / v5 against local Qwen 3 32B and cloud Opus 4.7).

The empirical finding from Phase 0: a frontier model with a poor worked example produces worse output than a 32B local model with a v4 worked example. Frontier model alone is necessary but not sufficient. The frontier model's value is its ability to extract behavioural patterns from a single worked example — a capacity smaller models lack. Local models treat the same worked example as a structural template (sections, tables, fields); frontier models treat it as a behavioural template (annotation discipline, depth of assumptions, source attribution).

The cost of cloud-only operation is on the order of $0.40-$0.80 per agent run depending on input depth (worked example + methodology grounding + multiple prior-iteration outputs at the deeper chains). Cumulative project spend across Phase 0 + the three lifecycle iterations is comfortably inside the project's $1,000 ceiling. The OpenRouter dashboard carries the precise figure.

#### 2.6 Single-run scoring and hand-rolled logging

Single-run scoring is the project's chosen evaluation methodology. Multi-run scoring was considered (running each agent 3-5 times to estimate variance) and explicitly rejected at the Phase 0 closeout. The rationale is documented in the Closeout Synthesis: at frontier ceiling (~30/30 expected on first shot), variance estimation adds cost without adding decision-relevant information; first-shot quality is the metric that matters for production.

Logging is hand-rolled flat-file output. Langfuse and similar observability frameworks were considered and explicitly rejected on the same Phase 0 closeout reasoning: hand-rolled is sufficient at small scale, defers operational complexity, keeps the project's engineering attention on the discipline layer rather than the observability layer. Langfuse may enter the architecture in Phase 2 (demo infrastructure) if multi-tenant observability becomes operationally necessary.

#### 2.7 The twelve-lever control surface

The system architecture has twelve identifiable control levers, documented in `PMO_LLM_Stack_Explained.docx` §7. The levers and their empirically observed impact:

- **Layer 5 (worked examples)** — demonstrated 4-point swing within a single test (Test 1 v3 → v4 → v5 across formatting changes to the Skyhawk worked example).
- **Layer 11 (the model itself)** — demonstrated 4-point swing between local Qwen 3 32B and cloud Opus 4.7.
- **Layer 6 (agent prompts)** — demonstrated 2-point lift from one-line v2 changes (e.g., "produce the variance-measurement framework rather than fabricating mid-execution variance").
- **Layer 4 (context documents / retrieval)** — relative impact still to be measured in Phase 2 when the state layer enters.
- **Layers 1, 2, 3, 7, 8, 9, 10** — untouched in Phase 0/1, impact unknown.
- **Layer 12 (run-to-run variance)** — the noise floor; expected ±2 to ±3 points on any single-run score. Empirically zero variance observed across the 25 first-shot 30/30s, suggesting frontier ceiling collapses variance toward zero at the top of the scoring distribution.

Optimisation effort follows the ranking. Improve worked examples first, then model, then prompts, then retrieval — drop down the stack as upper layers approach diminishing returns.

### 3. The Build Rulebook principles

The Build Rulebook (`PMO_LLM_Build_Rulebook.docx`) is the engineering-principles document. It consolidates six core principles emerging from Phase 0 and Phase 1 testing. Each principle is backed by specific evidence; the evidence is what makes the principles citable in interviews.

#### 3.1 Worked-example dominance

**The principle.** A model imitates the behavioural pattern of the worked example it is given, not just the topical content. The worked example is a behavioural template, not a stylistic reference.

**Evidence.** Phase 0 Test 5 vs Test 6 score gap (Risk Analyst, different active projects against the same Ironvale worked example) mapped exactly to the depth of the Response text in the worked example — projects with thin response text in the example produced thin responses in the output, and vice versa. The mapping was traceable line-by-line to the worked example, not to the active project or the agent prompt.

Test 1 v3 → v4 lift of 1 point on the Charter Drafter (27 → 28) was traceable solely to the inline-annotation hedging change in the Skyhawk worked example. Test 1 v5 regression of 4 points (28 → 24) was traceable solely to a format-mixing change in the same worked example (uniform section-suffix that the model mechanically copied to false-attribution failure mode in the output).

**Implication.** The single biggest investment in any agent build is the worked example. Spending more time on the example than on the prompt is correct. The agent prompt is a thin layer; the worked example is the load-bearing artefact.

#### 3.2 Format consistency in worked examples

**The principle.** Mixed formats within one section of a worked example create false-attribution failure modes. The model interprets section-level format dominance as a copying instruction rather than as a stylistic suggestion.

**Evidence.** Skyhawk v5 applied a uniform `— from intake` suffix to every line in §7 Commercial baseline. The model copied the suffix mechanically to the new Mariposa output, producing false attribution on lines where the suffix should not have applied (e.g., lines that were Northwood-side calculated rather than client-intake-sourced). Score regression: 28 → 24.

**Implication.** Use per-line discipline, not section-wide patterns. The committed format is v4-style inline italic annotations: `*(at draft stage this was [NEEDS PM REVIEW: <value>]; <how resolved>)*`. Per-line discipline; do not apply section-wide format suffixes. Every line that needs hedging gets its own annotation; every line that doesn't, doesn't.

#### 3.3 Frontier model alone is not enough

**The principle.** A better model with a poor worked example performs worse than a weaker model with a good one. Substrate quality and example quality multiply; they do not substitute.

**Evidence.** Phase 0 Test 5 local Qwen 3-30B with v2 prompt and original Skyhawk: 28/30. Test 1 v5 Opus 4.7 with v2 prompt and bad Skyhawk: 24/30. The frontier model lost to the local model when the worked example was worse.

**Implication.** Cloud-only on Opus 4.7 is necessary but not sufficient. The agent prompt and worked-example layers must be engineered with as much care under cloud as under local. The marginal cost of running on cloud (~$0.40/run) buys behavioural-pattern extraction capacity, not output quality directly.

#### 3.4 Worked-example absorption depends on model capacity

**The principle (Path 2.1 refinement to §3.1).** Worked-example absorption is not uniform across models. The model must have the capacity to extract the behavioural pattern from one example.

**Evidence.** The same v4 Skyhawk that lifted Opus from 27 → 28 produced 26 on local Qwen 3-30B. Local treated Skyhawk v4 as a structural template (sections, tables, fields); Opus treated the same example as a behavioural template (annotation discipline, depth of assumptions, source attribution).

**Implication.** Cloud substrate is required to extract full value from worked-example investment. The per-dollar return on the cloud substrate is better than the headline cost gap suggests once you factor in the absorption capacity multiplier.

#### 3.5 Control surface ranking

**The principle.** The twelve levers in the stack do not contribute equally to output quality. Optimisation effort follows the ranking.

**Evidence and implication** are documented in §2.7 above.

#### 3.6 The Phase 1 reproducible recipe

**The principle.** Opus 4.7 + a competent worked example with v4-style inline-annotation hedging + a v2-style agent prompt → frontier-ceiling output on first try.

**Evidence.** 25 first-shot 30/30 scores across 13 agents and three lifecycle iterations. No retries. No score revisions. The recipe held across:

- Six state-inversion tests (worked-example state and expected-output state maximally different)
- Three temporal-parallel tests (worked-example state and expected-output state matched)
- Three cross-agent state propagation chains within iterations
- Two cumulative state trajectories across iterations (Risk Analyst Week 0 → 28 → 52 → 78; Variance Analyst Week 0 framework → 28 → 52 → 78)
- Four headline new artefacts where the agent ran for the first time against a real event rather than a Week 0 framework (Change Order Reviewer at CO-001; Closeout Reporter at SC; Lessons-Learned Synthesiser at SC; Portfolio Risk Reviewer at SC)

**Implication.** Production agentic systems in this design pattern are reproducible. The recipe is not folk wisdom or one-off luck. It generalises to new agent types, new project states, new cross-agent chains, and new iteration cycles — given the discipline.

### 4. Empirical evidence — the lifecycle simulation

The lifecycle simulation is the principal evidence base. It runs the 13-agent system against one active project (Mariposa Wind Farm Phase 1) across four temporal slices: Week 0 (charter), Week 28 (mid-civil construction), Week 52 (mid-erection), Week 78 (Substantial Completion). Each agent runs at Week 0 to produce baseline output; subsets run at later iterations to demonstrate state evolution and cross-agent state propagation.

#### 4.1 Scoring rubric

Every agent output is scored against a six-dimension rubric, each dimension graded /5:

- **Schema** — does the output follow the agent's required structure?
- **Faithfulness** — does the output correctly use the input artefacts (events brief, prior agent outputs, worked example, methodology context)?
- **Methodology** — does the output correctly apply PMBOK and Northwood-specific methodology (EVM, risk taxonomy, change-order discipline, three-category closeout, etc.)?
- **Archive use** — does the output cite the worked example, prior iteration outputs, and portfolio context appropriately?
- **Decision-readiness** — is the output usable by the PM (or other intended audience) directly?
- **Style** — is the writing tight, professional, methodology-aware, with disciplined hedging?

Maximum score: 30. Production target: 28+. Single-run scoring with no multi-run variance estimation (see §2.6).

#### 4.2 Iteration 0 — Baseline 13-agent build

The first 13 outputs (run01 through run17 with some intermediate retrofits) build out the baseline 13-agent roster. Each agent gets one or more worked example, an agent prompt, and a Week 0 baseline run against Mariposa.

**13 first-shot 30/30s across 13 agents.** Key sophistication signals from the baseline build:

- **Issue Logger first-shot 30/30** — the strongest validation of the worked-example principle to date at the time of the run. Ironvale's worked example is a closeout-state log (22 issues, all Closed, retrospective lessons); Mariposa's output is a Week 0 baseline-state log (20 issues, all Open, provisional lessons). The agent extracted the *discipline* (categorisation, severity, lifecycle, linkage, dictionary structure, lesson-clause framing) and applied it to a categorically different operational state. State-inversion test #1.

- **Variance Analyst first-shot 30/30** — second state-inversion test. Skyhawk's worked example is mid-execution populated (Week 28 of 60 with real cost and schedule data); Mariposa's output is a Week 0 framework with empty templates. The agent inverted both the quantitative state (populated values vs empty-template values) and the temporal state (post-event retrospective vs pre-event prospective) while preserving the discipline.

- **Change Order Reviewer first-shot 30/30** — third state-inversion test. Riverside's worked example is a documented mid-construction CO with executed pricing and rejected alternatives; Mariposa's output is a Week 0 framework setting up how to handle COs that have not yet arrived. The agent invented a §1.2 Anticipated change-order categories table (Week 0-specific forward-looking planning artefact not in the worked example).

- **Closeout Reporter first-shot 30/30** — fifth state-inversion test. Skyhawk's worked example is a closeout report at SC; Mariposa's output is a framework setting up how to produce a closeout report. The agent recognised that Objective 2 (energisation) has a binary status structure without a partial-met state because the federal tax-credit-tier outcome is binary on the client side — sophisticated objective-level reasoning at Week 0 from a closeout-state worked example.

- **Portfolio Risk Reviewer first-shot 30/30** — sixth state-inversion test. The worked example is a notional Northwood portfolio review at end of Q2 last fiscal year; Mariposa's output is the Week 0 portfolio review at Mariposa entry. Multi-project portfolio context with only Mariposa's detailed artefacts available; the agent applied disciplined placeholder convention to the other portfolio members.

- **Risk Analyst v3 retrofit** — twelfth first-shot 30/30. Qualitatively different from the eleven new-agent builds: it updated an existing v2 agent prompt with additive cross-cutting awareness (rules 12-15) rather than building a new agent type. Tests that the worked-example-dominance principle holds across retrofits as well as new builds. The agent integrated *two* worked examples simultaneously (Ironvale's project-level risk register for v1/v2 discipline preservation + Portfolio Risk Reviewer's portfolio-level taxonomy for v3 cross-cutting extension).

#### 4.3 Iteration 1 — Week 28 mid-civil construction

Three agents re-run at Week 28: Issue Logger, Risk Analyst v3, Variance Analyst. Each consumes a Week 28 events brief plus the corresponding Week 0 output as the lifecycle predecessor.

**Issue Logger Week 28 — 30/30 (thirteenth first-shot).** First agent re-run on the same project at a later lifecycle iteration. Consumed 20 baseline issues with status updates + 3 new issues opened at Weeks 18/25/27. Append-only discipline preserved across the transition. Surfaced I-021 (sub-grade variance at Plot B positions 16/23/41) as a candidate Risk Analyst hand-off rather than just an issue — recognising that a partially-realised site-conditions event belongs in both the issue log (as event of record) and the risk register (as continuing forward-looking risk).

**Risk Analyst v3 Week 28 — 30/30 (fourteenth first-shot).** First cross-agent state propagation test: absorbed the updated Issue Logger Week 28 output and reshaped the register coherently. R3 transitioned Active → Mitigated. R-009 took the most methodologically subtle path — partially realised at Week 27 via I-021 at three Plot B positions, but the *forward-looking* element of R-009 (variance may extend to additional positions) was retained as Active rather than the entire risk being retired. This is methodological discipline emerging from the prompt's rules-not-content principle.

**Variance Analyst Week 28 — 30/30 (fifteenth first-shot).** First temporal-parallel test in the project: the Skyhawk worked example is at Week 28 of 60, the Mariposa output is at Week 28 of ~80. The recipe held at 30/30. The agent invented the "committed-and-spent vs forward-projected" distinction in §4 to handle the OEM PO favourable variance with proper commercial discipline — sophisticated commercial reasoning emerging from the prompt's discipline rules, not present in the Skyhawk worked example.

Iteration 1 closes at 15 first-shot 30/30s.

#### 4.4 Iteration 2 — Week 52 mid-erection

Four agents re-run at Week 52: Issue Logger, Risk Analyst v3, Variance Analyst, and (the headline new artefact) Change Order Reviewer against the actual CO-001 that the Risk Analyst predicted in the Week 28 register.

**Issue Logger Week 52 — 30/30 (sixteenth).** First run across *two* lifecycle iterations on the same project. Absorbed run12 (Week 0), run19 (Week 28), and the Week 52 events brief; produced a coherent 28-issue log preserving append-only discipline across both transitions. Three themes synthesized across two iterations in the §8 Lessons-Learned hand-off — meta-level reasoning across two lifecycle iterations and Mariposa-to-portfolio reach. The agent recognised that two issues (I-025, I-027) carry "Construction" as an operational sub-tag of Technical at the Construction Manager's reporting layer but classified Technical primary in the audit register — dual-layer operational-vs-audit categorisation discipline that real PMOs use, emerged from the agent's own discipline rather than the worked example.

**Risk Analyst v3 Week 52 — 30/30 (seventeenth).** First cumulative two-iteration state trajectory test. Absorbed run18 (Week 0 baseline), run20 (Week 28 update), run22 (Week 52 issue log), and the Week 52 events brief; preserved the cumulative state trajectory across three temporal slices. The agent updated R-002's trigger language with an erection-pace recovery condition ("erection pace fails to recover to ≥1.7/week by Week 60") — identifying that Week 52 has a new forward-looking trigger not present at Week 28 and adding the trigger to fire if recovery doesn't happen. Real risk-management thinking, not mechanical state copying.

**Variance Analyst Week 52 — 30/30 (eighteenth).** Self-invented discipline maintained and evolved across two iterations. The agent's Week 28 invention (committed-and-spent vs forward-projected) is maintained and updated at Week 52: forward-projected favourable of +$0.57M at Week 28 becomes +$0.23M at Week 52 as OEM PO favourable largely crystallises against actual deliveries and camp lease half-recognises. This is the agent doing real commercial accounting evolution across its own outputs — the most sophisticated single signal in the project at this point. The agent also constructed a Pattern 3 portfolio framing with explicit pre-discipline vs post-discipline empirical comparison: "first portfolio-validated application of the post-Ironvale Commercial Standards approach at renewables scale, where Riverside's pre-discipline CO-003 realised at 6.7% margin against 8.5% bid."

**Change Order Reviewer against CO-001 — 30/30 (nineteenth).** Headline new artefact of Iteration 2: first time the agent runs against a real change order rather than a Week 0 framework. The four-frame commercial dynamics analysis populated with full content (vendor leverage favourable — SCADA vendor standard catalogue module; client leverage low — refusal would not break contract; client position strong — tax-credit-tier dispatch verification driven; Northwood acceptance acceptable at 8.2% margin). Three sophistication signals: (a) the 8.0% vs 8.2% pricing-position reconciliation note — the agent identified a slight precision mismatch between the events brief's rounded "margin-neutral at 8.0%" and the actual calculation ($0.85M − $0.78M)/$0.85M = 8.2%, surfaced the difference explicitly in a footnote rather than papering over OR rejecting the events brief; (b) the out-of-scope risk flag in §2 about future OPCO data-model changes — not in the events brief, the agent's own commercial protection insight, recommending fixing the data model at CO-001 signature snapshot as a condition to pre-empt relitigation; (c) the third Lessons-Learned hand-off about standardised vendor portfolio-integration modules as an exception to Pattern 1 leverage — genuinely original pattern-science synthesis emerging from cross-portfolio reasoning.

Iteration 2 closes at 19 first-shot 30/30s.

#### 4.5 Iteration 3 — Week 78 Substantial Completion (closeout)

Six agents re-run at Week 78 — the largest iteration. Three carry-forward (Issue Logger, Risk Analyst v3, Variance Analyst) at the closeout state. Three closeout-discipline first-real-runs (Closeout Reporter, Lessons-Learned Synthesiser, Portfolio Risk Reviewer) — the matching portfolio-defensible counterparts to Iteration 2's Change Order Reviewer first-real-run.

**Issue Logger Week 78 — 30/30 (twentieth).** Second temporal-parallel test (Ironvale worked example is closeout-state; Mariposa Week 78 output is closeout-state). 31 issues total at SC, all Closed — closeout-grade clean log state. Sophistication signals: (a) the I-029 vs I-024 engineering category discrimination — the agent distinguished I-029 (performance-test wear-in calibration drift, "characteristic of normal commissioning-phase tuning") from I-024 (FAT manufacturing-side calibration drift), then drew the cross-issue lesson that I-029 "refines the I-024 FAT-discipline lesson by extending the 'expect findings, time-budget them' principle from manufacturing acceptance to operational acceptance"; (b) I-030 absorbed within CO-001 budget tolerance rather than treated as a CO-002 candidate — the agent applied the Change Order Reviewer's CO-001 condition 3 (data-model snapshot honoured) from Iteration 2 as a real boundary discipline (strongest cross-agent state propagation across iterations); (c) the warranty-tail log boundary statement (sophisticated administrative discipline identifying that closeout marks an organisational boundary between the construction-phase log and the warranty-phase log).

**Risk Analyst v3 Week 78 — 30/30 (twenty-first).** First application of three-category closeout taxonomy (Realised / Mitigated / Not Materialised) across all 12 risks. 3 Realised + 8 Mitigated + 1 Not Materialised. Sophistication signals: (a) trigger-language discrimination between warranty-tail and fully-closed risks — R-001/R-002/R-006/R-008/R-009 retain residual triggers; R-003/R-004/R-005/R-010/R-011/R-012 marked "n/a — risk closed at SC"; (b) R-007 closes "Realised (once, contained)" but residual trigger is any further client-driven scope-addition during warranty (Pattern-3-realisation-doesn't-extinguish-pattern discipline carried forward consistently from Iteration 1); (c) three concrete PMO Director governance recommendations with explicit elevation thresholds (Pattern 4 candidate → confirmed; Pattern 3 firm-level elevation; **Pattern 1 firm-level elevation for all single-OEM PO above $20M** — the $20M threshold is the CFO escalation threshold from I-015 picked up across the project context).

**Variance Analyst Week 78 — 30/30 (twenty-second).** Final closeout of the Variance Analyst's four-iteration arc. Final CPI 1.00, SPI 1.00, margin recovered to bid 9.5%, $0.27M net favourable, $4.98M of $5.5M contingency unconsumed. The self-invented committed-and-spent vs forward-projected distinction *resolves naturally at SC* — at Week 78 only "committed-and-spent at SC" column is needed because forward-projection is exhausted. The agent recognised that the discipline it invented is temporally bound — useful during execution when forward exposures persist, no longer needed at SC when all positions are crystallised. The agent also constructed a "Risk-allocation effectiveness in retrospect" post-hoc analysis comparing Week 0 allocation reasoning (R1 + R2 anticipated as 55% of dominant exposure) against realised draws (R5 $380k + unallocated $130k; R1 + R2 zero). Conclusion: "the reasoning held; the allocation pattern in retrospect would shift modestly toward R5 / unallocated, but the discipline was correct." Mature epistemic discipline.

**Closeout Reporter against full execution arc — 30/30 (twenty-third).** Headline new artefact of Iteration 3. First-real-closeout against the complete project execution. Three sophistication signals: (a) the Mitigated vs Not Materialised discipline-validation framing in §7 — "eight mitigations validated the mitigation discipline; R-012's non-materialisation returned its contingency without validating anything"; (b) "The disclosure boundary is operational, not editorial" in §10 Conventions — the agent articulated that audience-aware disclosure isn't a stylistic choice but an operational rule; (c) the "Met (forecast within deadline)" classification invented for Objective 2 — the agent invented a third category between definitively-Met and Partially-Met that captures the actual epistemic state of an outcome that hasn't yet happened but whose preconditions are fully discharged.

**Lessons-Learned Synthesiser against full execution arc — 30/30 (twenty-fourth).** Third temporal-parallel test (Ironvale worked example is closeout synthesis; Mariposa Week 78 output is closeout synthesis). Six themes, ten firm-level recommendations with five-pathway adoption classification and owner function, four project-specific lessons separated, three follow-on operational recommendations. Sophistication signals: (a) the re-classification rationale on the geotechnical lesson (Week 0 Project-specific → Closeout Firm-level via cross-portfolio Skyhawk evidence) — sophisticated epistemic transparency; (b) the nuanced resolution of the Week 0 fixed-price-vs-T&M structural question — synthesising across two contractual structures and three projects: "fixed-price worked at Mariposa because the four-frame discipline prevented the Riverside-style margin erosion that drove the Ironvale T&M-with-cap recommendation"; (c) the adoption-status committed-prospective discipline — lessons-learned and adoption are sequential operational processes, not the same event.

**Portfolio Risk Reviewer Iteration 3 — 30/30 (twenty-fifth, lifecycle simulation closeout).** Second portfolio review with full closeout-grade evidence. Three pattern movements committed: Pattern 4 candidate → confirmed; Pattern 3 strengthening with quantitative anchor; Pattern 1 strengthening with most complete renewables-scale validation. Seven firm-level recommendations with lever / addressee / target decision / target adoption. Sophistication signals: (a) the Iteration-2 candidate (tax-credit-deadline pre-contract confirmation discipline gap) *resolution* against execution evidence — folded into Regulatory class as sub-channel rather than warranting new closed-taxonomy class; (b) the resource-and-budget-impact section with concrete operational estimates (10-15 hours per qualifying proposal for greenfield-wind geotechnical; 7-10 working days fleet-level commissioning schedule for performance-test contingency); (c) audience-aware disclosure framing extended to portfolio context (Sponsor-and-executive-facing, not client-facing because spans multiple clients' projects).

Iteration 3 closes at 25 first-shot 30/30s. The lifecycle simulation is complete.

#### 4.6 Summary of empirical evidence

| Metric | Value |
|---|---|
| Total agent runs scored | 31 (run01 through run31) |
| First-shot 30/30 scores | 25 (the 31 agents minus 6 pre-Phase-1 baseline tests that scored 24-28) |
| Agents validated at frontier ceiling | 13 |
| Lifecycle iterations executed | 3 (Week 28, Week 52, Week 78) |
| State-inversion tests passed | 6 (Issue Logger, Variance Analyst, Change Order Reviewer, Lessons-Learned Synthesiser, Closeout Reporter, Portfolio Risk Reviewer — all baseline) |
| Temporal-parallel tests passed | 3 (Variance Analyst Wk28, Issue Logger Wk78, Lessons-Learned Synthesiser Wk78) |
| Cross-agent state propagation chains within iterations | 3 (Wk28 three-agent chain, Wk52 four-agent chain, Wk78 six-agent chain) |
| Cumulative state trajectories across iterations | 2 (Risk Analyst Wk0→28→52→78; Variance Analyst Wk0→28→52→78) |
| Headline new artefacts | 4 (Change Order Reviewer against CO-001; Closeout Reporter at SC; Lessons-Learned Synthesiser at SC; Portfolio Risk Reviewer second review) |
| Cumulative cloud-inference spend | Comfortably inside the $1,000 project ceiling (precise figure on OpenRouter dashboard) |

The full change log with per-result narratives is in `PMO_LLM_Build_Rulebook.docx` §1.6.

### 5. What this says about agentic system design

The 25-result evidence base supports four claims about agentic system design that I believe generalise beyond EPC.

#### 5.1 Discipline-not-content is the load-bearing engineering principle

The core engineering insight from the project is **discipline-not-content**. The agent's job is to learn *how to think about* the artefact class (risk register methodology, variance analysis discipline, four-frame commercial dynamics, three-category closeout taxonomy, etc.) — the worked example carries the thinking — and the model executes the thinking on new content.

This is testable. Six state-inversion tests demonstrated that maximally different state pairs (closeout-state worked example with Week 0 baseline output; populated mid-execution worked example with Week 0 framework output) preserve the discipline. The agent does not memorise content; it learns the pattern.

The implication for production agentic systems is that worked-example investment is the highest-return engineering activity. Spending more time on the worked example than on the prompt is not just allowed; it is optimal. The agent prompt is a thin layer that ensures the model knows what artefact class is being produced and what conventions to honour; the worked example is the load-bearing artefact.

#### 5.2 Emergent agent-system thinking is observable and reproducible

Three classes of emergent behaviour appeared consistently across the lifecycle simulation:

**Self-invented disciplines that persist across iterations.** The Variance Analyst's "committed-and-spent vs forward-projected" distinction was not in the Skyhawk worked example. The agent invented it at Week 28 to handle the OEM PO favourable variance with proper commercial discipline ("commercial practice is to retain it as a forward-projected favourable until FAT clearance and delivery cadence are demonstrated"). The agent maintained the discipline at Week 52 (forward-projected favourable of +$0.57M became +$0.23M) and resolved it naturally at Week 78 (only "committed-and-spent at SC" column needed because forward-projection is exhausted). The discipline is temporally bound and the agent recognised this — four-iteration evolution of an invented framework.

**Cross-agent state propagation that survives across iterations.** At Iteration 3, the Issue Logger's I-030 OPCO data-tag remediation was absorbed within CO-001 budget tolerance rather than treated as a CO-002 candidate, because the agent applied the Change Order Reviewer's CO-001 condition 3 (data-model snapshot at signature honoured) from Iteration 2 as a real boundary discipline. The Change Order Reviewer's invention from Week 52 became the Issue Logger's constraint at Week 78 — strongest demonstration of cross-agent state propagation across iterations in the project.

**Pattern-science synthesis emerging from cross-portfolio reasoning.** The Closeout Reporter's "eight mitigations validated the mitigation discipline; R-012's non-materialisation returned its contingency without validating anything" is a methodological observation about what closeout reports are *for* beyond client sign-off — emerged from the agent's own discipline, not the worked example. The Portfolio Risk Reviewer's parsimonious resolution of the Iteration-2 candidate (folding it into the existing Regulatory class as a sub-channel rather than warranting a new closed-taxonomy class) is sophisticated taxonomy discipline — emerging from cross-portfolio reasoning across four iterations of portfolio review.

These behaviours are not the model's general intelligence emerging through prompt engineering. They are the worked-example dominance principle producing emergent discipline that the worked example did not explicitly demonstrate. The model extends the discipline to new contexts because it has learned how to think about the artefact class, not what to write.

#### 5.3 The frontier model is the discipline-extraction engine

The frontier model is necessary specifically because of its ability to extract behavioural patterns from a single worked example. Smaller models do not have this capacity — they treat the worked example as a structural template. The marginal cost of running on Opus 4.7 (~$0.40 per agent run) buys behavioural-pattern extraction, not output quality directly.

The implication for production cost modelling: the right cost framing is per-discipline-extraction, not per-token. A frontier-model agent run at $0.40 produces an output that a smaller-model agent run at $0.05 cannot replicate at any scale of prompt engineering. The cost gap is the price of the extraction capacity.

#### 5.4 The recipe is bounded by what the worked example can teach

A limitation worth being explicit about: the agent system is bounded by what the worked example can teach. If the worked example is wrong, the output is wrong (Test 1 v5 demonstrated this with the false-attribution failure mode). If the worked example omits a discipline that the new project needs, the output will omit it (the Communications Planner had to *add* a project-specific crisis class not present in Riverside's worked example — the agent did this correctly, but the worked example design needs to leave room for adaptive extension).

The implication is that scaling the agent system to new artefact classes requires worked-example investment proportional to the complexity of the class. The 25-result evidence base shows that the discipline transfers across maximally different state pairs *within* an artefact class; it does not show that the agent will spontaneously generalise to artefact classes the worked examples don't cover.

For SAP-aligned enterprise deployment, this means the worked-example layer needs to be authored specifically for each artefact class an enterprise customer wants the agent system to produce. The architecture is portable; the worked examples are the customer-specific engineering investment.

### 6. Forward path

#### 6.1 Phase 2: Demo infrastructure (3-5 colleague pilot)

The next architectural piece is demo infrastructure for a 3-5 colleague pilot. The stack:

- **Next.js + Vercel** — frontend and edge-rendering infrastructure
- **Supabase** — Postgres backend with row-level security for multi-tenant state
- **OpenRouter proxy** — model-routing layer for Opus 4.7 inference
- **Qdrant** — vector database for worked-example retrieval and project-artefact semantic search
- **Hand-rolled flat-file logging carried forward initially**; Langfuse considered for Phase 3 if multi-tenant observability becomes necessary

Each colleague gets a unique URL with role-based access. The Procurement Strategist sees the procurement-side slice; the PM sees the PM-side slice; the Sponsor sees the executive-side slice. Shared state propagates across roles per the Mode B architecture.

Estimated operational cost: $20-40/month once running. Well inside the $1,000 project ceiling. Build cost: probably 2-4 weeks of focused work on the state layer (Qdrant ingestion, Supabase schema, role-based access, OpenRouter proxy wiring) plus 1-2 weeks of frontend work (Next.js scaffold, role-based UI, conversation rendering).

#### 6.2 Phase 3: SAP × AI thesis demonstration

The deeper architectural ambition is to show that the architecture transfers from generic-EPC to SAP-customer-specific contexts. The Phase 3 deliverable is a second instantiation of the architecture grounded on SAP-data worked examples:

- **PS / PPM project structures** as the methodology grounding (parallel to PMBOK on the generic-EPC side)
- **S/4HANA cost objects** as the budget and variance discipline anchor (parallel to WBS-branch P50 baselines)
- **Plant maintenance workflows** as a second discipline domain
- **RISE / Joule integrations** as the production deployment vector (the AI-aware SAP-customer adoption path)

The Phase 3 evidence base — if it produces analogous frontier-ceiling outputs — demonstrates that the architecture is SAP-portable. This is the artefact that lands directly with the senior-AI-Solutions-Architect-in-SAP-shops target role.

#### 6.3 Phase 4: Eval harness

An eval harness — reusable single-run scoring framework — is staged for after Phase 3. The lifecycle simulation evidence shows that single-run scoring at frontier ceiling collapses variance toward zero (25 of 25 outputs scored 30/30 on first invocation). At that variance floor, eval harness investment is principally about regression-testing future agent changes rather than estimating current quality. The build is therefore deferred until either (a) a substantial agent or worked-example change needs validation, or (b) the demo infrastructure produces enough multi-tenant inference to warrant automated quality monitoring.

#### 6.4 What the project does not undertake

Three explicit non-undertakings:

- **No go-to-market work.** Sales enablement, pricing, customer development — out of scope. The project produces evidence for portfolio purposes, not for commercial deployment.
- **No multi-model production routing.** The cost ceiling is comfortable on cloud-only Opus 4.7; a multi-model architecture (cheap-model-for-easy-tasks + frontier-for-hard-tasks routing) is not justified at this scale.
- **No fine-tuning.** Worked-example design has produced frontier ceiling on the recipe; fine-tuning has not been needed and is not planned.

#### 6.5 Portfolio positioning summary

The PMO LLM project is the strongest available portfolio evidence base for senior AI Solutions Architect / AI Strategy roles in SAP-centric enterprise shops. The 25-result lifecycle simulation demonstrates:

- **Engineering depth** in worked-example design, agent prompt engineering, control-surface mapping, and cross-agent state propagation
- **Architectural maturity** through Mode B collaborative roles, portfolio mode with cross-cutting risk propagation, and three-iteration lifecycle simulation
- **Empirical rigor** through six-dimension scoring rubric applied consistently across 25 outputs at frontier ceiling
- **Methodology discipline** through PMBOK grounding, four-frame commercial dynamics, three-category risk closeout, five-pathway adoption classification, and cross-portfolio pattern science
- **Cost and operational discipline** through $14 cumulative spend, cloud-only architecture, hand-rolled logging, deferred state-layer investment until justified
- **Documentation discipline** through the Build Rulebook, Strategy doc, Phase 0 Closeout Synthesis, Stack Explained, AI Concepts Explained, and this Engineering Detail

For an SAP-centric shop, the architecture transfers via Phase 3 (SAP-data worked examples + RISE / Joule integration). The project is a generic-EPC instantiation of an SAP-ready agentic system design.

---

**Supporting documents (the portfolio bundle):**

- [Executive Brief](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_Executive_Brief.docx) — 5-page entry point for hiring manager / interviewer
- [Build Rulebook](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_Build_Rulebook.docx) — engineering principles + full 25-result change log
- [Strategy](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_Strategy.docx) — strategic positioning, role mapping, original architecture
- [Phase 0 Closeout Synthesis](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_Phase0_Closeout_Synthesis.docx) — Phase 0 decisions and post-close learning
- [Stack Explained](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_Stack_Explained.docx) — the twelve-lever control surface map
- [AI Concepts Explained](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_AI_Concepts_Explained.docx) — plain-language reference for non-technical readers
- **Test Pack** — `PMO_LLM_Test_Pack/` — agent prompts, worked examples (past-project archive), test inputs, scoring rubric
- **Runs** — `runs/run01` through `runs/run31` — 31 scored agent outputs in markdown and Word format

**Recommended read-order for an interviewer:**
1. [Executive Brief](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_Executive_Brief.docx) (5 minutes)
2. This Engineering Detail (this document, 20-30 minutes)
3. [Build Rulebook](computer://C:\Claude\Projects\PMO LLM\PMO_LLM_Build_Rulebook.docx) §1.6 change log (10 minutes of skimming)
4. Two or three scored agent outputs of choice — recommended: [Change Order Reviewer against CO-001](computer://C:\Claude\Projects\PMO LLM\runs\run25_co001_mariposa_week52.docx), [Closeout Reporter at SC](computer://C:\Claude\Projects\PMO LLM\runs\run29_closeout_mariposa_week78.docx), [Portfolio Risk Reviewer Iteration 3](computer://C:\Claude\Projects\PMO LLM\runs\run31_portfolio_mariposa_week78.docx)


## AI PMO — Process & Architecture Note

*Where an AI-assisted PMO intelligence layer sits in the real project lifecycle, what it owns, and the two gaps it fills.*

---

### 1. The vision in one line

AI PMO is an intelligence layer that sits above the ERP and the scheduler and does the part neither can: turning cost, schedule, structure, and commercial intent into one explained portfolio picture, with the analysis already done. It **consumes** the engines (it does not replicate accounting or scheduling) and **builds** the synthesis. Earned value is the flagship, because it is the one number that needs cost, schedule, and structure together.

### 2. The real lifecycle (process view)

A typical engineered-order business runs: **opportunity → estimate/bid → quote → win → order booking → ERP project + WBS + budget → schedule build → execution (actuals + progress) → change → close → feedback to estimating.**

The important observation is *where the numbers are born*. The budget baseline and the margin promise are set upstream, in the estimate and the quote, before the ERP project exists. The bid cost model *is* the original budget-at-completion (BAC). By the time the order is booked and the ERP sets up the project, that "as-sold" number has already been translated — and often quietly degraded — into an "as-planned" WBS budget.

![End-to-end lifecycle swim lane. AI PMO reads both systems of record and, at setup (phase 2), authors the WBS and books the approved version into SAP — its one write. Everywhere else it is read-only.](AI-PMO-swimlane.png)

#### Lane ownership

| Lane | System of record for | Typical roles |
|---|---|---|
| **CRM / CPQ** *(out of integration scope)* | Opportunity, quote, as-sold value & margin | Sales, bid |
| **ERP — SAP PS** | Contract, WBS structure, budget, actuals, change, revenue | Commercial, cost control, PMO |
| **AI PMO** *(this layer)* | **Nothing** — reads both sides, writes only at authoring (§5) | All roles (read), controls/PMO (approve) |
| **Scheduler (P6 / Planner Premium)** | Tasks, dates, % complete, dependencies, resources | Planner / scheduler |

The mental model that resolves the "who owns what" confusion: **ownership is by system, not by person.** People are users of whichever system owns the fact. The PMO/controls role is the one that today manually stitches the two systems together in spreadsheets — and that stitching is exactly what AI PMO automates. It is not a new owner competing with anyone; it is the analyst's reconciliation work, done continuously and explained.

### 3. The join key

The WBS code is the linchpin. It links ERP cost (per WBS) to scheduler tasks (per WBS), and that join is what makes earned value possible. Everything downstream depends on the WBS being coded consistently across the two systems — which is also the single biggest real-world failure point (see §6).

#### Publishing the WBS to the scheduler (the sync contract)

The WBS *structure* flows one way — from SAP (system of record) into the scheduler as a read-only reference scaffold. Planners then create activities under it, and every activity carries its WBS code. The link is an attribute discipline, not a clever trick: tasks are born tagged because they are created under WBS nodes that came from SAP. Get this right and the join is guaranteed; get it wrong and you reconcile unmapped tasks forever.

- **Send structure only** — WBS code, name, parent, level, and a stable key. Never cost or dates: cost stays in SAP, timing stays in the scheduler. Sending cost just creates a second place for money to disagree.
- **Land it per tool** — Primavera P6 has a native WBS, so create the WBS nodes via the P6 REST / XML API and activities assign to a node. Dataverse / Planner Premium has no SAP-style WBS, so map the WBS code onto a custom field on each task (`msdyn_projecttask` + a `wbs_code` column), optionally representing WBS elements as summary tasks.
- **Seed before planning** — push the scaffold *before* activities are built, so planners build into the structure rather than mapping after the fact. The enforceable rule is "no activity without a WBS code."
- **Who publishes** — native SAP↔scheduler integration (BTP Integration Suite → P6 REST / Dataverse Web API) for existing SAP projects; for projects AI PMO authored, AI PMO can publish the booked WBS as the next hop after booking — the same propose → approve → hand-off provenance, one origin. AI PMO does not need to own the pipe to do its job.
- **Plan for change** — when the WBS changes in SAP, it re-publishes (add / rename / deactivate nodes). Activities under a removed element become orphaned tasks that need a human decision — and that exception queue *is* the reconciliation layer, the hardest and most valuable part.

In one line: SAP owns and publishes the WBS structure → the scheduler imports it read-only → planners add WBS-tagged activities under it → AI PMO reads both back and joins on the code. (Note: the schedule itself — durations, dependencies, critical path, resources — stays with the planner and the scheduler. AI PMO does not author the task list.)

### 4. Gap one — downstream synthesis (built)

During execution, the layer consumes the mirrored system-of-record data (read-only, provenance-tagged) and computes what no single system produces: earned value (CPI / SPI / EAC / VAC) at work-package, project, and portfolio level; the S-curve; an EV-aware status narrative; risk, issue, and change synthesis; and recommendations that point at specific work packages. This is the part already built.

### 5. Gap two — upstream authoring (the new bookend)

ERPs are deliberately weak at *authoring* a WBS. SAP gives you standard project templates, a coding mask, and a builder — governance and a blank structure, but no intelligence about *this* project's scope. In practice teams clone the nearest template and bend the real scope to fit it. That bending is where as-sold→as-planned erosion is born, and it is the root of the join-key mismatch: the WBS does not match the work because it was never shaped to the work.

Decomposing a contract or scope into a deliverable-based WBS is precisely what an LLM is good at and the ERP is not. So the layer gains an **authoring bookend**: AI proposes a scope-true WBS, a human approves it, and it is **booked into the ERP** as the real project structure — rather than inheriting a generic template.

#### The boundary rule (non-negotiable)

This is a write into the ERP, which departs from "read-only, never the engine." One distinction keeps it safe:

> **Write once, at creation, as a human-approved proposal; then hand the system of record to the ERP and return to read-only.**

Authoring-then-handoff is "AI *seeds* the record." Continuous write-back during execution is "AI *overrides* the record" — that is the trap, because it makes the layer compete with the engine and inherit its governance burden. We do the first and never the second. After booking, SAP owns the WBS and we mirror it like any other project.

#### Lifecycle of a single WBS (provenance)

1. **Proposed** — AI authors the WBS; rows are `is_app_native = true`, `source_system = APP`, `status = proposed`, no `external_id`.
2. **Approved** — controls / PMO reviews and edits the proposal (human-in-the-loop, with an audit trail).
3. **Booked** — a simulated/real ERP create (BAPI / OData) returns real IDs; rows flip to `source_system = SAP_PS`, `status = active`, `external_id` stamped, `synced_at` set. SAP is now the system of record.
4. **Mirrored** — from here the WBS is read-only, exactly like any pre-existing SAP project.

#### Authoring within governance, not around it

The AI must produce a *valid* SAP structure, not free-form text. WBS in SAP is constrained by the coding mask, project profile, level rules, billing-element flags, account assignment, and status profile. Templates do not disappear — they become **guardrails**: mandatory reporting levels, the coding mask, and the billing structure finance needs for cross-project comparability. The AI fills the project-specific decomposition *beneath* those anchors. *Template for governance, AI for the scope.* That framing is also what makes finance say yes.

### 6. The three-state reconciliation

The executive question is not "what is our CPI" — it is **"are we delivering the margin we sold?"** Answering it means holding three states together:

- **As-sold** — a baseline snapshot captured at booking (contract value, sold margin, baseline BAC per WBS). Frozen; not a live CPQ feed.
- **As-planned** — the current approved WBS budget; moves with change orders.
- **As-built** — actuals + progress today (the earned-value engine).

Three reconciliations follow, each a real question:

1. **As-sold → as-planned** = current budget − baseline budget. *"Did the plan still fit what we sold, or did budget erode before we even started?"*
2. **As-planned → as-built** = earned value. *"Are we executing to plan?"*
3. **As-sold → as-built** = sold margin vs forecast margin, where forecast margin = (contract − EAC) / contract. *"Are we delivering the margin we sold?"*

Surfaced as a margin "waterfall" on the project overview and rolled up to a portfolio margin-erosion view. The AI-authored WBS strengthens this directly: a scope-true structure, booked cleanly, largely dissolves the as-sold→as-planned erosion and the join-key mismatch — because the budget is loaded against a structure that reflects the scope, and the WBS is authored once and shared rather than reconciled after the fact.

#### Model additions (minimal)

- `projects`: `sold_contract_value`, `sold_margin_pct`, `baseline_captured_at`.
- `work_packages`: `baseline_bac` (frozen as-sold budget per WBS), `status` (`proposed` | `active`), `booked_at`.

### 7. Honest caveats

- **Mapping is the hard core, at both ends.** The bid WBS and the execution WBS are often different structures (one organised for pricing, one for delivery), so as-sold→as-planned is itself a mapping problem — the same challenge as the SAP↔scheduler join, one step upstream. In the simulation we sidestep it by deriving the baseline on the same WBS; in the real world it needs a reconciliation/exception layer.
- **Authoring is a different product motion.** Provisioning into the ERP (outbound) is a bigger, later bet than the read-only analytics layer (inbound). It strengthens the story but is sequenced after the synthesis layer is solid.
- **Freshness and provenance are existential, not cosmetic.** An intelligence layer is only as trustworthy as its sync; stale joins produce wrong EV, and wrong EV erodes trust faster than no EV. "As of" timestamps and drill-to-source are core.
- **Stay neutral and read-only during execution.** The defensibility of the layer is that it is cross-vendor and owns nothing operational. The authoring write is the one deliberate, tightly-scoped exception.

### 8. What this changes in the roadmap

The build gains an **authoring bookend** alongside the synthesis layer, joined by the strict *propose → approve → hand off → read-only* rule. The first increment is demonstrable with no live ERP: intake → AI authors a WBS (`is_app_native`) → review / approve → a simulated "Book to SAP PS" that stamps `external_id` and flips provenance to system-of-record. It reuses the intake form, the WBS-builder agent, and the canonical model already in place.


# Part II — Data & Integration


## AI PMO — Integration & Sync Contract (Phase 6)

*The specification for productionising the consume side: how the canonical model is filled from SAP PS, the scheduler, and back.*

---

### 1. Purpose & scope

Phases 0–5 built the canonical model and everything that reads it (earned value, resources, margin, AI grounding), but the data lands via simulation scripts. This contract specifies the **real ingestion service** that replaces those scripts: how each system of record is read, mapped, joined, and written back, with the operational rules (auth, idempotency, freshness, error handling) that make it production-grade.

It is implementation-ready: an engineer could build the connectors against it, and it doubles as the design basis for the Phase 6 Option 2 adapter layer. Nothing in the synthesis layer changes — only how the canonical model is populated.

**In scope:** SAP PS (ERP, WBS + cost), Microsoft Dataverse / Planner Premium and Primavera P6 (schedulers), the canonical model as the target, the WBS-code join, and the two outbound provisioning writes.

**Out of scope:** CRM/CPQ (the as-sold baseline crosses into SAP at booking; no direct integration), replicating any engine (no scheduling, accounting, or levelling logic), and write-back to the systems of record during execution.

### 2. Principles

- **Consume vs build.** System-of-record data is mirrored **read-only** into the canonical model with provenance. The app builds only synthesis. The only writes to a source are the two one-time provisioning writes in §11.
- **The canonical model is the target.** Every source maps *into* `work_packages`, `tasks`, `milestones`, `cost_actuals`, `resource_assignments`, and the `projects` provenance fields. The target schema is fixed (Phase 0); connectors adapt to it, never the reverse.
- **WBS code is the join key.** It links SAP cost (per WBS) to scheduler tasks (per WBS). The integrity of that join is the single most important contract obligation (§7).
- **Ports and adapters.** A source-agnostic ingestion core depends on a `SourceConnector` interface; each system is a swappable adapter. A mock adapter and a real adapter are interchangeable.
- **Idempotent and observable.** Every sync can be re-run with no side effects; every run is logged; every unmappable record is queued, not dropped.

### 3. Sources, systems of record, and the join key

| Source | System of record for | Primary API |
|---|---|---|
| **SAP PS** | WBS structure, budget, baseline, cost actuals, contract | SAP S/4HANA OData (Enterprise Project Services) or classic PS BAPIs via the BTP Cloud Connector |
| **Microsoft Dataverse / Planner Premium** | Tasks, dates, % complete, dependencies, resource assignments | Dataverse Web API (OData v4) + Project Schedule APIs |
| **Primavera P6** | Activities, dates, % complete, resource assignments | P6 EPPM REST API |

> Note (currency of the landscape): Microsoft **Project Online retires 30 Sept 2026**; Project for the web has folded into **Microsoft Planner Premium on Dataverse**, which is the integration target here. SAP classic PS networks are out of scope — the WBS element carries scope and cost; scheduling lives in the external scheduler.

The **WBS code** is carried on every task as an attribute (a Dataverse custom column, a P6 activity code), so that cost (from SAP, per WBS) and progress (from the scheduler, per task → WBS) can be joined. "No task without a WBS code" is the enforceable rule.

### 4. Ingestion channels

Real ERP/scheduler data does not arrive only via live APIs. The contract supports three channels per source, surfaced on a Data Import / Integration admin screen (Test Connection · Sync Now · Last Sync per source):

1. **API** — live pull from the source REST/OData API. Preferred for structure and progress.
2. **File / SFTP** — scheduled flat-file (CSV/XLSX) drop, parsed and validated against a published template. Common for SAP cost extracts and where direct API access is restricted.
3. **Manual upload** — ad-hoc CSV/XLSX upload of the same template, for one-off corrections or environments without connectivity.

All three channels feed the **same mapper and ingestion pipeline** — only the adapter at the edge differs. Each channel produces source-shaped records that are mapped, diffed, and upserted identically.

### 5. Connector architecture (ports & adapters)

```
source system ──▶ Adapter (per source/channel) ──▶ source DTO
                                                      │
                                                      ▼
                                               Mapper (DTO → canonical, join by WBS)
                                                      │
                                            ┌─────────┴─────────┐
                                            ▼                   ▼
                                     canonical rows       unmapped / orphaned
                                            │                   │
                                            ▼                   ▼
                                   Ingestion service     Exception queue
                              (diff → idempotent upsert → stamp provenance → log run)
```

**`SourceConnector` interface (the port):**

```
interface SourceConnector {
  testConnection(): Promise<ConnectionStatus>;
  fetchWorkPackages(projectRef): Promise<SapWbsDTO[]>;     // SAP only
  fetchCostActuals(projectRef): Promise<SapCostDTO[]>;     // SAP only
  fetchTasks(projectRef): Promise<SchedulerTaskDTO[]>;     // Dataverse / P6
  fetchResourceAssignments(projectRef): Promise<SchedulerResourceDTO[]>;
  fetchMilestones(projectRef): Promise<SchedulerMilestoneDTO[]>;
}
```

**Adapters** implement the interface per source: `SapPsAdapter`, `DataverseAdapter`, `P6Adapter` (live), plus `*MockAdapter` and `CsvFileAdapter` for the file/manual channels. DTOs are **source-shaped** (e.g. an OData `A_EnterpriseProjectElement` object, a Dataverse `msdyn_projecttask`), not canonical — the mapper does the translation.

**Mapper** — pure functions, no I/O, fully unit-tested: source DTO → canonical row, applying §6 mappings and resolving the WBS join. Anything that cannot resolve is returned flagged (see §7), never silently dropped.

**Ingestion service** — orchestrates fetch → map → **diff against current** → **idempotent upsert** (§8) → stamp `synced_at` → write a sync-run log; routes flagged records to the exception queue.

### 6. Field mappings

The heart of the contract. `external_id` is the source's stable key; `source_system` tags provenance; mirrored rows are read-only.

#### 6.1 SAP PS → canonical

**Project / WBS structure** (OData `A_EnterpriseProjectElement` / classic `PRPS`):

| Canonical (`work_packages`) | SAP source field | Notes |
|---|---|---|
| `wbs_code` | `WBSElementExternalID` (or `WBSElement`) | the join key |
| `parent_wbs_code` | `ParentWBSElement` | builds the hierarchy |
| `name` | `WBSElementDescription` | |
| `responsible_role_type` | `PersonResponsible` / responsible cost centre | mapped to a role type |
| `is_billing_element` | billing-element indicator | |
| `budget_bac` | budget (Budgeting API / planned total) | as-planned budget |
| `baseline_bac` | budget baseline snapshot | as-sold; frozen at booking |
| `target_finish` | basic / latest finish date | top-down envelope |
| `external_id` | WBS object number (`OBJNR`) | |

**Cost actuals** (CDS / `ACDOCA` or `BAPI_…` per WBS per period):

| Canonical (`cost_actuals`) | SAP source | Notes |
|---|---|---|
| `wbs_code` | WBS element | join |
| `period` | fiscal period / posting period | monthly bucket |
| `actual_cost` | actuals (+ commitments, per policy) | |
| `planned_value` | period planned value | |

Project header → `projects`: `sold_contract_value`, `contract_value_current`, `approved_budget_current`, `source_system='SAP_PS'`, `external_id`, `last_synced_at`.

#### 6.2 Dataverse / Planner Premium → canonical

Entities: `msdyn_project`, `msdyn_projecttask`, `msdyn_resourceassignment`.

| Canonical (`tasks`) | Dataverse field | Notes |
|---|---|---|
| `wbs_code` | custom column (e.g. `cr_wbscode`) | **required** — the join attribute |
| `name` | `msdyn_subject` | |
| `start_date` / `finish_date` | `msdyn_start` / `msdyn_finish` | |
| `percent_complete` | `msdyn_progress` | 0–100 |
| `predecessors` | task dependencies | |
| `external_id` | `msdyn_projecttaskid` | |
| `source_system` | constant `DATAVERSE` | |

`msdyn_resourceassignment` → `resource_assignments` (`resource_role`/`resource_name`, `period`, `planned_work_hours`, `external_id`). Milestone-flagged tasks → `milestones`.

#### 6.3 Primavera P6 → canonical

Endpoints: `/activities`, `/resourceassignments` (P6 EPPM REST).

| Canonical (`tasks`) | P6 field | Notes |
|---|---|---|
| `wbs_code` | activity WBS code / activity-code mapped to the published WBS | the join attribute |
| `name` | `Activity.Name` | |
| `start_date` / `finish_date` | `Activity.StartDate` / `FinishDate` | |
| `percent_complete` | `Activity.PercentComplete` | |
| `external_id` | `Activity.ObjectId` | |
| `source_system` | constant `P6` | |

`/resourceassignments` (units/hours per period) → `resource_assignments`.

### 7. The WBS-code join contract & exception handling

The join is an **attribute discipline**: every task carries its WBS code because it was created under WBS nodes that came from SAP (published per §11). The contract defines:

- **Valid join.** A task's `wbs_code` matches an existing `work_packages.wbs_code` for the same project. Coding-mask normalisation (leading zeros, separators) is applied before matching.
- **Unmapped task.** A scheduler task whose `wbs_code` is missing or matches no work package → routed to the **exception queue** (`sync_exceptions`), never ingested into `tasks` with a dangling reference. Mirrors the proven "missing-mapping flag" pattern (a record returned with `missingMapping: true` for the UI to surface).
- **Orphaned WBS.** A work package removed in SAP whose tasks still reference it → flagged for a human decision (reassign tasks or retire).
- **Resolution.** A human resolves each exception (map the task to a WBS, fix the code in the scheduler, or retire) from the Integration admin screen. The exception queue *is* the reconciliation layer — the most valuable and most human part of the integration.

### 8. Sync semantics

- **Triggers.** Scheduled (cron, e.g. nightly delta) + on-demand ("Sync Now") + file-drop (SFTP poll). Full vs delta per source (delta via `changed-on` / etag where the API supports it).
- **Ordering.** WBS before tasks (tasks need a parent), structure before cost. The orchestrator enforces dependency order.
- **Idempotency.** Upsert keyed on (`source_system`, `external_id`). Re-running a sync with unchanged source data is a no-op. Change detection via source `changedOn`/etag avoids needless writes.
- **Diff before apply.** Each run computes a diff (added / removed / changed-fields) against current canonical rows; large or destructive diffs can require confirmation before commit (the stage → review → apply pattern). Routine deltas apply automatically.
- **Conflict policy.** System of record wins for mirrored fields; `is_app_native` rows (app-authored, not yet booked) are never overwritten by a sync. Two sources never write the same field.

### 9. Auth & security

| Source | Auth model | Secrets |
|---|---|---|
| SAP PS | BTP **destinations** + Cloud Connector; OAuth 2.0 / principal propagation or a technical user | BTP Destination service / vault |
| Dataverse | **Entra ID** app registration + service principal (client-credentials), Dataverse application user with least-privilege role | Key vault |
| P6 | P6 EPPM auth (token / basic over TLS) | Key vault |

No service-role or static keys in application code. Tokens are short-lived and refreshed; all transport over TLS; least-privilege scopes per source.

### 10. Provenance & freshness

Every mirrored row carries `source_system`, `external_id`, `synced_at`; `projects` carries `last_synced_at`. The UI surfaces **"as of {synced_at}"** wherever synced figures appear (already present on the WBS tree, schedule, and EV). A staleness threshold per source drives a "stale" badge when the last successful sync exceeds it. Honesty about freshness is a trust requirement, not a nicety — stale joins produce wrong earned value.

### 11. Outbound writes (the two provisioning writes)

The only writes to a system of record, both one-time at setup, both human-approved (see the architecture note's "propose → approve → hand off → read-only" rule):

1. **Book WBS → SAP.** An AI-authored, human-approved WBS is created in SAP PS via `BAPI_PROJECTDEF_CREATE` + WBS-element BAPIs (or the S/4 Enterprise Project OData create), with **simulate-before-commit** validation against the coding mask / project profile. SAP returns the real IDs; provenance flips to `SAP_PS`.
2. **Publish WBS → scheduler.** The booked WBS **structure only** (code + name + parent + level, no cost or dates) is created in the scheduler as a read-only scaffold — P6 WBS nodes via REST, or Dataverse summary tasks plus the `wbs_code` custom column — so planners build WBS-tagged activities under it. Re-published on WBS change.

Both writes are gated by approval, fully audited, and validated/simulated before commit. The schedule itself is never authored.

### 12. Error handling & observability

- **Retry/backoff** on transient failures; **dead-letter** for repeated failures.
- **Partial-failure isolation** — one bad record does not fail the run; it goes to the exception queue.
- **`sync_runs`** log: source, channel, started/finished, counts (inserted/updated/skipped/exceptions), status, error summary.
- **`sync_exceptions`** queue: row, reason (unmapped WBS / validation / conflict), raw payload, resolution state.
- **Alerting** on failed runs and on staleness threshold breaches.
- The Integration admin screen renders last sync per source, run history, and the open exception queue.

### 13. Non-functional notes

- **Volume** — order of thousands of work packages and tasks per portfolio; well within single-batch sync.
- **Rate limits** — respect each API's throttling (Dataverse service-protection limits, SAP gateway limits); page large pulls; back off on 429.
- **Latency** — nightly delta is sufficient for EV/portfolio reporting; on-demand sync for a single project completes in seconds.

### 14. Testing strategy

- **Mapper unit tests** (the highest-value tests): source DTO fixtures → expected canonical rows, including the unmapped-WBS path. Pure functions, fast, deterministic — mirroring the proven mapper+exporter test pattern.
- **Idempotency test** — run the same sync twice; assert the second run produces zero writes.
- **Exception-path test** — feed a task with a bad WBS code; assert it lands in `sync_exceptions`, not `tasks`.
- **Round-trip test** (outbound) — author → book payload shape matches the SAP create contract; publish payload matches the scheduler scaffold.

### 15. Build order (Phase 6, Option 2)

Implement the contract one slice at a time, keeping the generators as a fallback so the working app never breaks:

1. **Connector interface + ingestion service + `sync_runs` / `sync_exceptions`** (migration) — the spine.
2. **SAP slice end-to-end** — `SapPsMockAdapter` returning OData-shaped WBS + cost fixtures → mapper → idempotent upsert → provenance. Prove it against one project, then the portfolio.
3. **Integration admin screen** — methods (API / file / manual), Test Connection, Sync Now, Last Sync, run history, exception queue.
4. **Dataverse + P6 slices** — same pattern for tasks / resources, with the WBS-join exception path exercised by a deliberately mis-tagged task.
5. **Outbound writes** — wire the existing book-to-SAP flow and add publish-to-scheduler through the same contract, with simulate-before-commit.
6. **Real adapters** — swap a mock for a live adapter behind the unchanged interface, when/if a real tenant is available.

### 16. Open questions & assumptions

- **Bid vs execution WBS.** The as-sold (bid) WBS and the execution WBS may differ structurally; the as-sold baseline is currently derived on the execution WBS. A real bid→execution mapping is a future reconciliation concern.
- **Cost granularity.** Whether `actual_cost` includes commitments or only actuals is a policy decision per deployment.
- **Resource identity.** Discipline-level resource pools vs named resources — the canonical model supports both; the contract assumes discipline-level for portfolio visibility.
- **Single vs multi-scheduler per project.** The model allows a project's tasks to come from one scheduler; mixed-source projects are out of scope for v1.

---

*Exit criterion (Phase 6): this is a fully-specified, testable sync contract. Implementing the SAP slice (§15.2) against a mock adapter, through the real pipeline, satisfies "at least one connector live or a fully-specified, testable sync contract."*


## Per-Object Integration Sync

### Technical Edition · Chapter B6 — ingest, parity & round-trip

The integration layer (B4/B5) is exercised per source object rather than as a single
monolithic sync. Migration 0030 generalised `sync_runs` / `sync_exceptions` to carry
an `entity` and `endpoint`, so each API — commitments, billing, results analysis,
cost elements, labour actuals, change orders, milestones — syncs independently with
its own run record and exception list.

The admin page exposes an object dropdown ("sync this API"), a data-freshness table
(when each object last synced), and CSV templates for the file/manual channel. A
round-trip download re-exports each object so file parity can be checked, and a
`source_system` column on all seven objects shows whether each row is an SAP feed or
AI-PMO-authored. The pattern mirrors the adapter / mapper / ingestion / exception
design proven in the sync contract (B4) — extended object by object so partial
integration (some feeds live, others manual) is a first-class state, not a failure.


# Part III — The Agents


## AI PMO — Agent Technical Profiles

For each of the 14 specialist agents: what it needs as **input**, where the app **grounds** it, the methodology **rules** it follows, and what it **refuses** to do.

Each profile *summarises* the agent's prompt file (`lib/agent-prompts/<agent>.md`), which is the **authoritative source** — consult the prompt for the full rules. (Keeping these as summaries of the prompt, not a parallel spec, is deliberate: it stops the documentation drifting from the prompts — see interview‑prep Q16.)

---

### Authoring & planning agents (Initiation → Planning)

These six produce the upstream PM artefacts. All are *reference‑grounded* — when a project was created from a comparable "similar project," that project's matching artefact is pulled in as an exemplar.

#### Charter Drafter — Project-level
- **Inputs:** The intake form plus the project header — objectives, scope and the commercial baseline.
- **Grounding:** Project header (SAP‑sourced) + a comparable past project's charter (reference grounding) + the Northwood charter worked example.
- **Rules:** PMBOK §4.1 charter, the 12‑section Northwood template; every inferred value is flagged `[NEEDS PM REVIEW]`.
- **Boundary:** Does not analyse schedule detail or build the WBS; nothing is left for the model to decide later.
- *Source of truth:* `lib/agent-prompts/charter_drafter.md`

#### Stakeholder Analyst — Project-level
- **Inputs:** Intake form + approved Charter.
- **Grounding:** Project header + a reference project's stakeholder register + the worked example.
- **Rules:** PMBOK KA 13; influence/interest classification; 10–18 roles across client, regulator, community, vendor and internal.
- **Boundary:** No political judgements on named individuals; does not write the comms plan.
- *Source of truth:* `lib/agent-prompts/stakeholder_analyst.md`

#### WBS Builder — Project-level
- **Inputs:** Intake + approved Charter + scope.
- **Grounding:** Project header + a reference project's WBS + the worked example.
- **Rules:** PMBOK §5.4 — the 100% rule (all scope, counted once); Level‑2 phase branches decomposed to Level 3; dictionary for the top work packages.
- **Boundary:** No Gantt charts or dates; no effort estimation. Authors the WBS that is then booked to SAP.
- *Source of truth:* `lib/agent-prompts/wbs_builder.md`

#### Schedule Reasoner — Project-level
- **Inputs:** Intake + Charter + the approved WBS; on the consume side, the scheduler's tasks/milestones and the contractual window.
- **Grounding:** Project header + WBS + a reference project's schedule + worked example; reads the canonical tasks/milestones and the project start/contract‑finish for critical‑path and window checks.
- **Rules:** PMBOK KA 6 critical‑path analysis; the critical path as 3–7 sequential chains; reconciles the forecast against the contractual window.
- **Boundary:** Never produces dated P6 / MS Project schedules; does not commit durations or owners without PM input.
- *Source of truth:* `lib/agent-prompts/schedule_reasoner.md`

#### Budget Builder — Project-level
- **Inputs:** Intake + Charter §7 commercial baseline + the approved WBS + Schedule Analysis. **Authoritative (never invented):** contract value, target margin, approved budget, contingency, contract type.
- **Grounding:** Project header (the control totals — the SAP/CPQ shell) + the canonical WBS + a reference project's cost baseline + the Northwood cost‑baseline worked example + the risk register (for contingency mapping).
- **Rules:** PMBOK cost management; one P50 cost line per WBS Level‑2 branch, totalling to the approved budget; contingency mapped to charter risks; cash flow tied to milestones.
- **Boundary:** Does not forecast actuals (no forecast engine) or generate ERP cost codes; flags inferred lines `[NEEDS PM REVIEW]`.
- *Source of truth:* `lib/agent-prompts/budget_builder.md`

#### Communications Planner — Project-level
- **Inputs:** Intake + Charter + Stakeholder Register + WBS + Schedule + Cost Baseline.
- **Grounding:** Project header + a reference project's comms plan + the worked example.
- **Rules:** PMBOK KA 10; maps who‑needs‑what; cadence, channels and escalation paths; reporting templates per audience.
- **Boundary:** Does not send emails or run meetings; plans the communication, people deliver it.
- *Source of truth:* `lib/agent-prompts/communications_planner.md`

---

### Execution, monitoring & closeout agents

These read the live project data (the canonical model + the domain tables) and synthesise — read‑only.

#### Issue Logger — Project-level
- **Inputs:** The project's issue log plus project context.
- **Grounding:** The canonical `issues` table (the live issue log) + the project header.
- **Rules:** Severity × age prioritisation; ownership‑gap detection; flags items blocking closeout.
- **Boundary:** Does not resolve issues or assign new owners.
- *Source of truth:* `lib/agent-prompts/issue_logger.md`

#### Variance Analyst — Project-level
- **Inputs:** The computed earned‑value figures plus the variance‑report history.
- **Grounding:** Structured facts — PV/EV/AC → CPI/SPI/EAC/VAC computed *in code* from the canonical WBS + cost + progress (not by the model) — plus the `variance_reports` table.
- **Rules:** Earned Value Management (PMBOK); summarise the latest position + trend across reporting weeks; flag thresholds and projected margin.
- **Boundary:** Does not compute portfolio‑wide trend; does not replace the monthly variance committee.
- *Source of truth:* `lib/agent-prompts/variance_analyst.md`

#### Change Order Reviewer — Single-item
- **Inputs:** One change order + Charter + WBS + Cost Baseline + project.
- **Grounding:** The selected `change_orders` row + the project header + the canonical structure.
- **Rules:** Northwood four‑frame analysis (scope / schedule / cost / contract); assess margin protection; recommend the approval routing.
- **Boundary:** Does not create change orders or negotiate commercial terms.
- *Source of truth:* `lib/agent-prompts/change_order_reviewer.md`

#### Risk Analyst — Project-level
- **Inputs:** The project's risk register (or a project brief).
- **Grounding:** The canonical `risks` table + project context.
- **Rules:** PMBOK 7 risk management + Northwood's six‑class cross‑cutting taxonomy; one cause→event→consequence sentence per risk; surfaces the top three to watch.
- **Boundary:** No cross‑portfolio patterns (that is the Portfolio Risk Reviewer); no mitigations without project context.
- *Source of truth:* `lib/agent-prompts/risk_analyst.md`

#### Lessons-Learned Synthesiser — Project-level
- **Inputs:** The project's records — risks, issues, change orders, variance and the planning artefacts.
- **Grounding:** The canonical domain tables (`risks` / `issues` / `change_orders` / `variance_reports`) + project context.
- **Rules:** Northwood situation→action→outcome→generalisation; 4–6 themes; 3–7 firm‑level lessons each mapped to an adoption pathway; hedges uncertain causation.
- **Boundary:** Does not replace post‑mortem facilitation; works only from what is in the data (no tacit knowledge).
- *Source of truth:* `lib/agent-prompts/lessons_learned_synthesiser.md`

#### Closeout Reporter — Project-level
- **Inputs:** The full project record — baseline vs actual cost/schedule, scope changes, risk closeout, lessons, outstanding items.
- **Grounding:** Project header (baseline) + the canonical cost / schedule / change / risk data + `variance_reports`.
- **Rules:** PMBOK Close Project; final outcome vs the original baseline; scope‑change history and risk closeout; Northwood closeout template.
- **Boundary:** Does not trigger contractual closeout activities or settle warranty claims.
- *Source of truth:* `lib/agent-prompts/closeout_reporter.md`

---

### Portfolio & reporting

#### Portfolio Risk Reviewer — Portfolio-level
- **Inputs:** Risks across multiple active projects in the portfolio.
- **Grounding:** The `risks` table across all active projects + the firm‑level pattern catalogue (`portfolio_patterns`).
- **Rules:** Northwood cross‑cutting taxonomy with a pattern‑emergence threshold of 2+ projects; aggregate by class; recommend portfolio‑level mitigation.
- **Boundary:** No single‑project deep dives (that is the Risk Analyst); does not produce a project risk register.
- *Source of truth:* `lib/agent-prompts/portfolio_risk_reviewer.md`

#### Status Reporter — Project-level
- **Inputs:** PM notes and observations + project data; plus the audience to tailor to.
- **Grounding:** The project data — variance, risks, issues, change orders, milestones — plus whatever the PM provides.
- **Rules:** PMBOK performance reporting; a one‑page RAG report, audience‑adapted (team / sponsor / client); always surfaces active change orders; substantiates the RAG the PM set.
- **Boundary:** Does not invent percentages, dates or costs; does not compute earned value (that is the Variance Analyst); does not pick the RAG colour for you.
- *Source of truth:* `lib/agent-prompts/status_reporter.md`

---

*The cross‑cutting design throughout: every agent is grounded in real data (project header, canonical model, domain tables, a comparable past project, or the worked‑example library); the figures it must not invent are handed in; anything it had to estimate is flagged for human review. The agents read and draft — a human approves. This profile set is a summary; the prompt files are authoritative.*


## PMO LLM — Agent Routing Design

A design note on how PMs invoke agents today, why we chose that pattern, the trade-offs, and the proposed Phase 2.5 enhancement that adds auto-routing as a hybrid option.

### Today: explicit agent selection

On the "Invoke agent" tab of any project, the PM picks an agent from a dropdown (Risk Analyst, Charter Drafter, WBS Builder, etc.), types a free-form prompt, and hits Send. The system loads the chosen agent's system prompt (e.g., `lib/agent-prompts/risk_analyst.md`), passes it plus the project context plus the user prompt to Claude Opus 4.7, and renders the markdown response.

This is the pattern from Phase 2.3 onward. Each invocation writes a row to `agent_outputs` recording the agent type used, the user prompt, the model output, and the token/cost stats.

### Why this pattern was chosen

Four reasons that drove the explicit-selection design.

#### Methodology faithfulness

The Phase 1 methodology proof — 25 first-shot 30/30 outputs — rests on specialist agents. Each agent has a carefully tuned system prompt that anchors it to its domain: the Risk Analyst's prompt references the cross-cutting classification taxonomy, the Charter Drafter's prompt references the Northwood charter template, the WBS Builder's prompt references PMBOK Section 5.4 (Create WBS) and the 100% rule. These anchoring details are what produce the v4-style inline hedging (`[NEEDS PM REVIEW: ...]`) and the worked-example-faithful structure.

If a router automatically picks the wrong agent — say, routing a stakeholder question to the Risk Analyst — the system prompt mismatch produces a wrong-domain answer with no warning. The methodology recipe stops being empirically clean.

#### Cost and latency control

Every agent invocation today is one Opus 4.7 call. Adding a router that itself uses an LLM adds a second call (router → specialist). Even with a cheap router model like Claude Haiku, that's another $0.005–0.01 and 1–2 seconds. Across hundreds of demo invocations the cost compounds and the latency becomes noticeable.

#### Audit-trail transparency

The Recent Activity feed on the dashboard shows which agent ran on each invocation. PMs can scan the feed and immediately understand the system's behaviour. With auto-routing, you also need to surface the router's decision ("Auto → Risk Analyst") so the chain remains visible. Otherwise debugging "why did I get the wrong answer" becomes harder.

#### Portfolio narrative

"We chose explicit agent selection to keep the methodology empirically clean during Phase 1 evidence collection" is itself a defensible architectural decision worth highlighting in interviews. It demonstrates restraint and methodological discipline rather than reaching for the more demoable pattern automatically.

### The downside

Explicit selection is fine for technical users who know the agent taxonomy. For business-user demos (the 3–5 colleagues who'll receive personalised URLs in the Phase 2.5 pilot), it creates friction:

- The PM has to learn what 13 different agents do
- The dropdown is a small UX speed-bump before the question can be composed
- "Pick a tool, then ask the tool" feels more bureaucratic than "ask the system a question"

For the colleague-demo, the latter feels more natural and more impressive.

### Proposed Phase 2.5 enhancement: hybrid Auto + override

Keep the dropdown, but add an **"Auto (Router)"** option at the top of the list and make it the default.

When "Auto" is selected:

1. The PM types a free-form prompt.
2. The system runs a small classifier LLM call (Claude Haiku, ~$0.005 per call) that maps the prompt to the most appropriate specialist agent. The router's system prompt lists all 13 agents and what each is for, then asks for a one-token answer (just the agent_type).
3. The system loads that specialist agent's prompt and invokes Opus 4.7 as today.
4. The audit trail records both: "Router → Risk Analyst", so the chain is fully visible in the Recent Activity feed and the `agent_outputs` table (new column `routed_from_intent`).

Power users — and the methodology-curious — can still pick a specific agent from the dropdown to override the routing.

### Why this is the right Phase 2.5 enhancement

- **Best of both worlds.** Methodology purity is preserved (the right specialist still runs; just the *choice* is automated). Demoability gets the natural ask-anything feel.
- **Audit trail stays clean.** Router decisions are recorded; a user looking at past outputs sees both the intent and the agent used.
- **Falls back gracefully.** If the router is uncertain or returns an invalid agent name, fall back to a sensible default (e.g., the first agent the PM's role can invoke) and log the fallback.
- **Low cost per call.** Adding ~$0.005 per invocation is negligible against the $0.10–0.40 the specialist call costs.
- **Demo-able as itself.** Shows two AI calls collaborating — a classifier and a specialist — which is the canonical "agentic system" pattern.

### Implementation outline

Four pieces of work, ~half a day total:

1. **`lib/agent-router.ts`** — small module exposing `routeUserIntent(prompt, allowedAgents)`. Calls Claude Haiku via OpenRouter with a system prompt that lists the agents (filtered to the user's role permissions) and asks for a single-token answer. Returns the agent_type name. Handles fallback if the model returns garbage.

2. **`lib/agent-runner.ts` patch** — detect `agent_type === 'auto'` in the incoming request, call the router first, then proceed with the routed agent.

3. **`components/agent-chat.tsx` patch** — add "Auto (Router)" as the first option in the agent dropdown, default-selected. After invocation, surface the routed-to agent in the response header (e.g., "Router → Risk Analyst") so the PM sees what happened.

4. **Schema patch** — add a `routed_from_intent` text column to `agent_outputs` (nullable). Migration `0004_add_router_metadata.sql`.

### Effort estimate

- Coding: ~4 hours
- Testing: ~1 hour (run a dozen mixed prompts, confirm router classifications are sensible)
- Documentation update: ~30 minutes (extend this design note to a closeout, update Stack Explained)

### Cost impact

Adds ~$0.005 per Auto invocation. Negligible.

### Risks worth flagging

- **Router can misroute.** Mitigated by audit-trail visibility and the explicit-override path.
- **Cheaper router models hedge less.** A Haiku router will sometimes give ambiguous answers. Fallback logic mitigates this. Could optionally upgrade to Sonnet for the router if Haiku turns out to be too sloppy in practice.
- **The router's quality is its own thing to validate.** Could add a `router_eval.ts` script that runs ~50 representative prompts through the router and checks the classifications against a hand-labelled gold set.

### Decision pending

Implement in Phase 2.5 alongside Realtime broadcast and visual polish. No urgency — Phase 2.4 demo works fine with explicit selection; the enhancement is for colleague-demo polish, not for the methodology evidence base.


## Cross-Agent Actions

### Technical Edition · Chapter B11 — the assign→respond loop (`action_items`)

AI PMO's agents and human roles coordinate through a lightweight task layer rather
than ad-hoc messages. Migrations 0009–0011 add `action_items` (assigner role, owner
role, project, body, status, response) and the canonical status set.

The loop: any role (or agent) **assigns** an action to another role on a project; the
owner sees it on an action ribbon and in a popup, **responds**, and the status moves
through a canonical lifecycle. Three analytics pages roll the open/closed actions up
across the portfolio. Generator 20 simulates 312 actions from the risk and issue
registers (owner→role mapping, weighted status) plus a few portfolio-level items, so
the loop is populated for the demo.

It is a deliberately **thin register** — it exists because no system-of-record owns
cross-discipline project actions, and the data feeds the watchlist and analytics
(the scope-charter exception). It does not attempt to be a ticketing system.


# Part IV — The Synthesis Libraries


## The Earned-Value Library

### Technical Edition · Chapter B12 — `lib/earned-value.ts` (pairs with Business A5/A13)

The earned-value library is the computational heart of AI PMO. It is a pure,
dependency-free module of functions over plain inputs — no I/O, no database — which
makes it trivially testable and reusable from pages, agents and the portfolio
roll-up alike.

### Inputs

`computeEv` assembles the three EVM primitives from canonical data joined on the
WBS code:

- **BAC / PV** from the work-package budgets and the planned curve.
- **EV** from each leaf work package's budget × the scheduler's `%complete` on its
  tasks — *the cross-seam join*: SAP budget meets scheduler progress.
- **AC** from `cost_actuals`, summed to the leaf.

### Core derivation

`deriveMetrics(bac, pv, ev, ac)` returns the full metric set:

```
cpi  = ev / ac
spi  = ev / pv
cv   = ev - ac          // cost variance
sv   = ev - pv          // schedule variance
eac  = ...              // three methods (see B13)
vac  = bac - eac
vacPct = vac / bac
tcpiBac = (bac - ev) / (bac - ac)   // CPI needed to hit budget
tcpiEac = (bac - ev) / (eac - ac)   // CPI needed to hit forecast
```

A `ready` flag guards against divide-by-zero and no-activity branches so the UI can
distinguish "on plan" from "no data."

### Per-WBS breakdown and roll-up

`computeEvByWbs` runs the same derivation per WBS branch (Level-2 phase grouping via
`wbs.split('.').slice(0,2).join('.')`), each with its own CPI/SPI and a RAG flag, so
a portfolio number resolves to a responsible branch. `rollUpEv` aggregates many
projects into a `PortfolioEv` for the dashboard, summing BAC/EV/AC before deriving
indices (never averaging indices — a classic EVM error the code avoids).

### Earned schedule

`earnedSchedule` measures schedule performance in time: it finds the past period at
which today's EV equalled the plan, giving `ES`, `SV(t)` and `SPI(t)` — correcting
SPI's end-of-project drift toward 1.0.

### Consumers

The EV tab card, the EV-by-WBS view, the portfolio EV analytics page, the
dashboard's portfolio pulse, the cash-flow and forecast libraries (which take EV
points), and the Variance Analyst agent.


## The Forecast Library

### Technical Edition · Chapter B13 — `lib/forecast.ts` + `forecast_snapshots` (pairs with Business A6)

Forecasting adds the **time dimension** the point-in-time metrics lack. It rests on
a monthly snapshot table plus pure decomposition functions.

### The snapshot model

`forecast_snapshots` (migration 0032) stores one row per `(project_id, period)` with
`bac, ev, ac, eac, etc, vac, cpi, spi, contract_value, poc_pct, recognised_revenue,
billed, forecast_margin`. Generator 22 builds it **anchored to live EV**: it
recomputes the current BAC/EV/AC/CPI/EAC by mirroring `computeEv`, makes that the
latest close, and back-casts N earlier months with smooth easing (`ease = t*t*(3-2t)`)
so the series *ends* exactly at the live EV card's EAC and drifts believably — no
zigzag, numbers that tie under scrutiny.

### EAC methods

Three standard forecasts, chosen by reliability of the trend:

```
eac1 = bac / cpi                       // performance continues
eac2 = ac + (bac - ev)                 // remainder at budget
eac3 = ac + (bac - ev) / (cpi * spi)   // cost- and schedule-weighted
```

### Functions

`parseForecast` returns a sorted, typed series; `eacMovement` decomposes the latest
ΔEAC into a **scope** component `(Δbac)/prevCPI` and a **performance** residual, so a
forecast change reads as "X from scope growth, Y from performance" rather than an
unexplained jump.

### Consumers

The forecast-trend chart (margin-at-complete band + transposed month table), the
cash-flow library (cost/EAC and billing series), and the Variance Analyst.


## The Cash-Flow Library

### Technical Edition · Chapter B14 — `lib/cash-flow.ts` (pairs with Business A8)

Pure synthesis over the forecast snapshots; no migration, no generator.

### `deriveCashFlow(points, finishIso, opts)`

Builds two cumulative curves on a monthly timeline and the funding gap between them:

```
payLagM = 1, collectLagM = 2, retentionPct = 5   // defaults, adjustable

cumCost  : AC history, then ramping AC→EAC by finish (smoothstep)
cumBill  : billed history, then ramping billed→contract×(1−retention) (smoothstep)

cashOutCum = cumCost[m − payLagM]       // pay later than you incur
cashInCum  = cumBill[m − collectLagM]    // collect later than you bill
net        = cashInCum − cashOutCum      // funding exposure (≤0 = financing)
```

Returns the series plus `currentNet`, `peakFunding` (the trough — max financing
need), `peakPeriod`, and `cashPositivePeriod` (first zero-crossing after the peak).
The lag and retention assumptions are returned with the result so the UI can show
them.

### `aggregateCashFlow(items)`

Rolls many projects' curves onto a shared monthly timeline. `evalAt` evaluates each
project's cumulative value *as of* a period (0 before it starts, its final value
after it ends), so the portfolio sum is correct across projects with different
windows. Produces the portfolio `CashAgg`; the page computes it again per segment and
per project for the drill-down.

### Consumers

The project Cost tab's Cash-flow lens (`components/cash-flow.tsx`) and the portfolio
Analytics → Cash flow page with segment/project drill (`cash-flow-explorer.tsx`).


## The Change-Orders Library

### Technical Edition · Chapter B15 — `lib/change-orders.ts` (pairs with Business A10)

Pure derivations over the `change_orders` table — no migration beyond the trend
fields, no generator at read time.

### Outcome classification

`classifyOutcome` maps each change order to **funded** / **absorbed** / **open** /
**withdrawn** from `status`. The trend model (migration 0031) added the `Absorbed`
and `Withdrawn` statuses and a `recovery_confidence` integer, so every change starts
life as a trend and resolves to a funded variation, an absorbed (unfunded) cost, or
a withdrawal.

### Derivations

- `summarizeChangeOrders(cos, soldContract)` — counts, cumulative cost/revenue,
  blended margin, sold→revised contract growth, and the exposure splits:
  `fundedRevenueM`, `absorbedCostM`, `openRevenueM`, `expectedRecoveryM`,
  `revenueAtRiskM` (= open revenue × (1 − recovery confidence)) and `avgRecoveryPct`.
  Revenue-at-risk mirrors the **IFRS 15 variable-consideration constraint**.
- `pipelineStages`, `marginImpact(cos, baseMargin)` (accretive/dilutive vs the base),
  `byDriver` and `categorizeDriver` (keyword buckets over the free-text `driver`
  field → Client-directed scope / Site conditions / Design development / Regulatory &
  permits / Supply & escalation / Estimating & productivity / Other).

### Consumers

The Changes tab panels, the portfolio Changes analytics page, the dashboard's
change-exposure KPIs and the by-segment / by-driver insight charts, and the Change
Order Reviewer agent. (Gotcha: `margin_realized_pct` can be null on trend/absorbed
rows — render guards required.)


## The Risk-EMV Library

### Technical Edition · Chapter B16 — `lib/risk-emv.ts` (pairs with Business A11)

Pure quantitative-risk functions over the risk register.

### Exposure

`isLive(status)` keeps only open / actively-managed threats (residual exposure
remains). `computeExposure(risks)` returns:

```
inherentEmv   = Σ emv_usd            (live threats, pre-mitigation)
residualEmv   = Σ residual_emv_usd   (post-mitigation)
reductionPct  = (inherentEmv − residualEmv) / inherentEmv
opportunityUpside, realisedCost, liveThreats
```

The reduction percentage is the headline "did mitigation work?" number; opportunities
(favourable risks) and realised cost are tracked separately from threat exposure.

### Contingency adequacy

`computeContingencyAdequacy` tests the buffer against what remains:

```
coverage = remainingContingency / residualExposure
band     = coverage ≥ 1.0 → 'Adequate'
           coverage ≥ 0.75 → 'Tight'
           else            → 'Exposed'
```

P50/P80 sizing is the conceptual frame; where a formal Monte Carlo P80 exists it is
consumed rather than re-derived.

### Consumers

The risk exposure panel, the inherent/residual heatmap toggle, the portfolio risk
analytics (EMV), and the Risk Analyst agent. A materialised risk crosses into the
issue log (B-issues / Business A12).


## The Commercial Libraries

### Technical Edition · Chapter B17 — margin · billing · commitment · results-analysis (pairs with Business A7/A9)

Four small pure libraries turn the cost-to-cash tables into commercial intelligence.

### `lib/margin.ts` — the margin bridge

`computeMarginBridge` derives three margins and the waterfall between them:
as-sold (`sold contract − frozen baseline budget`), as-planned (`current contract −
current WBS budget`), as-built (`current contract − EAC`); the deltas are attributed
to **budget growth**, **change orders**, and **performance**. The as-sold baseline is
frozen at booking (migration 0019 + generator 11).

### `lib/results-analysis.ts` — revenue recognition

`computeResultsAnalysis(rows, billingByPhase)` rolls the posted RA figures
(cost-based POC, `calculated_revenue`, `cost_of_sales`, `recognized_margin`) per WBS
phase to a project position, then derives `net = recognised − billed`,
`wip = max(0, net)` (contract asset) and `deferred = max(0, −net)` (contract
liability). Independent of EV by construction (migration 0029 + generator 19).

### `lib/cost-commitment.ts` + `lib/billing.ts`

Commitment from open purchase orders (`po_value − received_value`, open only) for the
Commitment tab; billing events (invoiced/paid) for the billing and cash-in series.
Together with cost actuals they give cost-to-date = actual + open commitment.

### Consumers

The Cost tab's three lenses (cost-to-date, revenue recognition, cash flow), the
Commitment tab, the margin bridge on Overview, and the Cost Controller agent — which
reasons across the three independent revenue figures (EV $, recognised revenue,
billed).


## Portfolio Reads & Pagination

### Technical Edition · Chapter B18 — `lib/select-all.ts`

A small but load-bearing utility. PostgREST (Supabase's REST layer) caps a single
response at `max_rows` (1000) on both local and cloud. A naive `.select()` over a
table that has grown past 1000 rows silently returns only the first page — which once
dropped 67 of 99 projects out of a portfolio earned-value roll-up without any error.

`selectAll(supabase, table, columns, pageSize = 1000)` pages through with `.range()`
until a short page is returned, guaranteeing the full table:

```
for (let from = 0; ; from += pageSize) {
  const { data } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
  out.push(...data);
  if (data.length < pageSize) break;
}
```

**Rule:** any portfolio-wide rollup uses `selectAll`, never a single `.limit()` or a
bare `.select()`. It is applied across the dashboard reads, the EV/resources/changes
analytics pages, and the cash-flow page. The lesson generalises — silent truncation
is worse than an error, because the numbers still look plausible.


# Part V — Build, AI Concepts & Evaluation


## PMO LLM — Build Rulebook

> **Why this document exists.** Across Phase 0 and the early Phase 1 agent builds, a set of patterns, principles, and conventions has emerged that now governs how we build, test, and document new agents. This rulebook consolidates them in one place so future agent builds can reference it without re-deriving every decision. It also serves as a portfolio artefact in its own right: the engineering rulebook a senior AI Solutions Architect would author when standing up a methodology-aware agentic system. The rulebook is updated as new findings arrive; the change log at the end records each update.

**Document status:** living document. Cite the section, not the document, when referring to a specific rule.

### 1. Core principles (Phase 0 + Phase 1)

These are the empirically-validated principles that govern every design decision downstream. Each principle is backed by specific evidence; cite the evidence when discussing the principle in interviews.

#### 1.1 Worked-example dominance

**The principle.** A model imitates the behavioural pattern of the worked example it is given, not just the topical content. The worked example is a behavioural template, not a stylistic reference.

**Evidence.** Phase 0 Test 5 vs Test 6 score gap (Risk Analyst, different active projects) mapped exactly to thin vs rich Response text in the worked example. Test 1 v3 → v4 lift of 1 point (27 → 28) was traceable solely to the inline-annotation change in the Skyhawk worked example. Test 1 v5 regression of 4 points (28 → 24) was traceable solely to a format-mixing change in the same worked example.

**Implication.** The single biggest investment in any agent build is the worked example. Spending more time on the example than on the prompt is correct. The agent prompt is a thin layer; the worked example is the load-bearing artefact.

#### 1.2 Format consistency in worked examples

**The principle.** Mixed formats within one section of a worked example create false-attribution failure modes. The model interprets section-level format dominance as a copying instruction.

**Evidence.** Skyhawk v5 applied a uniform `— from intake` suffix to every line in §7 Commercial baseline. The model copied the suffix mechanically to the new Mariposa output, producing false attribution on lines where the suffix should not have applied. Score regression: 28 → 24.

**Implication.** Use per-line discipline, not section-wide patterns. The committed format is v4-style inline italic annotations: `*(at draft stage this was [NEEDS PM REVIEW: <value>]; <how resolved>)*`. Per-line discipline; do not apply section-wide format suffixes.

#### 1.3 Frontier model alone is not enough

**The principle.** A better model with a poor worked example performs worse than a weaker model with a good one. Substrate quality and example quality multiply; they do not substitute.

**Evidence.** Test 5 local Qwen3-30B with v2 prompt and original Skyhawk: 28/30. Test 1 v5 Opus 4.7 with v2 prompt and bad Skyhawk: 24/30. The frontier model lost to the local model when the worked example was worse.

**Implication.** Cloud-only on Opus 4.7 is necessary but not sufficient. The agent prompt and worked-example layers must be engineered with as much care under cloud as under local.

#### 1.4 Worked-example absorption depends on model capacity

**The principle (Path 2.1 refinement to §1.1).** Worked-example absorption is not uniform across models. The model must have the capacity to extract the behavioural pattern from one example.

**Evidence.** The same v4 Skyhawk that lifted Opus from 27 → 28 produced 26 on local Qwen3-30B. Local treated Skyhawk v4 as a structural template (sections, tables, fields); Opus treated the same example as a behavioural template (annotation discipline, depth of assumptions, source attribution).

**Implication.** Cloud substrate is required to extract full value from worked-example investment. The per-dollar return on the cloud substrate is better than the headline cost gap suggests once you factor in absorption.

#### 1.5 Control surface ranking

**The principle.** The twelve levers documented in `PMO_LLM_Stack_Explained.docx` §7 do not contribute equally to output quality. The ranking from Phase 0 evidence:

- Layer 5 (worked examples) — demonstrated 4-point swing within a single test.
- Layer 11 (the model itself) — demonstrated 4-point swing between local and frontier.
- Layer 6 (agent prompts) — demonstrated 2-point lift from one-line v2 changes.
- Layer 4 (context documents / retrieval) — relative impact to be measured in Phase 1.
- Layers 1, 2, 3, 7, 8, 9, 10 — untouched in Phase 0, impact unknown.
- Layer 12 (run-to-run variance) — the noise floor; ±2 to ±3 points expected on any single-run score.

**Implication.** Optimisation effort follows the ranking. Improve worked examples first, then model, then prompts, then retrieval — drop down the stack as upper layers approach diminishing returns.

#### 1.6 Phase 1 emerging finding — the recipe is reproducible

**The principle (emerging from Phase 1).** Opus 4.7 + a competent worked example with v4-style inline-annotation hedging + a v2-style agent prompt → frontier-ceiling output on first try.

**Evidence.** Five first-shot 30/30 scores in a row on five brand-new agent types, each with a progressively deeper upstream context chain:
- Stakeholder Analyst on Riverside worked example: 30/30 (4 inputs)
- WBS Builder on Ironvale worked example: 30/30 (6 inputs)
- Schedule Reasoner on Riverside worked example: 30/30 (7 inputs)
- Budget Builder on Skyhawk worked example: 30/30 (8 inputs — five preceding agent artefacts in the chain)
- Communications Planner on Riverside worked example: 30/30 (10 inputs — six preceding agent artefacts; integrated charter §11 governance, stakeholder register roles, WBS risk linkages, schedule buffer, and budget thresholds into one internally-consistent communications plan)
- Issue Logger on Ironvale worked example: 30/30 (11 inputs — six preceding agent artefacts; the agent inverted the state shape from closeout-state to Week 0 baseline-state, producing 20 Open issues with provisional lesson clauses derived from upstream-artefact open items, where Ironvale's worked example showed 22 Closed issues with retrospective lesson clauses)
- Variance Analyst on Skyhawk worked example: 30/30 (12 inputs — seven preceding agent artefacts; second state-inversion test — Skyhawk's worked example was mid-execution populated variance with two material events, Mariposa's output was Week 0 framework with zero variance; agent invented §6.3 Variance-watch precursors section linking issue-log open items to future variance channels, and the §5 coverage analysis went beyond the worked example by stress-testing midpoint and upper-bound exposure scenarios)
- Change Order Reviewer on Riverside worked example: 30/30 (13 inputs — eight preceding agent artefacts; third state-inversion test — Riverside's worked example was a mid-execution analysis of the UV disinfection scope addition (CO-003, $1.45M), Mariposa's output was Week 0 framework with anticipated change-order categories; agent invented §1.2 Anticipated change-order categories table mapping Week 0 issue-log items to likely change-order drivers and timing windows; reframed the binding constraint from Riverside's state-regulatory deadline to Mariposa's 30-day SC-to-energisation buffer; identified the tax-credit-deadline asymmetry as a structural commercial dynamic — sophisticated counterparty-leverage reasoning that goes beyond the worked example)
- Lessons-Learned Synthesiser on Ironvale worked example: 30/30 (14 inputs — nine preceding agent artefacts; fourth state-inversion test and most extreme inversion yet — Ironvale's worked example was a fully populated closeout synthesis with 10 firm-level recommendations and adoption-quarter status tracked through the first year post-closeout; Mariposa's output was Week 0 framework with lessons-to-track and "Pending — realises at [event]" status; agent reframed Mariposa as a *test* of post-Ironvale firm-level standards at renewables scale, identified three lessons-to-track with immediate cross-portfolio relevance before realisation, added a sixth theme (Stakeholder & communications) not prominent in Ironvale's five-theme worked example; meta-level reasoning about Mariposa's role in the firm's learning curve)
- Closeout Reporter on Skyhawk worked example: 30/30 (15 inputs — ten preceding agent artefacts; fifth state-inversion test — Skyhawk's worked example was a fully populated closeout report at Substantial Completion, Mariposa's output was Week 0 framework with outcome-dimensions-to-measure; agent recognised that Objective 2 (energisation) is binary without a partial-met state because the federal tax-credit-tier outcome is binary on the client side; added three Mariposa-specific reporting dimensions (camp safety, per-turbine punch-item breakdown, SC-to-energisation buffer outcome) that Skyhawk's worked example didn't have; articulated the methodological rationale for the three-category risk closeout — mitigated risks validate the mitigation, not-materialised risks return contingency without validating anything; identified the warranty-period analogue to the SC-to-energisation buffer for status discipline)
- Portfolio Risk Reviewer on the multi-project portfolio worked example: 30/30 (16 inputs — eleven preceding agent artefacts plus the portfolio worked example; sixth state-inversion test and most architecturally distinct — worked example was a quarterly portfolio review covering 3 live projects (Skyhawk, Riverside, Ironvale) with full detail; Mariposa's output was a Week-0-triggered interim portfolio review treating Mariposa as one project of four with detail-on-Mariposa and placeholders-on-three; agent recognised this Week-0 review carries patterns from the worked-example date as prior-quarter baseline — temporal reference-frame shift; introduced a candidate pattern below threshold (tax-credit pre-contract confirmation discipline gap) with explicit reasoning about how the candidate could be elevated through PMO Director assessment; correctly deferred taxonomy extension to PMO Director governance; demonstrated bidirectional cross-document coherence between portfolio patterns and Mariposa lessons-learned framework headlines)
- Risk Analyst v3 (cross-cutting awareness retrofit) on Ironvale + Portfolio Risk Reviewer worked examples: 30/30 (14 inputs — two worked examples (Ironvale risk register + Portfolio Risk Reviewer portfolio review) plus eight preceding Mariposa agent outputs; the retrofit successfully integrated project-level and portfolio-level discipline; agent recognised that a single project can carry multiple risks in the same cross-cutting class (R-001 commercial cadence + R-006 technical interface both Vendor / supplier concentration; R-002/R-003/R-004/R-008 all Regulatory / external deadline but four different sub-classes); applied pattern-threshold awareness per-risk with explicit elevation reasoning; avoided duplicating candidate patterns already in the portfolio review; cited worked examples bidirectionally (R-007 quotes Riverside CO-003 and Skyhawk CO-003 as Pattern 3 evidence); v1 and v2 discipline (specific responses, observable triggers, role-owners, hedging on inferred thresholds, first-of-its-kind H impact, considered-and-excluded section, client-side partition) all preserved)

**Implication.** The agent build sequence is high-confidence. The investment in authoring competent worked examples is paying compound dividends. There is no need to iterate worked examples or agent prompts after the first run unless evidence accumulates that a specific gap exists.

### 2. The agent build recipe

Each new agent follows the same five-step recipe. The recipe has been validated three times in Phase 1 with consistent results.

#### Step 1 — Choose the worked-example source

Each agent gets one past project from the Northwood archive as its dominant worked example. The convention is a clean partition: each past project anchors a distinct agent type. Current assignments:

- **Skyhawk Solar** → Charter Drafter (Initiating) AND Budget Builder (Planning) AND Variance Analyst (Monitoring & Controlling) AND Closeout Reporter (Closing)
- **Riverside Water** → Stakeholder Analyst (Initiating) AND Schedule Reasoner (Planning) AND Communications Planner (Planning) AND Change Order Reviewer (Monitoring & Controlling)
- **Ironvale Smelter** → WBS Builder (Planning) AND Risk Analyst (Planning) AND Issue Logger (Executing) AND Lessons-Learned Synthesiser (Closing)
- **Portfolio-level (cross-project)** → Portfolio Risk Reviewer. Unique among the agents in that it does not pair with a single past project; its worked example is `archive/_portfolio/00_portfolio_risk_review.md`, a multi-project portfolio review at a notional past date when Skyhawk, Riverside, and Ironvale were all live in the active portfolio. The agent's unit of analysis is the portfolio, not the project.

Riverside and Ironvale anchor two agents each because they have distinct artefact types (stakeholder material vs schedule analysis; WBS vs risk register). Skyhawk is reserved for Charter Drafter to preserve the v4 inline-annotation worked example as the gold-standard pattern.

When a new agent is needed and no past project has matching artefact material, the rule is: pick the past project whose project nature best demonstrates the discipline the new agent needs to learn. For a new agent in the Closing phase, that's likely Ironvale (it has the richest closeout context, including lessons-learned). For a Communications agent, that's likely Riverside (multi-stakeholder city/state/community).

#### Step 2 — Author the worked example

Author the worked example as a markdown file in the appropriate archive folder. File naming: `0{N}{letter}_{artefact}.md` (e.g., `01b_stakeholder_register.md`, `01c_wbs.md`, `01d_schedule_analysis.md`). The letter suffix sits after the existing numeric sequence to preserve the lifecycle ordering.

The worked example follows the structure in §3 of this rulebook.

#### Step 3 — Write the agent prompt

Write the agent prompt as a markdown file in `PMO_LLM_Test_Pack/agents/{agent_name}.md`. The prompt follows the structure in §4 of this rulebook.

#### Step 4 — Render both .md and .docx in parallel

Per the established convention, every authored artefact exists in both `.md` (model-readable) and `.docx` (human-readable) form. Use pandoc for archive worked examples and agent prompts:

```bash
pandoc input.md -o input.docx
```

Pandoc default styling matches the existing archive convention. The marquee portfolio deliverables (Closeout Synthesis, Strategy, Stack Explained, this Rulebook) use the custom docx-js build scripts for house-style colours.

#### Step 5 — Run the first test

Construct the test command per the pattern in §5 of this rulebook. Expected cost ~$0.30–$0.45 of OpenRouter credit per test on Opus 4.7. Expected runtime 1–2 minutes.

Score the output against the six-dimension rubric (Schema, Faithfulness, Methodology, Archive use, Decision-readiness, Style — each /5, max 30). Render the run output as `.docx` immediately after scoring.

### 3. The worked-example pattern

Every worked example follows the same structure. The structure has been validated across charters (Skyhawk v4), stakeholder registers (Riverside), WBS (Ironvale), and schedule analyses (Riverside).

#### 3.1 Top-of-document note

Every worked example opens with a blockquote note explaining its role as a worked example. The note states:

- That this is the COMMITTED artefact at a specific point in the past project's lifecycle (end of Planning, post-charter, etc.)
- That items shown with inline italic annotations would, at draft stage, carry `[NEEDS PM REVIEW]` flags
- That the final values reflect what the PM committed during the corresponding planning sequence
- That a new project's draft would carry the same items in flagged form until equivalent confirmation cycles complete

This note is what tells the model "do not copy these specific values; copy the discipline."

#### 3.2 Section structure

The standard worked-example sections are:

1. **Project context** (compact: name, ID, contract type, value, PM, baseline date)
2. **Main artefact** (the stakeholder register, WBS, schedule, etc. — the substance)
3. **Optional dictionary or supporting sections** (WBS dictionary, engagement plan, etc.)
4. **Conventions used** (5 conventions the agent should imitate — explicit, numbered)
5. **Notes on format for the agent** (3 patterns the agent should imitate — explicit, numbered)
6. **Notes for downstream agents** (where applicable: what the Schedule Reasoner, Budget Builder, etc. should know)

The conventions and notes-on-format sections are the most important. They tell the agent explicitly what to copy and what to adapt. They typically contain 3–5 numbered patterns each.

#### 3.3 Inline italic annotation format

The canonical hedging format is:

```
*(at draft stage this was [NEEDS PM REVIEW: <what to confirm>]; <how resolved if applicable>)*
```

Used per-item, per-line, per-cell. NEVER applied section-wide. The "how resolved" clause is what makes the worked example feel like a real PM document — it shows the model that uncertainty resolves through specific confirmation cycles, not by inventing values.

#### 3.4 Adapt the discipline, not the content

The worked example is a behavioural template. The model should extract:

- The format of hedging annotations
- The structure of section organisation
- The level of detail per item
- The relationship between sections (e.g., the matrix in §3 of a stakeholder register must place every stakeholder from §2)

The model should NOT copy:

- Specific names from the past project
- Specific durations or costs
- Specific risks or stakeholders unique to the past project
- The past project's contract structure or commercial terms

When the model adapts well, it produces a clean transfer (e.g., Schedule Reasoner adding a road-upgrade chain because Mariposa has it but Riverside didn't). When the model copies, the failure shows as either irrelevant content or false attribution.

### 4. The agent prompt pattern

Every agent prompt follows the same structure. The structure has been validated across Stakeholder Analyst, WBS Builder, and Schedule Reasoner, all of which scored 30/30 first-shot.

#### 4.1 Role statement

One sentence describing the agent's role and the artefact it produces.

Example: "You are the WBS Builder, a senior PMO assistant for Northwood EPC Group. Your job is to produce a clean, methodology-aligned Work Breakdown Structure (WBS) and accompanying WBS dictionary from a project's intake form, approved Charter, Stakeholder Register, and supporting context."

#### 4.2 Ten behavioural rules

The agent prompt always contains ten numbered rules. The rules are not arbitrary; they fall into consistent categories:

- **Rule 1**: Authority. What is authoritative on the topic the agent works on (charter, intake, methodology).
- **Rule 2**: Structure. Reference to the worked example, citing it as the structural and stylistic template. "Adapt the discipline, not the topical content."
- **Rule 3**: Methodology. PMBOK alignment, 100% Rule (for WBS), etc.
- **Rule 4**: Naming or output convention specific to the artefact (e.g., deliverable-oriented for WBS, audience-segmented for engagement plans).
- **Rule 5**: Decomposition or counting rule (e.g., 10–18 stakeholders, 40–80 work packages, 3–7 critical-path chains).
- **Rule 6**: Hedging discipline category 1 (typically: ratings, names, owners).
- **Rule 7**: Hedging discipline category 2 (typically: durations, costs, dates, frequencies).
- **Rule 8**: Cross-section consistency (e.g., the matrix must place every stakeholder).
- **Rule 9**: Range constraint or completeness rule (e.g., dictionary covers ≥5 highest-impact packages).
- **Rule 10**: Output format. Markdown, sections numbered, no preamble or postscript.

#### 4.3 Style block

Five style rules. Common across agents:

- Professional. Concise. Plain language; no jargon for its own sake.
- Active voice. Specific where you have facts; flagged placeholders where you do not.
- Numbers in their natural units (days for durations, currency for values, dates in charter format).
- No promotional or sales tone. This is an internal control document.
- Inline italic annotations are used for hedging discipline only, not for emphasis.

#### 4.4 Definition-of-done block

5–9 explicit acceptance criteria for the output. The criteria are not aspirational; they are checks. If any criterion is missing in the output, the run failed even if the score is high.

Example criteria categories:
- Section presence and ordering
- Count or range satisfaction (e.g., 40–80 work packages)
- Cross-references intact
- All gaps flagged explicitly
- No values left "for the model to decide later"

#### 4.5 What the prompt does NOT include

The prompt does NOT include:

- Examples of good output. The worked example provides this; duplicating it in the prompt would dilute the worked-example dominance principle.
- Step-by-step instructions on how to construct the artefact. The model knows how to construct it; the prompt sets the rules.
- Excessive politeness or framing. The prompt is operational instructions, not a conversation.
- "Think step by step" or chain-of-thought scaffolding. Opus 4.7 reasons internally; explicit scaffolding adds tokens without measurable benefit on this task class.

### 5. The test execution pattern

#### 5.1 Command structure

The test command always uses `run_cloud.py` with `--model anthropic/claude-opus-4-7` and a list of input files. The file order follows the layered context model:

1. The agent prompt (system message)
2. Company context (`00_company_context.md`)
3. Methodology canon (`methodology/pmbok_extract.md`)
4. The worked example (one past project's artefact)
5. Any upstream agent outputs needed for context (e.g., the approved charter for downstream agents)
6. The active project's intake brief

Example for Schedule Reasoner on Mariposa:

```bash
python scripts/run_cloud.py \
  --model anthropic/claude-opus-4-7 \
  ".../agents/schedule_reasoner.md" \
  ".../00_company_context.md" \
  ".../methodology/pmbok_extract.md" \
  ".../archive/p1_riverside_water/01d_schedule_analysis.md" \
  ".../runs/run01c_charter_mariposa_opus47_v4skyhawk.md" \
  ".../runs/run07_stakeholder_mariposa.md" \
  ".../runs/run08_wbs_mariposa.md" \
  ".../test_inputs/charter_01_mariposa_wind.md" \
  > runs/run09_schedule_mariposa.md
```

#### 5.2 Output handling

The wrapper writes output to `runs/runNN_{agent}_{project}.md` in the WSL filesystem. The user then copies the output to the workspace runs folder:

```bash
cp runs/runNN_{agent}_{project}.md "/mnt/c/Claude/Projects/PMO LLM/runs/"
```

Render the docx immediately after:

```bash
pandoc runs/runNN_{agent}_{project}.md -o runs/runNN_{agent}_{project}.docx
```

#### 5.3 Scoring

Every test output is scored against the six-dimension rubric:

- **Schema** (out of 5): structural adherence to the template.
- **Faithfulness** (out of 5): traceability to authoritative sources; no fabrications.
- **Methodology** (out of 5): PMBOK alignment, discipline.
- **Archive use** (out of 5): worked example used adaptively, not copied.
- **Decision-readiness** (out of 5): the PM can approve after one review pass.
- **Style** (out of 5): clean, professional, no jargon padding.

Maximum 30. The current Phase 1 results are three 30/30s in a row. Single-run scoring carries ±2 to ±3 noise band per Phase 0 reproducibility methodology.

#### 5.4 Cost discipline

Each test costs approximately $0.30–$0.45 of OpenRouter credit on Opus 4.7. Input bundles in the 15K–30K token range; output bundles in the 4K–8K token range. The cost grows linearly with the input chain depth — Stakeholder Analyst (4 inputs) ~$0.20, WBS Builder (6 inputs) ~$0.30, Schedule Reasoner (7 inputs) ~$0.35.

Cumulative Phase 1 spend after three agents: ~$0.85 of $19 OpenRouter starter credit. Plenty of headroom against the $1,000 project ceiling.

### 6. File and folder conventions

#### 6.1 Workspace structure

```
C:\Claude\Projects\PMO LLM\
├── PMO_LLM_*.docx                          # Marquee portfolio deliverables (styled)
├── PMO_LLM_Build_Rulebook.md / .docx       # This document
├── PMO_LLM_Test_Pack\
│   ├── 00_company_context.md / .docx
│   ├── agents\
│   │   ├── charter_drafter.md / .docx
│   │   ├── stakeholder_analyst.md / .docx
│   │   ├── wbs_builder.md / .docx
│   │   ├── schedule_reasoner.md / .docx
│   │   └── ... (one per agent)
│   ├── methodology\
│   │   ├── pmbok_extract.md / .docx
│   │   ├── charter_template.md / .docx
│   │   └── ...
│   ├── archive\
│   │   ├── p1_riverside_water\
│   │   │   ├── 00_brief.md / .docx
│   │   │   ├── 01_charter.md / .docx
│   │   │   ├── 01b_stakeholder_register.md / .docx
│   │   │   ├── 01d_schedule_analysis.md / .docx
│   │   │   ├── 02_status_week_36.md / .docx
│   │   │   ├── 03_status_week_72.md / .docx
│   │   │   └── 04_risk_register.md / .docx
│   │   ├── p2_skyhawk_solar\
│   │   └── p3_ironvale_smelter\
│   │       └── 01c_wbs.md / .docx
│   └── test_inputs\
│       └── charter_01_mariposa_wind.md / .docx
└── runs\
    ├── run01_charter_mariposa.md / .docx       (Phase 0 baseline)
    ├── run07_stakeholder_mariposa.md / .docx   (Phase 1, 30/30)
    ├── run08_wbs_mariposa.md / .docx           (Phase 1, 30/30)
    ├── run09_schedule_mariposa.md / .docx      (Phase 1, 30/30)
    └── ...
```

#### 6.2 Naming conventions

- **Archive artefacts**: `0{N}{letter}_{artefact}.md`. Letter suffix added when inserting between existing numeric sequences (e.g., `01b` between `01_charter` and `02_status`).
- **Agent prompts**: `{snake_case_role}.md` (e.g., `stakeholder_analyst.md`, `wbs_builder.md`, `schedule_reasoner.md`).
- **Test outputs**: `run{NN}_{snake_case_agent}_{project_slug}.md` (e.g., `run07_stakeholder_mariposa.md`).
- **Test outputs with iterations**: append `_v{N}` (e.g., `run01c_charter_mariposa_opus47_v4skyhawk.md`).

#### 6.3 Markdown and Word in parallel

Every artefact in the project exists in both formats:

- `.md` is the working file. Edits go here.
- `.docx` is the rendered companion for human review. Regenerated after every meaningful `.md` change.

Use pandoc for archive/agent files. Use docx-js build scripts (in `outputs/build_*.js`) for marquee portfolio deliverables.

### 7. Build sequence philosophy

#### 7.1 Lifecycle order

Agents are built in PMBOK lifecycle order so each new agent can consume upstream agent outputs as context. The build order:

- Initiating: Charter Drafter (existing), Stakeholder Analyst
- Planning: WBS Builder, Schedule Reasoner, Risk Analyst (existing — needs cross-cutting awareness in update), Budget Builder, Communications Planner
- Executing: Status Reporter (existing), Issue Logger
- Monitoring & Controlling: Variance Analyst, Change Order Reviewer
- Closing: Lessons-Learned Synthesiser, Closeout Reporter
- Portfolio: Portfolio Risk Reviewer

Building in lifecycle order means each new agent can see what the upstream agents produced. By the time we reach Status Reporter (Executing phase), the agent will have access to the charter, stakeholder register, WBS, schedule, budget, and risk register — exactly the artefacts a real PM consults when writing a status report.

#### 7.2 Agent-first, state-layer-deferred

The architectural temptation is to build the state layer (Qdrant for retrieval, Postgres for mutable state) before the agents. We are deliberately deferring it. The rationale:

- Building the state layer before knowing what state each agent actually needs is speculative.
- The agent-first sequence lets each agent be validated as a standalone unit with the existing `run_cloud.py` wrapper.
- By the time three or four agents are working, the state-layer requirements are concrete and the design is no longer a guess.

We will introduce the state layer (Phase 1 sub-phase, after roughly 6–7 agents are working) when the planning load justifies it. The state layer becomes essential for the Phase 2 demo regardless.

#### 7.3 Single-run scoring, multi-run deferred

Phase 1 prioritises agent breadth and demo velocity over statistical depth. Single-run scoring is used throughout. The eval harness is structured so multi-run can be enabled later by changing one parameter. Multi-run is deferred to a possible Phase 2.5 add-on if interview defence requires it. The trade is acknowledged: single-run scores carry a ±2 to ±3 noise band; the build is optimised against this limitation.

#### 7.4 Cross-cutting awareness retrofitted

The Risk Analyst (carried forward from Phase 0) will need updating to handle cross-cutting risk classification (vendor, regulatory, resource, category) and applicability tagging across the portfolio. The Portfolio Risk Reviewer (new 13th agent) operates at portfolio level. Both are designed/updated when we reach the state-layer build, not before — because the portfolio cross-reference structure they depend on doesn't exist yet.

### 8. Decisions made and rationale

The substantive decisions made in this project and the reasoning behind each.

#### 8.1 Cloud-only on Anthropic Claude Opus 4.7

**Decision.** All Phase 1 and Phase 2 work runs on Opus 4.7 via OpenRouter. The local Qwen3-30B-A3B stack remains installed as a proof-of-concept artefact but goes dormant.

**Rationale.** Phase 0's Path 2.1 finding showed that the same worked example produces a larger lift on Opus than on local 30B. Per-dollar return is better on cloud once you factor in absorption. Cloud-only simplifies the substrate story for the portfolio.

#### 8.2 Portfolio mode (4–5 concurrent projects) over single-project demo

**Decision.** The demo runs on a portfolio of 4–5 concurrent fictional projects with cross-cutting risk propagation, not a single project.

**Rationale.** Cross-cutting risk propagation is the demo's differentiating value-add. Without it, the demo is "AI assistant per project." With it, the demo is "multi-role agentic PMO orchestration over a portfolio" — categorically more impressive and a direct map to the SAP Joule / AI Agent Hub orchestration pattern. +2–3 weeks of build time, ~$50–$100 extra API spend. Well within the $1,000 ceiling.

#### 8.3 Collaborative-roles mode (Mode B) over isolated-session mode (Mode A)

**Decision.** Each demo colleague's URL identifies them by role (Sponsor, PM-by-project, Procurement Strategist, Risk Owner, Construction Manager). All roles share state across the portfolio. Activity log captures who-did-what.

**Rationale.** Multi-role collaboration on shared state is the realistic PMO operating model. The Procurement Strategist who identifies a vendor risk should see it propagate to the PM's status report without manual copying. This is the interview-grade narrative.

#### 8.4 Single-run scoring (no multi-run)

**Decision.** Phase 1 uses single-run scoring throughout. Multi-run methodology is deferred to a possible Phase 2.5.

**Rationale.** The build prioritises agent breadth and demo velocity over statistical depth. The ±2 to ±3 noise floor is acknowledged. The eval harness is structured so multi-run can be enabled later by changing one parameter.

#### 8.5 No third-party observability (no Langfuse)

**Decision.** Phase 1 uses hand-rolled flat-file logging only. No Langfuse, LangSmith, or Weights & Biases.

**Rationale.** Engineering simplicity over slicker debugging. The trade is acknowledged. Langfuse Cloud free tier can be added in ~1 hour if debugging pain demands it.

#### 8.6 Each agent gets one dedicated past-project worked example

**Decision.** Each agent type is paired with one past project as its dominant worked example. Riverside Water → Stakeholder + Schedule. Ironvale → WBS + Risk. Skyhawk → Charter.

**Rationale.** Clean partition produces variety in the worked-example portfolio. Each past project demonstrates a distinct project nature (water/wastewater, industrial smelter, renewable solar) so the model sees range when learning patterns. Reuse of one past project across multiple agent types is fine when the artefacts are distinct.

#### 8.7 Budget headroom philosophy

**Decision.** Project budget ceiling is $1,000. Projected actual spend is $300–$550. The headroom (~$450–$700) is pre-authorised but not pre-allocated.

**Rationale.** In-the-moment decisions deploy budget against demonstrated value. Pre-allocation locks in choices before the build reveals which ones matter. Headroom is reserved for unanticipated requirements (extended-thinking calls, comparison models, upgrading free-tier choices that constrain the build).

### 9. The four architectural questions answered

These came up during the build and are worth recording in one place so they don't need re-asking.

#### 9.1 Chunking — is it happening yet?

Not yet. The wrapper concatenates whole files into the prompt. Current input bundles are 15K–30K tokens against Opus 4.7's 200K window — well within capacity. Chunking will be introduced when the corpus grows large enough that whole-file inclusion bumps against the "lost in the middle" effect or starts costing too much per call. Estimated trigger: when the active-project state plus archive plus methodology exceeds ~80K tokens per call.

#### 9.2 Where does the data live in the demo?

Not on the user's local machine. For Phase 2:

- **Corpus** (methodology, past projects, worked examples): pre-indexed in a cloud vector database (Qdrant Cloud or self-hosted on a small cloud VM).
- **Mutable project state** (added risks, change orders, status reports): Supabase Postgres, per-portfolio shared state with activity log.
- **Inference**: Opus 4.7 via OpenRouter, called server-side from Vercel serverless functions (API key never reaches the browser).
- **Web app**: Next.js on Vercel.
- **The user's local machine**: not in the loop after deploy; can be powered off.

#### 9.3 Do agents share state within a colleague's session?

Yes. Within a colleague's interaction, every agent reads the latest mutable state when invoked. When the Procurement Strategist adds a vendor risk via the Risk Analyst, it writes to shared state. When the PM later invokes the Status Reporter, the Status Reporter reads that updated state and reflects it.

#### 9.4 Do cross-cutting risks propagate across projects?

Yes — in the Phase 2 portfolio demo. The Risk Analyst (updated for portfolio mode) classifies each risk as project-specific or cross-cutting (vendor / regulatory / resource / category). Cross-cutting risks are written to portfolio-level state and tagged with applicability via a cross-reference table. When the PM of Project B runs a status report, the report pulls Project B's project-specific risks PLUS all portfolio-level risks tagged as applicable to Project B. The Portfolio Risk Reviewer (new agent) scans cross-cutting risks across the portfolio and surfaces patterns to the Sponsor.

### 10. Open questions and forward triggers

Questions that are not yet decided but will need answers as the build progresses. Triggers for revisiting deferred decisions.

#### 10.1 When to introduce the state layer

Trigger: after 6–7 agents are built. By then, the state-layer requirements are concrete (we know what each agent reads and writes), and the planning load (manually carrying upstream outputs into each test command) starts becoming friction worth eliminating.

#### 10.2 When to introduce retrieval (chunking)

Trigger: when input bundles exceed ~80K tokens per call, OR when adding new past projects to the archive doubles the corpus size beyond what whole-file inclusion can handle.

#### 10.3 When to consider multi-run scoring

Trigger: when an interview prep conversation, a portfolio reviewer's challenge, or a comparative analysis across configurations requires statistical defensibility on a quality claim. The eval harness is structured so flipping multi-run on is one parameter change.

#### 10.4 When to add Langfuse observability

Trigger: when debugging a lifecycle simulation that produces unexpected output reveals that hand-rolled flat-file logs are insufficient. The integration takes ~1 hour and does not disrupt other work.

#### 10.5 When to consider a comparison model

Trigger: if a portfolio reviewer or interview prep conversation makes the multi-model comparison story worthwhile. The most likely comparison candidates are Anthropic Sonnet 4.6 (cheaper Opus alternative for routine agents) or GPT-4.5 / Gemini 2.5 Pro (cross-vendor comparison for the architecture-portability story). Cost ~$300–$500 of additional OpenRouter spend across a four-model matrix.

#### 10.6 What to do with the Phase 0 Decision Memo's "must use multi-run" language

Currently the Decision Memo's Notes on Reproducibility section describes multi-run as the methodologically defensible approach. The Closeout Synthesis §6.4 has been updated to soften this to "deferred to a possible Phase 2.5." The Decision Memo itself remains canonical for the Phase 0 verdict and has not been edited. If interview defence ever requires citing the Decision Memo on this point, the Closeout Synthesis can be referenced as the post-Phase-0 refinement.

### 11. Change log

This rulebook is a living document. Material updates are recorded here.

- **2026-05-23, initial publication.** Consolidates Phase 0 + early Phase 1 patterns. Three first-shot 30/30 scores on Phase 1 agents (Stakeholder Analyst, WBS Builder, Schedule Reasoner) supply the empirical evidence for §1.6.
- **2026-05-23, Budget Builder added to Skyhawk pairing.** §2.1 worked-example assignments updated: Skyhawk Solar now anchors Charter Drafter AND Budget Builder. All three past projects now at two agents each — balanced partition.
- **2026-05-23, Budget Builder 30/30 result.** §1.6 evidence base extended from three to four first-shot 30/30 scores. The Budget Builder test was the deepest upstream context chain to date (8 inputs spanning five preceding agent artefacts); the recipe holds at this scale. The agent demonstrated pattern-extraction sophistication by sub-categorising Procurement to surface Mariposa-specific cost concentration, mirroring Skyhawk's procurement-line-decomposition pattern without copying its content.
- **2026-05-23, Communications Planner added to Riverside pairing.** §2.1 worked-example assignments updated: Riverside Water now anchors three agents (Stakeholder Analyst, Schedule Reasoner, Communications Planner). Multi-agent reuse of a single past project is acceptable when the artefacts are distinct, which they are — register vs schedule vs communications plan are three different artefact types built on the same project's stakeholder context.
- **2026-05-23, Communications Planner 30/30 result.** §1.6 evidence base extended from four to five first-shot 30/30 scores. The Communications Planner test was the deepest upstream context chain to date (10 inputs spanning six preceding agent artefacts); the recipe holds at this scale. The agent demonstrated *adaptive* use of the worked example — adding a project-specific crisis class (organised landowner opposition) not present in Riverside, replacing Riverside's process-upset class with a Mariposa-appropriate wildlife-incident class, and inventing a daily critical-path huddle cadence justified by the project's hard tax-credit deadline. This is the strongest evidence yet that the worked example teaches discipline, not content.
- **2026-05-23, Issue Logger added to Ironvale pairing.** §2.1 worked-example assignments updated: Ironvale Smelter now anchors three agents (WBS Builder, Risk Analyst, Issue Logger). All three past projects now at three-agent parity (Skyhawk at two, Riverside at three, Ironvale at three). The Ironvale issue log worked example demonstrates the lifecycle-state discipline (Open → In progress → Resolved → Closed, append-only) plus the issue-vs-risk distinction that the agent prompt enforces.
- **2026-05-23, Issue Logger 30/30 result — strongest validation of the worked-example principle to date.** §1.6 evidence base extended to six first-shot 30/30 scores. The Issue Logger test inverted the state shape: Ironvale's worked example was a closeout-state log (22 issues, all Closed, retrospective lessons), Mariposa's output was a Week 0 baseline-state log (20 issues, all Open, provisional lessons). The agent extracted the *discipline* (categorisation, severity, lifecycle, linkage, dictionary structure, lesson-clause framing) and applied it to a categorically different operational state. This is the strongest possible evidence that the worked example teaches discipline, not content. Three particularly impressive sophisticated touches: the agent invented "Lesson learned (provisional)" framing (epistemic discipline emerging without instruction); the agent synthesised three cross-issue themes in the lessons-learned notes (pattern extraction, not summary); and the agent identified a concentration pattern across its own log (Branch 3.0 OEM through I-002 and I-007).
- **2026-05-23, Variance Analyst added to Skyhawk pairing.** §2.1 worked-example assignments updated: Skyhawk Solar now anchors three agents (Charter Drafter, Budget Builder, Variance Analyst). **All three past projects now at three-agent parity** (Skyhawk 3, Riverside 3, Ironvale 3). The partition is balanced. The Skyhawk variance analysis worked example is set at Week 28 of 60 (mid-execution); the agent prompt explicitly handles the Week 0 case by producing the variance-measurement framework rather than fabricating mid-execution variance.
- **2026-05-23, Variance Analyst 30/30 result — second state-inversion test passed.** §1.6 evidence base extended to seven first-shot 30/30 scores. The state-inversion principle is now demonstrated twice: Issue Logger (closeout→baseline) and Variance Analyst (mid-execution populated→Week 0 framework). The agent inverted both the *quantitative state* (populated values vs empty-template values) and the *temporal state* (post-event retrospective vs pre-event prospective) while preserving the *discipline*. Two further sophistication signals: the agent invented a §6.3 Variance-watch precursors section that maps issue-log items to future variance channels (not present in the worked example), and the §5 coverage analysis stress-tested midpoint vs upper-bound exposure scenarios with explicit fallback to the margin floor as secondary defence (more sophisticated than the worked example's coverage analysis).
- **2026-05-23, Change Order Reviewer added to Riverside pairing — substantive exception to three-agent parity.** §2.1 worked-example assignments updated: Riverside Water now anchors **four** agents (Stakeholder Analyst, Schedule Reasoner, Communications Planner, Change Order Reviewer). The parity exception is substantively justified: Riverside is the only past project in the archive with a documented mid-construction client-driven change order (the UV disinfection scope addition in Q2 of construction, negotiated at thin margin, per `00_brief.md`). Using a project with an actual change-order event as the worked-example anchor gives the agent a real commercial narrative to learn from rather than a synthetic one. The UV change order worked example demonstrates: driver classification (Client-driven), schedule impact against the binding state-regulatory-deadline constraint (not just original SC), the four-frame pricing rationale (vendor leverage, client leverage, client position, Northwood acceptance), and rejected-alternatives discipline.
- **2026-05-23, Change Order Reviewer 30/30 result — third state-inversion test passed.** §1.6 evidence base extended to eight first-shot 30/30 scores. State-inversion principle now demonstrated three times consecutively: Issue Logger, Variance Analyst, Change Order Reviewer. The pattern is empirically robust: the worked example teaches the *discipline* (categorisation taxonomies, threshold structures, evidence-bearing analysis, decision routing) and the agent applies the discipline to the Week 0 baseline state regardless of how different that state is from the worked example's state. Three sophistication signals from this run: the agent invented a §1.2 Anticipated change-order categories table (Week 0-specific forward-looking planning artefact); the agent identified the tax-credit-deadline asymmetry as a structural commercial dynamic ("any change that touches energisation timing has the client *more* exposed than Northwood up to the LDs cap"); and the threshold-for-elevated-scrutiny statements (buffer-erosion days, dollar amounts) were calibrated to Mariposa's $148M scale without being explicitly asked for.
- **2026-05-23, Lessons-Learned Synthesiser added to Ironvale pairing — second four-agent exception.** §2.1 worked-example assignments updated: Ironvale Smelter now anchors **four** agents (WBS Builder, Risk Analyst, Issue Logger, Lessons-Learned Synthesiser). The parity exception is substantively justified: Ironvale's brief explicitly references a documented lessons-learned event ("lessons-learned write-up flagged single-sourced critical equipment as a category-level risk for the firm") — giving the agent a real synthesis narrative to learn from rather than a synthetic one. The lessons-learned worked example demonstrates theme-led organisation (5 themes), evidence-citation discipline (every lesson references Issue IDs and variance/change-order sections), firm-level-vs-project-specific separation, and adoption-pathway classification with owner function. Both Riverside and Ironvale now at four-agent parity for substantive (not symmetry) reasons. Skyhawk at three.
- **2026-05-23, Lessons-Learned Synthesiser 30/30 result — fourth state-inversion test passed, most extreme inversion yet.** §1.6 evidence base extended to nine first-shot 30/30 scores. The state-inversion principle is now empirically validated four times consecutively across maximally different state pairs. The Lessons-Learned Synthesiser test was the most extreme: Ironvale's worked example is at the *end* of the project lifecycle with one year of post-closeout adoption tracking; Mariposa's output is at the *beginning* of the lifecycle with no execution events. The agent extracted the discipline and applied it to the opposite-end state. Three sophistication signals beyond the recipe: (a) the agent reframed Mariposa as a "test" of post-Ironvale firm-level standards at renewables scale — meta-level reasoning about the firm's learning curve; (b) the agent identified three lessons-to-track with immediate cross-portfolio relevance before realisation on Mariposa itself; (c) the agent added a sixth theme (Stakeholder & communications) reflecting Mariposa's IPP-class client and community-engagement profile, recognising the worked-example theme structure was specific to Ironvale's circumstances and not universal.
- **2026-05-23, Closeout Reporter added to Skyhawk pairing — four-agent parity reached across all three past projects.** §2.1 worked-example assignments updated: Skyhawk Solar now anchors **four** agents (Charter Drafter, Budget Builder, Variance Analyst, Closeout Reporter). **All three past projects now at four-agent parity** (Skyhawk 4, Riverside 4, Ironvale 4). The partition is balanced. Skyhawk is the natural Closeout Reporter anchor because it has the richest mid-execution-to-closeout commercial narrative — the Variance Analysis worked example at Week 28 plus a closing margin that recovered from a 7.3% mid-execution projection to 8.6% at SC through favourable module variance and disciplined punch-list closeout. The Closeout Reporter worked example also demonstrates the three-category risk-closeout discipline (Realised / Mitigated / Not materialised) and the audience-aware disclosure boundary between client-facing executive summary and Sponsor-facing full detail.
- **2026-05-23, Closeout Reporter 30/30 result — fifth state-inversion test passed, lifecycle phase complete.** §1.6 evidence base extended to ten first-shot 30/30 scores. Five state-inversion tests passed consecutively across five different state pairs (Issue Logger, Variance Analyst, Change Order Reviewer, Lessons-Learned Synthesiser, Closeout Reporter). The lifecycle agent build is now complete — Closing phase has both Lessons-Learned Synthesiser and Closeout Reporter. Three sophistication signals from this run: (a) the agent recognised that Objective 2 (energisation) has a binary status structure without a partial-met state because the federal tax-credit-tier outcome is binary on the client side — sophisticated objective-level reasoning; (b) the agent added three Mariposa-specific reporting dimensions (camp safety, per-turbine punch-item breakdown, SC-to-energisation buffer outcome) that Skyhawk's worked example did not have but Mariposa's profile demands; (c) the agent articulated the methodological rationale for the three-category risk closeout in its conventions section — explaining *why* the methodology matters, not just applying it.
- **2026-05-23, Portfolio Risk Reviewer added — 13th agent, portfolio-level (not project-level), worked-example partition extended.** §2.1 worked-example assignments updated with a new "Portfolio-level (cross-project)" category. Portfolio Risk Reviewer is structurally different from the twelve lifecycle agents: it does not pair with a single past project. Its worked example is `archive/_portfolio/00_portfolio_risk_review.md` — a notional Northwood portfolio review at end of Q2 last fiscal year when Skyhawk, Riverside, and Ironvale were all live in the active portfolio. The worked example demonstrates the cross-cutting risk taxonomy (six closed classes), the applicability matrix discipline (six classes × N projects with explicit cell status), the pattern emergence threshold (two or more projects), and the recommended-portfolio-actions classification with lever and addressee. The portfolio-level worked example completes the agent roster at 13 agents (10 new lifecycle + 2 carry-forward + 1 portfolio).
- **2026-05-23, Portfolio Risk Reviewer 30/30 result — sixth state-inversion test passed, agent roster build-complete.** §1.6 evidence base extended to eleven first-shot 30/30 scores. Six state-inversion tests passed consecutively across six different state pairs — the discipline-not-content principle is now empirically robust at every scale of state inversion the project has encountered. The agent roster build is complete at 13 agents, all validated at first-shot 30/30. The Portfolio Risk Reviewer test was the most architecturally distinct: multi-project portfolio context with only Mariposa's detailed artefacts in the agent's context, requiring placeholder discipline on the other portfolio members. Three sophistication signals from this run: (a) the agent recognised that the worked-example date becomes the prior-quarter baseline this review carries patterns from — temporal reference-frame shift not explicit in the prompt; (b) the agent introduced a candidate pattern below threshold and reasoned about how it could be elevated, distinguishing single-project event from pattern evidence; (c) the agent demonstrated bidirectional cross-document coherence between portfolio patterns (Pattern 1 / 2 / candidate 4) and Mariposa lessons-learned framework §2 headlines (1 / 2 / 3), recognising it operates in the same governance pipeline as the lessons-learned synthesis.
- **2026-05-23, Risk Analyst v3 retrofit 30/30 result — twelfth first-shot 30/30; cross-portfolio integration validated.** §1.6 evidence base extended to twelve first-shot 30/30 scores. The Risk Analyst v3 retrofit was qualitatively different from the eleven new-agent builds: it updated an existing v2 agent prompt with additive cross-cutting awareness rather than building a new agent type. The test validates that the worked-example-dominance principle holds across retrofits as well as new builds — the agent integrated *two* worked examples simultaneously (Ironvale's project-level risk register for v1/v2 discipline preservation + Portfolio Risk Reviewer's portfolio-level taxonomy for v3 cross-cutting extension). Three sophistication signals from this run: (a) the agent recognised that a single project can carry multiple risks in the same cross-cutting class — R-001 commercial cadence + R-006 technical interface are both Vendor concentration but distinct project-level instances; R-002/R-003/R-004/R-008 are all Regulatory deadline but four sub-classes (federal tax-credit, wildlife permit, county DOT, utility); (b) the agent applied pattern-threshold awareness per-risk with explicit candidate-vs-confirmed elevation reasoning, marking R-005 and R-010 as "Candidate — pending placeholder confirmation" rather than fabricating threshold from single-project evidence; (c) the agent cited worked examples bidirectionally — R-007 quotes Riverside CO-003 and Skyhawk CO-003 as Pattern 3 evidence drawing from the actual past-project realised events to support the Mariposa structural prediction. The retrofit completes the agent roster validation at 12 first-shot 30/30s and the cross-portfolio architectural integration is empirically validated.
- **2026-05-23, Iteration 1 Week 28 — Issue Logger update 30/30 result — thirteenth first-shot 30/30; first lifecycle-iteration test passed.** §1.6 evidence base extended to thirteen first-shot 30/30 scores. This run is qualitatively new: the first agent re-run on the same project at a later lifecycle iteration (Week 28 mid-civil-construction state) rather than a fresh baseline run on a new project. The Issue Logger update consumed the Week 28 events brief (20 baseline issues with status updates, 3 new issues opened at Weeks 18/25/27) plus the Week 0 issue log run13 as the lifecycle-state predecessor, and produced a coherent Week 28 state log preserving append-only discipline, closing 18 issues, marking 2 In progress, opening 3 new (I-021 sub-grade variance at Plot B NW positions 16/23/41, I-022 wildlife officer additional avian survey, I-023 rebar delivery delay closed favourably). The agent's most methodologically subtle move: it surfaced I-021 as a candidate Risk Analyst hand-off rather than just an issue, recognising that a partially-realised site-conditions event with forward-looking pattern implications belongs in both the issue log (as event of record) and the risk register (as continuing forward-looking risk).
- **2026-05-23, Iteration 1 Week 28 — Risk Analyst v3 update 30/30 result — fourteenth first-shot 30/30; cross-agent state propagation validated across the lifecycle iteration.** §1.6 evidence base extended to fourteen first-shot 30/30 scores. This is the second agent in the Week 28 iteration and the first that demonstrates *cross-agent state propagation*: the Risk Analyst correctly absorbed the updated issue log (I-021 materialisation, I-022 / I-023 closures) plus the Week 28 events brief and reshaped the register coherently. R3 transitioned from Active to Mitigated (blackout windows confirmed, no construction blackout encountered). R-009 took the most methodologically subtle path — partially realised at Week 27 via I-021 at three Plot B positions, but the *forward-looking* element of R-009 (variance may extend to additional positions) was retained as Active rather than the entire risk being retired. Mitigation history across R1/R2/R4/R5 was rewritten past-tense with the correct Week numbers, dollar amounts, and named personnel from the events brief. Cross-cutting Pattern 4 candidate strengthened from "structural-prediction-only" to "two-of-two greenfield realisations" with an explicit recommendation to PMO Director for elevation consideration at Iteration 2 (Week 52). Three sophistication signals from this run: (a) the agent kept R-009 as a forward-looking risk after partial realisation, recognising that remediation at three known positions does not extinguish the risk that the pattern extends to additional positions — methodological discipline emerging from the prompt's rules-not-content principle; (b) the agent updated the §3 considered-and-excluded partition to add I-023 rebar-supply commentary and remove the I-002 currency exposure note (no longer needed post-PO release) — disciplined housekeeping that mirrors append-only-with-promotion discipline; (c) the agent reframed Pattern 4 evidence-quality framing as "evidence-quality strengthens" rather than "new pattern emerges" — exactly the right epistemic move for pattern science.
- **2026-05-23, Iteration 1 Week 28 — Variance Analyst populated 30/30 result — fifteenth first-shot 30/30; Iteration 1 closes Green; three-agent state propagation chain demonstrated within a single lifecycle iteration.** §1.6 evidence base extended to fifteen first-shot 30/30 scores. Iteration 1 is now complete (Issue Logger → Risk Analyst v3 → Variance Analyst, all 30/30). The Variance Analyst Week 28 populated test was the **first temporal-parallel test in the project**: the Skyhawk worked example is at Week 28 of 60, the Mariposa output is at Week 28 of ~80 — for the first time the worked example's temporal state matches the agent's expected output state, removing the state-inversion challenge that had dominated the prior tests. The recipe held cleanly at 30/30. Three sophistication signals from this run beyond the recipe: (a) **the committed-and-spent vs forward-projected distinction** in §4 was invented by the agent (not in the Skyhawk worked example) to handle the OEM PO favourable variance with proper commercial discipline — "commercial practice is to retain it as a forward-projected favourable until FAT clearance and delivery cadence are demonstrated" — sophisticated commercial reasoning emerging from the prompt's discipline rules; (b) **the R5-vs-R-009 allocation treatment §5 note** surfaced a real PMO governance question (when a forward-looking risk partially realises into an actual cost variance, should the consumption be re-allocated from the original risk reserve to a new dedicated allocation?) and flagged it as a PM decision rather than making it autonomously — epistemic discipline emerging from the hedging rules; (c) **the §10 Notes for downstream agents** independently produced cross-agent state coherence guidance for Status Reporter, Change Order Reviewer, Risk Analyst, and Issue Logger — the deepest demonstration of agent-system thinking the project has produced. This run validates that **cross-agent state propagation works across a complete lifecycle iteration**: the Variance Analyst correctly absorbed both the updated issue log (run19, especially I-021) and the updated risk register (run20, especially R-009 transition) and produced a variance report that is bidirectionally coherent with both upstream artefacts.
- **2026-05-23, Iteration 2 Week 52 — Issue Logger update 30/30 result — sixteenth first-shot 30/30; first cross-iteration append-only test passed.** §1.6 evidence base extended to sixteen first-shot 30/30 scores. This is the first run of any agent across *two* lifecycle iterations on the same project — the Issue Logger absorbed run12 (Week 0 baseline), run19 (Week 28 update), and the Week 52 events brief and produced a coherent 28-issue log preserving append-only discipline across both transitions. All 20 baseline issues remain documented with original opening narratives. All three Iteration-1-carry-overs (I-005, I-019, I-021) closed at the dates in the Week 52 brief. Five new Iteration-2 issues (I-024 through I-028) opened and closed within the Week 28-52 window, each with appropriate severity grading and escalation behaviour (I-026 Director routing for CO-001, I-028 Sponsor brief for R-010 weather trigger). The agent produced the cleanest log state in the project's history (28 closed, 0 open) — appropriate for the mid-erection lifecycle position. Three sophistication signals from this run: (a) **three themes synthesized across two iterations** in the §8 Lessons-Learned hand-off (tax-credit-deadline pre-contract confirmations, single-OEM concentration testability via FAT discipline, site-conditions-variance portfolio elevation readiness) — meta-level reasoning across two lifecycle iterations and Mariposa-to-portfolio reach; (b) **the "construction" category sub-tag note** at §4 recognised that two issues (I-025, I-027) carry Construction as an operational sub-tag of Technical at the Construction Manager's reporting layer but classified Technical primary in the audit register — dual-layer operational-vs-audit categorisation discipline that real PMOs actually use, emerged from the agent's own discipline; (c) **the climate-band-sized weather contingency lesson** extracted from I-028 — recommend retaining R5-pooled weather contingency but sizing against the erection-season climate-band expected stand-down windows rather than historical project averages — bid-stage geographic-and-seasonal calibration sophistication beyond the worked example.
- **2026-05-23, Iteration 2 Week 52 — Risk Analyst v3 update 30/30 result — seventeenth first-shot 30/30; cumulative two-iteration state trajectory validated.** §1.6 evidence base extended to seventeen first-shot 30/30 scores. This is the first run of the Risk Analyst across two lifecycle iterations on the same project. The agent absorbed run18 (Week 0 baseline register), run20 (Week 28 update), run22 (Week 52 issue log update), and the Week 52 events brief and produced a register that preserved the cumulative state trajectory across three temporal slices. Four risks transitioned to Mitigated (R-003 stays Mitigated with empirical reinforcement; R-004, R-008, R-009 transition from Active). R-001 probability downgraded from M to L given FAT clear + delivery cadence complete. R-007 and R-010 correctly held as partially-realised rather than retired (residual probability persists for further COs and remaining weather season). Pattern 4 candidate strengthened from "two-of-two greenfield realisations" to "**ready for elevation**" with explicit recommendation to PMO Director at Iteration 3 (Week 78) portfolio review. Three sophistication signals from this run: (a) **R-002 trigger updated with erection-pace recovery condition** ("erection pace fails to recover to ≥1.7/week by Week 60") — the agent recognised that Week 52 has a new forward-looking trigger not present at Week 28 (Chain E float fully consumed by pace shortfall) and added the trigger to fire if recovery doesn't happen, doing real risk-management thinking; (b) **R-009 fully mitigated but residual trigger retained** ("Any erection-stage foundation behaviour anomaly at remediated positions 16/23/41, OR settlement monitoring at remediated positions outside design tolerance") — sophisticated risk-tail discipline that fully-mitigated risks still carry residual triggers tied to the realised event; (c) **Pattern 3 strengthening framed as evidence-base depth rather than pattern-status change** — the agent recognised that Pattern 3 was already at threshold and confirmed, so CO-001's margin-neutral four-frame outcome is evidence-base strengthening for the firm-level standard-practice recommendation rather than pattern-status elevation, applying the pattern-science distinction between strengthening a confirmed pattern and elevating a candidate pattern.
- **2026-05-23, Iteration 2 Week 52 — Variance Analyst populated update 30/30 result — eighteenth first-shot 30/30; self-invented discipline maintained and evolved across two iterations.** §1.6 evidence base extended to eighteen first-shot 30/30 scores. This is the third populated state of the Variance Analyst (Week 0 framework, Week 28 populated, Week 52 populated) and the first where the agent had to maintain its own self-invented discipline (the committed-and-spent vs forward-projected distinction invented at Week 28) across a second iteration of its own outputs. The agent maintained the discipline AND evolved it correctly: the Week 28 forward-projected favourable of +$0.57M is now +$0.23M at Week 52, reflecting OEM PO favourable largely crystallised against actual deliveries and camp lease half-recognised. The Week 52 cost picture is dominated by CO-001's clean four-frame execution ($850k margin-neutral) plus disciplined absorption of two on-site events (I-021 closed Week 31, I-028 weather Week 49) within Chain E float and R5 reserve. Three sophistication signals from this run: (a) **the committed-and-spent vs forward-projected discipline maintained and evolved** — the self-invented framing from Week 28 is now load-bearing across two iterations of the agent's own outputs, the most sophisticated single signal in the project to date; (b) **R-001 risk-tail evolution in §5 contingency coverage** — the agent recognised that R-001's worst-case range has changed from "$0.8–2.4M (FAT Week 32 is the next exposure test)" at Week 28 to "$0.2–0.6M (warranty-tail only; pre-erection-completion exposures retired)" at Week 52, evolving the worst-case framing as the execution arc retired specific exposures rather than re-stating Week 28 framing; (c) **Pattern 3 portfolio framing with explicit pre-discipline vs post-discipline empirical comparison** — §6.3 framed CO-001's margin-neutral outcome as "first portfolio-validated application of the post-Ironvale Commercial Standards approach at renewables scale, where Riverside's pre-discipline CO-003 realised at 6.7% margin against 8.5% bid" — constructing a real before/after empirical comparison across the portfolio to give the Mariposa lesson its quantitative anchor for Lessons-Learned Synthesiser elevation at Iteration 3.
- **2026-05-23, Iteration 2 Week 52 — Change Order Reviewer first real CO 30/30 result — nineteenth first-shot 30/30; Iteration 2 closes Green; the headline new artefact of Iteration 2.** §1.6 evidence base extended to nineteen first-shot 30/30 scores. Iteration 2 is now complete (Issue Logger → Risk Analyst v3 → Variance Analyst → Change Order Reviewer, all 30/30). This is the first run of the Change Order Reviewer against a real CO rather than a Week 0 framework — the agent at Week 0 produced a framework setting up how to handle COs when they arrive; at Week 52 the agent populated the framework against CO-001 (the SCADA portfolio integration). The four-frame commercial dynamics analysis was applied to the actual scope event with full content (vendor leverage favourable — SCADA vendor standard catalogue module, client leverage low — refusal would not break contract, client position strong — tax-credit-tier dispatch verification driven, Northwood acceptance acceptable at 8.2% margin against 5.7% floor and 6.7% Riverside CO-003 precedent). The output is the most portfolio-defensible single artefact of the project to date because it shows the discipline applied to a concrete commercial event with explicit cross-generational comparison to the firm's prior practice. Three sophistication signals from this run: (a) **the 8.0% vs 8.2% pricing-position reconciliation note** — the agent identified a slight precision mismatch between the events brief's rounded "margin-neutral at 8.0%" and the actual calculation ($0.85M − $0.78M)/$0.85M = 8.2%, surfaced the difference explicitly in a footnote rather than papering over it OR rejecting the events brief, and confirmed that the discipline question (was the four-frame analysis sufficient to preserve project economics?) is answered yes either way — exactly the right epistemic move; (b) **the out-of-scope risk flag in §2 about future OPCO data-model changes** — not in the events brief, the agent's own commercial protection insight: the OPCO data model could change post-CO-001 (e.g., as client adds further Phase 2 portfolio sites), propagation back to Mariposa SCADA would constitute a separate CO, and the agent recommended fixing the data model at CO-001 signature snapshot as a condition to pre-empt relitigation; (c) **the third Lessons-Learned hand-off about standardised vendor portfolio-integration modules as an exception to Pattern 1 leverage** — the agent surfaced a sub-pattern: when the SCADA OEM offers integration as a catalogue product, the vendor-leverage dynamic flips from sole-source-accelerated-vendor (margin erosion under Pattern 1) to standard-catalogue (margin preservation under Pattern 3), constructing a new categorical distinction across Pattern 1 / Pattern 3 / Riverside CO-003 / Mariposa CO-001 archive — genuinely original pattern-science synthesis emerging from cross-portfolio reasoning.
- **2026-05-23, Iteration 3 Week 78 — Issue Logger closeout state 30/30 result — twentieth first-shot 30/30; second temporal-parallel test passed.** §1.6 evidence base extended to twenty first-shot 30/30 scores. This is the third run of the Issue Logger on Mariposa across three lifecycle iterations and the second temporal-parallel test in the project (after Variance Analyst Week 28) — the Ironvale worked example is a closeout-state log and the Mariposa Week 78 output is also a closeout-state log. The agent absorbed run12 (Week 0 baseline), run19 (Week 28 update), run22 (Week 52 update), and the Week 78 events brief and produced a 31-issue log preserving append-only discipline across all three transitions. Three new commissioning-phase issues opened and closed (I-029 performance-test wear-in calibration drift on 2 of 80 turbines, I-030 OPCO data-tag mismatch on 12 of 1,400 tags, I-031 capacitor labelling discrepancy at pre-SC walkdown). All 31 issues Closed at SC — closeout-grade clean log state. Three sophistication signals from this run: (a) **I-029 vs I-024 engineering category discrimination** — the agent distinguished I-029 (performance-test wear-in calibration drift, "characteristic of normal commissioning-phase tuning") from I-024 (FAT manufacturing-side calibration drift), then drew the cross-issue lesson that I-029 "refines the I-024 FAT-discipline lesson by extending the 'expect findings, time-budget them' principle from manufacturing acceptance to operational acceptance" — real engineering category-making and lesson refinement; (b) **I-030 absorbed within CO-001 budget tolerance rather than treated as a CO-002 candidate** — the agent applied the Change Order Reviewer's CO-001 condition 3 (data-model snapshot honoured) from Week 52 as a real boundary discipline, recognising the data-tag mismatch is closeout-phase reconciliation against existing scope not new scope requiring CO amendment — strongest cross-agent state propagation in the project to date; (c) **the warranty-tail log boundary statement** — "Any new issues during the warranty tail (Weeks 79–82 grid energisation, then 24-month warranty period) will be opened in the post-SC warranty log per the warranty workflow, not appended to this construction-phase log" — sophisticated administrative discipline that wasn't in the events brief, identifying that closeout marks an organisational boundary between the construction-phase log and the warranty-phase log.
- **2026-05-23, Iteration 3 Week 78 — Risk Analyst v3 closeout state 30/30 result — twenty-first first-shot 30/30; three-category closeout taxonomy correctly applied for the first time.** §1.6 evidence base extended to twenty-one first-shot 30/30 scores. This is the fourth run of the Risk Analyst on Mariposa across four lifecycle iterations (Week 0 baseline → Week 28 → Week 52 → Week 78 closeout), and the first time the agent applies the closeout-state three-category taxonomy (Realised / Mitigated / Not Materialised) instead of the execution-state Active/Mitigated/Active-partially-realised taxonomy. All 12 risks landed in correct categories: 3 Realised (R-007 CO-001 contained, R-009 sub-grade contained at three positions, R-010 one weather event absorbed), 8 Mitigated, 1 Not Materialised (R-012 — no opposition signal across 18-month execution arc). Three sophistication signals from this run: (a) **the trigger-language discrimination between warranty-tail and fully-closed risks** — R-001, R-002, R-006, R-008, R-009 retained residual triggers tied to warranty-tail or energisation-event exposures; R-003, R-004, R-005, R-010, R-011, R-012 had triggers marked "n/a — risk closed at SC" because the exposure path is completely retired — not mechanical labelling but recognition that "Mitigated" risks have different warranty-tail dispositions depending on whether the risk source persists into operations (R-001 OEM warranty tail persists vs R-005 labour does not — demobilised); (b) **the R-007 warranty-tail trigger** — the agent recognised that R-007 closes "Realised (once, contained)" but the residual trigger for the warranty tail is any further client-driven scope-addition request, carrying the Pattern-3-realisation-doesn't-extinguish-the-pattern discipline forward consistently from Week 28's R-009 partial-realisation reasoning; (c) **three concrete PMO Director governance recommendations with explicit elevation thresholds** — not just "Pattern 4 ready for elevation" but (i) Pattern 4 candidate → confirmed, (ii) Pattern 3 firm-level standard practice elevation, (iii) Pattern 1 firm-level standard practice elevation **for all single-OEM PO above $20M** — the $20M threshold is the CFO escalation threshold from I-015 picked up across the project context and applied as the appropriate elevation scope, real governance specificity emerging from cross-artefact reasoning.
- **2026-05-23, Iteration 3 Week 78 — Variance Analyst final SC closeout 30/30 result — twenty-second first-shot 30/30; the Variance Analyst's full four-iteration arc resolves coherently.** §1.6 evidence base extended to twenty-two first-shot 30/30 scores. This is the fourth populated state of the Variance Analyst (Week 0 framework, Week 28 mid-civil, Week 52 mid-erection, Week 78 final SC). Final position: CPI 1.00, SPI 1.00, margin 9.5% recovered to bid, $0.27M net favourable against the post-CO-001 approved budget, $4.98M of $5.5M contingency unconsumed, 30-day SC-to-energisation buffer fully intact after surviving three material in-construction events. Three sophistication signals from this run: (a) **the "Risk-allocation effectiveness in retrospect" post-hoc analysis in §5** — the agent constructed a comparison between Week 0 allocation reasoning (anticipating R1+R2 as 55% of dominant exposure) and the realised draws (R5 $380k + unallocated reserve $130k, R1+R2 zero), concluding "the reasoning held; the allocation pattern in retrospect would shift modestly toward R5/unallocated, but the discipline was correct" — distinguishing "reasoning right, realised pattern shifted modestly" from "reasoning wrong," mature epistemic discipline; (b) **the five-pathway adoption classification preemptively applied to L1-L6 with owner function** — the agent recognised the five-pathway classification is the Lessons-Learned Synthesiser's framework and pre-organised the Variance-side evidence in that taxonomy with explicit owner function (Engineering Standards, Commercial/Contract Standards, Commercial/Proposal Standards, Project Methodology Standards, Operations Standards), sophisticated cross-agent state propagation that prepares the hand-off in the downstream agent's expected format; (c) **the resolution of the self-invented "committed-and-spent vs forward-projected" distinction at SC** — Week 28 invented; Week 52 maintained and evolved; Week 78 consolidated to "committed-and-spent at SC" as the only column because forward-projection is exhausted at SC, recognising that the discipline it invented is temporally bound — useful during execution when forward exposures persist, no longer needed at SC when all positions are crystallised, sophisticated temporal-discipline evolution across four iterations of the agent's own outputs.
- **2026-05-23, Iteration 3 Week 78 — Closeout Reporter first real closeout 30/30 result — twenty-third first-shot 30/30; the headline new artefact of Iteration 3 and the most portfolio-defensible single artefact of the project.** §1.6 evidence base extended to twenty-three first-shot 30/30 scores. This is the first run of the Closeout Reporter against a real closeout rather than a Week 0 framework — matches the Change Order Reviewer's first-real-run from Iteration 2 as the headline new artefact pattern. The agent at Week 0 produced a framework setting up how to handle closeout; at Week 78 the agent populated the framework against the full execution arc (run01c charter → run16 framework → CO-001 analysis run25 → Week 78 issue log run26 → Week 78 risk register run27 → Week 78 variance run28 + week78_events.md). All charter §3 objectives evaluated (4 Met + 1 Met-on-forecast); three-category risk closeout applied (3 Realised / 8 Mitigated / 1 Not Materialised); audience-aware disclosure discipline applied; lessons-learned cross-reference to companion synthesis (forward-staged). Three sophistication signals from this run: (a) **the Mitigated vs Not Materialised discipline-validation framing in §7** — the agent recognised that closeout discipline isn't just bookkeeping but evidence-generation: "eight mitigations validated the mitigation discipline; R-012's non-materialisation returned its contingency without validating anything" — sophisticated framing of what closeout reports are *for* beyond client sign-off; (b) **"The disclosure boundary is operational, not editorial"** in §10 Conventions — the agent articulated that audience-aware disclosure isn't a stylistic choice but an operational rule (information-rights compliance), sophisticated meta-disciplinary framing; (c) **the "Met (forecast within deadline)" classification invented for Objective 2** — energisation Week 82 hasn't occurred at SC, so the agent invented a third category between definitively-Met and Partially-Met that captures the actual epistemic state, parallel to the Variance Analyst's self-invented committed-and-spent vs forward-projected distinction at Week 28, adapted to the closeout reporting context.
- **2026-05-23, Iteration 3 Week 78 — Lessons-Learned Synthesiser closeout synthesis 30/30 result — twenty-fourth first-shot 30/30; third temporal-parallel test passed; first synthesis against complete project closure.** §1.6 evidence base extended to twenty-four first-shot 30/30 scores. This is the third temporal-parallel test in the project (after Variance Analyst Week 28 and Issue Logger Week 78): Ironvale's worked example is a closeout-state synthesis and the Mariposa Week 78 output is also a closeout-state synthesis. This is also the first synthesis against complete project closure rather than the Week 0 baseline forward-looking projection — Week 0 framework produced lessons-to-track; Week 78 synthesis populates those lessons with full execution-arc evidence. The agent absorbed run15 (Week 0 framework), all five Week 78 closeout-state agent outputs (run25/26/27/28/29), the Ironvale closeout worked example, and the events brief to produce six theme-organised lesson sections, ten firm-level recommendations with adoption pathway and owner function, four project-specific lessons separated, three follow-on operational recommendations, and seven downstream-agent hand-offs. Three sophistication signals from this run: (a) **the re-classification rationale on the geotechnical lesson (Week 0 Project-specific → Closeout Firm-level)** — in §3.3 the agent documented the elevation rationale explicitly ("at Week 0 the lesson was flagged Project-specific because greenfield is a different category from Ironvale's brownfield; at closeout, the cross-portfolio Skyhawk evidence elevates it to Firm-level"), sophisticated epistemic transparency that audits what was known when and what evidence justified the re-classification; (b) **the nuanced resolution of the Week 0 fixed-price-vs-T&M structural question** — in §3.5 the agent took up a question the Week 0 framework flagged and produced a nuanced answer synthesising across two contractual structures and three projects: "fixed-price worked at Mariposa because the four-frame discipline prevented the Riverside-style margin erosion that drove the Ironvale T&M-with-cap recommendation; T&M-with-cap remains a valuable alternative option for engineering-discovery-sensitive scope, but the four-frame discipline is the structural prevention that allows fixed-price to remain viable on tax-credit-deadline renewables work" — real commercial reasoning, not mechanical lesson restatement; (c) **the adoption-status committed-prospective discipline** — throughout §4 the agent applied "Target adoption Q1 post-closeout" rather than claiming recommendations are already adopted; the "lessons-learned document is a *living artefact* updated through the first year post-closeout as adoption decisions land" framing in §7.5 codifies the discipline that lessons-learned and adoption are sequential operational processes, not the same event, sophisticated temporal discipline beyond what the Ironvale worked example explicitly demonstrated.
- **2026-05-23, Iteration 3 Week 78 — Portfolio Risk Reviewer second portfolio review 30/30 result — twenty-fifth first-shot 30/30; Iteration 3 closes Green; the entire lifecycle simulation closes complete across three iterations and 13 agents.** §1.6 evidence base extended to twenty-five first-shot 30/30 scores. This is the second portfolio review (Iteration-1 worked example baseline + Iteration-2 Week 0 Mariposa entry + Iteration-3 Mariposa SC closeout) and the first review against full closeout-grade evidence. Mariposa's column moves from Iteration-2 "6 of 6 Active at Week 0" to closeout state "3 Mitigated + 3 Realised". Three pattern movements committed: Pattern 4 elevates from candidate to confirmed (two-of-two Skyhawk + Mariposa greenfield realisations); Pattern 3 strengthens with renewables-scale quantitative anchor (8.2% post-discipline vs 6.7% pre-discipline = 1.5pp margin protection); Pattern 1 strengthens with the most complete renewables-scale validation of post-Ironvale discipline. Seven firm-level recommendations with lever, addressee, target decision, target adoption. Three sophistication signals from this run: (a) **the Iteration-2 candidate resolution against execution evidence** — the agent recognised the Iteration-2 candidate (tax-credit-deadline pre-contract confirmation discipline gap) needed *resolution*, not continued tracking, and looking at Mariposa execution evidence (all five Week 0 H-severity issues closed on plan) concluded the discipline-gap concern was a Mariposa-specific Week 0 baseline state rather than a recurring portfolio pattern, folding the candidate into Regulatory class as a sub-channel rather than warranting a new closed-taxonomy class — sophisticated parsimony discipline; (b) **the resource-and-budget-impact section in §6** — the agent quantified the operational cost of each firm-level recommendation (10-15 hours per qualifying proposal for greenfield-wind geotechnical grid; 7-10 working days of fleet-level commissioning schedule for performance-test contingency) and distinguished "cost addition" from "scheduling adjustment", sophisticated governance economics emerging from operational realism; (c) **the audience-aware disclosure framing extended to portfolio context** — the Closeout Reporter's "the disclosure boundary is operational, not editorial" principle applied to a multi-client artefact: "This review is Sponsor-facing and executive-facing. It is not client-facing — no client sees this analysis because it spans multiple clients' projects." Cross-agent state propagation of meta-disciplinary principles across the closeout agents.

**Lifecycle simulation closeout summary (Iterations 1+2+3).** Total 25 first-shot 30/30 scores across 13 agents and 3 lifecycle iterations: 13 baseline agent builds (Charter Drafter, Stakeholder Analyst, WBS Builder, Schedule Reasoner, Budget Builder, Communications Planner, Issue Logger, Variance Analyst, Change Order Reviewer, Lessons-Learned Synthesiser, Closeout Reporter, Portfolio Risk Reviewer, Risk Analyst v3 retrofit), plus 12 lifecycle-iteration runs (Iteration 1: Issue Logger / Risk Analyst v3 / Variance Analyst at Week 28; Iteration 2: Issue Logger / Risk Analyst v3 / Variance Analyst / Change Order Reviewer at Week 52; Iteration 3: Issue Logger / Risk Analyst v3 / Variance Analyst / Closeout Reporter / Lessons-Learned Synthesiser / Portfolio Risk Reviewer at Week 78). All 25 at frontier-ceiling 30/30 on first shot. Three temporal-parallel tests, six state-inversion tests, three cross-agent state propagation chains within iterations, two cumulative state trajectories across iterations (Risk Analyst Week 0 → 28 → 52 → 78; Variance Analyst Week 0 framework → 28 → 52 → 78), and four headline new artefacts (Change Order Reviewer first real CO at Iteration 2; Closeout Reporter first real closeout at Iteration 3; Lessons-Learned Synthesiser first closeout synthesis at Iteration 3; Portfolio Risk Reviewer second portfolio review at Iteration 3). The agent system has demonstrated complete EPC project lifecycle coverage from baseline through Substantial Completion with cross-portfolio learning synthesis at closeout.

---

**Related documents:**

- `PMO_LLM_Phase0_Closeout_Synthesis.docx` — Phase 0 decision and post-close learning, foundation for §1 of this rulebook.
- `PMO_LLM_Stack_Explained.docx` — the local AI stack reference plus §7 control-surface map (twelve levers, four zones).
- `PMO_LLM_Strategy.docx` — strategic positioning, role mapping, original architecture.
- `PMO_LLM_Test_Pack\` — the Northwood EPC corpus used as the build substrate.
- `runs\` — all scored output files in markdown and Word format.


## PMO LLM — AI Concepts Explained in Plain Language

> **What this document is.** A living reference that explains AI and LLM concepts in plain language, anchored to concrete examples from the PMO LLM project build. Written for readers who are new to AI — PM colleagues, interview audiences, anyone who needs to understand what we're building without first learning the technical jargon. Each concept follows the same template so the document can be extended over time as new concepts come up.

> **How to read it.** Read it once linearly to build a foundation. Use it as a glossary afterwards — every concept has a stable anchor and cross-references to related concepts. The PMO LLM examples are the bridge from abstract idea to concrete artefact you can point at.

> **How to extend it.** When a new concept comes up in conversation or work, add a section at the end following the template at the bottom of this document. Each addition gets a change-log entry. The document grows by accretion; no need to reorganise existing entries.

**Document status:** living. v1 published 23 May 2026 with 12 foundational concepts.

---

### 1. Large Language Model (LLM)

**One-line definition.** A computer program that learned to predict the next word from a vast amount of text, and turns out to be useful for many language tasks as a result.

**Plain explanation.** The PMO LLM build runs on a specific LLM: Anthropic's Claude Opus 4.7. Every time we run a test — Charter Drafter on Mariposa, Stakeholder Analyst, WBS Builder, all of them — we are sending instructions to Opus 4.7 and reading what it produces. To understand what Opus 4.7 actually is, imagine you read every book in a large library, every Wikipedia article, every well-written blog post, and every published code repository, billions of words in total. Now imagine the only game you played while reading was: "Cover the next word, guess what it is, uncover, learn from your mistake." Do that billions of times across the entire library and you would, as a side-effect, learn an enormous amount about language, facts, reasoning patterns, and how ideas connect. You would not be aware of having learned these things explicitly — they would be encoded in the patterns of how you predict the next word.

That is what an LLM is. The "Large" refers to the size: modern LLMs like Claude Opus 4.7 have hundreds of billions of numerical parameters internally — far more than a human brain has neurons. The "Language Model" part refers to the fundamental task: given a string of text, predict what comes next.

The astonishing fact about LLMs is that the simple task of next-token prediction, scaled to vast data and vast model size, produces a system that can write coherent prose, solve novel reasoning problems, draft documents in specialised domains, and converse fluently. None of this was explicitly programmed — it emerged from the training.

**In this project.** Every test we run uses one specific LLM: Anthropic's Claude Opus 4.7. The "Opus 4.7" name is a version identifier — the model was trained once by Anthropic and is now served via API. When our `run_cloud.py` wrapper makes a call, it is invoking that one trained LLM, instructing it to perform a PMO task. The model was not trained on Northwood data; it does not know Mariposa Wind specifically. What it knows is general — enough to recognise the patterns in a charter, a stakeholder register, a WBS — and what we supply in the prompt (worked examples, methodology, intake) is what makes it project-specific.

**Common misconception.** LLMs do not "look things up" in a database. The model has no live connection to the internet, no access to current events, no real-time information. Everything the model "knows" is encoded in its weights, frozen at the moment training ended. When we want the model to use current or project-specific information, we have to *include that information in the prompt* — there is no other channel.

**Related concepts.** [#3 Inference](#3-inference) (using the model), [#2 Training](#2-training) (how the model came to know things), [#5 System prompt and user message](#5-system-prompt-and-user-message) (how we instruct the model).

---

### 2. Training

**One-line definition.** The process of feeding billions of text examples through a model and adjusting its internal numbers until it can predict what comes next reliably.

**Plain explanation.** Opus 4.7, the model that handles every test in our project, exists because Anthropic spent months training it on a cluster of thousands of GPUs at a cost of tens of millions of dollars. We did not train it. We use it. To understand what training means, here is the process Anthropic went through.

Training is what turns a blank model into a useful one. The process happens in two main phases.

*Pre-training* is the first and largest phase. The model is fed enormous amounts of text — the open web, books, code repositories, scientific papers, conversations — and learns to predict the next word from context. This is done over weeks or months on clusters of thousands of GPUs, costing tens of millions of dollars. Pre-training is what gives the model its broad knowledge: language fluency, general world knowledge, reasoning patterns, programming idioms.

*Post-training* (also called fine-tuning, instruction tuning, or alignment) is the second phase. The pre-trained model is then shaped to be useful and safe through additional training on curated examples — particularly examples of helpful, accurate, and well-formatted responses to instructions. This is where the model learns to behave as a polite assistant rather than just continuing whatever text it sees. Reinforcement Learning from Human Feedback (RLHF) is a common post-training technique.

Training a frontier-class model like Claude Opus 4.7 happens once. After it is done, the model's weights are frozen. Every user of the model thereafter is using the same weights. Training does not happen on the user's data.

**In this project.** Anthropic trained Opus 4.7 long before our project existed. We do not train. When we use the model, we are doing *inference*, not training. The Northwood data we send in prompts does not update the model — it shapes one specific response and then is discarded. This is why we have to send the worked example every single time: the model does not remember it between calls.

In the original three-phase Strategy document, *fine-tuning* was an optional Phase 3. We dropped it from the critical path after Phase 0 because we discovered that prompt engineering plus a competent worked example produces 30/30 output without fine-tuning. Fine-tuning remains an option for a future phase if a specific gap appears that prompting cannot close.

**Common misconception.** Training is not what happens when you "have a conversation with ChatGPT" or use Claude. Those are inference. The model does not learn from your conversation; the next user's experience is not affected by yours. The only way to truly update a model is to retrain or fine-tune it, which only the model's provider can do.

**Related concepts.** [#1 Large Language Model](#1-large-language-model-llm), [#3 Inference](#3-inference), [#10 Open-weight vs proprietary models](#10-open-weight-vs-proprietary-models) (who gets to do training).

---

### 3. Inference

**One-line definition.** The act of running a trained model against a specific input to produce output — distinct from training, which is the one-time process that created the model in the first place.

**Plain explanation.** Every time you run `python scripts/run_cloud.py ...` in your WSL terminal, you are doing inference. The model has already been trained (by Anthropic, months ago, at vast expense); you are using it. Imagine training as building a piano: the keys are tuned, the action is regulated, the hammers are weighted, all done once at the factory. Imagine inference as playing the piano: you press keys and music comes out. Training cost millions, took months, and happened once. Inference costs cents, takes seconds, and happens billions of times.

When you send a prompt to Opus 4.7 via OpenRouter, the model loads (or is already loaded) into GPU memory. Your prompt is tokenised — converted into numerical chunks the model understands. The model runs a forward pass through its hundreds of billions of parameters and computes a probability distribution over its entire vocabulary for what the next token should be. It samples one, appends it to the running output, and repeats. Token after token, the response is generated.

Three properties of inference are worth understanding because they shape how we build with LLMs:

*Inference is stateless.* The model has no memory between calls. Each call starts fresh. If you want the model to "remember" something, you have to include it in the prompt.

*Inference does not update the model.* Whatever the model outputs in response to your prompt does not change the model's weights. The next user (or the same user on the next call) gets the same model.

*Inference cost is asymmetric.* Input tokens are cheaper than output tokens because the model can process the input in parallel but must generate the output sequentially.

**In this project.** Every test we run is one inference call. A typical PMO LLM test sends about 40,000 input tokens (agent prompt + methodology + worked example + upstream agent outputs + intake brief) and generates about 7,000 output tokens (the agent's response). At Opus pricing, this costs about $0.40 per call. Across the whole Phase 1 agent build, we have spent less than $2 of OpenRouter credit. The expensive part (training) was done by Anthropic and is amortised across the billions of inference calls the world makes against Opus every day.

**Common misconception.** "The AI thinks for a long time before answering" is true in a specific sense — modern models like Opus do generate intermediate reasoning tokens before the final answer — but the model is not "thinking" in a human sense. It is computing token-by-token probability distributions and sampling from them. The "thinking" is the act of generating tokens that represent reasoning steps.

**Related concepts.** [#1 LLM](#1-large-language-model-llm), [#2 Training](#2-training), [#4 Tokens and the context window](#4-tokens-and-the-context-window), [#12 State, statelessness, and why a database becomes necessary](#12-state-statelessness-and-why-a-database-becomes-necessary).

---

### 4. Tokens and the context window

**One-line definition.** Tokens are the chunks of text a model works with (roughly four characters or three-quarters of a word each); the context window is the maximum number of tokens the model can see at once.

**Plain explanation.** When we send a Mariposa charter prompt to Opus 4.7, the model does not read "Mariposa" as eight individual letters. It reads it as one chunk called a token. LLMs do not actually work with letters or words. They work with *tokens*, which are pieces of text the model's tokeniser has decided to treat as atomic units. Some tokens are full words ("Mariposa" is one token); some are word fragments ("renew" + "ables"); some are punctuation or whitespace ("." is a token, " " is sometimes a token, sometimes part of the adjacent word).

The reason tokens exist is efficiency. A model trained to predict the next *character* would need many more steps to generate a sentence than a model trained to predict the next *token*. The tokeniser is a compression: it captures the patterns the model sees often.

A rough rule of thumb in English: one token is about four characters or about three-quarters of a word. "The Mariposa Wind Farm has 80 turbines" is roughly 9 tokens.

The *context window* is the maximum number of tokens the model can attend to in one inference call. Modern frontier models have very large context windows: Claude Opus 4.7 has a 200,000-token window — equivalent to about 150,000 words, or roughly 300 pages of text. The model can see all of that at once and produce output that reasons across it.

There is an interesting subtlety: models exhibit a "lost in the middle" effect, where information placed at the start or end of the context is recalled more reliably than information buried in the middle. This is why we put the agent prompt first, the worked example near the top, and the intake brief at the end — putting load-bearing content at the bookends of the prompt produces more reliable output.

**In this project.** Our PMO LLM test prompts use about 40,000 tokens out of Opus's 200,000-token capacity — about 20% of the available window. We are nowhere near the limit. As the lifecycle simulation grows and we add more past projects to the archive, prompt size will grow, but we have substantial headroom before "lost in the middle" or context-cost becomes a real constraint.

**Common misconception.** People sometimes think tokens are the same as words. They are not. They are not the same as characters either. They are a specific compression chosen by each model family's tokeniser; you can have the same text tokenise differently across models.

**Related concepts.** [#3 Inference](#3-inference), [#9 RAG](#9-rag-retrieval-augmented-generation) (what we use when the context window gets crowded), [#11 Agent and multi-agent orchestration](#11-agent-and-multi-agent-orchestration) (when we split context across multiple agent calls).

---

### 5. System prompt and user message

**One-line definition.** The system prompt sets the persona and rules; the user message is the specific request. The model sees both and responds to the user message in the way the system prompt instructs.

**Plain explanation.** Every agent file in our project (`charter_drafter.md`, `stakeholder_analyst.md`, `wbs_builder.md`, `schedule_reasoner.md`, `budget_builder.md`, `communications_planner.md`, `issue_logger.md`) is essentially a system prompt. Open any one of them and you will see a block that begins "Paste the block below as the system message" — everything below that line is the system prompt for that agent.

Modern LLMs are tuned to recognise a structured input with at least two distinct components. The *system prompt* (sometimes called the system message) is the standing instruction — who the model is playing, what rules it follows, what voice it uses. The *user message* is the immediate request — the specific question or task this one call is about.

The distinction matters because the system prompt establishes context that should persist across the conversation, while the user message is the variable input that changes each call. A well-written system prompt is the difference between an LLM that produces generic output and one that produces specifically useful output for your domain.

In our PMO LLM project, each agent (Charter Drafter, Stakeholder Analyst, WBS Builder, Schedule Reasoner, Budget Builder, Communications Planner, Issue Logger) is essentially a system prompt. The agent file (e.g., `stakeholder_analyst.md`) contains the system prompt — ten behavioural rules, a style block, and a definition-of-done. The user message is the construction of the upstream artefacts plus the intake brief, concatenated by the wrapper.

When we say "build an agent," we are mostly designing a system prompt plus selecting the worked example that the system prompt references. There is no separate code; the agent is the prompt.

**In this project.** Look at `PMO_LLM_Test_Pack/agents/charter_drafter.md`. The block under the "Paste the block below as the system message" line is the system prompt. The remaining text in our wrapper-generated input — the methodology extract, the worked example, the active-project brief — is the user message. When the wrapper sends this to OpenRouter, it tags the system prompt as `role: system` and the rest as `role: user`. The model's training has taught it to treat these differently.

**Common misconception.** The system prompt is not a "secret" prompt the user cannot see — it is just the prompt that establishes context. In an API call we control both. In a consumer product like ChatGPT, the system prompt is set by the product team and the user provides only the user message; that is why the model has the same personality across all user conversations.

**Related concepts.** [#6 Worked example / few-shot prompting](#6-worked-example--few-shot-prompting), [#11 Agent](#11-agent-and-multi-agent-orchestration).

---

### 6. Worked example / few-shot prompting

**One-line definition.** Including one or more example artefacts in the prompt that demonstrate the discipline, format, and quality you want the model to produce — rather than describing the desired output abstractly.

**Plain explanation.** Suppose you wanted a colleague to draft a stakeholder register and you had ten minutes to brief them. You could spend the ten minutes describing what a good stakeholder register looks like ("include name, organisation, influence rating, engagement strategy, and so on"). Or you could spend the ten minutes showing them a great stakeholder register from a previous project and saying "produce something with this discipline." The second approach is almost always more effective.

LLMs are the same. *Few-shot prompting* is the technique of showing the model one or more concrete examples of the desired output (the "shots") within the prompt. The model extracts the pattern from the examples and applies it to the new task. With a sufficiently capable model, even *one* example (one-shot prompting) is enough to transfer the discipline.

In the PMO LLM project, the worked example is the single highest-leverage piece of the agent build. Phase 0 demonstrated this repeatedly: a model with a poor worked example performs worse than the same model with a good one, regardless of how good the model is. The worked example does not just teach the model what the output should *look like* — it teaches the model what discipline to apply, what to hedge, what to flag, what to commit, what shape the sections should take.

The two non-obvious findings from our work:

*Adapt the discipline, not the content.* The worked example shows specific names, dates, and figures from a past project. The model should not copy those — it should extract the *pattern* (where to use inline annotations, how to structure the dictionary, how to cross-reference other artefacts) and apply it to the new project's specifics.

*Format consistency matters more than aggressive flagging.* A worked example that uses a single section-wide format ("every line in this section ends with `— from intake`") teaches the model to copy the format mechanically, often to places where it does not apply. A worked example with per-line discipline (each line carries its own annotation only if needed) teaches the model to *think per-line*, which is what we actually want.

**In this project.** Every agent has exactly one worked example. Charter Drafter has Skyhawk v4. Stakeholder Analyst has Riverside. WBS Builder has Ironvale. Schedule Reasoner has Riverside (a different artefact). Budget Builder has Skyhawk (a different artefact). Communications Planner has Riverside (a third artefact). Issue Logger has Ironvale (a different artefact). The worked example is what gives the model the behavioural template for each agent type.

**Common misconception.** "Few-shot" sounds like it should mean "five shots." It actually means "a small number of examples" — typically one to five. With Opus 4.7 and a well-authored worked example, *one* shot is sufficient. Adding more does not help and increases token cost.

**Related concepts.** [#5 System prompt](#5-system-prompt-and-user-message), [#11 Agent](#11-agent-and-multi-agent-orchestration).

---

### 7. Hallucination

**One-line definition.** When an LLM produces output that is fluent and confident but factually wrong, often by inventing details that were not in the prompt and are not real.

**Plain explanation.** Imagine if our Stakeholder Analyst, instead of flagging an unknown client lead name with `[NEEDS PM REVIEW]`, invented a plausible-sounding name like "Sarah Chen" — confident, fluent, completely fabricated. That would be a hallucination. The Mariposa intake brief does not name a Client Lead; the model could have invented one, but instead it flagged the gap. That is hedging discipline working as designed.

LLMs are trained to produce plausible continuations of text. They do not have a separate "is this true?" checker. When the model lacks the information it needs to answer correctly, it will often produce something plausible-sounding rather than admit ignorance. This is a hallucination.

Examples in the wild:

- The model invents a citation to a non-existent paper because a citation would fit there.
- The model gives a confident but wrong date because the prompt did not specify one.
- The model fabricates a name (the CEO of a company, a person involved in an event) because a name belongs there grammatically.

Hallucinations are not lies — the model is not deceiving anyone. It is doing what it was trained to do: produce a continuation that fits the pattern. The problem is that fitting the pattern is not the same as being true.

Mitigating hallucinations is a major focus of LLM engineering. Three techniques are particularly relevant to our project:

*Hedging instructions in the system prompt.* "When a value is not in the intake, flag it with `[NEEDS PM REVIEW: …]` rather than guessing." Every PMO LLM agent prompt has rules like this.

*Source attribution discipline.* "Every claim that traces back to the intake is correct" tells the model not to fabricate. Where it cannot trace, it flags.

*Retrieval / grounding.* Providing the model with the actual source documents (charter, WBS, stakeholder register) reduces the temptation to fabricate because the facts are right there.

**In this project.** Our 30/30 scores so far have shown almost no hallucination. Every committed value in the outputs traces back to the charter or to upstream agent outputs. Every value that *could not* be committed has been flagged with an inline `[NEEDS PM REVIEW]` annotation rather than fabricated. The combined effect of hedging rules in the system prompt and faithful grounding in the worked example is that the model has been trained, through one example, to behave honestly.

The Phase 0 v5 Skyhawk regression (28 → 24) was a hallucination event: the model copied "— from intake" suffixes to values that were not actually from intake. Format mixing in the worked example caused the model to fabricate a source attribution. That is the textbook hallucination failure mode.

**Common misconception.** Hallucination is sometimes described as the model "lying." It is not. The model has no concept of truth — it has only the concept of plausible continuation. Calling it a lie anthropomorphises the system; calling it a hallucination acknowledges that the model produced something plausible-looking that is not real.

**Related concepts.** [#6 Worked example](#6-worked-example--few-shot-prompting) (where the hedging discipline is taught), [#9 RAG](#9-rag-retrieval-augmented-generation) (a technique to reduce hallucination by grounding).

---

### 8. Temperature and run-to-run variance

**One-line definition.** Temperature is a knob that controls how random the model's token sampling is; at any temperature above zero, two runs of the same prompt produce different outputs.

**Plain explanation.** In our project, we have explicitly chosen single-run scoring throughout Phase 1, accepting a ±2 to ±3 noise band on every test score. That noise comes from temperature. Here is what is actually happening inside the model.

When the model has computed the probability distribution for the next token, it has to choose one. The most obvious choice is to always pick the highest-probability token (called "greedy sampling" or "temperature = 0"). This produces deterministic output: the same prompt produces the same result every time.

But greedy sampling produces predictable, often boring output. Real model use typically introduces some randomness. The temperature parameter scales the probability distribution before sampling: higher temperature flattens the distribution, making lower-probability tokens more likely to be picked; lower temperature sharpens the distribution, making the top token nearly always win.

Typical settings:

- *Temperature 0:* deterministic, lowest variance, occasionally produces very rigid output.
- *Temperature 0.7:* the default for many systems; balanced between fluency and determinism.
- *Temperature 1.0+:* increasingly creative and varied; risks incoherence at high values.

The practical consequence is that *single-run scoring* of any LLM output carries inherent noise. The same prompt, run twice, can produce outputs that score differently. The size of the variance depends on the model and the temperature; for our project the noise floor on the 30-point rubric is approximately ±2 to ±3 points.

**In this project.** We have explicitly chosen single-run scoring for Phase 1 (a decision documented in the Phase 0 Closeout §6.4), accepting the ±2 to ±3 noise band as a known limitation. The eval harness is structured so multi-run scoring can be enabled later by changing one parameter, but for now velocity beats statistical depth. Our 30/30 scores so far should be read as "the agent's expected performance is at or near 30 with a confidence band that extends down to about 27."

**Common misconception.** Variance is sometimes seen as a defect to fix. It is not a defect — it is the consequence of the model sampling probabilistically rather than deterministically. You can eliminate variance by setting temperature to 0, but you typically lose output quality in exchange. The honest stance is to acknowledge variance, measure around it (multi-run when warranted), and design conclusions around bands rather than point estimates.

**Related concepts.** [#3 Inference](#3-inference) (the sampling happens here), [#1 LLM](#1-large-language-model-llm).

---

### 9. RAG (Retrieval-Augmented Generation)

**One-line definition.** A technique where the system first retrieves relevant chunks from a document store, then includes those chunks in the prompt to the LLM, so the model can reason over your specific documents rather than only what it learned in training.

**Plain explanation.** Opus 4.7 was trained on general internet data. It does not know what is in our `PMO_LLM_Test_Pack` folder. It has never seen the Skyhawk charter or the Riverside stakeholder register. To make it useful for our specific PMO domain, we have to give it access to those documents — and there are two ways to do that.

The first option is to put all your documents directly into the prompt every time. This works fine for small corpora — our PMO LLM project does this in Phase 1, sending whole files (methodology extract, worked example, upstream agent outputs) in every call. The limit is the context window and the cost per call.

The second option is RAG. You break your documents into chunks (paragraphs, sections, or some other unit). You compute an embedding (a numerical fingerprint) for each chunk and store those embeddings in a vector database. When the user asks a question, you compute the embedding of the question and use it to find the chunks most relevant to the question. You include those chunks (typically the top 5 to 20) in the prompt to the LLM and let it reason over them.

RAG has three advantages: it scales to corpora too large to fit in the context window, it surfaces the most relevant content rather than the whole corpus (reducing "lost in the middle"), and it provides an audit trail (you know which chunks the model saw).

The original Phase 1 plan in our project was to introduce RAG immediately. The new plan defers RAG until the corpus grows large enough to require it — currently we use whole-file concatenation because everything fits. RAG will become essential when the lifecycle simulation accumulates per-project state across 4-5 active projects, plus the archive, plus the methodology — at that scale the corpus exceeds practical context-window limits.

**In this project.** Currently no RAG. The wrapper concatenates whole files. The Phase 2 demo will introduce a vector database (Qdrant) that holds the methodology, archive, and worked examples; the per-project mutable state will live in a relational database (Supabase Postgres). Each demo interaction will involve a retrieval step before the LLM call.

**Common misconception.** RAG does not mean the LLM has been "trained on your documents." The LLM is not retrained — it is given relevant chunks at inference time. The model still has no permanent knowledge of your documents; it sees them anew with each call. This is also why a misconfigured RAG system can fail invisibly: if the retriever returns the wrong chunks, the LLM will answer based on those wrong chunks without knowing it was misled.

**Related concepts.** [#4 Tokens and the context window](#4-tokens-and-the-context-window), [#3 Inference](#3-inference), [#12 State and statelessness](#12-state-statelessness-and-why-a-database-becomes-necessary), [#7 Hallucination](#7-hallucination) (RAG reduces it by grounding).

---

### 10. Open-weight vs proprietary models

**One-line definition.** Open-weight models have their trained weights publicly downloadable so anyone can run them; proprietary models are accessible only via the provider's API.

**Plain explanation.** Our project has used both kinds of model. Phase 0 ran on Qwen3-30B-A3B, an open-weight model from Alibaba, hosted locally on a GEEKOM mini-PC with no cloud connection. After Phase 0 closed Green, we switched to Anthropic Claude Opus 4.7, a proprietary model accessed via OpenRouter's hosted API. The two ecosystems are real and the choice between them has real consequences.

Two ecosystems exist in modern AI.

*Proprietary models* are trained, owned, and served by a single company. Examples: Anthropic's Claude family, OpenAI's GPT family, Google's Gemini family. The model weights are not released. You access these models through the provider's API and pay per use. The provider handles all the infrastructure, the inference, and the updates.

*Open-weight models* are trained by an organisation (often a company or research lab) that releases the trained weights publicly under a licence. Examples: Meta's Llama family, Alibaba's Qwen family, Mistral, DeepSeek. You can download the weights and run the model yourself on your own hardware, or use a hosting provider that serves it.

The choice between them depends on several factors:

- *Quality.* As of 2026, frontier proprietary models (Opus 4.7, GPT-4.5, Gemini 2.5 Pro) remain ahead of the best open-weight models, but the gap is closing.
- *Cost.* Open-weight models can be cheaper to run at scale (if you can amortise the GPU investment), but proprietary models often win on cost-per-call at small scale because you pay only for usage.
- *Data residency.* Open-weight models can be run on infrastructure you fully control — data never leaves your perimeter. Proprietary APIs send the data to the provider's servers (though enterprise tiers offer strict data-handling guarantees).
- *Customisation.* Open-weight models can be fine-tuned on your data; some proprietary models support fine-tuning but with less flexibility.
- *Lock-in.* Proprietary models tie you to a single provider; open-weight models give you provider mobility.

The "on-prem" enterprise AI story (which our project's Strategy document discusses for SAP-shop customers) typically requires open-weight models because the data cannot leave the customer's infrastructure.

**In this project.** Phase 0 ran on Qwen3-30B-A3B, an open-weight model from Alibaba, hosted locally on a GEEKOM mini-PC. The architecture demonstrated portability to on-prem deployments. After Phase 0 closed Green, we switched to Anthropic Claude Opus 4.7 (proprietary, via OpenRouter) for Phase 1 because the per-dollar return is better when factoring in worked-example absorption. The local stack remains installed as a proof-of-concept that the same architecture works on open-weight infrastructure if a customer required it.

**Common misconception.** "Open-weight" is not the same as "open-source." Open-source software releases the code; open-weight releases the trained model parameters. The training data and the training code are often not released, so the model is not fully reproducible even when the weights are public.

**Related concepts.** [#2 Training](#2-training), [#3 Inference](#3-inference).

---

### 11. Agent and multi-agent orchestration

**One-line definition.** An "agent" in our context is an LLM configured with a specific role (via its system prompt) and a specific input/output shape; multi-agent orchestration is the pattern of using several agents in sequence, each handling one part of a larger task.

**Plain explanation.** When we say "Charter Drafter" or "Stakeholder Analyst" in this project, we mean a specific kind of construct called an agent. The Charter Drafter is the same Opus 4.7 model that runs every other agent — but configured with a charter-specific system prompt, expecting a charter-shaped input bundle, and producing a charter-shaped output. The agent is not a separate program; it is a *configuration* of the underlying LLM.

The word "agent" in AI has two distinct meanings worth disambiguating.

*The general AI sense.* An autonomous system that perceives, decides, and acts in the world — including modern LLM-based systems that can use tools, navigate the web, or carry out multi-step tasks unattended.

*The narrower system-design sense, which is how we use the term in this project.* A specific configuration of an LLM with a particular system prompt, expected input shape, and expected output shape. Our Charter Drafter is an agent in this sense: it has a system prompt that defines its role, it expects certain inputs (intake brief, charter template, worked example), and it produces a structured output (a charter document). It does not autonomously act — it produces an artefact when invoked.

Multi-agent orchestration is the design pattern where you decompose a larger task into a sequence of specialised agents. Each agent handles one part of the task and passes its output as input to the next agent. The agents do not share memory directly — they share state through the documents (or database rows) they read and write.

This is exactly what our Phase 1 build is producing. The Charter Drafter produces the charter. The Stakeholder Analyst reads the charter and produces the stakeholder register. The WBS Builder reads both and produces the WBS. The Schedule Reasoner reads charter, register, and WBS and produces the schedule. The Budget Builder reads all four and produces the cost baseline. The Communications Planner reads all five and produces the comms plan. Each agent is specialised; the chain produces a coherent project artefact set.

Multi-agent orchestration has two advantages over a single monolithic LLM call:

- *Specialisation.* Each agent's system prompt is tuned for its specific task. A monolithic prompt that tries to do everything is less effective than a specialised prompt for each sub-task.
- *Inspectability.* Each agent's output is an artefact you can review, score, and refine independently. A monolithic LLM call produces a single output that is harder to audit.

The trade-off is complexity. You need to manage the flow between agents, the state they share, and the orchestration logic. The state-layer work deferred to mid-Phase-1 in our project is exactly this orchestration.

**In this project.** Phase 0 had three agents (Charter Drafter, Status Reporter, Risk Analyst). Phase 1 is building out to thirteen agents covering the full PMBOK lifecycle: Initiating (2), Planning (5), Executing (2), Monitoring & Controlling (2), Closing (2), plus a Portfolio Risk Reviewer. The Phase 2 demo will run all thirteen agents against a shared portfolio state, with each demo colleague playing a specific role.

**Common misconception.** Multi-agent does not mean multiple model instances running in parallel. In our setup, every agent call hits the same Opus 4.7 model — just with different system prompts. The "agents" are configurations, not separate models.

**Related concepts.** [#5 System prompt](#5-system-prompt-and-user-message), [#12 State and statelessness](#12-state-statelessness-and-why-a-database-becomes-necessary), [#6 Worked example](#6-worked-example--few-shot-prompting).

---

### 12. State, statelessness, and why a database becomes necessary

**One-line definition.** LLMs are stateless — they remember nothing between calls — so any "memory" of your project must live outside the model, typically in a database, and be passed back into the model with each new call.

**Plain explanation.** Every time we run a test in our project, we send the full charter, the full stakeholder register, the full WBS, the full schedule, the full budget, every single time. We do not do this out of habit — we do it because Opus 4.7 has no memory of what we sent on the last call. This is one of the most consequential properties of LLMs and one of the least intuitive to people new to the technology.

Imagine you have a brilliant consultant who works only by post. You write a letter describing your project, the consultant reads it, drafts an analysis, posts it back. You ask a follow-up. The consultant has no recollection of the first letter — you have to re-explain the project from scratch every time, attaching the prior correspondence if you want continuity.

This is what working with an LLM is like. The model does not remember the last call. Each inference call starts fresh, with only the prompt you provide as context. There is no internal state, no memory, no "yesterday we discussed X."

For our PMO LLM project, this has three practical consequences.

*Whole-file context every call.* When we run the WBS Builder, we have to send the entire charter, the entire stakeholder register, and the methodology — because the model does not remember them from when we ran the Charter Drafter five minutes ago. This is why our prompt sizes grow as the agent chain deepens.

*Mutable project state must live in a database.* When the Phase 2 demo lets a colleague add a risk, that risk has to be stored somewhere durable. We will use Supabase Postgres. When the next colleague queries the project, the wrapper reads the current state from Postgres and includes it in the prompt. The model itself never holds the state.

*Activity logs and audit trails are external.* Who added the risk, when, what they changed — all of this must be tracked separately. The model has no awareness of the conversation history beyond what is in the current prompt.

This design constraint sounds limiting but is actually liberating. Because the state lives outside the model, you can:

- *Audit everything.* Every state change is recorded externally; you can replay the entire history.
- *Migrate between models.* If a better model emerges, you can switch — the state is in your database, not in the old model.
- *Share state across users.* Multiple colleagues can access the same project state because it lives in a shared store, not in any one user's conversation.

**In this project.** Phase 1 currently has no mutable state — each test starts fresh from the charter. Phase 2 introduces Supabase Postgres for portfolio state (4-5 projects, shared across colleague roles, with cross-cutting risk propagation). The architectural pattern is: state in Postgres → wrapper assembles the prompt including relevant state → call Opus → response back → state updated in Postgres. The model is the engine; the database is the memory.

**Common misconception.** "ChatGPT remembers our conversation" — well, it does, but the way it remembers is by carrying the entire conversation history forward into each new prompt. The model itself has no memory; the app builds up the prompt by concatenating prior turns. If the conversation gets long enough to exceed the context window, the earliest turns drop off and the model genuinely forgets them.

**Related concepts.** [#3 Inference](#3-inference), [#4 Tokens and the context window](#4-tokens-and-the-context-window), [#9 RAG](#9-rag-retrieval-augmented-generation), [#11 Multi-agent orchestration](#11-agent-and-multi-agent-orchestration).

---

### Template for new concept additions

To add a new concept, follow this template at the end of the document. Each entry should be additive — do not reorganise existing entries.

```
## N. Concept name

**One-line definition.** A single sentence anyone can remember.

**Plain explanation.** Three to five paragraphs in clear, non-technical language.
Use everyday analogies. Avoid jargon. Define any technical terms inline.

**In this project.** Where this concept shows up in the PMO LLM build,
with a concrete pointer to a file, an agent, an artefact, or a finding.

**Common misconception.** The thing readers typically get wrong about this concept,
phrased as a brief myth-bust.

**Related concepts.** Cross-references to other sections in this document
using markdown links (#N-section-name).
```

Add a change-log entry below for each new concept, with the date.

---

### Suggested future additions

Concepts that are likely to come up as the build progresses, in rough priority order. Add when they become relevant:

- **Embeddings and vector similarity.** What a numerical fingerprint of text is, how similarity search works. Becomes relevant when we stand up Qdrant.
- **Chain-of-thought and extended thinking.** How models "think" by generating intermediate reasoning tokens. Becomes relevant if we enable Opus extended thinking on high-stakes agents.
- **Tool use and function calling.** How modern LLMs can invoke external functions (database queries, web searches, calculators) mid-response. Becomes relevant when the demo introduces tool-style interactions.
- **Fine-tuning (LoRA, QLoRA).** The technique we considered and deferred in Phase 0. Becomes relevant if Phase 2.5 reactivates the fine-tuning option.
- **Reinforcement Learning from Human Feedback (RLHF).** The post-training technique that shapes proprietary models. Becomes relevant for the model-selection conversation.
- **Quantisation.** How models are compressed to run on smaller hardware. Becomes relevant if we revisit the local Qwen stack.
- **Latency vs throughput.** The two performance metrics that matter for deployed systems. Becomes relevant for the Phase 2 demo's user experience.
- **Multi-modal models.** Models that handle images, audio, or video in addition to text. Becomes relevant if the demo ever needs to ingest charts or photos.
- **Prompt injection and jailbreaking.** Security concerns when user input is concatenated into prompts. Becomes relevant before the demo goes to colleagues.

---

### Change log

- **2026-05-23, initial publication.** Twelve foundational concepts. The Inference section (§3) draws on a conversation in the PMO LLM build where the user asked for an explanation of inference using the project as a concrete example; that conversation prompted the creation of this document. The structure is designed to grow by accretion over time.
- **2026-05-23, revised same day.** Tightened the opening paragraphs of §1, §2, §3, §4, §5, §7, §8, §9, §10, §11, §12 to anchor each concept in the PMO LLM project from the first sentence, rather than introducing the project only in the dedicated tie-in section. The principle: the project is the running example throughout, not a bolt-on at the end. Reviewer feedback that triggered the revision: "hope the concepts are explained using this project as example."


---
title: "RAG and the LLM — Reference Document"
subtitle: "How the PMO LLM Architecture Actually Works"
---

## RAG and the LLM — Reference Document

A self-contained reference for the two ideas at the heart of the PMO LLM project: the **large language model** that does the writing, and **retrieval-augmented generation (RAG)** — the architecture that makes the model produce work grounded in your own corpus rather than its training data.

This document is meant to be re-read whenever the architecture choices in the strategy doc, the setup guide, or the test pack need a refresher. It uses one extended example throughout — the Charter Drafter producing a charter for "Mariposa Wind Farm Phase 1," a fictional project from the Northwood EPC test pack.

---

## Part 1 — The Large Language Model

### 1.1 What an LLM is

A large language model is, mechanically, a very large mathematical function. You give it text in, it gives you text out. The function has been "trained" — meaning its internal numerical parameters have been adjusted, by exposure to enormous amounts of text from the public internet, books, code, and other sources — so that the output it produces feels coherent and useful. Modern LLMs have between a few billion and a few hundred billion parameters (each parameter is a number that influences the function's behaviour).

Two important framings:

- An LLM is **a next-token predictor.** Given the text so far, it estimates the probability of every possible next token (a token is roughly a word or fragment) and picks one. Then it repeats. A paragraph of LLM output is the result of doing this hundreds or thousands of times in a row, each prediction conditioned on everything that came before.
- An LLM is **a compressed representation of the data it was trained on.** It doesn't have a database of facts inside it; it has a learned ability to produce text that *resembles* the kinds of text it has seen. This is the source of both its power (fluency, generality) and its weaknesses (hallucination, training cutoff).

### 1.2 How an LLM generates text

The mechanics, simplified to a useful level of detail:

1. The prompt — your input — is broken into tokens.
2. Each token is converted into a long list of numbers (a "vector embedding" — same idea as we'll meet again in RAG).
3. The model runs a series of attention computations across all the input tokens at once, building a contextual representation of the prompt.
4. The model produces a probability distribution over its entire vocabulary (typically 32,000–256,000 possible next tokens) for what comes next.
5. A sampling rule (greedy, temperature-scaled, etc.) picks one token from that distribution.
6. The chosen token is appended to the input, and the whole thing repeats — generating the next token, then the next, until the model emits an end-of-output token or a length limit is hit.

This is why generation feels "thoughtful" but is actually a tight loop. The model never plans the whole paragraph; it produces one token at a time, each conditioned on the running context.

### 1.3 Why LLMs hallucinate

Three reasons the model produces confident-sounding wrong answers.

**Training cutoff.** Every model is frozen at a date — its training data ends sometime, and anything that happened after is unknown to it. Ask a model about events three months after its cutoff and you get plausible fabrication.

**No access to private data.** The model has never seen your project archives, your charter templates, your client names. If you ask it about Northwood's L/M/H risk scales without giving it the template, it will invent something reasonable-looking that isn't yours.

**Probabilistic outputs, no internal fact-check.** When the model predicts the next token, it picks the one that fits best given the context — not the one that is *true*. If the prompt sets up "the contract value was \$" then a confident number follows, because numbers fit the pattern. Whether that number is correct is not a question the mechanism asks.

RAG, which we get to in Part 2, exists primarily to fix the second and third of these. It gives the model access to your private data and forces every claim to be grounded in retrieved content.

### 1.4 Context windows

A practical constraint that shapes the entire RAG design.

An LLM has a maximum number of tokens it can consider at once — the **context window**. Older models had 2K or 4K. Modern ones range from 8K to 1M+. Qwen3-32B-Instruct, the strategy doc's primary model, has 32K. Qwen 2.5 14B (your local) also supports 32K when configured to. Tokens are roughly 0.75 words, so 32K is roughly 24,000 words or 50–60 pages of dense text.

This means: you cannot just paste your entire corpus into the prompt every time you ask a question. Your project archive is hundreds of charters and risk registers and status reports — easily millions of tokens. The whole RAG architecture exists, in part, because you must select which parts of the corpus to include, every time.

### 1.5 The specific models in the PMO LLM project

Two models, used in different stages.

#### Qwen 2.5 14B-Instruct (local on the A8 Max)

- **Maker:** Alibaba.
- **Parameters:** 14 billion.
- **License:** Apache 2.0 — commercially usable without restriction.
- **Context window:** 32K when configured.
- **Local size:** ~8.5 GB at 4-bit quantization (the Ollama default).
- **Speed on the A8 Max (CPU only, no NVIDIA GPU):** roughly 5–15 tokens per second, depending on context size.
- **Use in this project:** the free-and-local validation tier (Phase 0a of the setup guide). Already installed and working on your A8 Max.

#### Qwen3-32B-Instruct (cloud GPU)

- **Maker:** Alibaba.
- **Parameters:** 32 billion.
- **License:** Apache 2.0 (the size used in this project; some larger Qwen3 variants have a different licence).
- **Context window:** 32K natively, extendable.
- **Cloud size:** ~64 GB at FP16, fits in a single A100 80GB GPU.
- **Speed on Lambda A100:** 30–80 tokens per second.
- **Use in this project:** the production-quality reference model for Phase 0b/1 of the setup guide.

Why two? Because the design is portable. Test the architecture locally for free, prove it works, then run the same architecture on a stronger model when the marginal cost of cloud GPU is justified by what you learn.

#### Quantization, briefly

You'll see references like "4-bit quantization" or "FP16" alongside model sizes. These are about how the model's parameters are stored.

- **FP16 (half precision):** each parameter is a 16-bit floating-point number. Highest quality, biggest size.
- **8-bit (FP8 / Q8):** half the storage, almost no quality loss.
- **4-bit (Q4):** quarter of the FP16 storage, modest quality loss, much faster on consumer hardware. This is what Ollama uses by default for local models.

A 14B model at FP16 is ~28 GB; at 4-bit it's ~8.5 GB. Same weights conceptually, less precise representation. For the test pack workloads this is fine.

---

## Part 2 — Retrieval-Augmented Generation (RAG)

### 2.1 What RAG is

RAG is the architecture that lets an LLM produce work grounded in your private data without retraining the model. The trick: instead of asking the model to *know* your domain, you give it the right reference material at the right moment, every time it generates a response.

Two phases. One runs once when the corpus changes; the other runs on every query.

### 2.2 Phase A — Indexing

This is the one-time setup, redone whenever documents are added or changed.

#### 2.2.1 Chunking

Walk through every file in the corpus. Split each into small chunks — typically 300–800 tokens, with a small overlap (say 50 tokens) between adjacent chunks. The overlap ensures that a single sentence or table row doesn't get cut in half across chunks, which would hurt retrieval quality.

For PMO LLM the chunker is a Python script that:

- Reads PDFs, Word docs, Markdown and plain text.
- Splits each file into 500-token windows with 50-token overlap.
- Tags each chunk with its source path (`archive/p2_skyhawk_solar/01_charter.md`), its tier (`methodology` / `templates` / `archive`), and any access-control labels.

#### 2.2.2 Embeddings

Each chunk is passed through an **embedding model** — a small specialised LLM whose only job is to turn text into a fixed-length list of numbers (a vector) that captures meaning. The model used in your setup guide is `BAAI/bge-large-en-v1.5`, which produces 1,024-dimensional vectors.

Two pieces of intuition about what these vectors capture:

- Chunks about similar topics produce similar vectors. The chunk for "project charter sections — overview, objectives, scope" sits very near the chunk for "what goes into a charter" but far from the chunk for "boiler delivery delays."
- "Near" is measured by **cosine similarity** — a single number from -1 to 1, where 1 means "very similar" and 0 means "unrelated." This is the metric the vector database uses to find chunks that match a query.

The 1,024 dimensions don't correspond to human-readable concepts. They are an internal representation the embedding model learned. You don't read them; the vector database compares them.

#### 2.2.3 The vector database

The chunk vectors get stored in a **vector database**. Your setup uses Qdrant, running in a Docker container. Qdrant stores each vector with its chunk text and metadata, and supports fast similarity search across millions of vectors.

When indexing is done, you have something like:

```
collection: pmo_corpus
  chunk_0001: vector=[0.123, -0.045, ...] (1024 dims)
              text="The charter is the single document of record establishing scope..."
              source="methodology/charter_template.md"
              tier="methodology"
  chunk_0002: vector=[0.087, 0.211, ...]
              text="2. Overview — A 2–4 sentence summary..."
              source="methodology/charter_template.md"
              tier="methodology"
  ...
  chunk_4523: vector=[-0.039, 0.156, ...]
              text="Substantial Completion: 5 June, year+1"
              source="archive/p2_skyhawk_solar/01_charter.md"
              tier="archive"
```

For the Northwood test pack, this comes to roughly 200–400 chunks. For a real PMO archive it would be thousands.

### 2.3 Phase B — Retrieval and generation

This runs every time a user asks for a charter draft, a status report, or a risk register.

#### 2.3.1 Query formation

The agent forms a search query from whatever context it has. For the Charter Drafter the query is built from the intake's project name, contract type, and scope summary — for instance:

```
project charter for Mariposa Wind Farm Phase 1:
320 MW onshore wind farm, fixed-price $148M, IPP client, 18-month delivery
```

#### 2.3.2 Query embedding and similarity search

The query goes through the *same* embedding model — `bge-large-en-v1.5` — and produces its own 1,024-dim vector. The vector database compares this query vector against every chunk vector by cosine similarity and returns the top **K** chunks (typically K=5 to K=10).

These are the chunks the database judged most semantically similar to the query. They are not always perfect, but on a well-built corpus they are reliably *useful*.

#### 2.3.3 Optional filters

Before similarity search, the retriever can apply filters from chunk metadata: tier, access-control labels, document type, project ID, date range. This is how the Charter Drafter agent restricts retrieval to `tier="methodology"` and `tier="templates"` — preventing it from copying from prior project charters when drafting a new one.

#### 2.3.4 Prompt assembly

The retrieved chunks are pasted into the prompt to the LLM, each labelled with its source. The full prompt has three parts:

1. **System prompt** — the agent's persona, rules, and output schema (from `agents/charter_drafter.md`).
2. **Context** — the retrieved chunks, with source labels so the model knows what came from where.
3. **User input** — the original request (the intake).

#### 2.3.5 Generation

The LLM produces the output one token at a time, but now those tokens are conditioned on a context that includes the right slice of your corpus. The model writes a charter that uses your template structure, reflects your methodology guidance, and patterns itself on the most relevant past project — because all of those are in front of it.

### 2.4 Properties that RAG provides

The reasons it's the right architecture for enterprise PM work.

**Updateable.** Change a template, ingest the new version, and the very next charter reflects the change. No retraining. No GPU time. No model versioning.

**Citable.** Every claim in the output can be traced to a specific chunk from a specific source document. This is the foundation for the eval harness in Phase 1 and for any future regulatory audit (EU AI Act, NIST AI RMF).

**Permission-aware (ACL).** Chunks can be tagged with access-control labels. A user who isn't entitled to see Project X's archive doesn't get those chunks in retrieval. The model never sees what the user can't see.

**Bounded hallucination.** Easy to instruct an agent: "every assertion must be traceable to a retrieved chunk or flagged with `[NEEDS PM REVIEW]`." This is the rule embedded in the Charter Drafter, Status Reporter, and Risk Analyst personas in your test pack.

**Modular.** The base model, the embedding model, and the vector database are all replaceable independently. Upgrade the model from Qwen 2.5 14B to Qwen3-32B without touching ingestion. Switch from Qdrant to Weaviate without touching the agents.

---

## Part 3 — Worked Example: Charter Drafter on Mariposa Wind

This part walks the whole thing end-to-end on one concrete example. The intake is from `test_inputs/charter_01_mariposa_wind.md`, the corpus is the test pack's three-project archive plus methodology, and the model is Qwen3-32B (the same example runs locally on Qwen 2.5 14B at lower throughput).

### 3.1 The intake

The user supplies the Charter Drafter with the Mariposa Wind project facts:

```
Project: Mariposa Wind Farm Phase 1 (NW-REN-2511)
Client: Mariposa Renewables Holdings (IPP)
Contract: Fixed-price, $148M
Effective: 22 May
Target Substantial Completion: 30 November year+1
Sponsor: VP Renewables / Director: L. Chen / PM: J. Okafor
Bid margin: 9.5%, budget $134M, contingency $5.5M
Scope: 80 turbines × 4 MW @ 110 m hub; 34.5 kV collection;
       substation; ~3-mile 230 kV interconnection
LDs: 0.5%/wk capped 8%. Retention 7.5%. Payment Net 30 milestone-based.
PPA deadline: 30 December year+1 for tax-credit tier
Known risks: single-OEM turbines, tax-credit cliff, migratory-bird permits,
             rural-roads coordination, camp accommodation
Open items: turbine PO release, interconnection status,
            permit blackout periods, camp accommodation arrangement
```

### 3.2 Query formation

The retriever combines the intake's key fields into a search query:

```
"project charter for Mariposa Wind Farm Phase 1:
 320 MW onshore wind farm, fixed-price $148M, IPP client, 18-month delivery"
```

That query is embedded into a 1,024-dim vector via `bge-large-en-v1.5`.

### 3.3 The six chunks Qdrant returns

The retriever requests top-K=6, filtered to `methodology` and `templates`, plus a smaller K=3 in `archive`. Qdrant returns:

#### Chunk 1 — `methodology/charter_template.md` (Sections 1–2), cosine 0.84

The template's Project Identification fields and the rule for the two-to-four-sentence Overview.

#### Chunk 2 — `methodology/charter_template.md` (Sections 7–8), cosine 0.82

The Commercial Baseline fields (contract value, margin, contingency, LDs, retention) and the top-5 Risks table shape (Category, Probability L/M/H, Impact L/M/H, Response strategy).

#### Chunk 3 — `archive/p2_skyhawk_solar/01_charter.md` (Sections 6–7), cosine 0.79

Skyhawk's milestone table — engineering review, long-lead POs, mobilisation, mechanical completion, BESS commissioning, energisation, Substantial Completion — and its commercial baseline showing the renewables IPP pattern (margin 8.8%, LDs 0.5%/wk capped 10%, retention 7.5%).

#### Chunk 4 — `methodology/pmbok_extract.md` (Charter content guidance), cosine 0.76

The PMBOK guidance on what a charter must contain — business need, measurable objectives, high-level requirements, overall risk, summary milestone schedule, financial resources, stakeholders, approval requirements, assumptions, constraints, PM authority.

#### Chunk 5 — `archive/p2_skyhawk_solar/01_charter.md` (Section 8 Risks), cosine 0.75

Skyhawk's risk table — utility interconnection delay (Reg, M, H, Mitigate), BESS supply-chain disruption (Sch, M, H, Mitigate), module degradation (Tech, L, M, Accept), weather (Sch, M, M, Mitigate), labour shortage (Peop, M, M, Mitigate).

#### Chunk 6 — `methodology/charter_template.md` (Section 11 Governance), cosine 0.73

The Governance defaults — reporting cadence (weekly/monthly/portfolio), decision rights structure, change-order thresholds, escalation path.

### 3.4 Prompt assembled

The skill orchestrator builds the final prompt:

```
[system]  Contents of agents/charter_drafter.md

[user]    Reference material:

          # methodology/charter_template.md (sections 1–2)
          <Chunk 1 text>
          ---
          # methodology/charter_template.md (sections 7–8)
          <Chunk 2 text>
          ---
          # archive/p2_skyhawk_solar/01_charter.md (sections 6–7)
          <Chunk 3 text>
          ---
          # methodology/pmbok_extract.md (charter guidance)
          <Chunk 4 text>
          ---
          # archive/p2_skyhawk_solar/01_charter.md (section 8)
          <Chunk 5 text>
          ---
          # methodology/charter_template.md (section 11)
          <Chunk 6 text>

          ---

          My request:
          <full Mariposa intake>
```

Total: ~12,500 tokens. Comfortable inside the 32K context window.

### 3.5 The model's output

The model produces a complete Project Charter with all twelve sections. Key observations:

- Sections 1, 7 (Commercial baseline), and 10 (Constraints) are populated directly from the intake.
- The Overview (§2) follows the template's two-to-four-sentence rule (from Chunk 1) and uses only intake content.
- The Objectives (§3) are written in SMART form (from the PMBOK chunk's instruction and the agent persona's rule), each tied to a measurable success criterion from the intake (320 MW, 30 December year+1 tax-credit deadline, ±3% cost variance).
- The Scope (§4) is split into in-scope and out-of-scope per intake. Nothing invented.
- Stakeholders (§5) names J. Okafor, L. Chen, and the VP Renewables (from intake) and flags `[NEEDS PM REVIEW]` for the client primary contact, the OEM, the utility coordinator and the two county DOTs (which the intake explicitly didn't name).
- Milestones (§6) take their structure from Skyhawk (Chunk 3) — engineering review, long-lead PO release, mobilisation, mechanical completion, energisation, Substantial Completion — but leave most dates as `[NEEDS PM REVIEW]` because the intake didn't supply them; energisation is anchored to the 30 December year+1 deadline from the intake.
- Risks (§8) lists five: single-OEM turbine supply (Schedule, M, H, Mitigate), tax-credit deadline slip (Regulatory, M, H, Mitigate), migratory-bird permit conditions (Regulatory, M, M, Mitigate), labour and camp accommodation (People, M, M, Mitigate), rural-roads coordination (Schedule, M, M, Mitigate). Each is anchored either to the intake's named risks or to Skyhawk's recurring renewables-IPP patterns (Chunk 5).
- Governance (§11) takes its skeleton from Chunk 6 — weekly internal status, monthly client, monthly portfolio — with decision-rights thresholds appropriate to a $148M contract.
- Approval (§12) leaves all signatures and dates as `<TBC>`, per the agent persona's rule.

### 3.6 Citation map

Where did each section actually come from?

| Output section | Primary source | Why |
|---|---|---|
| §1 Identification | Chunk 1 (template §1) + intake | Template fields, intake values |
| §2 Overview | Chunk 1 (template §2 rule) + intake | Two-to-four-sentence rule; content from intake |
| §3 Objectives | Chunk 4 (PMBOK SMART guidance) + agent persona | Methodology rule; targets from intake constraints |
| §4 Scope | Intake | Entirely from the user input |
| §5 Stakeholders | Chunk 1 (template §5) + intake + agent persona | Table structure; `[NEEDS PM REVIEW]` flags from persona's rule |
| §6 Milestones | Chunk 3 (Skyhawk §6 pattern) + intake | Skyhawk's milestone structure adapted; deadline anchored to intake |
| §7 Commercial | Chunk 2 (template §7) + Chunk 3 (Skyhawk §7) + intake | Template structure, retention idiom from Skyhawk, numbers from intake |
| §8 Risks | Chunk 5 (Skyhawk §8 patterns) + intake risks | Same table format; risks blend Skyhawk's recurring ones with intake-named ones |
| §9 Assumptions | Chunk 3 structure + intake open items | Skyhawk's assumption format; content from intake's `TBC` items |
| §10 Constraints | Intake | Tax-credit deadline, migratory-bird, local content |
| §11 Governance | Chunk 6 (template §11) + Chunk 3 + intake | Template defaults; thresholds calibrated to contract size |
| §12 Approval | Chunk 1 (template §12) | Signature block from template |

Every claim in the charter is either intake-derived, chunk-derived, or explicitly flagged `[NEEDS PM REVIEW]`. The eval harness in Phase 1 verifies this automatically — every assertion must trace, or it fails the citation-faithfulness check.

### 3.7 What this demonstrates

Four properties from §2.4, made concrete:

- **Traceability.** Every line of the output maps to a chunk or to the intake.
- **Methodology adherence without memorisation.** Northwood's L/M/H scales, 8% LD cap, half-at-SC retention rule, two-to-four-sentence overview rule — none of these were in the model's training data. They arrived via retrieval.
- **Archive intelligence.** Skyhawk wasn't copied; it was patterned from. The retriever judged Skyhawk to be the closest comparable (renewables, IPP, fixed-price, similar scale, same Project Director). For a water-treatment project the retriever would surface Riverside instead, and the output would adopt Riverside's idioms.
- **Bounded hallucination.** Eight `[NEEDS PM REVIEW]` flags in the output give the PM a precise punch list of items to fill in. No silent guessing.

---

## Part 4 — RAG vs Alternatives

Why this architecture, not another? The strategy doc names four ways to "train an LLM for PM operations." Here's why RAG is the workhorse for everything except very specific edge cases.

### 4.1 Prompting alone (no retrieval)

You paste a small system prompt and your request, the model answers from its training data. Fast, cheap, fine for general knowledge.

Wrong for PMO LLM because the model has no access to your methodology, templates, or archive. Output is generic PMBOK at best, fabrication at worst.

### 4.2 RAG (this architecture)

Documented in detail above. The workhorse.

Best when the model needs access to private/recent/specific data and you want updateable, citable answers.

### 4.3 Fine-tuning (LoRA / QLoRA / full fine-tune)

You train a small set of additional weights — an "adapter" — on hundreds or thousands of input/output examples. The model's behaviour becomes more specifically tuned to your domain.

Useful when:

- Prompt engineering plateaus and the model still misses domain idioms or formats.
- You need a consistent house voice the prompt can't reliably enforce.
- Output schemas need to be precise and the model needs to be drilled on them.

Costly because:

- Needs a curated dataset (hard to build).
- Has to be redone when methodology or templates change.
- Doesn't help with retrieval — fine-tuned models still hallucinate facts they weren't taught.

Strategy: layer fine-tuning *on top of* RAG, only against measured gaps. The eval harness in Phase 1 is what tells you whether a gap exists.

### 4.4 Continued pre-training

You further train the entire base model on a very large domain-specific corpus (hundreds of millions of tokens).

Useful only when:

- You have an enormous proprietary corpus.
- You need a true domain-foundation model.
- You can justify months of GPU time and a serious ML team.

Almost never the right first move. Not in scope for the PMO LLM personal-learning project.

### 4.5 The decision rule

Use RAG first. Add fine-tuning only against gaps you can measure. Skip continued pre-training unless the math obviously demands it. This is what the strategy doc recommends and what your phased plan operationalises.

---

## Part 5 — Components in the Build

Named tools and what they do, mapped to the layers from §2.

| Layer | Tool in PMO LLM | Function |
|---|---|---|
| Base model (cloud) | Qwen3-32B-Instruct via vLLM | Production-quality generator |
| Base model (local) | Qwen 2.5 14B-Instruct via Ollama | Free local generator for validation |
| Inference server (cloud) | vLLM | High-throughput model serving |
| Inference server (local) | Ollama | One-binary local model serving |
| Embedding model | BAAI/bge-large-en-v1.5 | Turns text into 1,024-dim vectors |
| Vector database | Qdrant (Docker) | Stores vectors; cosine-similarity search |
| Chunker | Custom Python in `src/rag/ingest.py` | 500-token windows, 50-token overlap, metadata tagging |
| Retriever | Custom Python in `src/rag/retrieve.py` | Forms query, embeds, searches Qdrant, returns chunks with sources |
| Skill orchestrator | Custom Python in `src/skills/<skill>.py` | Assembles system prompt + chunks + intake; calls model |
| Eval harness | Custom Python in `src/evals/run_evals.py` | Runs graded test cases; scores schema, citation faithfulness, fabrication rate |

Each piece is replaceable independently. You can swap Qwen3 for Mistral or DeepSeek without touching ingestion. You can swap Qdrant for Weaviate without touching the agents. You can switch from local Ollama to cloud vLLM without rewriting a single skill.

---

## Part 6 — Where RAG Falls Short

Honest caveats. RAG is not magic.

**Retrieval quality bounds output quality.** If the retriever surfaces the wrong chunks — or misses the right ones — the model gets bad context and writes bad output. The single best investment you can make in a RAG system is *evaluating retrieval separately from generation*. Score "did the retriever return the right chunks?" before you score "did the generator write the right charter?"

**Chunking is fragile around tables and structure.** A 500-token chunker can cut a risk-register table in half, separating a row from its header. The eval harness will surface this — the model will write incoherent risks because the chunks it received were nonsensical. Mitigations: smarter chunking (table-aware), smaller chunks (300 tokens), or post-processing to reattach orphaned table rows to headers.

**Embeddings are not semantics.** The embedding model captures *statistical similarity* — chunks that talk about similar things in similar ways tend to land near each other. But it's not human reasoning. A chunk that mentions "schedule" in passing can score similar to a chunk about schedule risk, even if the topics differ. Hybrid retrieval (semantic vectors + keyword search) helps. Reranking (a small model that re-scores the top-20 results) helps more.

**Long-context models tempt you to skip retrieval.** A 1M-token context window invites the temptation to paste everything. Don't. Even when it fits, large prompts cost more per call and degrade attention quality. RAG with a 32K window beats brute-paste with a 1M window on every dimension that matters — cost, speed, citation precision.

**RAG doesn't fix bad source documents.** If your charter template is unclear or your archive is full of bad past charters, retrieval will faithfully feed those flaws into the model. The corpus is part of the system, not a pre-existing condition. Curate it.

---

## Glossary

- **Agent** — a named workflow that wraps the model with a specific system prompt, retrieval scope, and output schema. In PMO LLM: Charter Drafter, Status Reporter, Risk Analyst.
- **Chunk** — a small piece of a document (typically 300–800 tokens) stored with its source metadata in the vector database.
- **Context window** — the maximum number of tokens the model can consider at once. Qwen 2.5 14B and Qwen3-32B both support 32K.
- **Cosine similarity** — a number from -1 to 1 measuring how similar two vectors are. Used to rank chunks against a query.
- **Embedding** — a list of numbers (a vector) that represents the meaning of a piece of text. In PMO LLM, 1,024 dimensions per chunk via `bge-large-en-v1.5`.
- **Fine-tuning** — training a small set of additional weights on top of a pretrained model to specialise it for a task. LoRA and QLoRA are common parameter-efficient variants.
- **Hallucination** — when a model generates plausible-looking content that isn't true.
- **Hybrid retrieval** — combining semantic search (embeddings) with keyword search (BM25) for robustness.
- **Inference** — running the model to produce output, as opposed to training it. vLLM and Ollama are inference servers.
- **LoRA / QLoRA** — Low-Rank Adaptation; parameter-efficient fine-tuning techniques.
- **Ollama** — a free open-source inference server for local LLMs on consumer hardware.
- **Parameter** — one of the model's billions of internal numbers that influence its output.
- **Quantization** — storing model parameters at lower numerical precision (e.g. 4-bit instead of 16-bit) to reduce size and increase speed.
- **RAG** — Retrieval-Augmented Generation. The architecture this document describes.
- **Reranking** — a second pass that re-scores retrieved chunks with a more expensive but more accurate model.
- **Top-K** — the number of most-similar chunks the retriever returns for a query. Typically 5–10.
- **Tier** — a metadata label on a chunk indicating which class of corpus it belongs to (methodology / templates / archive in PMO LLM).
- **Token** — a word or word fragment. The unit the model operates in. Roughly 0.75 words per token.
- **vLLM** — a high-throughput open-source inference server commonly used for cloud-GPU deployments.
- **Vector database** — a database that stores vectors and supports fast similarity search. Qdrant is the one used in PMO LLM.


## PMO LLM — Why OpenRouter?

A short explainer for why the demo calls AI models through OpenRouter rather than directly, what the alternatives are, and the operational quirks worth knowing.

### What OpenRouter is

OpenRouter is a middleman service that sits between this demo and the actual AI model providers (Anthropic, OpenAI, Google, Mistral, and many others). It exposes a single API endpoint that can route requests to any of dozens of AI models. One account, one API key, one billing relationship — but access to the full ecosystem of frontier models.

You can think of it as the "Plaid for AI APIs" — a thin abstraction that hides the differences between provider APIs and gives you a uniform interface.

### Why this demo uses OpenRouter

Four reasons, in order of importance.

#### 1. The methodology needs Claude Opus 4.7

The PMO LLM methodology proof — your 25 first-shot 30/30 results across the Mariposa Phase 1 lifecycle simulation — was built on Claude Opus 4.7. Phase 0 established empirically that this is the right substrate: smaller open-source models running locally (Qwen 2.5 14B on the A8 Max) cannot match Opus 4.7's reasoning depth on EPC planning tasks. The methodology specifically depends on the model being capable of the v4-style inline hedging discipline and the worked-example dominance recipe documented in the Build Rulebook. Opus 4.7 is currently the cheapest model that demonstrably reproduces those behaviours.

OpenRouter is the easiest way to call Anthropic's Opus 4.7 from a Node.js application that uses the OpenAI-compatible SDK. The demo's existing OpenRouter wrapper at `lib/openrouter.ts` works out of the box.

#### 2. One account, multiple models if you ever want to compare

If you ever want to run the same agent prompt against Claude Sonnet, GPT-4, or Gemini side-by-side — as you did in the Frontier Comparison Memo work — OpenRouter lets you change one line of code (the model name) and call any of them. You don't need separate developer accounts at Anthropic, OpenAI, and Google. This is especially useful for the comparison work that established Opus 4.7 as the right choice in the first place.

#### 3. Built-in cost tracking

Every API call OpenRouter routes returns the dollar cost in the response. That's why your demo can display "$0.165" stamped onto each agent invocation in the Recent Activity feed, and why the bulk-output script can show a running cost total while it works. With direct provider APIs you'd have to estimate cost yourself from token counts and per-model price tables.

#### 4. Pay-as-you-go, no enterprise contracts

OpenRouter operates on a credit balance — top up by credit card via Stripe, spend as needed, no monthly minimum, no contract. For a personal learning project like this one, that's exactly the right billing shape. A direct enterprise Anthropic account requires more setup and is meant for higher-volume teams.

### The alternatives we considered

#### Direct Anthropic API

Same Claude models, ~5% cheaper per call (OpenRouter takes a small margin), but requires a separate Anthropic developer account and a small code change to use Anthropic's native SDK instead of the OpenAI-compatible one we have today.

Net: small cost savings, more setup friction. Worth considering if monthly spend grows past $100. At this project's current scale ($1–50 per session), the OpenRouter overhead is not material.

#### Local model on your A8 Max

Free, private, no internet required. Your machine already has Ollama with Qwen 2.5 14B installed and ready to use. Phase 0 demonstrated empirically that this is the wrong substrate for the methodology — the smaller model couldn't reliably produce 30/30 outputs on the same rubric. We'd lose the methodology proof. Suitable for future work like cached retrieval or simple summarisation, not the agent invocations that are the headline demo moment.

#### Direct OpenAI / Gemini APIs

Same architecture, different provider. Would require swapping the model substrate, which contradicts the methodology decision. Not under consideration unless we re-open Phase 0.

### Operational gotchas worth knowing

#### Two different "credit" concepts

OpenRouter has two separate spending limits and they're easy to confuse:

1. **Account credit balance** — How much money you've topped up. Shown at `openrouter.ai/credits`. When this runs out, all calls fail with a billing error.

2. **Per-key spending limit** — A safety cap you can set per API key, separate from the account balance. Each key has its own "this key may spend up to $X" limit. The default is small. Even if your account has plenty of credit, if a key's limit is reached, calls from that key fail.

The Phase 2.4 bulk-output run hit this distinction: the account had $103 but the API key had a much lower per-key limit, so 376 calls were blocked despite plenty of credit being available. Fix: visit the key's settings page (linked in the error message) and raise or remove its limit.

#### Cost variance between models and prompt types

Opus 4.7 is significantly more expensive than Sonnet. Within Opus, costs vary by call type: a long-form structured WBS document (~$0.20) costs more than a short risk-analysis (~$0.08) because output tokens are the dominant cost driver. Plan for ~$0.10–$0.25 per typical PMO LLM agent invocation, with $0.15–$0.18 as a sensible average.

#### Rate limits exist but rarely bite for this workload

OpenRouter passes through provider rate limits. Anthropic's Tier 1 allows about 50 requests per minute for Claude — the bulk-output script's concurrency of 4 stays well below that. If you ever ran with concurrency > 20, you'd start seeing 429 (rate-limit) errors.

### Summary

OpenRouter is the most pragmatic way to call Claude Opus 4.7 from this codebase, given the methodology decision from Phase 0. The friction is real but minor: one-time per-key limit setup, slightly higher per-call cost than direct Anthropic. The benefits — model agnosticism, built-in cost tracking, pay-as-you-go billing — match the project's needs cleanly.

If the project ever scales past personal-learning into operational use, revisit the choice. For everything contemplated through Phase 2 and beyond, OpenRouter is the right call.


## AI PMO — Promote to Cloud (Demo Release) Runbook

A push-button sequence to stand up the shareable demo on Supabase Pro + Vercel,
starting from your local-first build. Do it once to release; repeat the short
"per-demo" section whenever you bring the cloud back up.

**Model:** you build on **local** (free). The cloud is only for sharing. When
you're not demoing, **pause** the cloud project so it costs ~$0.

**Before you start, confirm:**

- Supabase **Pro** is active and the project `pmo-llm-demo` (`edtxpjadvwsaktkvourr`) shows **Database + PostgREST = Healthy**.
- Your local stack runs (Docker up, `supabase start`), and the app works at `http://localhost:3000`.
- You have the cloud credentials in `.env.local.cloud-backup` (URL + anon + service-role key).
- Supabase CLI is installed (it is — via Scoop).

---

### Part A — One-time prep (do once)

#### A1. Install the new PDF packages

The PDF route now uses a slim browser on Vercel. Install the two new packages:

```powershell
pnpm install
```

This picks up `puppeteer-core` + `@sparticuz/chromium` (cloud) and keeps full
`puppeteer` as a dev dependency (local). Then confirm the build is clean:

```powershell
npx tsc --noEmit
pnpm build
```

`pnpm build` must end with a success line (warnings OK, errors block deploy).
If `tsc` still flags `puppeteer-core` / `@sparticuz/chromium`, the install
didn't complete — re-run `pnpm install`.

#### A2. Recover or regenerate the agent narratives

The schema + 99 projects rebuild for free from the generators. The only
non-reproducible data is the AI-written narratives in `agent_outputs`.

- If the old cloud is healthy: `node scripts/recover-agent-outputs.mjs --dry` then (if counts look right) `node scripts/recover-agent-outputs.mjs` — pulls them into **local**.
- If they're gone: regenerate (local Qwen = free, or the paid deep-fill) when you seed.

#### A3. Bump compute Nano -> Micro (optional, ~1 min downtime)

In the Supabase dashboard, open the project -> Settings -> Compute and Disk ->
change Nano to **Micro**. Same price in a paid org, more stable. Do this when
nothing else is running (not mid-recovery, not during a demo).

---

### Part B — Seed the cloud database

> The generators read `.env.local`. To seed the **cloud**, point `.env.local` at
> the cloud, run them, then point it back at local.

#### B1. Back up and switch env to cloud

```powershell
Copy-Item .env.local .env.local.local-backup -Force
Copy-Item .env.local.cloud-backup .env.local -Force
```

#### B2. Apply all migrations to the cloud

```powershell
supabase link --project-ref edtxpjadvwsaktkvourr
supabase db push
```

This runs all 30 migrations (through `0030`) against the cloud — same schema as local.

#### B3. Seed the portfolio + narratives

Run the same seed you used locally (procedural, free), then the narratives:

```powershell
pnpm tsx scripts/seed-all.ts
```

If you recovered narratives into local in A2, push them up too (point the
recovery script's *target* at cloud, or re-run your deep-fill against cloud).
For a quick free fill, run the agents via local Qwen against the cloud rows.

#### B4. Replace the placeholder access tokens

The seeded tokens are `demo-...-token-replace-me`. Before sharing publicly,
replace them with unguessable values (Supabase Studio -> SQL editor), e.g.:

```sql
update roles set token = 'demo-pm-' || gen_random_uuid()
where token = 'demo-pm-token-replace-me';
-- repeat per role
```

Note the new tokens — they go in the demo links you share.

#### B5. Switch env back to local

```powershell
Copy-Item .env.local.local-backup .env.local -Force
```

---

### Part C — Deploy the app to Railway

> Railway hosts the **Next.js app**; Supabase (Part B) still hosts the **database**.
> Railway runs a persistent Node server, so the PDF route and long agent calls
> have no serverless timeout / bundle limits — and no cold starts.

#### C1. Push the code to GitHub (done)

Railway builds from GitHub on every push:

```powershell
git push origin main
```

#### C2. One-time PDF-route prep for Railway

On a persistent server the simplest, most reliable PDF path is **full puppeteer**
with its bundled Chromium — and the `report-pdf` route already uses full puppeteer
whenever it is NOT on Vercel. Just make sure it's installed in production: move
`puppeteer` from `devDependencies` to `dependencies` in `package.json`, then:

```powershell
pnpm install
git commit -am "PDF: full puppeteer for the Railway persistent-server deploy"
git push origin main
```

(No `@sparticuz/chromium` gymnastics needed on Railway — that was only for Vercel's
serverless bundle limit. Leave those packages in; they're simply unused there.)

#### C3. Create the Railway service + env vars

In Railway: **New Project -> Deploy from GitHub repo -> `ChalaAkkaraju/ai-pmo`**.
Railway auto-detects Next.js (Nixpacks) and runs `next build` then `next start`.
Add these 4 variables (service -> **Variables**), all pointing at the **cloud**
Supabase (from `.env.local.cloud-backup`):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the cloud URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cloud anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | cloud service-role key |
| `OPENROUTER_API_KEY` | your OpenRouter key |

Railway injects a `PORT`; `next start` respects it. If the app doesn't bind, set
the start command to `next start -p $PORT`. Then **Settings -> Networking ->
Generate Domain** for a public URL.

#### C4. Deploy

Railway builds and starts automatically on pus

## AI PMO — Pre-Deploy Testing Checklist

Run through this once before deploying to Vercel. Designed for ~45 minutes of focused testing — substantial enough to catch the failures that would embarrass in production, brief enough that you'll actually do it.

Tick each box as you go. If anything fails, note it under "Issues found" at the bottom. Don't deploy until every must-pass item is green.

**Prerequisites before starting:**

- [ ] Windows dev server is running (`pnpm dev` in PowerShell, no errors in terminal)
- [ ] Browser open to `http://localhost:3000`
- [ ] Supabase dashboard accessible in another tab (handy for verifying writes)
- [ ] Browser DevTools open in a second window (`F12`) — keep an eye on Console tab for red errors

---

### Section 1 — Landing & authentication (5 min)

- [ ] `http://localhost:3000/` renders the AI PMO landing page (✨ brand mark, "AI PMO" heading, list of access tokens for each colleague role)
- [ ] No "PMO LLM" text anywhere on the landing page (should be fully rebranded)
- [ ] An invalid token like `/access/totally-fake-token` redirects to a 404 / "not found" page
- [ ] Clicking each role's access link loads the dashboard for that role without error:
  - [ ] Senior PM / PMO Director — J. Okafor (`demo-pm-token-replace-me`)
  - [ ] Portfolio Procurement Strategist — M. Patel (`demo-procurement-token-replace-me`)
  - [ ] Portfolio Risk Analyst — R. Yuen (`demo-risk-token-replace-me`)
  - [ ] VP Sponsor — L. Andersen (`demo-sponsor-token-replace-me`)
  - [ ] Commercial Manager — A. Whitfield (`demo-commercial-token-replace-me`)
  - [ ] Project Controls Manager — K. Müller (`demo-project-controls-token-replace-me`)
  - [ ] Program Manager (Renewables) — S. Park (`demo-program-manager-token-replace-me`)
  - [ ] Engineering Manager — D. Sato (`demo-engineering-manager-token-replace-me`)
  - [ ] Construction Manager — T. O'Brien (`demo-construction-manager-token-replace-me`)
  - [ ] HSE Manager — F. Mahmoud (`demo-hse-manager-token-replace-me`)
- [ ] The header bar shows the correct colleague name and role for the token you used

---

### Section 2 — Dashboard (PM Director role) (10 min)

Use the PM Director token for the deepest coverage.

**Header & branding:**

- [ ] Brand mark (✨ AI PMO + "for Project Management Office" tagline) visible top-left
- [ ] "Agents" link in top-right navigates to `/access/<token>/agents` (test the link)
- [ ] Colleague name (e.g., "J. Okafor") and role display visible top-right

**Ribbon 1 — Portfolio KPIs:**

- [ ] 6 KPI cards visible: Contract value, Approved budget, Active projects, Avg CPI/SPI, Open H issues, Realised risks
- [ ] Values look plausible (e.g., total contract value is in billions, not zero)
- [ ] Avg CPI/SPI card has tone color (warn/ok) consistent with the values
- [ ] Open H issues + realised risks have warn tone if count > 0

**Ribbon 2 — Theme cards:**

- [ ] 4 segment cards visible: Renewables, Water, Industrial, Power
- [ ] Each card shows project count, contract value, status breakdown
- [ ] Clicking a card expands an inline drill-down with project grid below
- [ ] "Collapse" button hides the drill-down
- [ ] Selecting a different theme card swaps the drill-down to that segment

**Hot 5 panel:**

- [ ] "Top projects of concern" section is visible
- [ ] 5 projects listed with composite scores
- [ ] Each row clickable, leads to the project detail page

**Activity feed (Recent agent activity):**

- [ ] "LIVE" badge visible next to the section title
- [ ] Cards show colleague name, role chip, agent, time-ago, and prompt preview
- [ ] Clicking a card expands to show full response inline
- [ ] Top of expanded card has the dark slate strip with "↗ Show full report" + "Collapse ▴" buttons
- [ ] Collapsing the card hides the response
- [ ] Empty-state message ("No agent activity yet... use the floating ✨ Ask AI Assistant button...") shows if no activity exists

---

### Section 3 — Project detail page (10 min)

Click into one of the Hot 5 projects (e.g., the top item).

**Project header:**

- [ ] Project code (e.g., `NW-PWR-2686`), name, client, segment, status visible
- [ ] BI strip shows CPI/SPI gauges, contingency bar, risk donut
- [ ] Current week + status indicator

**Tabs render and switch cleanly:**

- [ ] Risks tab loads — 3×3 risk heatmap visible above table, table populated, all risks have valid status
- [ ] Issues tab loads — table populated, H-severity items color-coded
- [ ] Change orders tab loads — CO table populated (may be empty for some projects)
- [ ] Variance tab loads — CPI/SPI trend chart + contingency burn-down both render without NaN errors
- [ ] Charter tab — markdown content visible, "↗ Show full report" button above
- [ ] Stakeholders tab — markdown content visible (or empty state)
- [ ] WBS tab — hierarchical tree view visible above markdown
- [ ] Schedule tab — Gantt strip visible above markdown
- [ ] Budget tab — markdown content visible
- [ ] Comms tab — markdown content visible
- [ ] Lessons tab — markdown content visible
- [ ] Closeout tab — markdown content visible

**Test the "↗ Show full report" button on one planning tab:**

- [ ] Click "↗ Show full report" on the Charter tab
- [ ] New tab opens to `/access/<token>/report/<output-id>`

---

### Section 4 — Visualizations close inspection (5 min)

These are the parts most likely to break visually in production.

**Risk heatmap (3×3):**

- [ ] Probability axis labeled L/M/H, Impact axis labeled L/M/H
- [ ] Cells color-coded (low=green, mid=amber, high=red)
- [ ] Each cell shows count of risks in that probability×impact bucket
- [ ] Cells with 0 risks are visibly distinct from cells with counts

**Variance trend chart:**

- [ ] CPI line visible across weeks
- [ ] SPI line visible across weeks
- [ ] Contingency burn-down area chart visible
- [ ] Y-axis labels have sensible precision (not "0.93000000")
- [ ] No NaN values in tooltips on hover

**Gantt schedule strip:**

- [ ] Phases render as colored bars (amber=Active, teal=SC, slate=Closed)
- [ ] Current-week marker visible
- [ ] No overlapping/crushed bars

**WBS tree view:**

- [ ] Hierarchical layout, not flat list
- [ ] Section headings distinguishable from leaf items
- [ ] Project root demoted (doesn't dominate the layout)

---

### Section 5 — Floating AI Assistant widget (10 min)

This is the highest-traffic interactive component.

**Collapsed state:**

- [ ] Black pill button "✨ Ask AI Assistant" visible bottom-right on every page
- [ ] Clicking opens the chat panel

**Expanded panel:**

- [ ] Dark slate header with gold ✨ icon + "Ask AI Assistant" title
- [ ] Subtitle shows role + context (either "Portfolio" or current project code)
- [ ] "Pick agent" dropdown defaults to "Auto"
- [ ] Dropdown lists all agents available to the current role
- [ ] Placeholder text in the textarea is role-appropriate
- [ ] "×" close button works, panel closes cleanly

**Quick-mode invocation (auto-routed):**

- [ ] From dashboard, type a portfolio-level prompt (e.g., "Which three projects need attention this week?") and hit Send
- [ ] "Calling…" appears immediately
- [ ] Response arrives within ~15 seconds
- [ ] Response card shows "Auto → <Specialist Name>" header (e.g., "Auto → Portfolio Risk Reviewer")
- [ ] Markdown rendering shows colored callouts: amber for "Caveat:", sky for "Recommendation:", emerald for "Action:" / "Next step:" (if the response contains them)
- [ ] Footer shows duration in seconds + "↗ Show full report" button

**Override the router:**

- [ ] Switch dropdown to a specific agent (e.g., "Variance Analyst")
- [ ] Send another prompt
- [ ] Response card header says the agent name directly (no "Auto →" prefix)

**Context awareness:**

- [ ] Navigate to a project detail page
- [ ] Open floating widget — subtitle should now say "context: <project-code>"
- [ ] Invoke an agent — response should be project-scoped, citing that project's data

**Read-only role (if testing as Sponsor):**

- [ ] Open widget as Sponsor (whose can_write is false)
- [ ] Textarea should be disabled with "Read-only role" placeholder
- [ ] Send button disabled

---

### Section 6 — Polished report viewer (10 min)

The path you most recently built — needs careful coverage.

**Open a report from the activity feed:**

- [ ] On dashboard, expand any activity card
- [ ] Click "↗ Show full report" in the dark strip at the top
- [ ] New browser tab opens to `/access/<token>/report/<output-id>`

**Initial load state:**

- [ ] Sky-blue banner at top: "Generating the full long-form report. This usually takes 25–40 seconds..."
- [ ] Download PDF button shows spinner + "Preparing report…" (disabled)
- [ ] The quick brief is visible below the banner (page isn't blank)

**After ~30 seconds:**

- [ ] Banner disappears
- [ ] Download PDF button becomes active, shows "↓ Download PDF" with gold accent
- [ ] Page now shows the full long-form content (more `## Section` headings, longer paragraphs than the brief)
- [ ] Letterhead at top: ✨ AI PMO + "Project Management Office" tagline (left), "STATUS REPORT" + date + generated time (right)
- [ ] Title block: report title + project code/name/segment/client OR "Portfolio-level" badge
- [ ] Meta strip (4 columns): Prepared by, Requested by, For, Methodology
- [ ] Request quote block (italic, in slate-50 panel with left border)
- [ ] Either "Summary + Full detail" two-tier OR single flowing body (depending on whether the markdown has H2 sections)
- [ ] Footer: "Generated by AI PMO · Methodology: PMBOK 7..."

**Test the cache:**

- [ ] Refresh the page (F5 or Ctrl+R)
- [ ] Full version should appear INSTANTLY (no spinner, no 30-second wait) — confirms sessionStorage cache is working
- [ ] No new LLM invocation should fire (verify by checking the activity feed on the dashboard — no new entry)

**Download PDF:**

- [ ] Click "↓ Download PDF"
- [ ] Button changes to "Generating PDF…" with spinner (~2-3 seconds)
- [ ] Browser triggers a file download
- [ ] File name format: `AI-PMO-<AgentSlug>-<ProjectCode-or-Portfolio>-<YYYY-MM-DD>.pdf`
- [ ] Open the downloaded PDF — verify it contains the report content
- [ ] PDF does NOT show the app navigation header (the duplicate "✨ AI PMO" strip at the top of the screen)
- [ ] PDF does NOT show the floating "Ask AI Assistant" button
- [ ] Page breaks look reasonable (no orphaned headings on their own line)

**Test reports from other surfaces:**

- [ ] On a project page, go to Charter tab → click "↗ Show full report" → polished view opens
- [ ] In the floating widget, send a new prompt → after response, click "↗ Show full report" in the response footer → polished view opens

---

### Section 7 — Agents catalog page (5 min)

- [ ] Navigate to `/access/<token>/agents`
- [ ] Page title: "Agents available to you"
- [ ] Intro paragraph correctly states the count (e.g., "you can invoke 13 of 13 specialists" for PM)
- [ ] References "the floating ✨ Ask AI Assistant button" (NOT "Ask agent")
- [ ] All 13 agents listed
- [ ] Agents your role CAN invoke shown in full color
- [ ] Agents your role CANNOT invoke shown muted with "Not in your role" pill
- [ ] Each card has: name, purpose, scope badge, does[] list, doesNot[] list, sample prompt, methodology
- [ ] Test as Sponsor too — far fewer agents should be enabled

---

### Section 8 — Live activity feed (Realtime) (5 min)

Verify the cross-session broadcast still works.

- [ ] Open dashboard in browser tab A (e.g., as PM Director)
- [ ] Open dashboard in browser tab B (different colleague, e.g., Procurement Strategist) — use a different role token
- [ ] In tab B, invoke an agent via the floating widget
- [ ] Switch back to tab A — within ~2 seconds, the new activity should appear in the "Recent agent activity" feed
- [ ] New entry has a brief highlight animation (CSS flash) for the first few seconds
- [ ] Feed caps at 5 entries (older ones drop off)

---

### Section 9 — Error / edge cases (3 min)

- [ ] Empty prompt (just spaces) — Send button should be disabled, can't submit
- [ ] Try invoking an agent that requires a project_code from a portfolio-level page (e.g., Charter Drafter from dashboard) — should either auto-route to a portfolio-level agent OR return a sensible error message
- [ ] Click "Show full report" twice quickly — second click should be ignored while first is in flight (no duplicate calls)
- [ ] Navigate around with browser back/forward buttons — pages should re-render without console errors

---

### Section 10 — Browser console hygiene (2 min)

- [ ] Open DevTools (F12) → Console tab
- [ ] Refresh the dashboard
- [ ] Browse through 3-4 project pages
- [ ] Open the floating widget, invoke an agent
- [ ] Open a report, download a PDF
- [ ] **Scan the Console** — note any RED errors (warnings in yellow are usually fine)
- [ ] If you see red errors, capture screenshots before fixing

Common acceptable warnings:
- `Download the React DevTools` — informational
- Hydration warnings on dev-only — usually fine in production
- Fast Refresh messages — dev-only

Unacceptable (must fix before deploy):
- `TypeError`, `ReferenceError`, `SyntaxError` in your own code
- `Failed to fetch` for Supabase or OpenRouter calls
- 500 errors in the Network tab

---

### Section 11 — Vercel readiness (final 5 min)

Things that matter specifically for the cloud deploy:

- [ ] Confirm `.env.local` has all 4 required keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`
- [ ] `.env.local` is gitignored (run `git status .env.local` — should say "ignored" or not show it)
- [ ] `package.json` has `"build": "next build"` and `"start": "next start"` scripts (Vercel uses these)
- [ ] Run `pnpm build` locally to confirm the production build succeeds:
  ```
  pnpm build
  ```
  Should end with "✓ Compiled successfully" (warnings OK; errors block deploy)
- [ ] If `pnpm build` errors, fix before deploying — Vercel will fail with the same error
- [ ] The longest-running API call (full-mode regeneration) should complete under 60 seconds — Vercel Hobby tier times out at 60s. The `maxDuration: 60` is already set on `/api/agent`. Note that close-to-the-limit invocations may sometimes time out under cold-start conditions; if so, Vercel Pro raises the limit to 300s.

---

### Issues found during this test

Note any problems below. Address must-fix items before deploying.

```
Issue 1:
  Where:
  What happened:
  Severity (blocker / nice-to-fix / cosmetic):

Issue 2:
  Where:
  What happened:
  Severity:

...
```

---

### Sign-off

- [ ] All sections complete
- [ ] All RED console errors resolved
- [ ] `pnpm build` succeeds
- [ ] Issues list is empty OR all items marked nice-to-fix/cosmetic (no blockers)
- [ ] Ready to deploy to Vercel

**Tested by:** _________________
**Date:** _________________
**Build commit:** _________________ (run `git log -1 --oneline` to get)


# Appendices


## Data Dictionary

### Technical Edition · Appendix — the canonical model

AI PMO's schema is a provenance-tagged canonical model: each table carries the data
of a project-controls domain, joined on the **WBS code**, with a `source_system`
tag recording whether a row is a system-of-record fact (SAP PS, scheduler) or AI-PMO
synthesis. The core tables:

| Table | Holds | Notes |
| --- | --- | --- |
| `roles` | Access roles + URL `token` | Token *is* the auth mechanism; 10 demo roles |
| `projects` | Project header, contract & budget, window dates | `contract_value_current`, `approved_budget_current`, `sold_contract_value`, `contract_finish` |
| `work_packages` | Canonical WBS (the join key) | Authoring/booking provenance (0018) |
| `tasks` | Schedule activities + `%complete` | The scheduler side of the seam |
| `cost_actuals` | Actual cost, by `value_category` (element) | The SAP cost side (0027) |
| `purchase_orders` | Commitments (`po_value`, `received_value`) | Open commitment = po − received (0027) |
| `billing_events` | Invoices raised (Invoiced/Paid) | Cash-in + billed-to-date (0028) |
| `results_analysis` | Cost-based POC recognised revenue per phase | IFRS 15; independent of EV (0029) |
| `forecast_snapshots` | Monthly EV/EAC/revenue time series | Anchored to live EV (0032) |
| `change_orders` | Changes & trends | `status` incl. Absorbed/Withdrawn, `recovery_confidence` (0031) |
| `risks` | Risk register | `emv_usd`, `residual_emv_usd`, probabilities (risk enrichment) |
| `issues` | Issue log | `severity`, `sla_weeks`, `escalated` (0026) |
| `variance_reports` | Period CPI/SPI/contingency | Drives the watchlist |
| `milestones` | Contract & schedule milestones | |
| `resource_assignments` | Resource demand/actuals (hours, rate) | (0027) |
| `action_items` | Cross-agent task assignments | assign→respond loop (0009–0011) |
| `agent_outputs` | AI-written narratives (audit log) | The non-reproducible data |
| `portfolio_patterns` | Cross-project emergence signals | Dashboard insight |
| `sync_runs` / `sync_exceptions` | Integration run + exception log | (0020, 0030) |
| `project_drafts` | Half-filled intake forms | (0014) |
| `worked_examples` / others | Seed & demo support | |

**Conventions.** Money is stored in dollars (some derived figures in `_m` millions);
the WBS code joins cost and schedule; Level-2 (`a.b`) is the phase grouping; all
portfolio reads paginate via `selectAll` (B18). Migrations are immutable and numbered
(`0001`…`0033`); generators are idempotent and re-runnable (skip unless `--force`).


## AI PMO — Application Audit: Design Consistency & Dead Code

**Scope:** all 19 pages, 39 components, 30 lib files, 16 API routes
**Date:** 4 June 2026
**Mode:** findings only — no code changed. Every claim below is grep-verified.

---

### How to read this

Two parts: **(A) design consistency** (look, feel, UX) and **(B) dead code**. Each finding has a severity, the evidence (file:line), and a recommended fix. Nothing here has been changed in the codebase — this is the menu you asked for, so you can pick what to action before the demo.

The headline: the app is **structurally healthy**. Dead code is tiny and contained (2 components + 1 route). The design issues are almost all *the same root cause repeated* — colours and badge styles are defined ad hoc in each component instead of in one shared place. Fix that root cause once and most of Part A collapses into a handful of edits.

---

## Part A — Design consistency

### A1. Status badge styling is duplicated in 8+ places — HIGH

This is the single biggest consistency problem. The same idea ("colour a status pill") is reimplemented independently across the app, and the colours have already drifted.

Local, per-component status-class functions found:

| File | Function |
|---|---|
| `lib/risk-status.ts:50` | `riskStatusBadgeClass()` — the *canonical* one |
| `lib/segment-style.ts:80` | `statusBadge()` |
| `components/risks-table.tsx:47` | `actionStatusClass()` |
| `components/issues-table.tsx:25` | `statusBadgeClass()` |
| `components/portfolio-tables.tsx:43,49,282` | `issueStatusClass()`, `riskStatusClass()`, `actionStatusClass()` |
| `components/change-orders-table.tsx:24` | `statusClass()` |
| `components/raised-actions-panel.tsx:51` | `statusClass()` |
| `components/integration-client.tsx:44` | `statusCls()` |
| `components/risk-heatmap.tsx:50` | `dotClass()` |

**Drift this has already caused:** "Done/closed" is `bg-emerald-100` in `risks-table.tsx:49` but `bg-green-100` in `issues-table.tsx:26` — two different greens for the same meaning. "Realised" risk is amber as a badge (`lib/risk-status.ts`) but **red** as a heatmap dot (`risk-heatmap.tsx:50`) — visible on the same risks page.

**Fix:** one `lib/badge-styles.ts` exporting a `{ risk, issue, action }` status→class map (and a paired `dot` variant for the heatmap so badge and dot agree). Replace all nine local functions with imports. ~1–2 hrs, removes the whole class of bug.

### A2. Colours live in 3+ sources; charts hardcode hex — HIGH

Colour is defined in (1) `styles/globals.css` CSS theme vars, (2) `lib/segment-style.ts`, (3) `lib/risk-status.ts`, and (4) hardcoded hex/rgb inside ~14 components. Hardcoded-colour count by file:

```
analytics-charts.tsx 26   dashboard-client.tsx 19   variance-trend-chart.tsx 15
resource-load-view.tsx 14  schedule-gantt.tsx 11*    earned-value-card.tsx 11
floating-agent-widget.tsx 10  agent-deck.tsx 9        margin-bridge.tsx 7
```
(*schedule-gantt is dead — see B1.)

The same brand blue is written three ways: `#378ADD` (earned-value, margin), `#0ea5e9` / `sky-500` (analytics), and `bg-sky-*`/`bg-blue-*` Tailwind classes elsewhere — used interchangeably for "planned / active". Changing the palette today means editing four kinds of place.

**Fix:** a single `lib/chart-palette.ts` (or extend `design-tokens.ts`) with named constants — `planned`, `earned`, `actual`, `variance`, `changeOrder`, `today` — imported by every chart/SVG. Charts legitimately need exact hex for SVG strokes, so keeping them as constants (not Tailwind classes) is fine; the point is *one* source. Pick one blue for "planned/active" and retire the others.

### A3. `cn()` helper exists but is barely used — MEDIUM

`lib/utils.ts:4` already exports a proper `cn()` (clsx-based). Yet almost every component composes classes with raw template strings and inline ternaries, e.g. `variance-summary.tsx:47`, `portfolio-tables.tsx:136`. This is why conditional styling looks different everywhere.

**Fix:** adopt the existing `cn()` in components with conditional classes. No new dependency — it's already there. (Correcting the sub-audit, which wrongly reported `cn()` as missing.)

### A4. Primary/secondary buttons aren't standardized — MEDIUM

Primary buttons are mostly `bg-foreground text-background` but with drifting padding and radius, and the floating widget uses inline `rgb(15 23 42)` instead:

- `header.tsx:53` — `rounded-md bg-foreground px-3 py-1.5 text-xs`
- `assign-task-button.tsx:141` — `rounded-md bg-foreground px-4 py-2 text-sm`
- `floating-agent-widget.tsx:494` — `rounded-full ... px-4 py-3` + inline slate bg
- `floating-agent-widget.tsx:613` — `px-3 py-1.5` + inline slate bg

Secondary/border buttons mix `rounded` vs `rounded-md` and `py-0.5` vs `py-1.5` (`floating-agent-widget.tsx:761,768,791`).

**Note:** the Integration page buttons you and I just standardized (sky/violet/emerald tinted pills) are *not* yet reflected elsewhere — they're currently a one-page style. Worth deciding whether that tinted-pill language becomes the app-wide button system or stays scoped to Integration.

**Fix:** one `<Button variant size>` component (or `@layer components` presets) covering primary / secondary / tinted. Replace inline `rgb(15 23 42)` in the widget with the token.

### A5. Typography scale is fragmented — MEDIUM

290 occurrences of arbitrary `text-[Npx]` (`[10px]`, `[11px]`, `[12px]`) sit alongside the Tailwind scale (`text-xs/sm/base`). Labels are sometimes `text-[10px] uppercase`, sometimes `text-xs uppercase`.

**Fix:** add `2xs`/`3xs` steps to `tailwind.config.ts` and migrate the arbitrary sizes, or simply collapse `[10px]/[11px]/[12px]` onto `text-xs`. Mechanical, low-risk, big readability payoff.

Fonts are *fine*: Inter app-wide (`app/layout.tsx`), Plus Jakarta Sans as an intentional display face on the welcome page only (`welcome/page.tsx:34`). Not an inconsistency. (Correcting the sub-audit, which flagged it.)

### A6. Card padding / container rhythm drifts — LOW

Cards are consistently `rounded-lg border bg-card` but padding ranges `p-3 / p-4 / p-5 / p-6` for similar surfaces (`risk-heatmap.tsx:84` p-5, `assign-task-button.tsx:93` p-4, `earned-value-card.tsx:22` p-6, `variance-summary.tsx:47,77` p-4 vs p-6 on sibling cards).

**Fix:** three named tiers — compact `p-3`, standard `p-4`, feature `p-6` — as `@layer components` classes. Low priority; cosmetic.

### A7. UX flow — mostly consistent (good) — INFO

Strong points worth keeping: header + breadcrumbs render on every authed page; the floating agent widget is mounted app-wide via the layout; empty states uniformly use `text-sm text-muted-foreground`; each page opens with an h1 + intro paragraph. No navigation dead-ends found. The main UX nit is the visual drift above (badges/buttons), not the flows.

---

## Part B — Dead / unused code

Small and safe to remove. All three confirmed with zero external references.

### B1. `components/schedule-gantt.tsx` — unused component — REMOVE (Certain)
`ScheduleGantt` has **zero** imports anywhere (grep across `app/` + `components/`). Superseded by `ScheduleView` (`project-tabs.tsx:33,154`), which renders real task data. The file also carries 11 hardcoded colours and its own `statusColours()`/`dotClass()` — so removing it also shrinks Part A. Safe to delete.

### B2. `components/wbs-tree-view.tsx` — unused component — REMOVE (Certain)
`WbsTreeView` (markdown-parsing WBS renderer) has **zero** external imports. Superseded by `WbsCanonicalTree` (`project-tabs.tsx:149`), which reads the `work_packages` table. Safe to delete.

### B3. `app/api/integration/export/route.ts` — orphaned route — REMOVE or RE-WIRE (Certain)
`GET /api/integration/export` (generic CSV download for wbs/cost/tasks/resources) has **zero** callers. The Integration UI uses `/api/integration/template` (blank templates) and `/api/integration/export-sap` (WBS→SAP load) instead; cost/tasks/resources show "—" in the Download column.
**Decision needed:** either delete it, or wire it into the matrix's empty "Download data" cells if you want round-trip download-edit-upload for cost/tasks/resources too. (This is the route you flagged as possibly orphaned after the redesign — confirmed orphaned.)

### B4. Clean elsewhere — INFO
Searched and found **none** of: stale TODO/FIXME/HACK/XXX markers, large commented-out code blocks, unused lib exports (spot-checked), unused imports in the big components, or dead `useState`/computed vars in `dashboard-client` / `project-tabs` / `integration-client`. The codebase is genuinely tidy outside B1–B3.

---

## Recommended order (if/when you say go)

1. **Delete B1–B3** (2 components + 1 route, or re-wire B3). Pure win, ~15 min, tsc-verified.
2. **A1 — `lib/badge-styles.ts`** consolidation. Highest UX payoff; kills the green/emerald and amber/red status drift.
3. **A2 — `lib/chart-palette.ts`** + pick one "planned/active" blue. Makes the palette themeable.
4. **A3/A4 — adopt `cn()` + a `<Button>`** primitive; fold the Integration tinted-pill style into it (or keep scoped — your call).
5. **A5/A6 — typography + card-padding tiers.** Mechanical polish, do last.

Items 2–5 are best done as one short "design-tokens" pass since they touch overlapping files. None of it is required for the demo to function — it's consistency polish — but A1 is the one a sharp viewer would notice.

*No files were modified to produce this report.*
