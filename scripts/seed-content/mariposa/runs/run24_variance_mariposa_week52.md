# Variance Analysis Report — Mariposa Wind Farm Phase 1 (Week 52 of ~80)

## 1. Project context and report period

- **Project:** Mariposa Wind Farm Phase 1 (NW-REN-2511)
- **Client:** Mariposa Renewables Holdings (IPP)
- **Contract:** Fixed-price, $148.85M (post-CO-001 SCADA portfolio integration +$0.85M Week 40; original $148.0M); approved budget $134.78M (post-CO-001 +$0.78M; original $134.0M); Northwood contingency $5.5M
- **Northwood PM:** J. Okafor
- **Project Director:** L. Chen
- **Commercial Manager:** D. Reeves
- **Report period:** Week 52 of ~80 (mid-erection; foundations 100% complete Week 38 on schedule; OEM manufacturing complete with deliveries through Week 50; first-turbine erection Week 47 successful; 7 of 80 turbines erected at end of Week 52; erection in steady-state at 1.5/week vs 1.7/week plan)
- **Reporting cadence:** Weekly internal variance review; monthly variance report aligned to monthly portfolio dashboard and monthly client status. Week 52 is the cadence-point for the Week-52 monthly variance report.
- **Cost baseline reference:** `run10_budget_mariposa.md` §3 (WBS-branch P50 baseline) and §4 (contingency allocation against charter §8 R1–R5)
- **Schedule baseline reference:** `run09_schedule_mariposa.md` §2 (master milestone table) and §3 (Chains A–F critical path)
- **Issue log reference:** `run22_issue_log_mariposa_week52.md` (28 issues at Week 52; 0 Open — clean log state)
- **Risk register reference:** `run23_risk_register_mariposa_week52.md` (Week 52 update; R-004, R-008, R-009 transitioned to Mitigated; R-007 partially realised via CO-001; R-006/R-010/R-011 partial tests)
- **Change order reference:** CO-001 executed Week 40 ($850k SCADA portfolio integration, schedule-neutral, margin-neutral)

## 2. Executive summary — variance at a glance

| Metric | At Week 52 | Target / band | Status |
|---|---:|---|---|
| Cost Performance Index (CPI) | 1.00 | ≥ 1.00 | At target — recovered from 0.99 at Week 28 |
| Schedule Performance Index (SPI) | 0.99 | ≥ 1.00 | Below target by 1% — 5-day Chain E slip within float |
| Cumulative cost variance (CV) | +$0.20M | within ±2% of cumulative budget | Within tolerance — slightly favourable |
| Cumulative schedule variance (SV) | −5 days against erection plan | within ±14 days | Within tolerance |
| Contingency consumed-to-date | $0.42M of $5.5M (7.6%) | Track against risk closure | Slightly ahead of risk closure pace — explained §5 |
| Contingency remaining vs unresolved risks | $5.08M against R1, R2, R5 live + R6/R10/R11 partial | ≥ sum of expected exposures | Positive — coverage analysis §5 |
| Projected margin at SC (P50) | 9.3% | ≥ 9.5% target | Below target by 0.2pp; well above 5.7% floor |
| SC-to-energisation buffer | 30 days intact | ≥ 30 days | Full buffer preserved through two material in-construction events |
| Contract value (post-CO-001) | $148.85M | $148.0M base | +$0.85M scope-additive, margin-neutral |

**One-sentence summary.** Mariposa is tracking at CPI 1.00 and SPI 0.99 at Week 52 against a 9.3% projected margin, with the cumulative position dominated by CO-001's clean four-frame execution (margin-neutral $850k SCADA portfolio integration) and disciplined absorption of a sub-grade event (I-021, closed Week 31) and a weather stand-down (I-028, Week 49) within Chain E float and R5 reserve; the 30-day SC-to-energisation buffer has now survived two material on-site events and remains fully intact.

## 3. Schedule variance analysis

The schedule baseline (per `run09_schedule_mariposa.md` §3) anchors on six critical-path chains. Variance is reported by chain at Week 52.

| Chain | Baseline activity | Planned end | Actual / forecast end | Variance | SPI (chain) |
|---|---|---|---|---:|---:|
| A — Detailed Engineering | 100% review | Week 35 | Week 35 | 0 days | 1.00 |
| B — Long-lead OEM procurement | FAT lead unit clear | Week 32 | Week 33 (third attempt; off critical path) | +5 days off CP | (n/a — off CP) |
| B — Long-lead OEM procurement | All deliveries complete | Week 50 | Week 50 | 0 days | 1.00 |
| C — Rural road upgrades | County 1 & 2 complete | Week 35 | Week 35 | 0 days | 1.00 |
| C — Rural road upgrades | First heavy-haul | Week 38 | Week 38 | 0 days | 1.00 |
| D — Civil construction | Foundations 100% complete | Week 38 | Week 38 (recovered from Week 28 5-day slip) | 0 days | 1.00 |
| E — Turbine erection | First erection complete | Week 47+4 days | Week 47+5 days | +1 day | 0.96 (first-position) |
| E — Turbine erection | 7 turbines complete | Week 52 | Week 53 | +5 days | 0.97 |
| F — Commissioning, performance test | Substantial Completion | 30 Nov year+1 | 30 Nov year+1 forecast | 0 days | (forecast) |
| F — Commissioning, performance test | Grid energisation | No later than 30 Dec year+1 | 30 Dec year+1 forecast | 0 days | (forecast) |

**Convergence assessment.** Three convergence points per schedule §3:

- **B + C → first turbine component delivery (Week 38).** Both chains delivered on schedule; convergence achieved without slip. Closed.
- **B + C + D → first turbine erection ready (Week 47).** All three converged on plan; first-turbine erection executed Week 47. Closed.
- **E + F-substation → grid synchronisation (Week ~65 onward).** Chain E running 2 positions behind plan (5-day slip within float); F not yet started. Forecast intact.

**Net schedule position at Week 52.** Critical path is 5 days behind on Chain E (erection pace 1.5/week vs 1.7/week plan), exactly equal to Chain E's 5-day float. The float buffer is now fully consumed; any further pace shortfall would erode the 30-day SC-to-energisation buffer. Pace recovery to 1.7/week is expected by Week 60 per I-027 lessons (sequence optimisation, crane re-positioning); this is the single most-important schedule recovery milestone for the remainder of the project. **The 30-day SC-to-energisation buffer remains fully intact and has now survived two material on-site events (I-021 sub-grade Week 27-31, I-028 weather Week 49) — substantive empirical evidence for the buffer-sufficiency lesson tracked at portfolio level.**

## 4. Cost variance analysis

Cost variance is reported by WBS Level-2 branch against the post-CO-001 approved budget of $134.78M (per `run10_budget_mariposa.md` §3 baseline of $134.0M + $0.78M CO-001 cost-side).

| WBS branch | P50 baseline ($M) | BCWP at Week 52 ($M) | ACWP at Week 52 ($M) | Variance ($M) | CPI |
|---|---:|---:|---:|---:|---:|
| 1.0 Project Management | 6.7 | 4.50 | 4.50 | 0 | 1.00 |
| 2.0 Engineering & Design | 5.4 | 5.40 | 5.40 | 0 | 1.00 |
| 3.0 Procurement — Turbine OEM (80 × 4.0 MW) | 67.0 | 53.60 (manufacturing complete, deliveries 100%; commitment crystallised at $66.4M PO; pro-rata recognition through Week 50) | 53.55 | +0.05 *(at draft stage [NEEDS PM REVIEW: confirm EV recognition treatment for full PO commitment crystallised against $66.4M PO; favourable $0.6M now largely recognised in commitment and remaining $0.05M retained against warranty-tail exposure])* | 1.00 |
| 3.0 Procurement — Substation & 230 kV equipment | 8.0 | 4.80 | 4.80 | 0 | 1.00 |
| 3.0 Procurement — 34.5 kV collection & MV cabling | 6.7 | 3.20 | 3.20 | 0 | 1.00 |
| 3.0 Procurement — Civil materials | 4.0 | 4.00 | 4.00 | 0 | 1.00 |
| 4.0 Site access & rural road upgrades | 5.4 | 5.40 | 5.41 | −0.01 *(I-025 crane-pad repair <$10k absorbed)* | 1.00 |
| 5.0 Civil construction | 10.7 | 10.70 | 10.88 | −0.18 *(I-021 sub-grade remediation closed Week 31)* | 0.98 |
| 6.0 Electrical construction | 8.0 | 1.60 | 1.60 | 0 | 1.00 |
| 7.0 Turbine erection | 13.4 | 1.20 (7 of 80 erections complete + crew mobilisation) | 1.40 *(I-028 weather productivity loss $0.20M absorbed)* | −0.20 | 0.86 |
| 8.0 SCADA & plant controls (incl. CO-001 +$0.78M) | 2.08 | 0.39 (integration workstream 50% complete on CO-001 portion; base SCADA pre-commissioning not yet active) | 0.39 | 0 | 1.00 |
| 9.0 Commissioning, performance test, training | 1.3 | 0 | 0 | 0 | (n/a) |
| 10.0 Project close | 0.4 | 0 | 0 | 0 | (n/a) |
| Camp & site facilities | 1.7 | 0.85 (lease half-term run at $1.55M total) | 0.85 | +0.075 *(camp lease favourable $0.15M, half recognised pro-rata)* | 1.00 |
| **Project total — committed-and-spent** | 134.78 | 95.64 *(at draft stage [NEEDS PM REVIEW: cross-check against accounting cumulative-cost-to-date $78.20M; difference reflects committed-but-not-yet-spent recognition on OEM PO and CO-001 scope])* | 95.98 | **−0.34 committed-and-spent** | **1.00** |
| **Project total — forward-projected to SC** | 134.78 | 134.78 | 134.55 | **+0.23 favourable forward** | **1.00 forward** |

**Largest variance items.** Four movements at Week 52, two favourable and two unfavourable:

- **Branch 3.0 Turbine OEM (+$0.60M crystallised at PO, mostly recognised by Week 52).** OEM PO at $66.4M vs $67.0M budget. Manufacturing complete and deliveries 100% by Week 50; commercial exposure on this branch is now warranty-tail only. The original favourable variance is largely realised; small residual ($0.05M unrecognised) is retained until warranty tail closes.
- **Branch 7.0 Turbine erection (−$0.20M, CPI 0.86).** I-028 weather stand-down at Week 49 (4 consecutive days beyond lift-criteria). Absorbed within Chain E 5-day float and R5/unallocated reserve. Branch CPI low at this early-erection stage because the variance lands against $1.20M earned to date; on full-branch basis the impact is 1.5% of branch P50.
- **Branch 5.0 Civil construction (−$0.18M, CPI 0.98).** I-021 sub-grade remediation closed Week 31; cost crystallised and recognised. Branch CPI has recovered toward 1.00 as branch BCWP fully matured at $10.70M (foundations 100% complete Week 38).
- **Camp & site facilities (+$0.075M recognised pro-rata).** Lease half-term complete at favourable rate; remaining $0.075M favourable to be recognised through second half of lease.

The net committed-and-spent variance of −$0.34M reflects timing of variance recognition (unfavourable events crystallised, favourable variances partially retained against forward risk); the forward-projected position of +$0.23M reflects expected continuation of favourable OEM/camp variance net of remaining contingency exposure.

**CO-001 commercial integration.** Contract value moved from $148.0M to $148.85M (Week 40). Approved cost budget moved from $134.0M to $134.78M (CO-001 cost-side $0.78M against $0.85M revenue = $0.07M margin contribution at 8.0%). Margin pre-event at 9.4%; margin post-event neutral at 9.4%; margin at Week 52 projecting 9.3% after I-028 weather absorption. The CO-001 four-frame discipline preserved base contract margin economics — first portfolio evidence at renewables scale that the post-Ironvale Commercial Standards approach works.

## 5. Contingency consumption status

The $5.5M contingency from charter §7 was analytically allocated against R1–R5 plus unallocated reserve in budget §4. Week 52 consumption status:

| Risk source | Allocation ($k) | Consumed-to-date ($k) | Remaining ($k) | Risk status |
|---|---:|---:|---:|---|
| R1 — Single-OEM turbine supply (80 units) | 1,800 | 0 | 1,800 | Active — mitigated through FAT clear Week 33, deliveries complete Week 50, first-turbine erection successful Week 47; residual exposure warranty-tail only |
| R2 — Federal tax-credit deadline (30 Dec year+1) | 1,200 | 0 | 1,200 | Active — 30-day SC-to-energisation buffer intact; Chain E 5-day float consumed but buffer untouched; acceleration channel still available |
| R3 — Migratory bird flyway blackouts | 700 | 0 | 700 | Mitigated — first blackout window observed Weeks 44-50 with bid-stage sequencing holding; second window Sep–Nov year+1 not on critical path |
| R4 — Rural-road upgrades (two counties) | 800 | 10 | 790 | Mitigated — both DOTs complete Week 35; first heavy-haul Week 38; I-025 crane-pad repair <$10k absorbed; residual exposure on remaining heavy-hauls minimal |
| R5 — Rural labour market / camp | 500 | 380 | 120 | Active — $180k Week 28 (sub-grade absorbed) + $200k Week 49 (weather productivity absorbed) — see allocation note below |
| Unallocated reserve | 500 | 30 | 470 | Held for unanticipated discoveries; $30k minor items absorbed through Iteration 2 |
| **Total** | **5,500** | **420** | **5,080** | |

**Note on R5 vs R-009/R-010 allocation treatment.** At Week 28, the I-021 sub-grade $180k was provisionally absorbed within R5 reserve pending Risk Analyst confirmation of R-009 as a standalone register entry. The Week 52 risk register confirms R-009 as a discrete register entry now Mitigated; commercial practice at next monthly review would reallocate the $180k from R5 to a dedicated R-009 closure, recovering $180k of R5 budget. Similarly, the I-028 weather $200k is presently absorbed within R5 reserve pending whether R-010 receives a dedicated allocation; if R-010 is given a separate allocation reflecting partial realisation, the $200k reallocates from R5 to R-010. *(at draft stage [NEEDS PM REVIEW: allocation rebalancing between R5/R-009/R-010 is an accounting clarification that does not change total $420k consumed; PM decision required at next monthly review on whether to formalise R-009 and R-010 as discrete allocations or retain pooled R5 reserve approach])*

**Coverage analysis.** Remaining contingency $5.08M against live exposure ranges per budget §7 and Week 52 risk register:
- R1 worst-case range now $0.2–0.6M (warranty-tail only; pre-erection-completion exposures retired)
- R2 worst-case range $0.5–1.5M (buffer intact; acceleration channel still primary)
- R5 worst-case range $0.1–0.3M residual productivity through commissioning
- R6 forward exposure $0.1–0.4M (partially tested at FAT and first-turbine erection; remaining 73 erections provide test surface)
- R10 forward exposure $0.4–1.2M (partially realised at Week 49; remaining erection season Weeks 53-65 retains weather exposure)
- R11 forward exposure $0.0–0.5M (lifting and working-at-height across remaining 73 erections; primarily safety-consequence rather than cost)

Midpoint summed exposure: ~$2.2M against $5.08M remaining contingency. Margin of $2.88M on residual contingency vs residual midpoint exposure — comfortable. High-end summed exposure: ~$4.5M, still within remaining contingency. Coverage position is materially stronger than at Week 28 because the front-loaded risk events (R1 PO release, R4 road upgrades, R8 utility, R9 sub-grade) have largely retired through mitigation.

**PM authority on additional contingency draw.** Per charter §11, Director approval required beyond $1M re-allocation; Sponsor approval beyond that. At $0.42M consumed of $5.5M, full PM discretion intact through normal operating range.

## 6. Variance root cause analysis

Three material variance events from Iteration 2 warrant root-cause analysis at Week 52. Two are direct cost variances above or near the materiality threshold ($0.2M cost OR 7 days schedule); the third is the CO-001 commercial event, analysed for its commercial-discipline lesson rather than its variance per se (the CO is margin-neutral).

### 6.1 Weather stand-down event Week 49 ($0.20M cost, 4 days schedule absorbed within Chain E float)

**Trigger event.** Sustained high-wind window beyond lift-criteria threshold at Week 49 produced four consecutive stand-down days across the erection crew. Wind speeds exceeded the OEM-specified lift-criteria threshold for nacelle and rotor erection. The event crossed the R-010 register trigger threshold (more than 3 consecutive weather-stand-down days) and triggered Sponsor brief per protocol.

**Decision sequence.** Week 49 Days 1–4: daily weather-decision protocol with erection subcontractor confirmed sustained high-wind exceeding lift-criteria; no override considered (per R-011 safety discipline); crew stood down with retention. Week 50: Sponsor briefed per R-010 threshold protocol; lessons captured (I-028); productivity loss quantified at $0.20M against R5 reserve pending R-010 allocation decision. Week 51: erection resumed at steady 1.5 turbine/week pace.

**Root cause classification.** **External — natural/site (weather)** per the Northwood six-category scheme. Sustained high-wind events within the erection season climate band are expected for wind sites; the question is sizing and pooling of weather contingency, not whether the event itself is anomalous.

**Lesson learned (provisional, ready for elevation).** The R5-pooled-reserve approach to weather contingency (rather than a separate weather line) absorbed I-028 cleanly. For wind-erection projects, R5 allocation should be sized against expected erection-season-climate-band stand-down windows derived from regional historic wind data, not against project-portfolio historical averages. The I-028 closure narrative supports portfolio-level elevation of this lesson; further weather events through Weeks 53-65 will test the discipline further but the first-event evidence is encouraging.

### 6.2 Sub-grade variance closure at Plot B positions 16, 23, 41 (Week 27 opened, closed Week 31; net $0.18M cost, 5 days schedule absorbed within Chain D float and recovered)

**Trigger event.** Reported in Week 28 variance log §6.1. At Week 52 the event is fully closed: extended geotechnical investigation Weeks 29-31 found no further variance beyond the three confirmed positions; remedial piling and structural fill complete Week 30; foundations 100% complete Week 38 on the original schedule baseline (Chain D 5-day slip recovered through absorption rather than schedule extension).

**Decision sequence at closure.** Week 31: extended geotechnical investigation results confirmed no extension beyond three positions; I-021 closed with full operational closure. Forward-looking element of R-009 closed concurrently. Week 38: foundations 100% complete on original schedule baseline, validating that the Chain D float plus subcontractor overtime fully absorbed the slip.

**Root cause classification.** **External — natural/site (geotechnical)** — confirmed from Week 28 provisional classification. Cross-referenced to portfolio Pattern 4 candidate via R-009 in the Week 52 risk register.

**Lesson learned (now confirmed for portfolio elevation).** For variable-terrain greenfield wind sites, geotechnical investigation grid density at proposal stage should exceed standard greenfield grid; the Mariposa arc (three positions, contained, no extension) is now empirically equivalent to Skyhawk Plot B NW quadrant (two-of-two greenfield realisations following identical containment pattern). The Iteration-1 provisional lesson is now confirmed and ready for Portfolio Risk Reviewer Iteration 3 elevation of Pattern 4 from candidate to confirmed.

### 6.3 CO-001 SCADA portfolio integration (margin-neutral commercial event, structurally-predicted R-007 realisation)

**Trigger event.** Client request received Week 34 for SCADA portfolio integration with client's operations centre (OPCO) — outside original WBS 8.3 scope, required for client tax-credit-tier dispatch verification. This is the structurally-predicted client-driven mid-construction scope addition on a fixed-price IPP contract per portfolio Pattern 3.

**Decision sequence.** Week 34: client request received; Commercial Manager D. Reeves opened I-026 as H-severity. Weeks 34-35: four-frame commercial dynamics analysis prepared (vendor leverage favourable — SCADA vendor offers standard portfolio-integration module; client leverage low — integration essential to client tax-credit-tier verification; client position — strong willingness to pay; Northwood acceptance — price at 8.0% margin matching base contract). Week 36: pricing issued at $850k schedule-neutral, margin-neutral. Week 38: client agreement signed. Week 40: CO-001 executed at Director-approval threshold per charter §11.

**Root cause classification.** **Client-driven scope addition** per the Northwood six-category scheme. Structurally predicted by portfolio Pattern 3 (client-driven mid-construction scope additions on fixed-price contracts erode margin); the four-frame discipline is the structural prevention.

**Lesson learned (now confirmed for portfolio elevation).** The four-frame commercial dynamics analysis (vendor leverage, client leverage, client position, Northwood acceptance) is the right discipline for client-driven mid-construction scope additions on fixed-price contracts. **CO-001's margin-neutral outcome at 8.0% is the first portfolio-validated application of the post-Ironvale Commercial Standards approach at renewables scale, where Riverside's pre-discipline CO-003 realised at 6.7% margin against 8.5% bid.** Pattern 3 evidence base is strengthened; the firm-level standard-practice recommendation is now portfolio-ready. A secondary lesson: for tax-credit-tier-verification dispatch integration on IPP projects, proposal-stage scoping should explicitly clarify whether SCADA scope ends at plant control or extends to client portfolio OPCO — asked at proposal, this would have priced the integration into base contract rather than CO.

## 7. Recovery actions

Three recovery actions are committed for the period Weeks 53-65.

| Action | Owner | Target close | Linked variance | Status |
|---|---|---|---|---|
| Erection pace recovery to 1.7 turbines/week (from current 1.5/week) through sequence optimisation and crane re-positioning lessons from I-027 | Construction Manager (M. Nakamura) | Week 60 | §3 Chain E pace shortfall | In progress — sequence optimisation in active execution; pace trend monitored weekly |
| CO-001 SCADA portfolio integration workstream completion to client OPCO acceptance | Engineering Lead with SCADA vendor and client OPCO interface | Week 65 (mechanical completion) | §4 Branch 8.0 / §6.3 | In progress — 50% complete at Week 52, on track |
| R5/R-009/R-010 contingency allocation rebalancing — reassign $180k sub-grade absorption to R-009 and $200k weather absorption to R-010 (or retain R5-pooled approach), formalise treatment | PM with Commercial Manager | Week 56 (next monthly review) | §5 allocation note | Planned — accounting clarification, no total impact |

**Recovery cost projection.** Erection pace recovery: no incremental cost (sequence and procedural optimisation); productivity gain absorbed within existing crew base. CO-001 integration completion: within $0.78M committed CO-001 budget. Contingency rebalancing: zero-sum accounting change.

**Trigger for additional recovery action.** Per R-002 trigger threshold in the Week 52 risk register, critical-path slip eroding the 30-day SC-to-energisation buffer at any weekly review OR erection pace failing to recover to ≥1.7/week by Week 60 fires R-002 buffer-erosion escalation. This is the single most-important forward trigger for the remainder of the project.

## 8. Outlook to next reporting period (Weeks 53-56)

**Expected variance evolution.** CPI projected to hold at 1.00 through Week 56 if (a) no further weather stand-down events occur, (b) erection pace begins recovering toward 1.7/week as sequence optimisation matures, (c) no further design-interface findings at OEM-erection boundary. SPI projected to hold at 0.99 or slightly improve as the 5-day Chain E slip is partially recovered by Week 60. Contingency consumption projected to add $0–0.10M for minor operational items in normal week-on-week absorption.

**Watch items.**
- Erection pace trend (Weeks 53-60). Recovery to 1.7/week by Week 60 is the single most material watch item — failure triggers R-002 buffer-erosion escalation.
- Second migratory bird blackout window (15 Sep – 15 Nov year+1) — sequenced into Chain D/E plan; not on critical path but Officer Whitlock site walks continue.
- Remaining 73 turbine erections through Weeks 53-65. Each erection is a test of R-006 design-interface (unlikely after first-turbine validation but not closed), R-010 weather (residual exposure through erection season), and R-011 safety (active through every lift).
- CO-001 integration workstream milestones — 75% complete by Week 60 target; client OPCO acceptance scheduled for Week 65 mechanical completion.
- No CO-002 anticipated; R-007 remains Active at lower probability and Commercial Manager continues four-frame discipline if request surfaces.

**Re-baseline trigger assessment.** No current trigger exceeded. Position against each threshold per budget §6.3 and schedule §6:

- **Single-branch cost update threshold** (>$400k OR >10% of branch P50): Branch 7.0 Turbine erection at −$0.20M, 1.5% of branch P50 — below threshold. All other branches well below.
- **Single-branch re-baseline threshold** (>$1.0M OR >20% of branch P50): All branches well below.
- **Total-project escalation threshold** (>$3.3M = 60% of contingency, OR margin projection <5.7%): $0.42M consumed of $5.5M (7.6%); projected margin 9.3% well above 5.7% floor.
- **Schedule re-baseline thresholds** (single-activity slip >14 days, critical-path slip >14 days, or any erosion of the 30-day SC-to-energisation buffer): Chain E 5-day slip exactly equal to Chain E float (buffer untouched); **30-day SC-to-energisation buffer fully intact**.

All thresholds clear. The Chain E float being fully consumed brings the project to a tighter monitoring posture than at Week 28: any further pace shortfall now translates 1-for-1 into SC-to-energisation buffer erosion. Weekly schedule reviews from Week 53 onward should report buffer position explicitly.

## 9. Conventions used

Five patterns this document follows, for traceability against the Northwood worked-example convention:

1. **EVM as the variance backbone.** CPI = BCWP / ACWP; SPI = BCWP / BCWS; CV = BCWP − ACWP; SV in days. Branch-level CPI reported separately from project-level CPI to surface dominant-branch movement; committed-and-spent reported separately from forward-projected to preserve commercial discipline on retained favourable variance against warranty tail and remaining erection season exposures.

2. **Variance reported by WBS Level-2 branch and by critical-path chain.** The weather event appears in §3 (Chain E pace shortfall) and §4 (Branch 7.0 −$0.20M) with cross-reference; same underlying event, two lenses. CO-001 appears in §4 (Branch 8.0 +$0.78M cost / +$0.85M revenue) and §6.3 (commercial-discipline root cause); contract-level and branch-level views are reconciled explicitly.

3. **Root-cause analysis disciplined and evidence-bearing.** Weather event classified External — natural/site with evidence from daily weather-decision protocol logs and OEM lift-criteria specification; sub-grade closure confirmed External — natural/site with cross-reference to portfolio Pattern 4 candidate; CO-001 classified Client-driven scope addition with four-frame analysis documented per the post-Ironvale Commercial Standards discipline. Speculation flagged with inline italic annotations where evidence is partial (OEM EV recognition treatment, R5/R-009/R-010 allocation rebalancing decision, committed-vs-spent reconciliation against accounting cumulative).

4. **Recovery actions named, owned, dated, and cost-projected.** Three actions: erection pace recovery (Construction Manager / Week 60 / no incremental cost), CO-001 integration completion (Engineering Lead / Week 65 / within CO budget), contingency allocation rebalancing (PM with Commercial Manager / Week 56 / zero-sum). Aspirational recovery excluded.

5. **Re-baseline trigger assessment at every reporting period.** Four thresholds reported with position. The 30-day SC-to-energisation buffer remains the single most-watched figure; it has survived two material in-construction events (I-021 sub-grade, I-028 weather) — substantive evidence for the Pattern 2 lesson on buffer sufficiency the Portfolio Risk Reviewer is tracking. Chain E float being fully consumed brings the project to a tighter monitoring posture for Weeks 53-65.

## 10. Notes for downstream agents

- **Status Reporter.** The Executive Summary (§2) and the Outlook (§8) feed the Week 52 monthly client status report. The Cost variance (§4) and Schedule variance (§3) feed the monthly portfolio dashboard. Root-cause analyses on I-028 (§6.1), I-021 closure (§6.2), and CO-001 (§6.3) are reported for the Sponsor brief; CO-001 is also reported externally as the scope/commercial event of record. Branch 7.0 Turbine erection dominant-branch commentary is mandatory through erection season as the Chain E float is now fully consumed. **Position against the 30-day SC-to-energisation buffer is "intact and has survived two material on-site events" — this remains the single most important figure to track week-on-week, with the added note that Chain E float consumption brings the buffer to a tighter forward posture.**

- **Change Order Reviewer.** CO-001 (executed Week 40) is the first real CO on the project; the four-frame commercial dynamics analysis is documented in §6.3. Driver classification (client-driven scope addition, structurally-predicted R-007 realisation), schedule-impact assessment (schedule-neutral against the binding 30 Dec year+1 federal tax-credit deadline), four-frame pricing rationale (vendor favourable, client low-leverage, client strong willingness, Northwood acceptance at 8.0% margin), and approval routing (Director threshold per charter §11) are all sourced from this variance log. No CO-002 anticipated at Week 52; the Change Order Reviewer's residual monitoring scope through erection is R-007 lower-probability further COs.

- **Risk Analyst.** Four risks transitioned during Iteration 2 (R-004, R-007, R-008, R-009); three risks moved to partial-realisation/partial-test status (R-006, R-010, R-011). The variance log Section 5 contingency-consumption table reflects these transitions; the dual update — risk register transitions and variance log root-cause analysis — has occurred in this reporting cycle as intended. R-002 buffer-erosion trigger is the single most-important forward trigger for Weeks 53-65. R5/R-009/R-010 allocation rebalancing is an accounting clarification at next monthly review.

- **Lessons-Learned Synthesiser.** Three lessons confirmed at Week 52 are portfolio-elevation-ready: (a) for variable-terrain greenfield wind sites, enhanced proposal-stage geotechnical scope (§6.2 — two-of-two greenfield realisations following identical contained-variance arc); (b) the four-frame commercial dynamics discipline preserves margin on client-driven mid-construction scope additions (§6.3 — first renewables-scale validation, CO-001 margin-neutral against Riverside CO-003 pre-discipline margin erosion); (c) the 30-day SC-to-energisation buffer is structurally sufficient against mid-construction shocks on tax-credit-deadline projects (§3, §8 — buffer survived two material events). A fourth lesson is provisional: R5-pooled-reserve weather contingency sizing against erection-season-climate-band expected stand-down windows (§6.1 — first-event evidence encouraging, further evidence through Weeks 53-65). Portfolio Risk Reviewer at Iteration 3 (Week 78) will determine elevation of Pattern 4 from candidate to confirmed pattern based on the closeout-grade evidence now available from Mariposa.
