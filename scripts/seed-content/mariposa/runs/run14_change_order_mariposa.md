# Change Order Analysis Framework — Mariposa Wind Farm Phase 1 (Week 0 baseline)

> **Note on this document's state.** This is the Week 0 baseline of the Change Order Analysis framework for Mariposa Wind Farm Phase 1. Contract signature is 22 May; no execution has occurred, and no change orders are pending. There is no specific change to analyse because no change has been requested. This document therefore defines the *framework* — driver classification scheme, scope/schedule/cost/commercial/risk analysis structure, recommendation discipline, approval routing per charter §11, and conditions discipline — that will be applied to each individual change order from Week 1 onward as scope-change events accrue. The Week 0 issue log (`run12_issue_log_mariposa.md`) identifies the open items most likely to generate the first change orders; those issues are referenced here as change-order precursors, not as realised change orders.

## 1. Change context — framework

Every Change Order Analysis Package for Mariposa opens with the change context block. The block is structured so that the originator, driver classification, and authorising context are visible before any scope, schedule, or cost analysis is read.

**Block template (applied per change order from Week 1 onward):**

- **Change order ID:** CO-NNN (sequential; CO-001 will be the first)
- **Project:** Mariposa Wind Farm Phase 1 (NW-REN-2511)
- **Client originator:** (named client representative, typically Client Lead per stakeholder register row 6) with (Client Executive Sponsor, register row 7) backing on material commercial events
- **Request date:** (date of formal written request; verbal indications noted with date)
- **Driver classification:** (one of four — see §1.1)
- **Driver detail:** (one-paragraph explanation of *why* the change is being requested, framed in the originator's language and rationale)
- **Analysis date:** (date this analysis is prepared)
- **Northwood PM:** J. Okafor
- **Commercial Manager:** *(at draft stage [NEEDS PM REVIEW: Commercial Manager assignment unconfirmed per budget §1 and issue log I-011; required for change-order sign-off])*
- **Project Director:** L. Chen
- **Sponsor:** VP Renewables

### 1.1 Driver classification scheme

Every change order is classified into exactly one of four drivers. The classification frames every downstream judgment in the analysis — pricing position, schedule absorption, risk allocation, recommendation. Driver-classification ambiguity is the most common failure mode this discipline prevents.

- **Client-driven** — change originates from client's commercial, operational, or strategic priorities. Pricing dynamic: Northwood has commercial leverage (client wants the change); margin protection is the discipline. Examples on this project would include client-requested turbine layout optimisation for landowner accommodation, client-requested SCADA integration with their portfolio platform, client-requested operator training scope expansion.
- **Northwood-driven** — change originates from Northwood's execution discovery, design refinement, or planning correction. Pricing dynamic: Northwood typically absorbs cost (it's our discovery); the question is whether contingency or margin takes the hit. Examples would include geotechnical discovery requiring foundation design changes that Northwood did not anticipate, OEM design-interface findings requiring electrical re-routing.
- **External regulatory** — change originates from permitting authority, utility, county DOT, or other regulator. Pricing dynamic: change is non-negotiable in scope; commercial recovery channel depends on whether contract risk allocation places regulatory shifts on client or contractor. Examples would include wildlife agency imposing additional mitigation measures during construction, utility imposing protection-coordination changes during interconnection studies, county DOT imposing additional restoration requirements.
- **Scope clarification** — change resolves ambiguity in the original contract scope rather than adding new scope. Pricing dynamic: typically zero-cost or low-cost; the discipline is documenting the clarification so future change orders cannot relitigate it. Examples would include clarifying the boundary between Northwood's interconnection scope and the utility's transmission scope, clarifying the operator training scope boundary between Northwood and the client's separate O&M provider.

### 1.2 Anticipated change-order categories at Week 0

Drawing from the Week 0 issue log and charter §8 risk register, the following change-order categories are anticipated during Mariposa execution. These are *anticipated*, not predicted — they identify where change orders are most likely to originate, so that when one arrives, the analyst recognises the pattern.

| Anticipated category | Driver class (most likely) | Originating issue / risk | Rough timing |
|---|---|---|---|
| Migratory bird blackout window scope change | External regulatory or Scope clarification | I-003, R3 | Weeks 3–8 (blackout windows pending client confirmation) |
| OEM PO commercial terms variation | Client-driven or Scope clarification | I-002, R1 | Weeks 4–12 (around PO release) |
| Interconnection scope or schedule shift | External regulatory | I-005, R2 | Weeks 2–20 (study completion-dependent) |
| Rural road upgrade scope expansion | External regulatory | I-006, R4 | Weeks 6–24 (DOT engagement-dependent) |
| Camp accommodation scope change | Northwood-driven or Client-driven | I-004, R5 | Weeks 1–6 (build-vs-lease decision-dependent) |
| Geotechnical discovery at turbine positions | Northwood-driven | (no issue yet; WBS 2.1, 5.4 risk channel) | Weeks 10–30 (during foundations) |
| Client-requested turbine layout adjustment | Client-driven | (no issue yet; charter §4 scope channel) | Weeks 4–20 (during detailed design) |
| Performance test procedure variation | Scope clarification | I-019 | Weeks 60–75 (pre-test window) |
| Acceleration scope to preserve energisation buffer | Client-driven or Northwood-driven | I-005, R2 | Any week from mobilisation onward if buffer erodes |

The categorisation is indicative. Actual change orders will be analysed individually using the §1–§10 structure of this framework.

## 2. Scope impact — framework

Every Change Order Analysis Package separates scope impact into three explicit lists, plus an out-of-scope risk-flag discipline.

**Block template:**

- **New scope (in):** itemised list of what the change adds. Each item is a discrete deliverable, not an activity. Cross-referenced to WBS where it modifies an existing work package.
- **Existing scope unchanged:** explicit statement of which charter §4.1 in-scope items are unaffected. The discipline prevents later relitigation of whether the change altered something it did not.
- **Out of scope (explicitly):** itemised list of what is *not* included in this change, particularly where future work has interface implications. Each item is named as out of scope, not assumed silently.
- **Out-of-scope risk flag:** any future scope item that this change order makes more likely (a "Phase 3" or "post-energisation" implication). The flag is a forward-looking note for the PM, not a commitment.

Scope analysis cross-references the WBS (`run08_wbs_mariposa.md`) by branch and package number, and explicitly notes which charter §4.1 or §4.2 items are touched. Charter §4 is authoritative on the scope baseline.

## 3. Schedule impact — framework

Schedule impact is assessed against existing float in the schedule baseline (`run09_schedule_mariposa.md` §3 Chains A–F), not against the original baseline only. A schedule slip in isolation says little; a schedule slip against the binding downstream constraint is the operational measurement.

**Block template:**

- **Critical-path assessment.** Which of Chains A–F the change affects, and whether the change sits on the critical path or in float. Convergence points named (per schedule §3: Chains B+C at first component delivery; Chains B+C+D at first turbine erection ready; Chain E+substation at grid synchronisation).
- **Schedule delta table.** Activity-level, day-by-day impact against the original baseline:

| Activity | Original plan | With CO-NNN | Variance |
|---|---|---|---|
| (per activity) | (date) | (date) | (days) |

- **Net critical-path impact:** statement in days against the relevant chain's end-point.
- **Position against binding constraint.** This is mandatory on Mariposa: every change-order schedule analysis names its position against the **30-day SC-to-energisation buffer**. The buffer is the project's only float against the hard 30 December year+1 federal tax-credit deadline (charter §10 Constraint 1). Every change-order's schedule impact is computed as residual buffer remaining: (original 30 days) − (days consumed by prior change orders) − (days consumed by this change order) = (residual buffer).
- **LDs assessment.** Per charter §7: 0.5%/week capped at 8% ($11.84M). LDs trigger only if SC slips past the contracted SC date. If a change order includes a contractual SC extension, LDs do not trigger against the slip; if it does not, LDs exposure is computed against the slip.

**Threshold for elevated scrutiny.** Any change order eroding the 30-day buffer by more than 5 days requires explicit Sponsor brief per communications plan §4 escalation triggers, regardless of dollar value. Buffer erosion past 15 days requires Client Executive Sponsor briefing per the same plan. Full buffer consumption (i.e., the change pushes energisation to 30 December year+1) is a CFO escalation event.

## 4. Cost impact — framework

Cost impact is decomposed by cost line with a confidence indicator per line, and presented with a pricing position table showing Northwood cost, theoretical price at bid margin, negotiated price, and realised margin.

**Block template — cost decomposition:**

| Cost line | Estimated cost ($k) | Confidence |
|---|---:|---|
| (per cost line — equipment, subcontract variation, Northwood labour, PM overhead, etc.) | — | (Tight / Medium / Wide) |
| **Total estimated cost** | — | |

Confidence bands follow budget §3 convention: Tight is ±5% (firm quote, Northwood self-perform standard scope), Medium is ±10–15% (subcontract variation pending, commodity-exposed), Wide is ±20%+ (sole-source accelerated quote, novel scope).

**Block template — pricing position:**

| Line | Value ($M) |
|---|---:|
| Northwood cost (per decomposition) | — |
| Northwood margin at project bid margin (9.5%) | — |
| Theoretical price at bid margin | — |
| **Negotiated price (with client)** | — |
| Realised margin on CO-NNN | $— ( —%) |
| Realised margin vs project bid margin | ± percentage points |

**Cost-baseline impact statement.** Per change order, state:

- Impact on contract value (charter §7 base $148.0M; running total maintained).
- Impact on approved cost budget (charter §7 base $134.0M; running total maintained).
- Impact on P50 project margin (baseline 9.5%; movement reported in percentage points; floor 5.7% per budget §2).
- Impact on Northwood contingency ($5.5M envelope per charter §7 and budget §4): does the change carry its own commercial structure, or does it draw on contingency?

**Threshold for elevated scrutiny.** Per budget §6.3 and communications plan §4: any single change order with cost impact above $400k requires PM-to-Project-Director escalation; above $1.0M requires Director-to-Sponsor escalation; cumulative change-order cost impact crossing $3.3M (60% of contingency) OR projected margin dropping below 5.7% triggers Sponsor-to-CFO escalation per charter §11.

## 5. Commercial position and recommended pricing — framework

The pricing recommendation lays out four commercial dynamics. The four-frame analysis prevents pricing decisions from being made on margin arithmetic alone — the strategic, relational, and floor-defending dimensions are equally part of the recommendation.

**Block template — four-frame commercial dynamics:**

- *Vendor leverage on Northwood.* Where the change requires upstream procurement (OEM, subcontractor, supplier), state the vendor's commercial position. Sole-source-on-accelerated-cadence situations (the dominant pattern with the turbine OEM per charter §8 R1) leave Northwood with limited cost-recovery options.
- *Client leverage on Northwood.* State the commercial cost to Northwood of refusing the change. On Mariposa, the Phase 2/Phase 3 prospect dimension is relevant — *(at draft stage [NEEDS PM REVIEW: confirm whether Mariposa Renewables Holdings has a Phase 2 or follow-on portfolio prospect with Northwood; this is a known commercial dimension on IPP relationships but not yet confirmed for this client])*. Mid-construction-change refusal carries relational cost on top of any direct margin impact.
- *Client position.* State the client's commercial constraints — capital allocation, financing covenants, tax-credit-deadline pressure (charter §10 Constraint 1 is the dominant constraint on this client). The tax-credit-deadline asymmetry is structural: any change that touches energisation timing has the client *more* exposed than Northwood up to the LDs cap.
- *Northwood acceptance rationale.* State the strategic, relational, or floor-defending reasoning for the recommended commercial position. The reasoning is made explicit, not implicit.

**Block template — rejected alternatives:**

The recommendation states what was chosen *and why other options were not*. The typical four alternatives:

- *Accept at recommended price* (the recommendation).
- *Accept at bid margin.* Why not — typically client commercial ceiling or relational consequence.
- *Absorb at lower margin* (or zero margin). Why not — typically precedent risk or floor-defending position.
- *Reject and decline scope.* Why not — typically opportunity cost, relational cost, or operational difficulty of separating the scope.

The rejected-alternatives discipline is what makes the recommendation auditable. Each rejected alternative is stated with its rationale, not dismissed by omission.

## 6. Risk assessment — framework

Risk assessment lists new risks introduced by the change order and existing charter §8 risks materially changed by it.

**Block template — new risks:**

| New risk | Category | Probability | Impact | Response |
|---|---|---|---|---|
| (per new risk) | (Schedule / Cost / Technical / Commercial / Regulatory / Safety / Quality / Stakeholder) | (L/M/H) | (L/M/H) | (Avoid / Transfer / Mitigate / Accept with specific action) |

**Block template — existing risks materially changed:**

| Charter §8 risk | Direction of change | Rationale |
|---|---|---|
| R1 — Single-OEM turbine supply | (worsened / unchanged / improved) | (one-sentence rationale) |
| R2 — Federal tax-credit deadline | (worsened / unchanged / improved) | (one-sentence rationale) |
| R3 — Migratory bird flyway blackouts | (worsened / unchanged / improved) | (one-sentence rationale) |
| R4 — Rural-road upgrades (two counties) | (worsened / unchanged / improved) | (one-sentence rationale) |
| R5 — Rural labour market / camp | (worsened / unchanged / improved) | (one-sentence rationale) |

**Net risk position.** One-paragraph statement of whether net risk increase is within standard envelope or requires contingency reallocation. Contingency reallocation reasoning maps to the budget §4 allocations against R1–R5 plus unallocated reserve.

## 7. Recommendation — framework

The recommendation is one of four standard outcomes:

- **ACCEPT** — accept the change at the recommended price with no conditions beyond standard contract administration.
- **ACCEPT-WITH-CONDITIONS** — accept subject to specific operational conditions listed in §8. This is the most common outcome on commercially material changes.
- **ACCEPT-AT-MODIFIED-PRICE** — accept the scope but at a price different from the originator's request, with the modified-price rationale stated.
- **REJECT** — decline the change. Rejection is rare and reserved for changes that breach contract, exceed Northwood authority, or carry unacceptable risk relative to margin.

**Authority level statement.** Per charter §11: PM up to $100k, Director up to $1M, Sponsor above $1M. The recommendation states which authority level the change requires. Additionally per charter §11, client approval is required for any scope change affecting energisation date or permitted construction methods — this is a parallel client-side requirement, not a substitute for Northwood internal authorisation.

**Decision timeline statement.** Recommended dates for Northwood internal sign-off and client signature, calibrated against the change's operational urgency (e.g., an OEM-related change with a vendor PO deadline carries a tighter timeline than a punch-list scope clarification).

## 8. Approval routing and conditions — framework

Conditions on acceptance are explicit and operationally specific. Vague conditions ("subject to commercial agreement") fail to protect Northwood's position; specific conditions are commitments the client signs against.

**Typical condition categories (4–8 conditions per change order):**

- **Contract amendment language.** Specific clauses the amendment must include — SC date adjustment, scope-boundary language, warranty start adjustment.
- **Schedule extension provisions.** If the change extends SC, the conditions specify the new SC date and confirm LDs run from the new date, not the original.
- **Downstream warranty starts.** Where the change adds equipment, conditions specify whether warranty runs from change-order commissioning or from project Substantial Completion.
- **Scope boundary clarifications.** Explicit out-of-scope statements to prevent future relitigation.
- **Audit-trail requirements.** Documentation requirements for the change — typically the amendment is standalone, not absorbed into the base contract, to preserve audit trail of margin compression or scope movement on the specific scope.
- **Operational preconditions.** Vendor PO release windows, subcontractor mobilisation, regulatory submissions that gate the change-order execution.
- **Energisation-buffer impact acknowledgement.** Where the change touches Chain F or the 30-day SC-to-energisation buffer, the conditions state explicit acknowledgement of the new buffer position. This is Mariposa-specific.
- **Regulatory acknowledgement.** Where the change touches permit conditions or interconnection terms, the conditions state explicit acknowledgement from the relevant regulator (assigned wildlife officer per stakeholder register row 10; utility coordinator per row 9).

**Approval routing chain per charter §11:**

- PM (J. Okafor) → recommendation
- Commercial Manager → confirms pricing and commercial terms *(at draft stage [NEEDS PM REVIEW: Commercial Manager assignment per I-011])*
- Project Director (L. Chen) → endorses commercial position; authority up to $1M
- Sponsor (VP Renewables) → authorises above $1M; mandatory on any change touching energisation date or permitted construction methods regardless of dollar value
- CFO → escalation per charter §11 *(at draft stage [NEEDS PM REVIEW: CFO escalation trigger threshold for this contract size; charter §11 flagged for confirmation; CFO name unnamed in charter §12 per I-015])*
- Client Lead → primary client signature *(at draft stage [NEEDS PM REVIEW: Client Lead name per I-001])*
- Client Executive Sponsor → escalation client-side on material commercial or schedule events per communications plan §3.1

**Reporting routing post-signature:**

- Status Reporter: each signed change order disclosed at next monthly client status and monthly portfolio dashboard per communications plan §5.
- Issue Logger: any open items arising from change-order negotiation or execution logged with Linked-change-order field set to CO-NNN per issue log §6.
- Variance Analyst: change order incorporated into cost baseline from the period of signature; variance reports thereafter use revised contract value and revised approved cost budget per variance §10.
- Risk Analyst: risk register updated to reflect new risks per §6 and any materially-changed existing risks; update should occur in the same reporting cycle as the variance update.

## 9. Conventions used

Five patterns this framework follows, for traceability against the Northwood worked-example convention:

1. **Driver classification first.** Every change-order analysis opens with a Driver classification — Client-driven, Northwood-driven, External regulatory, Scope clarification. The classification frames every downstream judgment (pricing position, schedule absorption, risk allocation). Driver-classification ambiguity is the most common failure mode this discipline prevents. Anticipated change-order categories at Week 0 are pre-classified against the four drivers in §1.2 so that the pattern is recognised when the first change order arrives.
2. **Schedule impact assessed against existing float, not against original baseline only.** A day count in isolation says little; what matters is the position against the binding downstream constraint. On Mariposa the binding constraint is the 30-day SC-to-energisation buffer against the 30 December year+1 federal tax-credit deadline. Every change-order schedule analysis names this constraint and computes residual buffer explicitly. The buffer is the project's only float and the single most-watched figure per communications plan §8.
3. **Pricing rationale lays out the four commercial dynamics.** Vendor leverage on Northwood, client leverage on Northwood, client position, Northwood acceptance rationale. The four-frame analysis prevents pricing decisions from being made on margin arithmetic alone — the strategic, relational, and floor-defending dimensions are equally part of the recommendation.
4. **Recommendation supported by rejected alternatives.** The recommendation states what was chosen *and why other options were not*. Four standard alternatives (accept at recommended price, accept at bid margin, absorb at lower margin, reject) with rationale on each rejection. This is the discipline that makes the recommendation auditable.
5. **Conditions on acceptance are explicit and operationally specific.** Typically 4–8 conditions per change order, each with the operational language a contract amendment would adopt. Mariposa-specific condition categories include the energisation-buffer impact acknowledgement (any Chain F-touching change) and regulatory acknowledgement (any change touching wildlife permit or utility interconnection terms).

## 10. Notes for downstream agents

- **Status Reporter.** No change orders at Week 0 to disclose. From the first signed change order onward, each is disclosed at headline level in the next monthly client status report (revised SC date if applicable, revised contract value, revised energisation buffer) and at full level in the next monthly portfolio dashboard (cost impact, margin impact, contingency consumption, buffer position). The energisation-buffer position update is mandatory in every status report after any change order touching Chain F is signed. Branch 3.0 (Turbine OEM) related change orders carry mandatory commentary regardless of dollar value, given the branch's 50% cost concentration per budget §3.
- **Issue Logger.** Each signed change order is expected to open between 2 and 8 new issues for tracking (contract amendment signature status, subcontractor or vendor PO release status, regulatory acknowledgement status, operational precondition closure). Each new issue carries a Linked-change-order field set to the change-order ID. Conversely, the five H-severity Week 0 issues (I-001 through I-005) are the most likely change-order precursors per §1.2; I-003 and I-005 are the candidates most likely to produce client-acknowledged change orders on this project per issue log §8.
- **Variance Analyst.** Per variance §10 cross-reference: change orders update the cost baseline from the period of signature. The variance framework distinguishes change-order-driven baseline movement (expected, baselined into the new total) from execution variance against the revised post-change-order baseline. Margin tracking continues against the running post-change-order target (baseline 9.5%, floor 5.7%). Cumulative change-order cost impact is a separate variance dimension tracked alongside branch-level variance; the threshold for Sponsor escalation is cumulative impact crossing $3.3M (60% of contingency) per variance §8.
- **Risk Analyst.** Each change order's §6 new risks are added to the risk register with a Linked-change-order field. Existing charter §8 R1–R5 status changes flowing from change orders are recorded in the risk register's status field with cross-reference to the change-order ID. Anticipated change-order categories at Week 0 (§1.2) map predominantly to R1 (OEM-related), R2 (interconnection / acceleration), R3 (blackout windows), R4 (rural roads), R5 (camp) — the same charter §8 risks that drive the contingency allocation in budget §4, which is consistent and intentional.
- **Lessons-Learned Synthesiser.** At project close, the change-order log feeds the lessons-learned write-up. Three themes are pre-flagged for likely surfacing on Mariposa based on the Week 0 risk profile: (a) single-OEM concentration creates vendor-leverage commercial dynamics on accelerated change orders, predictably eroding margin (the Riverside CO-003 worked-example pattern, expected to recur on any turbine-related change order); (b) tax-credit-deadline projects compress the commercial-acceptance window on any change order touching energisation, reducing Northwood's leverage to negotiate price; (c) regulatory-driven changes (wildlife agency, utility, county DOTs) are typically non-negotiable in scope but variable in commercial-recovery channel depending on contract risk allocation, and Mariposa's contract risk allocation on these dimensions is *(at draft stage [NEEDS PM REVIEW: confirm contract risk-allocation language on regulatory-shift events; this is material to change-order recovery pathways and is not yet confirmed against the signed contract])*.
