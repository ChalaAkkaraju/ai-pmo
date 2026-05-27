# Project Issue Log — Ironvale Smelter Modernisation

> **Note on this document's role as a worked example.** This is the COMMITTED Project Issue Log for Ironvale Smelter Modernisation, presented in its closeout state — every issue tracked from project initiation through Mechanical Completion, with the disposition of each recorded. When the Issue Logger agent uses this as a worked example for a new project, items shown as `Closed` with a resolution narrative reflect what was logged and resolved during execution; a new project's Week 0 baseline log would carry only the open items derivable from the approved Charter and upstream Planning artefacts (the WBS, Schedule, Budget, Stakeholder Register, Communications Plan) — items already flagged for follow-up rather than issues yet to materialise. The closeout-state log shown here demonstrates the discipline of issue capture, categorisation, linkage, and resolution that the agent should imitate.

## 1. Project context

- **Project:** Ironvale Smelter Modernisation (NW-IND-2110)
- **Client:** Ironvale Metals Group
- **Contract:** T&M with $30M cap; working value $26.5M
- **Duration:** 11 months Award (14 August) → Mechanical Completion (30 June year+1)
- **Northwood PM:** P. Beaumont
- **Issue log baseline date:** Week 0 (initial seed from charter open items); maintained through Mechanical Completion
- **Issue log state shown:** Closeout (post-Mechanical Completion, all issues either resolved or transferred to warranty)

## 2. Issue log

The log below is the running register of operational issues. An "issue" is something that has happened or has become an open item requiring follow-up action — distinct from a "risk" (something that may happen but has not yet). The risk register (`04_risk_register.md`) holds risks; this log holds issues. When a risk materialises, it transitions to an issue here, with a cross-reference back to its risk identifier.

| ID | Opened | Description | Category | Severity | Owner | Status | Linked WBS | Linked risk | Closed |
|---|---|---|---|---|---|---|---|---|---|
| I-001 | Week 0 | Existing-conditions documentation accuracy verification — confirm client's digitised plant records against field walkdown | Technical | M | Engineering Lead | Closed | 2.1 | (Charter Assumption 1) | Week 3 — records confirmed accurate; one ambiguity resolved by field measurement |
| I-002 | Week 0 | Furnace OEM delivery lead time at PO acceptance — confirm against bid assumption | Schedule | M | Procurement Lead | Closed | 3.1 | R4 (charter §8) | Week 4 — vendor confirmed 14 weeks ex-works on PO acceptance, slightly better than bid |
| I-003 | Week 0 | Subcontractor selection for mechanical, electrical, I&C packages | Commercial | M | PM | Closed | 3.8 | — | Week 14 — all three subcontracts awarded |
| I-004 | Week 0 | Lead Controls Engineer assignment for SCADA architecture (WBS 2.5) | Stakeholder | L | PM | Closed | 2.5 | — | Week 2 — assigned |
| I-005 | Week 2 | Asbestos and lead-paint survey scope clarification with client | Quality / Regulatory | M | QA/QC Lead | Closed | 4.3 | — | Week 5 — survey completed; abatement contractor scope agreed |
| I-006 | Week 3 | Client Line C SCADA documentation access — required for integration design | Technical / Stakeholder | M | Lead Controls Engineer | Closed | 7.4 | R3 (charter §8) | Week 5 — client provided access; documentation completeness sufficient for integration design |
| I-007 | Week 8 | State regulator engineer assignment pending permit issuance | Regulatory | L | PM with QA/QC support | Closed | 2.10 | — | Week 12 — officer assigned at permit issuance; first monthly compliance call Week 13 |
| I-008 | Week 16 | **Latent defect 1: undocumented hot-metal transfer piping discovered behind Furnace Line A refractory during demolition** | Technical / Commercial | H | PM with Construction Manager | Closed | 4.6 | R1 materialised | Week 18 — engineering decision to bypass and re-route; T&M variation request approved by client at agreed cost-share; net cost impact $180k of which client cost-share $130k |
| I-009 | Week 17 | Refractory dry-out procedure clarification — OEM-specified procedure differs from Northwood standard | Technical | L | Engineering Lead with OEM | Closed | 9.3 | — | Week 18 — OEM-specified procedure adopted; dry-out scheduled for Week 41 |
| I-010 | Week 19 | **Latent defect 2: foundation settlement anomaly in Furnace Line B footprint** | Technical / Schedule | H | PM with Construction Manager | Closed | 4.6 | R1 materialised | Week 22 — geotechnical investigation; remedial piling required; T&M variation request approved by client at agreed cost-share; net cost impact $245k of which client cost-share $180k; 2-week schedule impact absorbed within float |
| I-011 | Week 24 | Plant Superintendent shutdown window confirmation — final 7-day window timing | Stakeholder | M | Construction Manager | Closed | 8.3 | R2 (charter §8) | Week 26 — window confirmed 15-22 June year+1; client production plan locked |
| I-012 | Week 28 | Permitting authority dust control conditions clarification — interpretation of Rule 27 dust limits during demolition | Regulatory | M | QA/QC Lead | Closed | 4.3, 6.1 | — | Week 30 — written interpretation received; dust suppression measures specified |
| I-013 | Week 32 | State regulator inspector availability for performance test — booking window | Schedule / Regulatory | M | PM | Closed | 9.6 | — | Week 36 — inspector booked for Week 47; pre-test procedure agreement initiated |
| I-014 | Week 35 | Operator training schedule alignment with client shift patterns | Stakeholder | L | Construction Manager with Client Plant Engineer | Closed | 9.7 | — | Week 38 — training scheduled across three shifts; client backfill arranged |
| I-015 | Week 41 | Refractory dry-out — minor temperature deviation in early hours of dry-out cycle on Furnace Line A | Technical | L | Construction Manager with OEM | Closed | 9.3 | — | Week 41 — corrected within OEM tolerance; no impact on commissioning schedule |
| I-016 | Week 43 | Hot commissioning Furnace Line A — first-heat off-gas temperature higher than design by 8% | Technical | M | Engineering Lead with OEM | Closed | 9.3 | — | Week 44 — OEM root cause: refractory geometry on hooding; field modification completed; off-gas within tolerance |
| I-017 | Week 45 | SCADA-Line-C integration intermittent data dropout during commissioning | Technical | M | Lead Controls Engineer | Closed | 7.4 | R3 materialised | Week 46 — network configuration issue at gateway; client IT and Northwood Controls jointly resolved; integration stable for tie-in week |
| I-018 | Week 47 | Tie-in week execution — minor schedule pressure on Day 5 (electrical connection sequence delay) | Schedule | L | Construction Manager | Closed | 8.4 | — | Week 47 — recovered through overtime; Day 7 tie-in completed on schedule |
| I-019 | Week 48 | Performance test Day 3 — production rate variance against target | Technical | M | Engineering Lead with OEM | Closed | 9.4 | — | Week 48 — variance traced to feed-rate calibration; corrected; test continued without restart |
| I-020 | Week 49 | Punch list — 14 items at Mechanical Completion | Quality | L | Construction Manager | Closed | 9.8 | — | Week 51 — all items closed within 14 days of MC |
| I-021 | Week 50 | Spare parts list completeness — three items deferred from initial vendor scope | Commercial | L | Procurement Lead | Closed | 10.2 | — | Week 51 — items added to handover dossier; warranty cover extended |
| I-022 | Week 51 | As-built documentation site concurrence — two as-built drawings flagged for site verification | Quality | L | Engineering Lead | Closed | 10.2 | — | Week 52 — verification complete; documentation handover finalised |

The log contains 22 issues across 52 weeks of project execution. Open at peak: 4 issues simultaneously (Weeks 16-19, during the latent-defect phase). The two High-severity issues (I-008, I-010) were both materialisations of charter risk R1 (latent defects in 35-year-old facility) and were resolved through the T&M variation mechanism per charter §11 governance.

## 3. Issue dictionary — significant issues

Dictionary entries are provided here for the issues that materially affected commercial outcome, schedule, or required formal escalation. Trivial issues (L-severity, single-team resolution) are tracked in the log without dictionary entries.

**I-008 — Latent defect 1: undocumented hot-metal transfer piping (Week 16).** *Discovery context:* During Furnace Line A refractory demolition, an undocumented hot-metal transfer pipe was found embedded behind the refractory wall. The pipe served a historical casting bay that had been decommissioned twenty years earlier but never removed. *Engineering response:* Northwood engineering team reviewed pipe routing against existing drawings; pipe was confirmed not in current service but presented a demolition-method risk if breached during removal. Decision: bypass-and-reroute removal sequence approved; specialist demolition contractor brought in for safe extraction. *Commercial resolution:* T&M variation request submitted to client per WBS 4.6 procedure; cost-share threshold per contract Schedule 3 invoked; client cost-share $130k of $180k total. *Lesson learned:* Even with client's digitised records (Charter Assumption 1), 35-year-old industrial facilities carry undocumented infrastructure; future Northwood industrial-refurbishment proposals will price latent-defect contingency at 2-3% of contract value above standard, distinct from general contingency.

**I-010 — Latent defect 2: foundation settlement anomaly (Week 19).** *Discovery context:* During preparation of Furnace Line B footprint after demolition, geotechnical settlement readings indicated soil bearing capacity below the original design assumption in the south-west quadrant of the footprint. *Engineering response:* Soil investigation extended; remedial piling specified to support the new furnace foundation; engineering rework on Furnace Line B foundation design (WBS 2.7) completed in 8 working days. *Schedule resolution:* 2-week impact on Line B foundation completion absorbed within the schedule float that the parallel work on Line A and ancillaries provided. *Commercial resolution:* T&M variation request submitted; client cost-share $180k of $245k total. *Lesson learned:* For brownfield industrial sites, geotechnical investigation depth and grid density should exceed greenfield standards; updated Northwood standard for industrial brownfield projects now specifies 1.5× standard geotechnical scope.

**I-006 — Client Line C SCADA documentation access (Week 3).** *Discovery context:* Lead Controls Engineer (WBS 2.5 owner) required documentation of the existing Line C SCADA system to design the data-sharing integration for the new SCADA per WBS 7.4. Initial client response indicated documentation might be incomplete for a system originally installed by a defunct integrator. *Resolution:* Joint Northwood-client investigation surfaced a backup documentation set held by the client's IT group that was sufficient for the integration design. *Lesson learned:* For projects integrating with legacy client systems, documentation availability should be confirmed at proposal stage, not at Week 3 of execution; updated proposal-stage diligence checklist now includes legacy-system documentation availability.

**I-017 — SCADA-Line-C integration intermittent dropout (Week 45).** *Discovery context:* During commissioning of the SCADA integration, intermittent data dropouts between new and existing SCADA were observed under specific load conditions. *Resolution:* Joint Northwood Controls and client IT troubleshooting identified a gateway configuration mismatch; reconfiguration resolved the dropout. *Linkage:* Risk R3 (SCADA integration with Line C — highest-risk integration point per WBS 7.4) materialised here; the standing mitigation (no operational control coupling; data-sharing only) limited the operational impact. *Lesson learned:* Integration testing protocols should include load-varied scenarios from the earliest test phase, not only steady-state verification.

## 4. Issue categorisation conventions

Eight categories are used. Each issue belongs to exactly one primary category; secondary categorisation is permitted via slash notation (e.g., "Technical / Commercial" for the latent defects, which were both technical discoveries and commercial events).

- **Technical** — engineering, design, or technology issues.
- **Schedule** — issues affecting milestone dates, sequence, or float.
- **Cost** — issues affecting budget, cost-to-complete, or contingency consumption (distinct from Commercial — Cost issues are internal to Northwood; Commercial issues touch the contract).
- **Commercial** — issues affecting the contract — change orders, variations, claims, payment timing.
- **Regulatory** — issues with regulators, permits, compliance — federal, state, local.
- **Safety** — issues affecting site safety, OSHA reporting, near-misses, lost-time events.
- **Quality** — issues affecting quality of delivered work, ITP failures, non-conformances, punch items.
- **Stakeholder** — issues with people: assignments pending, client interface friction, subcontractor performance below expectation.

Severity is graded L/M/H per Northwood standard. H-severity issues require immediate PM-Director escalation (per Communications Plan §4); M-severity issues are tracked weekly in the internal status meeting; L-severity issues are owner-resolved without escalation.

## 5. Lifecycle states

Issues progress through four states. Transitions are explicit and logged.

- **Open** — issue identified, owner assigned, no resolution path defined yet.
- **In progress** — owner is actively working on resolution; resolution path defined.
- **Resolved** — corrective action complete; awaiting verification.
- **Closed** — resolution verified; issue removed from active register but remains in log for audit.

Issues remain in the log permanently — closure does not delete. The log is append-only with state transitions; this is the discipline that makes the log auditable at closeout and useful as a lessons-learned input.

## 6. Linkage to other registers

The issue log cross-references three other project artefacts:

- **Risk register (`04_risk_register.md`).** When a risk materialises, it transitions to an issue in this log with the risk identifier in the Linked-risk column. Reverse-direction: when an issue surfaces a previously-unidentified risk, the risk register is updated with a back-reference to the issue. R1 and R3 both materialised on Ironvale; the linkages above show how.
- **Work Breakdown Structure (`01c_wbs.md`).** Every issue links to a WBS work package via the Linked-WBS column. This is the audit trail from issue to scope — useful for cost-allocation, for variance analysis, and for closeout reporting.
- **Change orders (separate change-order log).** Issues that result in formal change orders carry a Change-order reference in the dictionary entry. The latent-defect issues (I-008, I-010) both produced T&M variation requests that flowed through the change-order log.

## 7. Conventions used

Five patterns this document follows, for traceability against the Northwood worked-example convention:

1. **Issues are things that happened; risks are things that may happen.** The Risk Register is forward-looking; the Issue Log is backward-and-current looking. A risk that materialises transitions to an issue with cross-reference. This separation is non-trivial — combining the two creates a log that is neither useful for risk planning nor useful for issue audit.
2. **Categorisation is single-primary with optional secondary slash.** Eight categories, each issue gets one primary category, optional second category after a slash where the issue genuinely spans two. Multi-categorisation discipline prevents the log from becoming an unstructured grab-bag.
3. **Severity (L/M/H) drives escalation behaviour, not just labelling.** H-severity triggers immediate PM-Director escalation per the Communications Plan; M-severity triggers weekly attention; L-severity is owner-resolved. The grade carries operational meaning.
4. **Dictionary entries only for material issues.** Not every L-severity issue needs a paragraph of context. The dictionary discipline is reserved for issues that materially affected commercial outcome, schedule, or required formal escalation — typically 5-10 entries on a project of this size, even if the log has 20-30 entries.
5. **The log is append-only; closure does not delete.** Closed issues remain in the log permanently. This is the discipline that makes the log auditable at closeout and useful as a lessons-learned input.

## 8. Notes for downstream agents

- **Status Reporter.** The Open and In-progress issues (typically 3-8 at any point in execution) feed the "Issues" section of the monthly status report. Closed issues are not reported individually but contribute to the cumulative-closed count. H-severity issues are always reported with disposition; M-severity issues are reported in summary; L-severity issues are reported by count only.
- **Variance Analyst.** Cost variance is tracked at the WBS-branch level (per Budget); issues with material cost impact (typically H-severity Cost or Commercial issues) link to their WBS branch and surface in the variance commentary. The two latent-defect issues on Ironvale (I-008, I-010) drove $425k of cost movement on Branch 4.0 — the variance commentary cross-referenced this log.
- **Change Order Reviewer.** Commercial-category issues that result in formal change orders flow into the change-order log via this register. The dictionary entry's Commercial-resolution clause is the source material for the change-order analysis package.
- **Lessons-Learned Synthesiser.** At project close, the issue log's dictionary entries are the primary input to the lessons-learned write-up. The "Lesson learned" clause in each dictionary entry is the seed; the synthesiser groups them by category and theme for the closeout report.
