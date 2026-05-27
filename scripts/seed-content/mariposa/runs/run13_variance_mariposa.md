# Variance Analysis Report — Mariposa Wind Farm Phase 1 (Week 0 baseline — framework)

> **Note on this document's state.** This is the Week 0 baseline of the Variance Analysis framework for Mariposa Wind Farm Phase 1. Contract signature is 22 May; no execution has occurred against the baseline. There is no variance to measure because the baseline itself is the reference point against which future variance will be measured. This document therefore defines the *framework* — the metrics, thresholds, cadence, view structure, and reporting templates — that will be populated from Week 1 onward as cost and schedule actuals accrue. The Week 0 issue log (`run12_issue_log_mariposa.md`) identifies the open items most likely to produce the first material variance events; those issues are referenced here as variance-watch precursors, not as realised variance.

## 1. Project context and report period

- **Project:** Mariposa Wind Farm Phase 1 (NW-REN-2511)
- **Client:** Mariposa Renewables Holdings (IPP)
- **Contract:** Fixed-price, $148.0M; approved budget $134.0M; Northwood contingency $5.5M
- **Northwood PM:** J. Okafor
- **Project Director:** L. Chen
- **Commercial Manager:** *(at draft stage [NEEDS PM REVIEW: Commercial Manager assignment unconfirmed per budget §1 — required for cost-baseline integrity and variance sign-off; see issue log I-011])*
- **Report period:** Week 0 of ~80 (contract signature 22 May; Substantial Completion 30 November year+1; hard energisation deadline 30 December year+1)
- **Reporting cadence:** Weekly internal variance review; monthly variance report aligned to monthly portfolio dashboard and monthly client status per communications plan §5
- **Cost baseline reference:** `run10_budget_mariposa.md` §3 (WBS-branch P50 cost baseline) and §4 (contingency allocation against charter §8 R1–R5)
- **Schedule baseline reference:** `run09_schedule_mariposa.md` §2 (master milestone table) and §3 (Chains A–F critical path)
- **Issue log reference:** `run12_issue_log_mariposa.md` (20 Week-0 open items; 5 H-severity issues track to charter §8 risks)

## 2. Executive summary — variance at a glance

At Week 0, the variance dashboard is empty by definition. The table below shows the framework that will be populated from Week 1 onward; baseline values are stated where they are commitments (target margin, contingency envelope, buffer position) and shown as "n/a — Week 0" where they require execution data.

| Metric | At Week 0 | Target / band | Status |
|---|---:|---|---|
| Cost Performance Index (CPI) | n/a — Week 0 | ≥ 1.00 | Baseline |
| Schedule Performance Index (SPI) | n/a — Week 0 | ≥ 1.00 | Baseline |
| Cumulative cost variance (CV) | $0 | within ±2% of cumulative budget | Baseline |
| Cumulative schedule variance (SV) | 0 days | within ±14 days against milestones | Baseline |
| Contingency consumed-to-date | $0 of $5.5M (0%) | Track against risk closure | Baseline |
| Contingency remaining vs unresolved risks | $5.5M against R1–R5 live | ≥ sum of expected exposures | Baseline — all live |
| Projected margin at SC (P50) | 9.5% | ≥ 9.5% target | Baseline |
| Margin floor (full contingency consumed) | 5.7% | Above floor | Baseline |
| SC-to-energisation buffer | 30 days | ≥ 30 days | Baseline — full buffer intact |

**One-sentence summary.** Mariposa is at Week 0 baseline with full contingency envelope ($5.5M) intact, full 30-day SC-to-energisation buffer intact, and a 9.5% target margin against a 5.7% commercially-distressed floor; the variance framework below is the discipline by which Week 1 onward execution is measured against this baseline.

## 3. Schedule variance analysis — framework

Schedule variance will be reported by critical-path chain (per schedule baseline §3) and by milestone (per schedule baseline §2). The two-view discipline — by chain (chronological, end-to-end critical-path lens) and by milestone (contract-anchored, payment-aligned lens) — is the schedule-side complement to the cost-side dual-view in §4.

### 3.1 Chain-level variance template

| Chain | Baseline activity | Planned end | Actual / forecast end | Variance | SPI (chain) |
|---|---|---|---|---:|---:|
| A — Detailed Engineering to OEM-ready | 60% Engineering review | *(per schedule §2; date [NEEDS PM REVIEW per I-013])* | — | — | — |
| B — Long-lead turbine OEM procurement | OEM PO released | *(per schedule §2; PO release date [NEEDS PM REVIEW per I-002])* | — | — | — |
| B — Long-lead turbine OEM procurement | First turbine component delivery on site | *(per schedule §2; OEM cadence-driven)* | — | — | — |
| C — Rural road upgrades | Both counties' upgrades complete | *(per schedule §2; date [NEEDS PM REVIEW per I-013])* | — | — | — |
| D — Civil construction | Foundations complete (80 positions) | *(per schedule §2; date [NEEDS PM REVIEW per I-013])* | — | — | — |
| E — Turbine erection & electrical completion | Mechanical completion — 80 turbines | *(per schedule §2; date [NEEDS PM REVIEW per I-013])* | — | — | — |
| F — Commissioning, performance test, energisation | Performance test complete | *(per schedule §2)* | — | — | — |
| F — Commissioning, performance test, energisation | Substantial Completion | 30 November year+1 | — | — | — |
| F — Commissioning, performance test, energisation | Grid interconnection energisation | No later than 30 December year+1 | — | — | — |

**Convergence assessment template.** At each reporting period, convergence between chains is assessed at three explicit points per schedule §3: (a) Chains B + C → first turbine component delivery (component on site + road readiness); (b) Chains B + C + D → first turbine erection ready (component + road + foundation cured at the same position); (c) Chains E + F-substation → grid synchronisation ready (mechanical completion + substation energisation). Convergence slippage is reported even when chains individually are on track.

**Net schedule position template.** Net critical-path slip in days; float-to-SC remaining; **position against the 30-day SC-to-energisation buffer** (the single most-watched figure on the project per communications plan §5).

### 3.2 Milestone-level variance template

Variance against each charter §6 milestone (per schedule §2 table) will be reported in days. Payment-linked milestones (TBC against signed contract per I-013) carry priority because slip on those affects cash flow per budget §5.

## 4. Cost variance analysis — framework

Cost variance will be reported by WBS Level-2 branch (per budget §3) against the P50 baseline of $134.0M. EVM formulas are the backbone: CPI = BCWP / ACWP; CV = BCWP − ACWP. Variance reporting distinguishes band-tightening updates (six Medium-confidence branches expected to tighten through Engineering 30% and PO/subcontract award per budget §3) from genuine cost movement.

### 4.1 Branch-level variance template

| WBS branch | P50 baseline ($M) | BCWP ($M) | ACWP ($M) | Variance ($M) | CPI |
|---|---:|---:|---:|---:|---:|
| 1.0 Project Management | 6.7 | — | — | — | — |
| 2.0 Engineering & Design | 5.4 | — | — | — | — |
| 3.0 Procurement — Turbine OEM (80 × 4.0 MW) | 67.0 | — | — | — | — |
| 3.0 Procurement — Substation & 230 kV equipment | 8.0 | — | — | — | — |
| 3.0 Procurement — 34.5 kV collection & MV cabling | 6.7 | — | — | — | — |
| 3.0 Procurement — Civil materials | 4.0 | — | — | — | — |
| 4.0 Site access & rural road upgrades | 5.4 | — | — | — | — |
| 5.0 Civil construction | 10.7 | — | — | — | — |
| 6.0 Electrical construction | 8.0 | — | — | — | — |
| 7.0 Turbine erection | 13.4 | — | — | — | — |
| 8.0 SCADA & plant controls | 1.3 | — | — | — | — |
| 9.0 Commissioning, performance test, training | 1.3 | — | — | — | — |
| 10.0 Project close | 0.4 | — | — | — | — |
| Camp & site facilities | 1.7 | — | — | — | — |
| **Project total — committed-and-spent** | **134.0** | — | — | — | — |
| **Project total — forward-projected to SC** | **134.0** | — | — | — | — |

**Dominant-branch discipline.** Branch 3.0 Turbine OEM at $67.0M is 50% of the cost base and 100% of the project's commercial sensitivity in a single line. Any movement on this branch is material per budget §9 and communications plan §8. Variance commentary on Branch 3.0 is mandatory in every variance report, even when the variance is zero, until the OEM PO is released and FAT-cleared.

**Confidence-band tracking.** Six branches carry Medium-confidence bands at Week 0 (Turbine OEM, civil materials, road upgrades, civil construction, electrical construction, turbine erection, camp) per budget §3. As bands tighten through Engineering 30%, OEM PO acceptance, and subcontract award, variance reports distinguish band-tightening (precision improvement on baseline) from execution variance (movement against tightened baseline). The distinction is required because confusing the two understates real execution variance during the early phase.

## 5. Contingency consumption status — framework

The $5.5M contingency from charter §7 was analytically allocated against R1–R5 plus unallocated reserve in budget §4. Week 0 status is baseline — all allocations are full, all risks are live.

| Risk source | Allocation ($k) | Consumed-to-date ($k) | Remaining ($k) | Risk status |
|---|---:|---:|---:|---|
| R1 — Single-OEM turbine supply (80 units) | 1,800 | 0 | 1,800 | Live — PO release pending per I-002; FAT and performance bond are primary mitigations |
| R2 — Federal tax-credit deadline (30 Dec year+1) | 1,200 | 0 | 1,200 | Live — buffer intact; acceleration channel unused |
| R3 — Migratory bird flyway blackouts | 700 | 0 | 700 | Live — blackout windows pending client confirmation per I-003 |
| R4 — Rural-road upgrades (two counties) | 800 | 0 | 800 | Live — county identities and Roads Leads pending per I-006 |
| R5 — Rural labour market / camp | 500 | 0 | 500 | Live — camp build-vs-lease decision pending per I-004 |
| Unallocated reserve | 500 | 0 | 500 | Held for unanticipated discoveries |
| **Total** | **5,500** | **0** | **5,500** | |

**Coverage analysis at Week 0.** Remaining contingency $5.5M against the sum of R1–R5 worst-case allocated exposures (per budget §7 ranges): R1 $0.8–2.4M, R2 $0.5–1.5M, R3 $0.3–1.0M, R4 $0.4–1.1M, R5 $0.2–0.6M = $2.2–6.6M aggregate range. At the midpoint of the ranges ($4.4M), coverage against allocated exposure is positive by ~$1.1M including the unallocated reserve. At the high end of the ranges ($6.6M), coverage is negative by ~$1.1M — meaning if every risk realises near its upper bound simultaneously, contingency does not cover the full exposure and the margin floor (5.7%) becomes the secondary defence. *(at draft stage [NEEDS PM REVIEW: confirm exposure-range midpoints are the right reference at Week 0; the variance framework treats this as the coverage indicator until execution data tightens the ranges])*.

**Coverage discipline going forward.** Coverage will be recomputed every reporting period as exposure ranges tighten through PO acceptance (R1), interconnection study completion (R2 indirect), blackout-window confirmation (R3), DOT engagement (R4), and camp decision (R5). The threshold for flag is a remaining margin below $200k against summed midpoint exposures, mirroring the Skyhawk worked example's thin-margin trigger.

## 6. Variance root cause analysis — framework

No material variance exists at Week 0. The classification scheme below will be applied when variance crosses the materiality threshold (>$0.2M cost OR >7 days schedule on any single event).

### 6.1 Classification scheme

Six root-cause categories per Northwood convention:

- **Internal Northwood** — variance attributable to Northwood execution, design, or planning decisions.
- **External vendor** — variance attributable to OEM, subcontractor, or supplier performance.
- **External client** — variance attributable to client-driven scope, sequence, or decision changes.
- **External regulatory** — variance attributable to permit, agency, or compliance events.
- **External natural/site** — variance attributable to weather, geotechnical, or site discoveries.
- **Methodological** — variance attributable to estimating, scheduling, or planning method limitations.

### 6.2 Root-cause analysis template

Each material variance event will be reported with: **Trigger event** (what happened, when, evidence source), **Decision sequence** (week-by-week record of detection, escalation, decision), **Root cause classification** (one of the six categories with evidence cited), **Lesson learned** (provisional during execution, retrospective at close).

### 6.3 Variance-watch precursors at Week 0

The five H-severity issues in the Week 0 issue log identify where the first material variance events are most likely to originate. These are not variance — they are present-state open items whose unresolved status would, if uncorrected, produce variance. Variance reports will track these as precursors until each closes:

- **I-002 (OEM PO release date).** If PO slips against the 60% Engineering gate, Chain B propagates to Chains D–F. Variance channel: schedule (Chain B SPI), cost (R1 contingency drawdown for expediting or alternate-sourcing prep). *(at draft stage [NEEDS PM REVIEW: precursor watch confirms once Engineering 30% completes and the PO-ready date is pinned])*
- **I-003 (blackout-window confirmation).** If confirmed windows differ from bid assumptions, Chain D sequencing changes. Variance channel: schedule (Chain D SPI), cost (R3 contingency drawdown for crew re-sequencing).
- **I-004 (camp build-vs-lease).** Decision affects mobilisation timing and budget structure. Variance channel: schedule (mobilisation milestone), cost (camp line, capex-vs-opex variance against $1.7M baseline).
- **I-005 (interconnection study status).** If study delay materialises, the 30-day SC-to-energisation buffer is the only float. Variance channel: schedule (Chain F end-point), cost (R2 acceleration drawdown).
- **I-001 (Client Lead confirmation).** Not a direct variance precursor but degrades every escalation pathway; indirect amplifier of all other variance channels.

## 7. Recovery actions — framework

No recovery actions at Week 0 because no variance has occurred. The template below commits the format for execution-state recovery actions.

| Action | Owner | Target close | Linked variance | Status |
|---|---|---|---|---|
| *(template — populated from Week 1 onward as variance accrues)* | (single owner) | (date) | (§ reference) | (Planned / In progress / Closed) |

**Recovery action discipline.** Each recovery action will have a single owner, a target close date, a linked variance section reference, and an estimated cost or an explicit scope-only classification. Aspirational recovery without commitment will not be recorded. Recovery cost projection will distinguish contingency drawdown from within-branch absorption.

## 8. Outlook to next reporting period (Weeks 1–4)

**Expected variance evolution.** No variance is expected at Weeks 1–4 in the EVM sense — Engineering and early Procurement are the dominant activities, and the BCWS curve runs flat in the early weeks. The expected variance-relevant events are issue closures (the five H-severity items) rather than execution variance.

**Watch items for the next reporting period:**

- Closure of I-001 (Client Lead confirmation) — gates every escalation pathway.
- Closure of I-005 (interconnection study status confirmation) — gates the central commercial commitment.
- Closure of I-009, I-010, I-011 (Construction Manager, Logistics Lead, Commercial Manager assignments) — gates variance-report sign-off and Chain C/D/E ownership.
- Progress on I-002 (OEM PO release path) — Engineering 30% completion is the precondition.
- Progress on I-003 (blackout-window confirmation) — drives Chain D sequencing visibility.

**Re-baseline trigger assessment at Week 0.** No trigger is currently exceeded; the assessment is included to commit the discipline. Three thresholds per budget §6.3 and schedule §6:

- **Single-branch cost update threshold** (>$400k OR >10% of branch P50, whichever smaller): position at Week 0 is zero variance against all branches; full headroom intact.
- **Single-branch re-baseline threshold** (>$1.0M OR >20% of branch P50): position at Week 0 is zero variance; full headroom intact.
- **Total-project escalation threshold** (>$3.3M = 60% of contingency, OR margin projection <5.7%): position at Week 0 is zero contingency consumed against $5.5M envelope; full headroom intact.
- **Schedule re-baseline thresholds** (single-activity slip >14 days for update, >30 days OR critical-path slip >14 days for re-baseline, >30 days critical-path slip OR any erosion of the 30-day SC-to-energisation buffer for portfolio escalation): position at Week 0 is zero slip against all activities; full buffer intact.

The discipline is to report this assessment at every period — even at Week 0 when every threshold is fully clear — so that the first time a threshold approaches, the format is established and the conversation focuses on the event, not the framework.

## 9. Conventions used

Five patterns this document follows, for traceability against the Northwood worked-example convention:

1. **EVM as the variance backbone.** CPI and SPI are the headline ratio metrics; CV and SV are the dollar / day measurements. Formulas: CPI = BCWP / ACWP, SPI = BCWP / BCWS, CV = BCWP − ACWP, SV = BCWP − BCWS. Ratios reported as decimals; CV in dollars; SV in days. At Week 0 these are framework definitions; from Week 1 onward they are populated values.
2. **Variance reported by WBS Level-2 branch and by critical-path chain.** The same underlying event appears once in each view — once by branch (cost lens) and once by chain (schedule lens) — with explicit cross-references. The two-view discipline is committed at Week 0 even though no events yet exist to cross-reference.
3. **Root-cause analysis disciplined and evidence-bearing.** Six classification categories (Internal Northwood, External vendor, External client, External regulatory, External natural/site, Methodological); evidence cited from primary sources (OEM expediter reports, geotechnical investigations, permit correspondence, subcontractor flags); speculation flagged with inline italic annotations. At Week 0 the scheme is committed; from Week 1 onward it is applied.
4. **Recovery actions named, owned, dated, and cost-projected.** Single owner, target close date, linked variance reference, estimated cost or scope-only classification. Aspirational recovery excluded. At Week 0 the template is committed; from Week 1 onward it is populated.
5. **Re-baseline trigger assessment at every reporting period.** Three thresholds (single-branch update, single-branch re-baseline, total-project escalation) plus schedule thresholds reported at every period, including Week 0 when every threshold is clear. The discipline gives pre-warning before re-baseline events arrive.

## 10. Notes for downstream agents

- **Status Reporter.** The Week 0 variance framework is the reference for every subsequent variance report. The Executive Summary (§2) and the Outlook (§8) feed the monthly client status report. Cost variance (§4) and schedule variance (§3) feed the monthly portfolio dashboard. From Week 1 onward, position against the 30-day SC-to-energisation buffer is mandatory in every status report per communications plan §8 — this remains the single most important figure on the project. Branch 3.0 Turbine OEM variance commentary is mandatory in every report until PO release and FAT clearance, per the dominant-branch discipline in §4.
- **Change Order Reviewer.** No change orders at Week 0. Client-driven variance events would route through the change-order log per communications plan §3.1. The first candidates for change-order generation per issue log §8 are I-003 (if confirmed blackout windows differ materially from bid assumptions) and I-005 (if interconnection study delay forces acceleration recoverable through claim). Variance reports will cross-reference change orders by ID once the log activates.
- **Risk Analyst.** Charter §8 risks R1–R5 are forward-looking; this variance framework tracks their contingency allocations and their precursor issues (I-002, I-003, I-004, I-005 plus I-006 for R4). When a risk materialises, the risk register transitions the risk status to "Realised / Materialised" and this variance log records the operational event under the appropriate root-cause category. The dual update — risk register and variance log — should occur in the same reporting cycle to maintain consistency.
- **Issue Logger.** Issues whose closure would prevent variance (the five H-severity items at Week 0) carry a forward reference into this framework as variance-watch precursors per §6.3. When an issue closes with a variance event attached (e.g., I-002 closes with an OEM PO premium because of late vendor reselection), the issue log's closure entry references the variance section here where the operational event is analysed. Issues that close cleanly without variance need only the standard issue-log closure entry.
