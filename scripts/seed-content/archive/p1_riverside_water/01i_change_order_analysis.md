# Change Order Analysis — Riverside Water Reclamation Phase 2 Expansion (CO-003: UV Disinfection Scope Addition, Week 35)

> **Note on this document's role as a worked example.** This is a Change Order Analysis Package for Riverside Water at Week 35 of the 92-week project — the formal analysis prepared by the Northwood PM and Commercial Manager when the City of Riverside requested addition of UV disinfection capacity in Q2 of construction. The package is the artefact used to obtain Director and Sponsor authorisation for the negotiated commercial position, and it is the format that subsequent change orders on the project followed. When the Change Order Reviewer agent uses this as a worked example for a new project, two adaptations apply. First, at a Week 0 baseline state, the agent produces the change-order-analysis *framework* (template, conventions, anticipated categories) rather than an analysis of a specific change — there are no change orders at Week 0 to analyse. Second, items shown with inline italic annotations — margin assumptions sensitive to final vendor quote, schedule-impact estimates dependent on subcontractor commitment, risk-introduction items that depend on detailed engineering — would carry `[NEEDS PM REVIEW]` flags at draft stage. The Week 35 state shown reflects what the Riverside PM committed at the point of formal change-order analysis.

## 1. Change context

- **Change order ID:** CO-003 (third change order on the project; CO-001 and CO-002 were minor scope clarifications closed in Weeks 12 and 24)
- **Project:** Riverside Water Reclamation Phase 2 Expansion (NW-WW-2103)
- **Client originator:** D. Hoffmann (Client PM), with E. Marsh (Public Works Director) sponsorship on the client side
- **Request date:** Week 32 (verbal indication at Public Works Director briefing); formal written request Week 34
- **Driver classification:** **Client-driven** — change originates from the client's regulatory and operational priorities, not from Northwood execution or external pressure
- **Driver detail:** State regulator signalled forthcoming tightening of pathogen-discharge standards 18 months out, ahead of original assumption. Client wants UV disinfection installed in this expansion rather than as a separate retrofit later, capturing the construction mobilisation already on site
- **Analysis date:** Week 35
- **Northwood PM:** M. Acharya
- **Commercial Manager:** D. Reeves

## 2. Scope impact

**New scope (in):**
- UV reactor train sized for 30 MGD peak flow with redundant module configuration
- Channel modification downstream of tertiary filters to fit UV reactor in series
- UV power supply and controls integrated with existing plant SCADA
- 12-month spare-lamp inventory
- Operator training on UV system operations
- Commissioning and performance testing as part of the existing performance test sequence (extended by ~4 weeks)

**Existing scope unchanged:**
- 30 MGD biological treatment capacity (Phase 2 baseline)
- TN/TP biological compliance per charter Objective 2
- Tertiary filtration retrofit (UV sits downstream)

**Out of scope (explicitly):**
- Replacement UV lamps beyond the 12-month inventory (client's O&M responsibility post-warranty)
- Standby disinfection (chlorine contact chamber not part of UV scope)
- Effluent monitoring beyond UV transmittance (existing plant CEMS sufficient)

**Out-of-scope risk flag:** Client has separately discussed disinfection redundancy (chlorine standby) as a potential future Phase 3 addition. Northwood should document the UV-only architecture in the as-built handover so that future redundancy work has clear interface boundaries. *(at draft stage [NEEDS PM REVIEW: confirm with client whether disinfection redundancy is a CO-003 conditions item or deferred to Phase 3])*

## 3. Schedule impact

**Critical-path assessment.** The UV system installation sits downstream of tertiary filtration and upstream of the performance test. Filtration is on the existing critical path (Chain C civil/mechanical → Chain D commissioning); UV insertion adds a new sub-chain between filtration completion and performance test commencement.

**Schedule delta:**

| Activity | Original plan | With CO-003 | Variance |
|---|---|---|---|
| Tertiary filtration mechanical complete | Week 78 | Week 78 | 0 |
| UV reactor channel construction | (n/a) | Weeks 76–82 (parallel with filtration tail) | +0 days (parallel, no critical-path impact) |
| UV reactor installation | (n/a) | Weeks 82–86 | +0 days (in float between filtration complete and performance test start) |
| UV commissioning | (n/a) | Weeks 86–88 | +0 days (within float) |
| Performance test commenced | Week 86 | Week 88 | +14 days |
| Performance test complete (30-day continuous) | Week 90 | Week 92 | +14 days |
| Substantial Completion | Week 92 (= 30 January year+2) | Week 94 (= 13 February year+2) | **+14 days** |

**Net critical-path impact:** +14 days (2 weeks). The 58-day float between original SC (30 January year+2) and the state-mandated effluent standard effective date (30 March year+2) absorbs the 14-day slip. Revised float to regulatory deadline: 44 days. Still positive but the buffer is now tighter.

**LDs assessment.** The contract LDs (0.4%/week capped at 8%, $3.36M) apply to slip past contract SC. CO-003 includes a contractual extension to SC by 2 weeks; LDs do not trigger. *(at draft stage [NEEDS PM REVIEW: confirm SC extension is part of CO-003 commercial terms; client signature on this provision is the precondition for the schedule analysis above])*

## 4. Cost impact

**Cost decomposition (Northwood):**

| Cost line | Estimated cost ($k) | Confidence |
|---|---:|---|
| UV reactor equipment (sole-source vendor, accelerated quote) | 720 | Tight — quote received Week 34 |
| Channel civil modification (downstream of filtration) | 180 | Medium — subcontractor T&M variation per WBS 4.6 |
| UV power supply and controls (electrical subcontract variation) | 140 | Medium — electrical subcontractor scope addition |
| SCADA integration | 80 | Tight — Northwood self-perform |
| Commissioning and performance test extension (2 weeks crew presence) | 100 | Medium — labour and equipment |
| Operator training | 40 | Tight — standard Northwood scope |
| Project management overhead (2 weeks PM/CM extended) | 90 | Tight — Northwood standard rate |
| **Total estimated cost** | **1,350** | |

**Pricing position:**

| Line | Value ($M) |
|---|---:|
| Northwood cost (per above) | 1.35 |
| Northwood margin (at project bid margin 8.5%) | 0.13 |
| Theoretical price at bid margin | 1.48 |
| **Negotiated price (with client)** | **1.45** |
| Realised margin on CO-003 | $0.10M (6.7%) |
| Realised margin vs project bid margin | −1.8 percentage points |

**Pricing rationale.** The negotiated $1.45M reflects four commercial dynamics:

- *Vendor leverage on Northwood.* UV equipment is sole-source from one vendor with the lead time the client wants; competitive procurement is not viable within the schedule envelope. Vendor cost is firm.
- *Client leverage on Northwood.* Mid-construction change orders are commercially difficult to refuse — Northwood's existing mobilisation and the relationship implication of refusal would cost more than the margin compression on this scope.
- *Client position.* Client signalled an upper price tolerance around $1.45M based on internal capital allocation; above this would have required council approval and substantial delay.
- *Northwood acceptance.* Director and PM judged the 6.7% margin acceptable on this scope given (a) the scope is in Northwood's strength area, (b) the relationship value to Phase 3 prospect exceeds the marginal opportunity cost, (c) the schedule absorption inside existing float preserves LDs and base-contract performance.

**Cost-baseline impact:** CO-003 adds $1.45M to contract value (from $42.0M to $43.45M) and $1.35M to approved cost budget. Project P50 margin moves from 8.5% to **8.4%** — minor reduction. *(at draft stage [NEEDS PM REVIEW: P50 margin shift confirmed against final cost projections at Week 35; updated at signature])*

**Contingency impact:** Original Northwood contingency $1.8M (charter §7) is unaffected by CO-003 — the change carries its own commercial structure. However, the 14-day schedule slip absorbs 14 days of float against the state-mandated deadline (58 → 44 days), tightening the implicit schedule contingency on the project tail. Variance reports from Week 36 onward will track schedule contingency separately.

## 5. Commercial position and recommended pricing

**Recommendation: ACCEPT at $1.45M with the conditions listed in §8.**

The recommendation reflects three judgments:

*Margin acceptable.* 6.7% is below project bid margin (8.5%) but above the 5% floor that triggers Sponsor concern. Northwood has accepted comparable margin compression on other water projects where the strategic value justified it.

*Schedule fits.* 14-day slip inside the 58-day float to regulatory deadline; revised 44-day buffer remains positive. LDs not triggered. Base-contract performance preserved.

*Relationship value substantial.* Phase 3 prospect is referenced in client communications and has been confirmed verbally by E. Marsh as Northwood's to lose. CO-003 acceptance on the negotiated terms strengthens the Phase 3 commercial position.

**Recommendation rejected alternatives:**

- *Reject and decline scope.* Would forfeit the work, the margin opportunity (small but positive), and likely the Phase 3 prospect. Rejected.
- *Accept at bid margin (price $1.48M).* Client signal was $1.45M ceiling; price above this risks delay through council referral or outright rejection by client. Rejected as commercially unrealistic.
- *Accept and absorb at lower margin (e.g., $1.35M = zero margin).* Sets a precedent for future change orders on this and other client engagements; signals weak commercial position. Rejected.

## 6. Risk assessment

**New risks introduced by CO-003:**

| New risk | Category | Probability | Impact | Response |
|---|---|---|---|---|
| UV vendor lead time slips past Week 80 | Schedule | L | H | Mitigate — vendor PO at change-order signature, expediter assigned per WBS analogue 3.11 |
| UV transmittance lower than design assumption at site (treated effluent variability) | Technical | L | M | Accept — design margin on reactor sizing; commissioning includes site-specific transmittance test |
| Sub-grade conditions at UV channel location require additional civil work | Cost / Schedule | L | M | Accept — T&M variation channel exists per WBS 4.6 for sub-grade discoveries; budget for $50k within the $180k civil modification estimate |

**Existing risks materially changed by CO-003:**

| Existing risk | Direction of change | Rationale |
|---|---|---|
| R3 — Process tie-ins exceed permitted plant shutdown windows | Slightly worsened | UV integration adds one tie-in to existing plant SCADA; mitigation extended to include UV start-up coordination |
| R4 — Effluent performance test fails on TN limit | No change | UV scope addresses pathogens, not nutrients; TN compliance pathway unaffected |

**Net risk position:** Three new low-probability risks added, two with H or M impact; one existing risk slightly worsened. Northwood's view: net risk increase is small and within standard project-extension envelope; no contingency reallocation needed at signature.

## 7. Recommendation

**ACCEPT at $1.45M** subject to the conditions in §8.

Signature authority per charter §11: Director ($500k limit applies to internal-only changes; client-driven change orders above $500k require Sponsor authorisation; CO-003 at $1.45M revenue / $1.35M cost is client-driven and exceeds the Director threshold). **Sponsor authorisation required.**

Recommended decision timeline: Sponsor brief and signature within Week 36; client signature within Week 37; UV vendor PO release Week 37; UV reactor delivery target Week 80.

## 8. Approval routing and conditions

**Conditions on CO-003 acceptance:**

1. Contract amendment extends Substantial Completion to 14 February year+2 (= original 30 January + 14 days).
2. LDs from extended SC date, not original.
3. UV vendor PO released within 7 days of CO-003 signature, with vendor delivery guarantee against Week 80 target.
4. CO-003 commercial terms documented in standalone amendment, not absorbed into base contract — preserves audit trail of margin compression on this specific scope.
5. Operator training scope explicitly limited to UV system operations; broader operator training on the Phase 2 facility is base-contract scope.
6. Spare lamp inventory transfers to client at Substantial Completion; warranty period for UV equipment runs from UV commissioning complete (Week 88), not from Substantial Completion.

**Approval routing:**

- PM (M. Acharya) → recommends ACCEPT — Week 35.
- Commercial Manager (D. Reeves) → confirms pricing and commercial terms — Week 35.
- Project Director (R. Tannehill) → endorses commercial position — Week 35.
- Sponsor (VP Water & Wastewater) → authorises acceptance — Week 36.
- CFO → notification only (below $1M cost variance threshold for CFO escalation per charter §11).
- Client signature → Week 37.

**Reporting routing post-signature:**

- Status Reporter: CO-003 disclosed at next monthly client status and monthly portfolio dashboard per communications plan §5.
- Issue Logger: any open items arising from CO-003 negotiation (vendor PO release timing, contract amendment language) logged with linkage back to this change order ID.
- Variance Analyst: CO-003 incorporated into cost baseline from Week 37; variance reports thereafter use the revised $43.45M contract value and $35.75M revised approved cost budget.
- Risk Analyst: risk register updated to include three new CO-003 risks (per §6) and the materially-changed R3 status.

## 9. Conventions used

Five patterns this document follows, for traceability against the Northwood worked-example convention:

1. **Driver classification first.** Every change order analysis opens with a Driver classification — Client-driven, Northwood-driven, External regulatory, Scope clarification. The classification frames every downstream judgment (pricing position, schedule absorption, risk allocation). Driver-classification ambiguity is the most common failure mode this discipline prevents.
2. **Schedule impact assessed against existing float, not against original baseline only.** A 14-day slip means little in isolation; what matters is the position against the binding downstream constraint (here: the state-mandated effluent standard 58 days after original SC). Schedule analysis names the binding constraint and computes the residual buffer explicitly.
3. **Pricing rationale lays out the four commercial dynamics.** Vendor leverage on Northwood, client leverage on Northwood, client position, Northwood acceptance rationale. The four-frame analysis prevents pricing decisions from being made on margin arithmetic alone — the strategic, relational, and floor-defending dimensions are equally part of the recommendation.
4. **Recommendation supported by rejected alternatives.** The recommendation states what was chosen and *why other options were not*. This is the discipline that makes the recommendation auditable.
5. **Conditions on acceptance are explicit and operationally specific.** Six conditions on CO-003, each with the operational language a contract amendment would adopt. Vague conditions ("subject to commercial agreement") fail to protect Northwood's position; specific conditions are commitments the client signs against.

## 10. Notes for downstream agents

- **Status Reporter.** CO-003 acceptance becomes a Week 36 portfolio dashboard and monthly client status item. The monthly client status discloses CO-003 at headline level with revised SC date and revised contract value; the portfolio dashboard discloses CO-003 cost, margin impact, and the 44-day buffer to regulatory deadline (down from 58). Subsequent status reports track CO-003 execution progress as a discrete deliverable until UV commissioning complete.
- **Issue Logger.** CO-003 opens up to five new issues for tracking: vendor PO release status, contract amendment signature status, UV channel civil sub-grade survey status, operator training schedule alignment, spare-lamp inventory procurement. Each carries a Linked-change-order field set to CO-003.
- **Variance Analyst.** CO-003 cost ($1.35M) and revenue ($1.45M) enter the variance baseline from Week 37. The variance framework distinguishes CO-003-driven cost movement (expected, baselined into the new total) from execution variance against the revised CO-003 baseline. Margin tracking continues against the post-CO-003 8.4% target.
- **Risk Analyst.** Risk register updates required: add three new CO-003 risks (UV vendor lead time, UV transmittance variability, sub-grade conditions at UV channel); update R3 status reflecting the new tie-in within the existing plant-shutdown coordination. Risk register update should happen within Week 37 to maintain consistency with the variance baseline and issue log.
- **Lessons-Learned Synthesiser.** CO-003 is the canonical worked example of a mid-construction client-driven scope addition at a thin margin. The closeout lessons-learned write-up should reference CO-003 specifically for three patterns: (a) regulatory anticipation by clients can drive mid-construction scope changes that are difficult to refuse; (b) sole-source vendor leverage on accelerated change orders erodes margin in a predictable way; (c) strategic value of the Phase 3 prospect can be a legitimate commercial input into change-order pricing decisions, but must be made explicit not implicit.
