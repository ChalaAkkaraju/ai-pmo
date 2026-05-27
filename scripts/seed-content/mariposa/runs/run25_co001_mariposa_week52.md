# Change Order Analysis Package — Mariposa Wind Farm Phase 1 (CO-001: SCADA Portfolio Integration, Week 40)

> **Note on this document's role.** This is the first Change Order Analysis Package executed against a real change on Mariposa, following the Week 0 framework established in `run14_change_order_mariposa.md`. CO-001 was negotiated Weeks 34–38 and executed Week 40. This package is the retrospective formal analysis prepared by PM J. Okafor and Commercial Manager D. Reeves at Week 40 to confirm the four-frame commercial dynamics reasoning, schedule absorption, risk position, and authorising context against charter §11 routing. The package is the artefact the Project Director endorsed and is the format CO-002 and any subsequent change orders on the project will follow.

## 1. Change context

- **Change order ID:** CO-001 (first change order on the project)
- **Project:** Mariposa Wind Farm Phase 1 (NW-REN-2511)
- **Client originator:** D. Bridges (Client Lead, Mariposa Renewables Holdings) with G. Castillo (Client Executive Sponsor, VP Operations) backing on the commercial event
- **Request date:** Week 34 (formal written request); informal indication Week 33 during monthly client status
- **Driver classification:** **Client-driven** — change originates from the client's tax-credit-tier dispatch-verification requirement, not from Northwood execution discovery, regulator action, or scope ambiguity in the original contract
- **Driver detail:** The client requires Mariposa's SCADA system to integrate with its portfolio operations centre (OPCO) so that fleet-level dispatch from the OPCO can verify Mariposa's contribution to the client's higher federal tax-credit tier qualification. The original WBS 8.3 SCADA scope assumed Mariposa-only plant-control integration (turbine SCADA to substation/plant control); OPCO portfolio integration is a distinct workstream covering Modbus TCP gateway, secure VPN, and portfolio-dashboard API. The client's underlying need — tax-credit-tier dispatch verification — is the same regulatory and economic mechanism that defines the 30 December year+1 hard deadline in charter §10 Constraint 1; the integration is a parallel commercial mechanism, not a schedule mechanism.
- **Analysis date:** Week 40 (formal package; commercial analysis prepared Weeks 34–35; pricing issued Week 36; client agreement signed Week 38)
- **Northwood PM:** J. Okafor
- **Commercial Manager:** D. Reeves
- **Project Director:** L. Chen
- **Sponsor:** VP Renewables

## 2. Scope impact

**New scope (in):**
- Modbus TCP gateway sized for portfolio-dashboard polling cadence, installed in the Mariposa SCADA cabinet
- Secure site-to-OPCO VPN with client-supplied endpoint configuration on the OPCO side
- Portfolio-dashboard API integration: data-tag mapping from Mariposa SCADA point list to client's portfolio data model
- Factory and site integration testing with client OPCO participation
- OPCO-acceptance test as a discrete sub-test within Mariposa SCADA commissioning
- Operator-procedural documentation update for OPCO-coordinated dispatch operations
- 24-month warranty on the integration scope, running from CO-001 mechanical completion (Week 65 target)

**Existing scope unchanged:**
- WBS 8.3 plant-level SCADA scope (turbine SCADA → substation → plant control)
- WBS 8.5 SCADA application configuration
- Charter §4.1 in-scope items relating to commissioning, performance testing, and operator training (unaffected)
- 30 November year+1 Substantial Completion target and 30 December year+1 energisation deadline (charter §1, §10)
- Performance test sequence and acceptance criteria (I-019, closed Week 32)

**Out of scope (explicitly):**
- Client OPCO-side configuration, network policy, and firewall — client-owned
- Portfolio-dashboard application development on the OPCO side — client-owned
- Cybersecurity penetration testing of the OPCO environment — client-owned
- Future OPCO data-model changes after Mariposa CO-001 mechanical completion — handled via post-warranty support agreement, not CO-001
- Dispatch-decision logic and operations protocols at the OPCO — client-owned

**Out-of-scope risk flag:** The Mariposa integration to OPCO is a one-to-one technical interface; if the client adds further Phase 2 / portfolio sites that change the OPCO data model in ways that propagate back to Mariposa's SCADA configuration, that change would be a separate CO. The as-built handover documentation should clearly fix the OPCO data-model version at CO-001 mechanical completion so future portfolio expansion does not relitigate the CO-001 boundary.

## 3. Schedule impact

**Critical-path assessment.** The CO-001 integration workstream runs in parallel with WBS 8.3 plant-level SCADA work and does not gate any Chain A–F critical-path activity. SCADA application configuration (WBS 8.5) carried approximately 45 days of float at planning baseline per schedule §4; the integration workstream consumes part of that float but completes ahead of Chain F commissioning. No Chain E erection or Chain F commissioning activity is delayed.

**Schedule delta:**

| Activity | Original plan | With CO-001 | Variance |
|---|---|---|---|
| WBS 8.3 plant SCADA installation | Weeks 60–66 | Weeks 60–66 | 0 days |
| CO-001 Modbus gateway + VPN install (new) | (n/a) | Weeks 56–60 (in float) | 0 days critical-path impact |
| CO-001 API integration & data-tag mapping (new) | (n/a) | Weeks 58–63 (parallel to plant SCADA) | 0 days critical-path impact |
| CO-001 OPCO-acceptance integration test (new) | (n/a) | Week 64–65 (within SCADA commissioning window) | 0 days critical-path impact |
| Mechanical Completion (Mariposa SCADA including CO-001) | Week 66 plant SCADA | Week 65 (CO-001 closes one week ahead of plant SCADA MC, by design) | 0 days |
| Substantial Completion | 30 November year+1 | 30 November year+1 | 0 days |
| Grid energisation | No later than 30 December year+1 | No later than 30 December year+1 | 0 days |

**Net critical-path impact:** 0 days. **Position against binding constraint:** the 30-day SC-to-energisation buffer (charter §10 Constraint 1) is unaffected by CO-001; the buffer remains 30 days at signature and at Week 52 remains 30 days intact, having since survived the I-021 sub-grade event and the I-028 weather stand-down.

**LDs assessment.** Contract LDs per charter §7 (0.5%/week capped at 8%, $11.84M against post-CO-001 contract value $148.85M = $11.91M cap, effectively unchanged) apply only to slip past contract SC. CO-001 is schedule-neutral and includes no SC adjustment; LDs trigger conditions are unchanged.

**Buffer-erosion threshold assessment.** Per the Week 0 framework §3, any change order eroding the 30-day buffer by more than 5 days requires Sponsor brief, and any erosion past 15 days requires Client Executive Sponsor briefing. CO-001 erodes 0 days. No buffer-threshold escalation triggered by this change.

## 4. Cost impact

**Cost decomposition (Northwood):**

| Cost line | Estimated cost ($k) | Confidence |
|---|---:|---|
| Modbus TCP gateway hardware + portfolio-dashboard-API licence (SCADA vendor standard portfolio-integration module) | 310 | Tight — vendor quote received Week 35 against standard module |
| VPN appliance + secure-tunnel configuration (Northwood self-perform with vendor support) | 80 | Tight — standard Northwood scope |
| Data-tag mapping engineering (point list × OPCO data model; ~1,400 tags) | 140 | Medium — engineering effort dependent on OPCO data-model finalisation |
| Factory integration test (vendor facility) | 60 | Tight — fixed-price vendor quote |
| Site integration test + OPCO-acceptance test (Northwood with client OPCO participation) | 90 | Tight — Northwood standard scope |
| Operator-procedural documentation update | 30 | Tight — Northwood standard |
| PM/CM overhead allocated to CO-001 workstream | 70 | Tight — Northwood standard rate × workstream duration |
| **Total estimated cost** | **780** | |

**Pricing position:**

| Line | Value ($M) |
|---|---:|
| Northwood cost (per decomposition) | 0.78 |
| Northwood margin at project bid margin (9.5%) | 0.082 |
| Theoretical price at bid margin | 0.862 |
| **Negotiated price (with client)** | **0.85** |
| Realised margin on CO-001 | $0.07M (8.2%) |
| Realised margin vs project bid margin | −1.3 percentage points |

*Note on margin reporting: the events brief and Week 52 variance log describe CO-001 as "margin-neutral at 8.0%." The 8.0% figure rounds the realised margin on the CO scope; the precise calculation against $0.78M cost and $0.85M price yields 8.2% on the CO itself. Both figures sit comfortably above the 5.7% margin floor and meaningfully above the worked-example precedent (Riverside CO-003 at 6.7%); the discipline question — was the four-frame analysis sufficient to preserve project economics — is answered yes either way.*

**Pricing rationale.** The negotiated $0.85M reflects the four commercial dynamics analysed Weeks 34–35 by Commercial Manager D. Reeves:

- *Vendor leverage on Northwood.* **Favourable to Northwood.** The SCADA vendor offers a standard portfolio-integration module priced against a published quote; this is not a sole-source accelerated procurement (contrast Riverside CO-003 UV equipment, Pattern 1 leverage). Competitive procurement was not pursued because the integration must use the same SCADA vendor as the plant scope; that constraint sets vendor-side pricing at standard catalogue rates, not at accelerated-CO premium rates. Cost confidence is Tight on the dominant line.
- *Client leverage on Northwood.* **Low.** Refusing the change would not break the base contract, but it would push the client to procure portfolio integration separately post-handover, which is operationally awkward and which the client signalled would be a relational negative against the Phase 2 prospect *(at draft stage [NEEDS PM REVIEW: Phase 2 prospect status flagged in framework §5; verbal indication from G. Castillo Week 33 monthly status that Mariposa Phase 2 is "actively in capital planning"; confirm at Director-level before treating as commercial input])*. The relational dimension is real but secondary; the dominant fact is that refusal would not cost Northwood the base contract.
- *Client position.* **Strong willingness to pay.** Portfolio integration is essential to the client's tax-credit-tier dispatch verification; without it, the client cannot operationally demonstrate Mariposa's contribution to the higher tax-credit tier the project was designed to capture. The same regulatory pressure that drives charter §10 Constraint 1 (the 30 December year+1 deadline) drives this commercial event. Client signalled an upper price tolerance around $0.85M based on internal capital allocation; above this would have required a separate capital-approval step on the client side.
- *Northwood acceptance.* **Acceptable margin against acceptable risk.** 8.2% realised margin sits 1.3 percentage points below the 9.5% bid margin and well above the 5.7% margin floor (per budget §2). Northwood Director endorsement reflects (a) the scope is in Northwood's electrical/controls strength area, (b) the schedule absorption inside existing WBS 8.5 float preserves base-contract performance, (c) the Phase 2 prospect dimension is a legitimate-but-explicit commercial input, (d) the integration is technically low-risk (standard vendor module, mature interface).

**Cost-baseline impact:** CO-001 adds $0.85M to contract value (from $148.0M to $148.85M) and $0.78M to approved cost budget (from $134.0M to $134.78M). Project P50 margin moves from 9.5% to **9.4%** pre-event (margin-neutral character of the CO preserves base-contract economics; the 0.1 percentage-point movement reflects mathematics of adding a slightly-lower-margin scope to a higher-margin base). At Week 52, after absorption of I-021 sub-grade ($0.18M) and I-028 weather ($0.20M) within R5 reserve, projected margin sits at 9.3% — well above the 5.7% floor.

**Contingency impact:** Northwood contingency $5.5M (charter §7) is unaffected by CO-001 directly — the change carries its own commercial structure and is not drawn from contingency. The variance log §5 confirms $0.42M of $5.5M consumed at Week 52 (sub-grade + weather + minor items), entirely unrelated to CO-001.

## 5. Commercial position and recommended pricing

**Recommendation: ACCEPT-WITH-CONDITIONS at $0.85M with the conditions listed in §8.**

The recommendation reflects four judgments:

*Margin acceptable.* 8.2% is below project bid margin (9.5%) but materially above the 5.7% floor and above the 6.7% Riverside CO-003 precedent. The four-frame discipline successfully priced this CO against the client's willingness-to-pay anchor rather than against an accelerated-vendor floor.

*Schedule absorbs cleanly.* 0-day critical-path impact; 30-day SC-to-energisation buffer untouched. The integration workstream runs in WBS 8.5 float and closes one week ahead of plant SCADA mechanical completion by design.

*Strategic dimension explicit.* The Phase 2 prospect is a real commercial input and is named in §4 four-frame analysis rather than absorbed implicitly into the pricing recommendation. This is the discipline the Riverside CO-003 worked example flagged as a firm-level lesson and that the post-Ironvale Commercial Standards adopted.

*Technical risk low.* Vendor's standard portfolio-integration module is mature; no novel engineering; no new charter §8 risks introduced (see §6).

**Recommendation rejected alternatives:**

- *Accept at bid margin (price $0.862M).* Client's signalled ceiling sat at $0.85M; pricing 1.5% above ceiling would have required client capital-approval re-cycle, delaying signature past Week 38 and potentially into the second blackout-window monitoring period. The 0.3-percentage-point margin gain did not justify the relational and timing cost. Rejected.
- *Absorb at lower margin (e.g., $0.78M = zero margin).* Would have established a precedent for absorbing client portfolio-integration scope at cost, with knock-on implications for any Phase 2 commercial negotiation and for any further Mariposa Phase 1 mid-construction CO. The four-frame analysis showed the client was willing to pay; absorbing margin would have under-priced the discipline that protects future CO economics. Rejected.
- *Reject and decline scope.* Would have forfeited $0.07M margin contribution, weakened the Phase 2 commercial position, and pushed the client to post-handover separate procurement that would have created operational and warranty-boundary complications. The downside of rejection exceeded the upside of preserving 0.1 percentage point of base-contract margin. Rejected.

## 6. Risk assessment

**New risks introduced by CO-001:**

| New risk | Category | Probability | Impact | Response |
|---|---|---|---|---|
| OPCO data-model finalisation by client slips, delaying data-tag mapping engineering | Schedule | L | L | Mitigate — data-model snapshot taken at CO-001 signature (Week 38); change-orders against post-signature OPCO model changes are out-of-scope per §2; client commitment to model freeze at Week 50 |
| Site-to-OPCO VPN cybersecurity acceptance by client IT introduces unanticipated configuration constraints | Technical | L | L | Mitigate — VPN configuration spec circulated to client IT Week 38 for early review; client IT acceptance gated before Week 56 install window |
| OPCO-acceptance test fails at Week 64–65 due to portfolio-dashboard API mismatch | Technical | L | M | Mitigate — factory integration test at vendor facility (Week 58) validates API ahead of site test; rework path exists within Chain F float on commissioning |

**Existing charter §8 risks materially changed by CO-001:**

| Charter §8 risk | Direction of change | Rationale |
|---|---|---|
| R-001 — Single-OEM turbine supply | Unchanged | CO-001 does not touch turbine OEM scope |
| R-002 — Federal tax-credit deadline | Unchanged | CO-001 is schedule-neutral; 30-day buffer untouched; CO-001 in fact supports client's tax-credit-tier *verification* mechanism but does not affect Northwood's energisation commitment |
| R-003 — Migratory bird flyway blackouts | Unchanged | CO-001 is indoor controls scope |
| R-004 — Rural-road upgrades | Unchanged | No heavy-haul implications |
| R-005 — Rural labour market / camp | Unchanged | CO-001 staffing absorbed within existing controls engineering team |
| R-006 — OEM design-interface | Unchanged | CO-001 is downstream of OEM-turbine boundary |
| R-007 — Client-driven mid-construction CO | **Partially realised** | CO-001 *is* the realisation of R-007; R-007 remains Active forward-looking at lower probability through erection and commissioning |
| R-008 — Regional utility interconnection | Unchanged | OPCO integration is client-internal, not utility-side |
| R-010 — Weather / climate-sensitive construction | Unchanged | Indoor scope |
| R-011 — Safety / HSE | Unchanged | Low-risk controls work |
| R-012 — Stakeholder / opposition | Unchanged | No external visibility |

**Net risk position.** Three new low-probability risks added, two L impact and one M impact. R-007 transitions from Active-anticipated to Active-partially-realised; remaining R-007 probability through erection and commissioning rated lower (the structurally-predicted SCADA portfolio integration was the dominant anticipated CO category per Week 0 framework §1.2). No contingency reallocation required; $0.5M unallocated reserve and remaining $5.08M overall coverage at Week 52 are comfortable against residual exposures (variance log §5).

## 7. Recommendation

**ACCEPT-WITH-CONDITIONS at $0.85M** subject to the six conditions in §8.

**Authority level required.** Per charter §11 thresholds confirmed at I-014 closure (PM up to $100k, Director up to $1M, Sponsor above $1M):

- CO-001 cost-side at $0.78M and revenue-side at $0.85M sits within Director authority and above PM authority.
- CO-001 is schedule-neutral and does not affect energisation date or permitted construction methods, so the charter §11 mandatory-Sponsor-on-energisation-touching-changes provision does not apply.
- **Project Director (L. Chen) authorisation required. Sponsor (VP Renewables) notification only; CFO (M. Hartford) not in routing path (CFO escalation trigger per I-015 is $20M contract-value and project-financial-distress thresholds, neither triggered).**

**Decision timeline (actual).** Commercial analysis Weeks 34–35; pricing issued Week 36; client agreement signed Week 38; CO-001 executed Week 40. Integration workstream complete Week 65 (target) for handover into Chain F commissioning.

## 8. Approval routing and conditions

**Conditions on CO-001 acceptance:**

1. CO-001 commercial terms documented in standalone contract amendment, not absorbed into base contract — preserves audit trail of the four-frame commercial dynamics reasoning and the realised margin on this specific scope. (Audit-trail discipline; mirrors Riverside CO-003 condition 4 from worked example.)
2. Substantial Completion target unchanged at 30 November year+1; energisation deadline unchanged at no later than 30 December year+1; LDs continue to run from the contractual SC date with no extension. (Schedule-neutral confirmation; explicit so future change orders cannot relitigate the SC anchor.)
3. OPCO data model fixed at the snapshot taken at CO-001 signature Week 38. Post-signature client-side OPCO data-model changes are out-of-scope; any propagation back to Mariposa SCADA configuration is a separate CO. (Scope-boundary clarification; addresses the out-of-scope risk flag in §2.)
4. Site-to-OPCO VPN configuration specification submitted to client IT for acceptance no later than Week 50; client IT acceptance gated before Week 56 install window. (Operational precondition; protects against late-discovered configuration constraints in the new-risk table §6.)
5. Warranty on CO-001 integration scope runs 24 months from CO-001 mechanical completion (Week 65 target), not from project Substantial Completion. Spare integration-hardware inventory transfers to client at CO-001 mechanical completion. (Downstream warranty start; preserves Northwood's warranty exposure window on the integration scope independent of base-contract warranty start.)
6. CO-001 OPCO-acceptance test forms a discrete pass/fail sub-test within Mariposa SCADA commissioning. Acceptance test acceptance criteria documented in CO-001 amendment, not in base-contract commissioning protocol. (Test discipline; ensures acceptance is operationally verifiable, not a vague subjective sign-off.)

**Approval routing (executed):**

- PM (J. Okafor) → recommended ACCEPT-WITH-CONDITIONS — Week 35.
- Commercial Manager (D. Reeves) → confirmed pricing and four-frame commercial terms — Week 35.
- Project Director (L. Chen) → endorsed and authorised — Week 36 (within Director authority).
- Sponsor (VP Renewables) → notified for monthly portfolio dashboard awareness — Week 36; no authorisation required.
- CFO (M. Hartford) → not in routing path.
- Client Lead (D. Bridges) → coordinated client-side approval — Week 36–38.
- Client Executive Sponsor (G. Castillo) → client-side authorisation — Week 38; client signature on amendment Week 38.
- CO-001 executed (both signatures complete) — Week 40.

**Reporting routing post-signature (executed):**

- Status Reporter: CO-001 disclosed at Week 40 monthly client status (revised contract value $148.85M; SC and energisation unchanged) and at monthly portfolio dashboard (cost impact, margin impact, no contingency consumption, no buffer impact). Reaffirmed at Week 52 monthly status.
- Issue Logger: I-026 closed Week 40 with CO-001 cross-reference; integration workstream tracked through closeout via Linked-WBS field (WBS 8.3) and via construction reporting through Week 65 mechanical completion.
- Variance Analyst: CO-001 incorporated into cost baseline from Week 40; variance reports from Week 40 onward use $148.85M / $134.78M revised baselines. Week 52 variance log §4 confirms incorporation.
- Risk Analyst: Risk register updated Week 40 — three new CO-001 risks added (per §6 table); R-007 transitioned Active → Active partially realised. Risk register Week 52 update confirms transitions.

## 9. Conventions used

Five patterns this document follows, for traceability against the Northwood worked-example convention and the Week 0 framework:

1. **Driver classification first.** CO-001 is opened with explicit classification as Client-driven (not Northwood-driven, External regulatory, or Scope clarification). The classification is what framed every downstream judgment: pricing position anchored on client willingness-to-pay rather than Northwood cost recovery; schedule absorption analysed against existing float rather than baseline; risk allocation kept on client side for OPCO-internal scope. Without the driver classification opening the analysis, the four-frame pricing rationale would lack its anchor.
2. **Schedule impact assessed against existing float, not against original baseline only.** CO-001's 0-day critical-path impact says little in isolation; what matters is the explicit naming of the binding constraint (the 30-day SC-to-energisation buffer against charter §10 Constraint 1) and the computation that the buffer remains 30 days intact. The integration workstream consumes part of the WBS 8.5 ~45-day float but does not touch Chain F commissioning timing — and this is stated, not implied.
3. **Pricing rationale lays out the four commercial dynamics.** Vendor leverage (favourable — standard vendor module, not accelerated sole-source), client leverage (low — refusal would not break the contract), client position (strong — tax-credit-tier dispatch-verification driven), Northwood acceptance (acceptable margin and risk, Phase 2 prospect named explicitly). The four-frame discipline is what distinguishes CO-001's 8.2% margin outcome from Riverside CO-003's 6.7% margin outcome — same firm, two project generations, with the post-Ironvale Commercial Standards in between.
4. **Recommendation supported by rejected alternatives.** Three alternatives explicitly rejected with rationale: accept at bid margin (rejected on client capital-approval timing cost), absorb at zero margin (rejected on precedent risk for Phase 2 negotiations), reject scope (rejected on Phase 2 relational cost and downstream warranty-boundary complications). Each rejection is auditable, not dismissed by omission.
5. **Conditions on acceptance are explicit and operationally specific.** Six conditions, each with operational language a contract amendment adopts: standalone amendment for audit trail, SC anchor preserved, OPCO data-model freeze at signature, VPN spec submission timing gate, downstream warranty start, discrete acceptance test with documented criteria. Vague conditions are absent; specific commitments the client signed against are present.

## 10. Notes for downstream agents

- **Status Reporter.** CO-001 has been the headline commercial event in three monthly status reports (Week 40 disclosure, Week 44 progress, Week 52 mid-execution at 50% integration workstream complete). At Week 65 mechanical completion of the integration workstream, CO-001 closes as a discrete deliverable in the monthly status. The post-CO-001 contract value ($148.85M) is the figure of record from Week 40 onward; the 30-day SC-to-energisation buffer position continues to be reported every monthly status regardless of whether CO-001 has further movement (the buffer is the project's single most-watched figure per the Week 0 framework and per variance log Week 52).
- **Issue Logger.** I-026 closed Week 40 with CO-001 cross-reference. CO-001 has not generated post-signature operational issues through Week 52; the three new risks in §6 are tracked in the risk register, not in the issue log, because they have not materialised. If the Week 50 client-IT VPN acceptance gate (condition 4) slips, that would open a new issue with Linked-change-order field set to CO-001. The data-model snapshot at signature (condition 3) protects against future relitigation; any post-signature OPCO model change would similarly open a new issue and likely a CO-002 candidate.
- **Variance Analyst.** Week 52 variance log §4 has fully incorporated CO-001 into Branch 8.0 ($2.08M post-CO-001 = $1.30M base SCADA + $0.78M CO-001), with $0.39M ACWP recognised against 50% workstream completion. The post-CO-001 baselines ($148.85M contract / $134.78M cost) are the references for all variance reporting from Week 40 onward. The 8.2% CO-001 realised margin is the firm-level evidence on which the Variance Analyst's §6.3 four-frame-discipline lesson rests; this Change Order Analysis Package is the source artefact for that lesson.
- **Risk Analyst.** R-007 transitioned at CO-001 execution to Active partially realised; residual probability through remaining erection and commissioning is rated lower per Week 52 risk register. The three new CO-001 risks in §6 (OPCO data-model slip, VPN cybersecurity acceptance, OPCO-acceptance test failure) are register-trackable; at Week 52, all three remain at original L probability with no realisation signals. If CO-002 surfaces, the four-frame discipline is the proven template — vendor leverage, client leverage, client position, Northwood acceptance — with explicit rejected-alternatives.
- **Lessons-Learned Synthesiser.** CO-001 is the canonical worked example on Mariposa of the post-Ironvale Commercial Standards four-frame discipline working at renewables scale. Three lessons are flagged for closeout synthesis: (a) the four-frame discipline preserves margin where Riverside CO-003 pre-discipline practice did not — first portfolio evidence at renewables scale, validating Pattern 3 firm-level standard practice; (b) for tax-credit-tier-verification dispatch integration on IPP projects, proposal-stage scoping should explicitly clarify whether SCADA scope ends at plant control or extends to client portfolio OPCO — asked at proposal, this would have priced the integration into base contract rather than CO, eliminating the 1.3 percentage-point margin compression entirely; (c) standardised vendor portfolio-integration modules (where the SCADA OEM offers the integration as a catalogue product) prevent the sole-source-accelerated-vendor leverage that drives margin erosion on Pattern 1 procurement events — the favourable vendor-leverage frame here is an exception to the dominant Northwood pattern and worth flagging as a sub-condition under which client-driven mid-construction CO economics are structurally better than the Pattern 3 base case.
