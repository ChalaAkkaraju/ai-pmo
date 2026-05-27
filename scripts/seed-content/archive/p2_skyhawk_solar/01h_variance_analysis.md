# Variance Analysis Report — Skyhawk Solar + Storage Phase 1 (Week 28 of 60)

> **Note on this document's role as a worked example.** This is a Variance Analysis Report for Skyhawk Solar at a mid-execution state — Week 28 of the 60-week project (about 47% into the construction phase). The report shows the variance discipline as it operates with real variance data to analyse: schedule and cost movement against baseline, root-cause analysis on material variances, contingency drawdown, and recovery action commitments. When the Variance Analyst agent uses this as a worked example for a new project, two adaptations apply. First, at a Week 0 baseline state, the agent produces the variance-measurement *framework* rather than a populated variance report — there is no variance to analyse yet, only the structure to be used going forward. Second, items shown with inline italic annotations — root-cause attributions where the evidence is partial, recovery-action target dates dependent on subcontractor commitment, and contingency drawdown rates that depend on future risk closure — would carry `[NEEDS PM REVIEW]` flags at draft stage. The Week 28 state shown reflects what the Skyhawk PM, Commercial Manager, and Schedule Engineer committed at that point in execution.

## 1. Project context and report period

- **Project:** Skyhawk Solar + Storage Phase 1 (NW-REN-2207)
- **Client:** Skyhawk Renewables LLC (IPP)
- **Contract:** Fixed-price, $68.0M; approved budget $62.0M; Northwood contingency $2.5M
- **Northwood PM:** J. Okafor
- **Commercial Manager:** D. Reeves
- **Report period:** Week 28 of 60 (mid-civil, BESS in FAT, long-lead module deliveries ongoing)
- **Reporting cadence:** Monthly client status (Week 28 is also the cadence-point for the Week-28 client status report)
- **Variance baseline:** Cost baseline at run-equivalent of Skyhawk's `01e_budget_baseline.md`; schedule baseline at Skyhawk's planning-period schedule analysis

## 2. Executive summary — variance at a glance

| Metric | At Week 28 | Target / band | Status |
|---|---:|---|---|
| Cost Performance Index (CPI) | 0.97 | ≥ 1.00 | Below target by 3% — explained, recovery in progress |
| Schedule Performance Index (SPI) | 0.95 | ≥ 1.00 | Below target by 5% — 2-week slip on civil critical path |
| Cumulative cost variance (CV) | −$0.6M | within ±2% of cumulative budget | At threshold |
| Cumulative schedule variance (SV) | −10 days against planned milestones | within ±14 days | Within tolerance |
| Contingency consumed-to-date | $0.7M of $2.5M (28%) | Track ahead of risk closure | Slightly ahead — explained |
| Contingency remaining vs unresolved risks | $1.8M against R1, R3, R4 still live | ≥ sum of expected exposures | Marginal — see §5 |
| Projected margin at SC (P50) | 8.2% | ≥ 8.8% target | Below target by 0.6%; above 5.1% distress floor |

**One-sentence summary.** Skyhawk is tracking 5% behind schedule and 3% over cost at Week 28 against an 8.8% target margin; the root causes are concentrated in two events (BESS vendor reselection in Week 18 and a two-week civil slip in Weeks 22–24), both of which have recovery plans active and contingency cover.

## 3. Schedule variance analysis

The schedule baseline (from `01_charter.md` §6 milestones and the underlying construction schedule) anchors on five critical-path chains. Variance is reported by chain.

| Chain | Baseline activity | Planned end | Actual / forecast end | Variance | SPI (chain) |
|---|---|---|---|---:|---:|
| A — Detailed Engineering | Engineering 60% review | Week 11 | Week 11 | 0 days | 1.00 |
| B — Long-lead procurement | BESS PO release | Week 15 | Week 18 *(at draft stage [NEEDS PM REVIEW: confirm against signed PO date]; PO released Week 18 to alternate vendor)* | +21 days | 0.86 |
| B — Long-lead procurement | Modules and inverters delivered | Week 26 | Week 25 | −7 days (ahead) | 1.05 |
| C — Civil construction | Foundation pour 50% complete | Week 26 | Week 28 | +14 days | 0.93 |
| D — Mechanical erection | Not yet started | Week 32 planned start | Week 33 forecast start | +7 days | (forecast) |
| E — Commissioning and performance test | Not yet started | Week 52 planned start | Week 52 forecast start | 0 days | (forecast) |

**Convergence assessment.** Chain B BESS slip (Week 18 PO) has not yet propagated to Chain D mechanical erection because the BESS delivery slot is in Week 38 — sufficient buffer remains between PO release and required-on-site. Chain C civil slip (2 weeks against foundation milestone) is partially recoverable through subcontractor overtime in Weeks 29–32; the recovery plan targets re-alignment by Week 32. If neither recovery succeeds, Chain D start slips one week, which is recoverable within float to SC.

**Net schedule position at Week 28.** Critical path is currently behind by 14 days (Chain C civil). Float to SC remains positive at +20 days. The 30-day window between planned SC (Week 60) and the next external commitment (PPA energisation) is preserved.

## 4. Cost variance analysis

Cost variance is reported by WBS Level-2 branch, against the P50 baseline of $62.0M (from `01e_budget_baseline.md` §3).

| WBS branch | P50 baseline ($M) | BCWP at Week 28 ($M) | ACWP at Week 28 ($M) | Variance ($M) | CPI |
|---|---:|---:|---:|---:|---:|
| 1.0 Project Management | 3.1 | 1.44 | 1.50 | −0.06 | 0.96 |
| 2.0 Engineering & Design | 2.5 | 2.40 | 2.35 | +0.05 | 1.02 |
| 3.0 Procurement — Modules | 18.6 | 18.6 | 18.0 | +0.6 | 1.03 |
| 3.0 Procurement — Inverters | 4.3 | 4.3 | 4.3 | 0 | 1.00 |
| 3.0 Procurement — BESS | 9.3 | 9.3 | 9.7 | −0.4 *(at draft stage [NEEDS PM REVIEW: confirm against final PO with vendor-2]; finalised at $9.7M against budget $9.3M)* | 0.96 |
| 3.0 Procurement — Substation | 6.2 | 5.0 | 5.0 | 0 | 1.00 |
| 3.0 Procurement — Racking | 5.0 | 5.0 | 5.0 | 0 | 1.00 |
| 3.0 Procurement — BOS electrical | 3.7 | 2.0 | 2.05 | −0.05 | 0.98 |
| 4.0 Civil construction | 4.3 | 2.0 | 2.3 | −0.3 | 0.87 |
| 5.0 Mechanical / electrical install | 3.7 | 0 | 0 | 0 | (n/a) |
| 6.0 Commissioning | 1.0 | 0 | 0 | 0 | (n/a) |
| 7.0 Project close | 0.3 | 0 | 0 | 0 | (n/a) |
| **Project total — committed-and-spent** | 62.0 | 50.04 | 50.20 | −0.16 | 0.997 |
| **Project total — forward-projected to SC** | 62.0 | 62.0 | 62.6 | **−0.6** | **0.97** |

**Largest variance items.** Two branches drive the cumulative variance: BESS (−$0.4M, vendor reselection in Week 18) and Civil (−$0.3M, sub-grade conditions worse than design assumption discovered in Weeks 22–24). Module variance is favourable (+$0.6M, vendor competition stronger than bid assumption); this offset cushions but does not eliminate the unfavourable variances.

## 5. Contingency consumption status

The $2.5M contingency from charter §7 was analytically allocated against R1–R5 in `01e_budget_baseline.md` §4. The Week 28 consumption status:

| Risk source | Allocation ($k) | Consumed-to-date ($k) | Remaining ($k) | Risk status |
|---|---:|---:|---:|---|
| R1 — Utility interconnection late | 400 | 0 | 400 | Live — utility studies on track; first energisation test scheduled Week 50 |
| R2 — BESS supply disruption | 600 | 400 | 200 | Realised — vendor-2 reselection consumed; closing remainder if no further disruption |
| R3 — Module degradation | 150 | 0 | 150 | Live — modules in commissioning warranty window once erected |
| R4 — Weather / monsoon | 500 | 0 | 500 | Live — monsoon season Weeks 35–48; impact not yet materialised |
| R5 — Local labour shortage | 350 | 200 | 150 | Partially realised — civil slip Weeks 22–24 attributable in part to local labour availability; retention bonus drawdown $200k |
| Unallocated reserve | 500 | 100 | 400 | $100k drawn against sub-grade investigation cost not anticipated in any risk |
| **Total** | **2,500** | **700** | **1,800** | |

**Coverage analysis.** Remaining contingency $1.8M against live risks projected exposure (R1 + R3 + R4 worst case ≈ $1.05M, R5 residual ≈ $150k, unallocated buffer $400k = total reserved exposure ≈ $1.6M). Margin of $200k on residual contingency vs residual risk exposure — tight but positive. If monsoon season produces material productivity loss (R4 realised), the $500k allocation may not cover, and the unallocated reserve becomes the secondary source. PM authority on additional contingency draw is exhausted at $500k beyond original allocation; Director approval required for any unanticipated event exceeding that.

## 6. Variance root cause analysis

Two material variances warrant detailed root-cause analysis at this report period.

### 6.1 BESS PO slip from Week 15 to Week 18 ($0.4M cost, 21 days schedule)

**Trigger event.** Original BESS vendor selected in proposal stage and confirmed at Week 6 review showed deteriorating financial-health indicators in Q3 vendor monitoring (Weeks 12–14): declining cash position, two analyst downgrades, supply-chain disruption reports from independent vendor's prior projects.

**Decision sequence.** Week 14: Procurement Lead flagged the indicators; PM and Director reviewed in week-end meeting; decision made to suspend PO release pending alternate-vendor qualification. Week 15: alternate vendor (qualified in proposal but not preferred on price) engaged for accelerated commercial discussion. Week 17: alternate vendor commercial terms agreed at +$0.4M against original vendor's proposed price. Week 18: PO released.

**Root cause classification.** External — vendor financial-health deterioration. Northwood acted prudently in not releasing the PO to a vendor at financial risk; the cost premium for the alternate is the consequence. R2 contingency allocation ($600k) was sized for this scenario at planning.

**Lesson learned (provisional).** Vendor financial-health monitoring frequency for sole-source long-lead items should increase from quarterly to monthly during the PO-release window; would have surfaced indicators 4–8 weeks earlier.

### 6.2 Civil schedule slip Weeks 22–24 ($0.3M cost, 14 days schedule)

**Trigger event.** Foundation excavation at the Solar Plot B (40% of array foundations) encountered sub-grade soil conditions softer than the geotechnical investigation indicated. Bearing capacity required additional excavation depth and structural fill in 18 of 80 foundation positions.

**Decision sequence.** Week 22: civil subcontractor flagged soft soil at first three positions. Week 23: PM ordered extended geotechnical investigation across Plot B; results showed broader subgrade weakness in the north-west quadrant. Week 24: revised foundation design with additional excavation depth approved; subcontractor mobilised additional equipment.

**Root cause classification.** External — sub-grade geotechnical variance from investigation. Investigation was per Northwood standard for projects of this size; the affected quadrant did not feature in the original sampling grid which was concentrated in higher-risk topographic areas. R5 contingency allocation (local labour) covers part of the cost; the unallocated reserve covers the geotechnical investigation cost ($100k) that was not anticipated in any specific risk.

**Lesson learned (provisional).** For solar projects on terrain with variable soil profiles, geotechnical investigation grid density should be uniform across the footprint, not concentrated in topographically-high-risk areas. Standard sampling pattern updated.

## 7. Recovery actions

Four recovery actions are committed for the period Weeks 29–40.

| Action | Owner | Target close | Linked variance | Status |
|---|---|---|---|---|
| Civil subcontractor overtime Weeks 29–32 to recover 14-day foundation slip | Construction Manager | Week 32 | §6.2 | In progress |
| BESS factory acceptance test in Week 38 with on-site expediter from Week 35 | Procurement Lead | Week 38 | §6.1 | Planned |
| Pre-monsoon work-front loading: complete erosion-control installation by Week 34 to maximise productive monsoon-season days | Construction Manager | Week 34 | R4 forward | In progress |
| Increase vendor financial-health monitoring on all remaining long-lead POs from quarterly to monthly through end of construction | Procurement Lead | Standing through SC | §6.1 lesson | Active |

**Recovery cost projection.** Civil subcontractor overtime estimated $80k (within existing branch contingency, not contingency drawdown). Pre-monsoon loading is sequence-only, no incremental cost. Vendor monitoring is process change, no incremental cost. BESS expediter cost ($30k) absorbed in 3.0 Procurement branch.

## 8. Outlook to next reporting period (Weeks 29–32)

**Expected variance evolution.** SPI projected to improve from 0.95 to 0.97 by Week 32 if civil recovery succeeds as planned; CPI projected to stay at 0.97 (no new material variances anticipated). Contingency consumption projected to add $100k against R5 (retention bonus continuation) and $0 against other risks if monsoon delays. Monsoon season begins Week 35; first material R4 exposure window opens Week 36.

**Watch items.**
- Civil overtime delivery (does the 14-day recovery materialise by Week 32?)
- BESS vendor-2 performance through FAT (does the PO premium hold or grow?)
- Module deliveries continuing on cadence (does the favourable variance persist?)
- Erosion-control completion by Week 34 (does the pre-monsoon loading deliver as planned?)

**Re-baseline trigger assessment.** No current trigger exceeded. The 5.1% margin floor (full contingency consumed) remains uncrossed at projected 8.2%. Single-branch overrun thresholds (BESS at −$0.4M against branch limit −$1.0M; Civil at −$0.3M against branch limit −$0.5M) remain below re-baseline triggers. Total-project overrun at −$0.6M against total threshold −$1.5M (60% contingency consumed) remains below threshold.

## 9. Conventions used

Five patterns this document follows, for traceability against the Northwood worked-example convention:

1. **EVM as the variance backbone.** CPI and SPI are the headline metrics; CV and SV are the dollar / day measurements. The metrics inherit their formulas from PMBOK Earned Value Method conventions. Numbers without a unit are absolute dollars or days; ratios are decimal.
2. **Variance reported by WBS Level-2 branch and by critical-path chain.** The same variance appears once in each view — once by branch (cost lens) and once by chain (schedule lens). Cross-references between the two views are explicit where they describe the same underlying event.
3. **Root-cause analysis disciplined and evidence-bearing.** Root causes are classified (Internal Northwood, External vendor, External client, External regulatory, External natural/site, Methodological). Evidence is cited (vendor monitoring data, geotechnical reports, subcontractor flags). Speculation is flagged with inline italic annotations where the evidence is partial.
4. **Recovery actions named, owned, dated, and cost-projected.** Every recovery action has a single owner, a target close date, a linked variance section, and an estimated cost or scope-only classification. Aspirational recovery without commitment is not recorded as an action.
5. **Re-baseline trigger assessment included at every reporting period.** Even when no triggers are crossed (as here at Week 28), the assessment is explicit: which thresholds remain how far from triggers. This is the discipline that gives the PM, Director, and Sponsor pre-warning before re-baseline events arrive.

## 10. Notes for downstream agents

- **Status Reporter.** The Executive Summary (§2) and the Outlook (§8) feed the monthly client status report. The Cost variance (§4) and Schedule variance (§3) feed the monthly portfolio dashboard. Root-cause analyses (§6) are summarised for the Sponsor brief; full detail is internal-only unless the variance event has been disclosed to the client.
- **Change Order Reviewer.** Variance events with client-driven causation flow into the change-order log. None of the Week 28 variances are client-driven; if a future variance traces to a client-instructed scope or sequence change, the change-order package is the recovery vehicle.
- **Risk Analyst.** Realised risks (R2 BESS, R5 partially) update the risk register status from "Live" to "Realised / Materialised." The risk register's standalone document should be updated in the same reporting cycle to maintain consistency between the issue log, the variance analysis, and the risk register.
- **Issue Logger.** Variance events that originated as upstream open items (e.g., R2 BESS vendor selection was originally I-002-equivalent on Skyhawk's Week 0 baseline) close on the issue log with a Linked-variance reference back to this document. The issue log's closed-state lifecycle entry cites the variance analysis where the operational closure was achieved.
