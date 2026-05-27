# Project Schedule and Critical Path Analysis — Mariposa Wind Farm Phase 1

## 1. Project context

- **Project:** Mariposa Wind Farm Phase 1 (NW-REN-2511)
- **Client:** Mariposa Renewables Holdings (IPP)
- **Contract:** Fixed-price, $148.0M
- **Duration baseline:** ~18 months Award (22 May) → Substantial Completion (30 November, year+1)
- **Northwood PM:** J. Okafor
- **Schedule baseline date:** Week 0 (charter approval / contract signature 22 May)
- **Schedule classification:** P50 baseline; P80 contingency build separately tracked at portfolio level

## 2. Master milestone schedule

The milestones below carry the contractual baseline from charter §6 together with internal milestones added to give the critical path the granularity it needs. Charter §6 milestones are largely flagged in the charter itself; planning-inferred dates carry the inline italic annotation form.

| Milestone | Target date | Source | Payment-linked? | Critical path? |
|---|---|---|---|---|
| Contract effective | 22 May | Charter §1 | — | Start |
| Detailed Engineering 30% review | *(at draft stage [NEEDS PM REVIEW: date — charter §6 flagged])* | Charter §6 | [NEEDS PM REVIEW: confirm payment-linked] | Yes |
| Detailed Engineering 60% review | *(at draft stage [NEEDS PM REVIEW: confirm 60% review date in scheduler; required to gate OEM PO release])* | Planning-inferred | [NEEDS PM REVIEW: confirm payment-linked] | Yes |
| Long-lead turbine OEM PO released — 80 units | *(at draft stage [NEEDS PM REVIEW: PO release date — open intake item per charter §9 Assumption 4]; largest single procurement on the project)* | Charter §6 | [NEEDS PM REVIEW] | Yes — OEM on critical path |
| Detailed Engineering 90% review | *(at draft stage [NEEDS PM REVIEW: 90% review date])* | Planning-inferred | No | Selectively |
| Migratory bird permit conditions confirmed | *(at draft stage [NEEDS PM REVIEW: client confirmation pending per charter §10 Constraint 3]; gates 5.2 sequencing)* | Planning-inferred | No | Yes — constrains construction window |
| Rural road upgrades complete — both counties | *(at draft stage [NEEDS PM REVIEW: date — charter §6 flagged]; must precede first heavy-haul)* | Charter §6 | [NEEDS PM REVIEW] | Yes |
| Site mobilisation | *(at draft stage [NEEDS PM REVIEW: date — charter §6 flagged])* | Charter §6 | [NEEDS PM REVIEW] | Yes |
| Foundations complete — 80 positions | *(at draft stage [NEEDS PM REVIEW: date — charter §6 flagged]; largest civil work package)* | Charter §6 | [NEEDS PM REVIEW] | Yes |
| First turbine component delivery on site | *(at draft stage [NEEDS PM REVIEW: date driven by OEM cadence at PO acceptance; gated by road upgrades])* | Planning-inferred | No | Yes |
| Mechanical completion — turbine erection (80 units) | *(at draft stage [NEEDS PM REVIEW: date — charter §6 flagged]; weather-window sensitive)* | Charter §6 | [NEEDS PM REVIEW] | Yes |
| Substation and interconnection line complete | *(at draft stage [NEEDS PM REVIEW: date])* | Planning-inferred | No | Yes |
| First-turbine commissioning & grid synchronisation | *(at draft stage [NEEDS PM REVIEW: date]; precedent that proves the commissioning procedure)* | Planning-inferred | No | Yes |
| Power performance test complete (320 MW verification) | *(at draft stage [NEEDS PM REVIEW: test window and duration — confirm against OEM warranty terms per WBS 9.6])* | Planning-inferred | No | Yes |
| Substantial Completion | 30 November, year+1 | Charter §6 / §1 | [NEEDS PM REVIEW] | Yes |
| Grid interconnection energisation | No later than 30 December, year+1 | Charter §10 Constraint 1 | [NEEDS PM REVIEW] | Yes — hard tax-credit constraint |

Total schedule duration: approximately 558 days from contract effective to Substantial Completion. Charter §10 Constraint 1 sets the hard energisation deadline 30 days after planned SC. That 30-day window is the only float against the federal tax-credit constraint, and it sits entirely at the end of the schedule.

## 3. Critical path

The critical path runs through six sequential chains, each gating the next. Convergence points are named explicitly.

**Chain A — Detailed Engineering to OEM-ready.** Award → 30% review → 60% review. Engineering must reach the level supporting OEM PO release (WBS 2.11 OEM design interface complete to tower-loads coordination level). *(at draft stage [NEEDS PM REVIEW: duration from Award to OEM-ready engineering])*. Critical because the turbine OEM PO is the longest-lead procurement on the project and dominates every downstream chain.

**Chain B — Long-lead turbine OEM procurement.** 60% engineering → OEM PO release → OEM manufacturing across 80 units → ocean and overland shipping → first component on site. This is Northwood's largest single-OEM PO to date. There is no qualified alternate at the required cadence; concentration risk is monetary (performance bond, escalation rights) rather than schedule-substitutable. *(at draft stage [NEEDS PM REVIEW: OEM manufacturing lead time and delivery cadence to be confirmed at PO acceptance per charter §9 Assumption 4])*. **Convergence with Chain C at "first component delivery on site."**

**Chain C — Rural road upgrades for heavy-haul.** Award → road condition surveys (Counties 1 and 2) → upgrade design and DOT approvals → upgrade construction → first heavy-haul ready. Runs in parallel with Chains A and B for the first portion of the project. The two-county DOT coordination introduces serial approval risk. *(at draft stage [NEEDS PM REVIEW: road upgrade duration per county])*. The chain must finish before the first turbine component delivery in Chain B — this is the explicit convergence point with Chain B.

**Chain D — Civil construction (foundations).** Site mobilisation → site clearing and grading (gated by migratory bird blackout windows per charter §10 Constraint 3) → 80 turbine foundations → cure. Foundations gate erection one-for-one at each turbine position. *(at draft stage [NEEDS PM REVIEW: foundation construction sequence and duration; sequencing constrained by bird blackouts])*. **Convergence with Chains B and C at "first turbine erection ready" — foundation cured AND component on site at the same position.**

**Chain E — Turbine erection and electrical completion.** Component delivery and lay-down → tower erection (80 positions) → nacelle and rotor erection (80 positions, weather-window sensitive) → turbine internal completion → pre-commissioning checks. Running in parallel: substation construction → equipment installation → interconnection line construction → substation and collection-system testing. **Convergence at "mechanical completion AND substation energisation-ready" — both are required before grid synchronisation.**

**Chain F — Commissioning, performance test, energisation.** Cold commissioning → first-turbine commissioning and grid synchronisation → fleet commissioning across remaining 79 turbines → power performance test → Substantial Completion → grid interconnection energisation no later than 30 December year+1. The performance test duration and acceptance criteria are open against OEM warranty terms. *(at draft stage [NEEDS PM REVIEW: performance test duration and acceptance criteria per WBS 9.6])*.

The critical path is Award → 60% Engineering → OEM PO release → component delivery (gated by road upgrades) → foundation complete at each position → erection → substation energised → commissioning → performance test → SC → energisation. Activities not on this chain (SCADA application configuration, operator training, punch-list management, as-built documentation, road restoration) have float ranging from approximately 20 to 90 days.

## 4. Float analysis

Activities with **meaningful float (greater than 15 days)** at the planning baseline:

- **SCADA application configuration (WBS 8.5).** *(at draft stage [NEEDS PM REVIEW: float estimate — typically ~45 days on equivalent renewables projects])*. Hardware install gates with substation work; application configuration overlaps fleet commissioning.
- **Operator training (WBS 9.7).** *(at draft stage [NEEDS PM REVIEW: ~30 days])*. Delivered ahead of performance test commencement.
- **Punch-list management (WBS 9.8).** *(at draft stage [NEEDS PM REVIEW: ~30 days])*. Runs in parallel with fleet commissioning across 80 turbines.
- **As-built documentation (WBS 1.7, 10.2).** *(at draft stage [NEEDS PM REVIEW: ~60 days])*. Progressive compilation; final assembly at handover.
- **Road restoration and handback (WBS 4.7).** *(at draft stage [NEEDS PM REVIEW: ~60 days])*. Sequenced after last heavy-haul; does not gate SC if structured into demobilisation.

Activities with **near-critical float (15 days or less)** that warrant elevated monitoring:

- **SC to energisation buffer.** 30 days of float between planned SC (30 November year+1) and the hard tax-credit deadline (30 December year+1). This is the project's only buffer against the §10 Constraint 1. Any slip in Chain F that consumes this margin escalates immediately.
- **Migratory bird blackout window edges.** *(at draft stage [NEEDS PM REVIEW: float depends on blackout windows pending client confirmation per charter §9 Assumption 3])*. Site clearing and grading (WBS 5.2) sequencing has effectively zero float at the edges of any blackout period.
- **Two-county DOT approval coordination.** *(at draft stage [NEEDS PM REVIEW: float estimate; both counties' approvals must complete to support component delivery])*. Serial approvals across two county DOTs are the procedural risk; either county can become the binding constraint.
- **First-turbine commissioning sequence.** *(at draft stage [NEEDS PM REVIEW: ~10 days])*. The first turbine through the OEM commissioning sequence proves the procedure; defects discovered here typically propagate as rework across the fleet.

## 5. Schedule-linked risks

Five risks in charter §8 are schedule-bearing — each converts to a date slip on specific activities if it realises. These are a subset of the charter §8 register, viewed through a schedule lens; the register itself is not re-authored here.

| Risk (charter §8) | Schedule impact | Activity affected | Expected slip range | Mitigation in schedule |
|---|---|---|---|---|
| R1 — Single-OEM turbine supply concentration across 80 units | Direct delay to component delivery, cascading to erection and energisation | Chain B / first component delivery and fleet delivery cadence | 4–16 weeks *(at draft stage [NEEDS PM REVIEW: range depends on OEM lead time confirmed at PO acceptance])* | Early PO release, contracted delivery cadence with escalation rights, OEM performance bond, FAT on lead units (WBS 3.11), expediter on the ground at OEM factory; no qualified alternate at this capacity, so contingency is monetary not schedule |
| R2 — Federal tax-credit deadline 30 December year+1 is hard | Erodes the 30-day SC-to-energisation buffer; past 30 Dec, exposes Northwood to LD cap and client claim | Chain F / energisation | 0 days of acceptable slip past 30 Dec; any slip eroding the 30-day buffer triggers escalation | Schedule built with 30 days of buffer to SC; monthly schedule-risk review; energisation critical path tracked weekly from mobilisation onward |
| R3 — Migratory bird flyway blackout periods | Construction blackout periods compress the productive construction window for site clearing and grading | Chain D / site clearing, grading; possibly Chain E / erection if blackouts intersect erection season | 2–8 weeks *(at draft stage [NEEDS PM REVIEW: blackout windows pending client confirmation per charter §10 Constraint 3])* | Confirm blackout windows before mobilisation; sequence weather- and bird-sensitive work outside blackouts; build schedule contingency once windows confirmed |
| R4 — Rural-road upgrades across two counties | Direct delay to first heavy-haul, which gates first component delivery | Chain C / road upgrade completion → Chain B convergence | 3–10 weeks per county *(at draft stage [NEEDS PM REVIEW: range depends on DOT engagement])* | Engage both county DOTs from Day 1, dedicated Logistics Lead, road upgrades tracked as a charter milestone, parallel rather than serial work where DOTs permit |
| R5 — Rural labour market shortage / camp accommodation unresolved | Productivity loss across all on-site work packages; delayed mobilisation if camp unresolved | Chains D, E across construction phase | 2–6 weeks across the construction phase *(at draft stage [NEEDS PM REVIEW: contingent on camp build-vs-lease decision per charter §9 Assumption 6])* | Finalise build-vs-lease camp decision before mobilisation, early recruitment, retention bonuses, partner with regional trades |

## 6. Schedule baseline change control

The schedule baseline above is a P50 plan. The internal P80 plan (held in the cost-and-schedule contingency model) carries an additional *(at draft stage [NEEDS PM REVIEW: P80 contingency in weeks — Northwood convention on a project of this duration is typically 6–10 weeks; recommend 8 weeks])*, allocated provisionally as follows: 3 weeks on Chain B (OEM concentration risk), 2 weeks on Chain C (two-county DOT coordination), 2 weeks on Chain D (bird blackout exposure), 1 week on Chain F (performance test).

Re-baseline thresholds:
- Single-activity slip exceeding 14 days → schedule update, no re-baseline.
- Single-activity slip exceeding 30 days OR critical-path slip exceeding 14 days → schedule re-baseline, change-order if client-driven, internal-only if Northwood-driven.
- Critical-path slip exceeding 30 days OR any erosion of the SC-to-energisation 30-day buffer → portfolio escalation per charter §11 governance, immediate Sponsor and Client Executive Sponsor brief.

Owner of schedule baseline integrity: J. Okafor (PM), with weekly schedule reviews including the Construction Manager, Logistics Lead, Procurement Lead, and Engineering Lead. *(at draft stage [NEEDS PM REVIEW: confirm Construction Manager, Logistics Lead, and Procurement Lead assignments per stakeholder register and WBS dictionary])*.

## 7. Notes on format

Five patterns this document follows, for traceability against the Northwood worked-example convention:

1. **Master milestone table with source attribution.** Each milestone shows where it came from — charter §6 directly, charter §1 or §10, or planning-inferred. Charter milestones carry no inline annotation; planning-inferred milestones carry `*(at draft stage [NEEDS PM REVIEW: ...]; ...)*`. Several charter milestones here are themselves flagged in the source charter and carry forward those flags.
2. **Critical path as numbered chains, not a single linear narrative.** Six chains (A through F) with convergence points named — Chains B and C converge at first component delivery; Chains B, C, and D converge at first turbine erection ready; Chains E gates Chain F. The structure makes the path inspectable.
3. **Float analysis distinguishes meaningful float (>15 days) from near-critical float (≤15 days).** The 15-day threshold is a Northwood convention. The SC-to-energisation 30-day buffer is reported as near-critical because, although it is 30 days, it is the project's only buffer against a hard external deadline.
4. **Schedule-linked risks are a subset of the charter §8 risk register.** The five §8 risks all carry schedule impact; the table filters and adds expected slip ranges. Re-authoring is not performed here.
5. **P50 baseline plus P80 contingency with explicit re-baseline thresholds.** The schedule shown is the P50 plan. P80 contingency is held separately and stated in weeks per chain. Re-baseline thresholds are stated in days with explicit owner.

## 8. Notes for downstream agents

- **Budget Builder.** The critical-path activities — OEM PO (WBS 3.1), foundations (WBS 5.4), erection (WBS 7.2–7.4), substation equipment (WBS 6.4), and energisation (WBS 9.2) — are also the largest cost concentrations. The schedule contingency (provisionally 8 weeks P80) should match the budget contingency reasoning against the $5.5M Northwood contingency; if they diverge, the PM should reconcile. Camp build-vs-lease (WBS 1.8 / 3.12) is a material capex-vs-opex decision that affects both schedule mobilisation and budget structure.
- **Risk Analyst.** The five schedule-linked risks in §5 are a filtered view of the charter §8 register. R1 (OEM) and R2 (tax-credit deadline) dominate; R3 (bird blackouts) is contingent on client confirmation and could materially reshape Chain D sequencing; R4 (rural roads) is a parallel critical-path strand worth watching independently of OEM cadence. Watch for new risks emerging at the OEM design interface (WBS 2.11) and at the two-county DOT interfaces (WBS 4.2 and 4.3) — coordination-heavy packages where new risks typically surface during execution.
- **Status Reporter.** Variance-to-baseline reporting uses the milestone table in §2 as the reference. The 30-day SC-to-energisation buffer is the single most important figure to track week-on-week from mobilisation onward; any erosion is a Sponsor-level event. Re-baseline events per §6 should be called out in the next status report following the event, with rationale and impact on the energisation date.
