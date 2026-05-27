# Project Schedule and Critical Path Analysis — Riverside Water Reclamation Phase 2 Expansion

> **Note on this document's role as a worked example.** This is the COMMITTED Project Schedule and Critical Path Analysis for Riverside Water as it stood at the end of the Planning phase (twelve weeks after charter approval), before the blower-vendor schedule pathology materialised. When the Schedule Reasoner agent uses this as a worked example for a new project's schedule, items shown with inline italic annotations — activity-level durations not directly stated in the charter, near-critical paths inferred from sequencing, and the names of activity owners — should appear at the draft stage as `[NEEDS PM REVIEW: <value>]` rather than as the resolved values shown here. The final values shown reflect what the Northwood PM and Schedule Engineer committed during the Planning sequence; a new project's draft schedule analysis would carry these in flagged form until equivalent commitments are made.

## 1. Project context

- **Project:** Riverside Water Reclamation Phase 2 Expansion (NW-WW-2103)
- **Client:** City of Riverside Public Works Department
- **Contract:** Fixed-price, $42.0M
- **Duration baseline:** 22 months Award (12 March) → Substantial Completion (30 January year+2)
- **Northwood PM:** M. Acharya
- **Schedule baseline date:** Week 12 post-charter
- **Schedule classification:** P50 baseline; P80 contingency build separately tracked at portfolio level

## 2. Master milestone schedule

The milestones below are the contractual schedule baseline from charter §6, with the additional internal milestones added during the Planning sequence to give the critical path the granularity it needs.

| Milestone | Target date | Source | Payment-linked? | Critical path? |
|---|---|---|---|---|
| Contract effective | 12 March | Charter §1 | — | Start |
| Detailed Engineering 30% review | 15 June | *(at draft stage [NEEDS PM REVIEW: confirm 30% date in scheduler]; confirmed Week 8)* | No | Yes |
| Detailed Engineering 60% review | 30 August | Charter §6 | Yes | Yes |
| Long-lead equipment POs released — aeration blowers | 15 October | Charter §6 | No | Yes — blowers on critical path |
| Long-lead equipment POs released — other major | 30 October | *(at draft stage [NEEDS PM REVIEW: confirm staggered PO release windows]; confirmed Week 18)* | No | Selectively |
| Aeration blower factory acceptance test (FAT) | 30 April year+1 | *(at draft stage [NEEDS PM REVIEW: contingent on vendor 32-week lead time confirmed at PO acceptance]; vendor accepted PO with 28-week ex-works lead time)* | No | Yes |
| Site mobilisation | 20 January year+1 | Charter §6 | Yes | Yes |
| Earthworks complete (new basins) | 15 March year+1 | *(at draft stage [NEEDS PM REVIEW: subcontractor-dependent])* | No | Yes |
| First biological train mechanical complete | 31 August year+1 | *(at draft stage [NEEDS PM REVIEW: gated by blower delivery])* | No | Yes |
| First biological train commissioned | 30 September year+1 | Charter §6 | Yes | Yes |
| Second biological train mechanical complete | 31 October year+1 | *(at draft stage [NEEDS PM REVIEW: gated by tie-ins])* | No | Yes |
| Second train commissioned, tie-ins complete | 30 November year+1 | Charter §6 | Yes | Yes |
| Performance test commenced | 1 December year+1 | Charter §6 | No | Yes |
| Performance test complete (30-day continuous) | 1 January year+2 | *(at draft stage [NEEDS PM REVIEW: 30-day duration confirmed in state regulator procedure])* | No | Yes |
| Substantial Completion | 30 January year+2 | Charter §6 | Yes | Yes |

Total schedule duration: 689 days from contract effective to Substantial Completion. Charter §10 constrains Substantial Completion ahead of the state-mandated effluent standard taking effect on 30 March year+2 — a 58-day float between SC and the regulatory deadline, all of which sits at the end of the schedule.

## 3. Critical path

The critical path on Riverside runs through five sequential chains, each gating the next.

**Chain A — Detailed Engineering.** Award → 30% review (95 days) → 60% review (76 days). Total 171 days from contract effective. Critical because PO release for blowers is gated on 60% engineering complete, and the blowers are the longest-lead equipment on the project.

**Chain B — Long-lead blower procurement.** 60% review → blower PO release (46 days) → vendor manufacturing (28 weeks / 196 days ex-works per vendor acceptance) → ocean shipping and site delivery (45 days). Total 287 days from 60% review. The two large aeration blowers are sourced from a single European vendor; this is the project's largest single procurement risk and the dominant critical-path constraint. There is no qualified alternate supplier at the required capacity and footprint. *(at draft stage [NEEDS PM REVIEW: vendor manufacturing lead time at PO acceptance]; vendor confirmed 28 weeks at PO acceptance — slightly better than the 32-week bid assumption)*

**Chain C — Civil works → mechanical installation.** Site mobilisation → earthworks and foundations for two new biological trains (54 days) → structural steel and concrete (76 days) → mechanical installation of first train (90 days — gated by blower delivery). The civil chain runs in parallel with Chain B for the first 130 days post-mobilisation; thereafter the chain becomes blower-gated. First-train mechanical completion is the convergence point of Chains B and C.

**Chain D — Commissioning and tie-ins.** First train mechanical complete → cold and hot commissioning (30 days) → tie-ins to existing process train (10 days, requires scheduled plant shutdown) → second train installation overlapping → second train commissioning (45 days) → tie-ins complete. The tie-ins are performed during permitted plant-shutdown windows; the windows are negotiated with the Plant Superintendent at the start of construction.

**Chain E — Performance test.** Second train commissioned → 30-day continuous performance test → Substantial Completion. The performance test is contractually 30 days continuous; any process upset that breaches state-permit thresholds during the test restarts the clock.

The critical path is Award → 60% Engineering → blower PO release → blower delivery → mechanical install of first train → commissioning → second train → tie-ins complete → performance test → SC. Activities not on this chain (tertiary filtration retrofit, headworks screening expansion, SCADA upgrades) have float ranging from 30 to 90 days.

## 4. Float analysis

Activities with meaningful float (greater than 15 days) at the planning baseline:

- **Tertiary filtration retrofit.** ~85 days of float. Sequenced to fit between first-train commissioning and second-train mechanical complete; can flex by ±40 days without consuming critical-path float.
- **Headworks screening expansion.** ~60 days of float. Independent of new biological trains; sequenced for convenience.
- **SCADA upgrade — application configuration.** ~45 days of float. Hardware install is on critical path (gated by blower-train commissioning); application configuration overlaps commissioning and finishes ahead.
- **Operator training.** ~30 days of float. Delivered ahead of performance test commencement.

Activities with **near-critical float (15 days or less)** that warrant elevated monitoring:

- **Permit-shutdown coordination with Plant Superintendent.** 12 days of float. Tie-in windows are gated by plant flow patterns; misalignment between Northwood and client schedule materially compresses Chain D.
- **Aeration blower factory acceptance test.** 8 days of float. FAT outcome can flag in-vendor defects that consume float through rework.
- **State regulator performance-test procedure agreement.** 10 days of float. The performance-test procedure must be agreed with the state regulator at least 60 days before test commencement; delays in regulator response have historically been the most common slip cause on water projects in this state.

## 5. Schedule-linked risks

Five risks are schedule-bearing — they convert to date slips on specific activities if they realise. (These are a subset of the charter §8 risk register, viewed through a schedule lens.)

| Risk (charter §8) | Schedule impact | Activity affected | Expected slip range | Mitigation in schedule |
|---|---|---|---|---|
| R1 — Long-lead blower delivery exceeds 32 weeks | Direct delay to blower-gated mechanical installation | Chain B / first-train mechanical complete | 4–14 weeks | Early PO release (15 October), expediter on the ground from Week -8 of needed delivery, FAT discipline; no qualified alternate supplier so contingency is monetary not schedule |
| R3 — Process tie-ins exceed permitted plant shutdown windows | Direct delay to Chain D | Tie-ins / second train commissioning | 1–3 weeks per missed window | Detailed sequencing plan, dry runs ahead of each shutdown, weekly coordination with Plant Superintendent, contingency tie-in window negotiated as part of charter |
| R4 — Effluent performance test fails on TN limit | Performance test restart | Chain E / 30-day test | 30 days per failed cycle | Design margin on biological reactor sizing, third-party process validation review before test commencement |
| Latent — State regulator performance-test procedure change | Test pre-conditions need re-agreement | Chain E / 30-day test | 14–30 days | Quarterly regulator engagement, procedure-change notification clause in permit |
| Latent — Client-driven scope change (e.g. UV disinfection) | New scope inserted mid-project | Chain C or new chain | 6–12 weeks | T&M-style change-order vehicle pre-agreed in contract; pricing pre-agreed for typical scope additions |

## 6. Schedule baseline change control

The schedule baseline above is a P50 plan. The internal P80 plan (not shown — held in the cost-and-schedule contingency model) carries an additional 8 weeks of contingency, allocated as follows: 4 weeks on Chain B (blower-vendor schedule risk), 2 weeks on Chain D (tie-in windows), 2 weeks on Chain E (performance test).

Re-baseline thresholds:
- Single-activity slip exceeding 14 days → schedule update, no re-baseline.
- Single-activity slip exceeding 30 days OR critical-path slip exceeding 14 days → schedule re-baseline, change-order if client-driven, internal-only if Northwood-driven.
- Critical-path slip exceeding 30 days → portfolio escalation per charter §11 governance.

Owner of schedule baseline integrity: M. Acharya (PM), with weekly schedule reviews including the Construction Manager, Procurement Lead, and Engineering Lead.

## 7. Notes on format (for the agent reading this as a worked example)

Five patterns the Schedule Reasoner should imitate when drafting a schedule analysis for a new project:

1. **Master milestone table with source attribution.** Each milestone shows where it came from — charter §6 directly, or inferred during planning. Inferred milestones carry the inline italic annotation form `*(at draft stage [NEEDS PM REVIEW: <what to confirm>]; <how resolved>)*`. Charter milestones never carry annotations; planning-inferred milestones always do.

2. **Critical path as numbered chains, not a single linear narrative.** Five chains (A through E) make the path inspectable and let the reader see where the chains converge. A single linear narrative hides the structure.

3. **Float analysis distinguishes meaningful float from near-critical float.** Meaningful float (>15 days) is reportable; near-critical (≤15 days) is for active monitoring. The 15-day threshold is a Northwood convention, not a PMBOK universal.

4. **Schedule-linked risks are a *subset* of the charter risk register.** The Schedule Reasoner doesn't re-author risks; it filters the existing register to those with schedule impact and adds expected slip ranges in days/weeks. Cross-reference back to charter §8 via the risk identifier.

5. **P50 baseline plus P80 contingency, with explicit re-baseline thresholds.** The schedule shown is the P50 plan. P80 contingency is held separately. Re-baseline thresholds are stated in days so the PM has explicit triggers, not judgement calls.

## 8. Notes for downstream agents

- **Budget Builder.** The critical-path activities (Chain B blower procurement, Chain C civil works through first-train install, Chain D commissioning, Chain E performance test) are also the largest cost concentrations. The schedule contingency (8 weeks P80) should match the budget contingency reasoning; if they diverge, the PM should reconcile.
- **Risk Analyst.** The five schedule-linked risks in §5 are a filtered view of the charter §8 register. If new risks emerge during execution with schedule impact, both the risk register and this document update together.
- **Status Reporter.** Variance-to-baseline reporting uses the milestone table in §2 as the reference. Re-baseline events per §6 should be called out in the next status report following the event, with rationale.
