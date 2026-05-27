# Work Breakdown Structure (WBS) — Ironvale Smelter Modernisation

> **Note on this document's role as a worked example.** This is the COMMITTED WBS for Ironvale Smelter Modernisation as it stood at the end of the Planning phase (eight weeks after charter approval), and as it was refined through Engineering. When the WBS Builder agent uses this as a worked example for decomposing a new project's scope, items shown with inline italic annotations — work-package owners, duration estimates, cost ranges, and any third-level decomposition that depended on engineering progression — should appear at the draft stage as `[NEEDS PM REVIEW: <value>]` rather than as the resolved values shown here. The final values shown are what the Northwood PM committed during the Planning sequence; a new project's draft WBS would carry these in flagged form until equivalent commitments are made.

## 1. Project context (for reference)

- **Project:** Ironvale Smelter Modernisation (NW-IND-2110)
- **Client:** Ironvale Metals Group
- **Contract:** T&M with $30M cap; working value $26.5M
- **Duration:** Award 14 August → Mechanical Completion 30 June year+1 (~11 months)
- **Northwood PM:** P. Beaumont
- **WBS baseline date:** Week 8 post-charter, after Engineering 30% review

## 2. WBS structure

Deliverable-oriented decomposition per PMBOK §5.4 (Create WBS). Decomposition uses the 100% Rule — every element of project scope is captured at exactly one place in the hierarchy. Numbering follows the standard outline convention.

### 1.0 Project Management

- **1.1 Project planning & scheduling.** Master schedule maintenance, baseline change control, two-week look-ahead. *(committed)*
- **1.2 Cost control & T&M reporting.** Monthly client invoice preparation, internal cost-to-complete forecasting, cap-tracking. *(committed; cap-tracking discipline is the differentiator from fixed-price PM)*
- **1.3 HSE management.** Site safety plan, daily toolbox talks, incident reporting, contractor onboarding. *(committed)*
- **1.4 Quality management.** Quality plan, inspection-and-test plan (ITP) management, non-conformance management. *(committed)*
- **1.5 Risk & change-order management.** Risk register maintenance, change-order log, T&M variation justification packages. *(committed)*
- **1.6 Stakeholder & client coordination.** Client interface (T. Hartnett embedded), regulator liaison, weekly status meetings. *(committed)*
- **1.7 Documentation & as-builts.** Document control, drawing management, as-built drafting, handover dossier compilation. *(committed)*

### 2.0 Engineering & Design

- **2.1 Existing conditions survey & verification.** Walk-down of existing furnace bays, validation of client's digitised plant records, field measurements where records are absent. *(committed; the client's pre-project digitisation is the reason this work package is sized conservatively. At draft stage this was `[NEEDS PM REVIEW: scope contingent on client record accuracy]`; record accuracy confirmed at Week 3)*
- **2.2 Process engineering — Furnace Lines A & B.** Heat and mass balance, melt-rate calculations, refractory sizing, process-control narrative. *(committed)*
- **2.3 Mechanical design — Furnace Lines.** Furnace structure, charging mechanisms, tap-hole design, off-gas hooding, water-cooling system. *(committed)*
- **2.4 Electrical design — power & MCC.** Furnace transformer sizing, MCC layouts, motor schedules, cable sizing. *(committed)*
- **2.5 I&C / SCADA system architecture design.** Network architecture, PLC selection, HMI design, alarm management philosophy, integration with existing Line C SCADA. *(committed)*
- **2.6 Environmental controls design — baghouse & scrubber.** Equipment sizing for Rule 27 compliance, ducting design, CEMS specification. *(committed; Rule 27 design margin set at 25% above limit at draft stage `[NEEDS PM REVIEW: confirm design margin with client and regulator]`; 25% margin confirmed at 30% review)*
- **2.7 Structural & foundation design.** Foundations for new furnace lines, baghouse and scrubber platforms, ducting supports, modifications to existing structural steel. *(committed)*
- **2.8 Tie-in engineering.** Crucible bay interface, services tie-ins (water, compressed air, electrical), shutdown sequencing. *(committed; the shutdown-week sequence is engineered to a 7-day window per charter Assumption 2)*
- **2.9 Engineering reviews — 30%, 60%, 90%.** Internal and client design reviews at three milestones. *(committed; Engineering 60% is a contractual payment milestone)*
- **2.10 Permit support to client.** Technical input to client's permit applications; client retains permit ownership per charter §4.2. *(committed)*

### 3.0 Procurement

- **3.1 Furnace long-lead equipment — Lines A & B.** Two furnace packages, single vendor for technical consistency; PO release at 15 January year+1 per charter §6. *(committed; the long-lead PO is the critical-path item that drives the rest of the schedule)*
- **3.2 Baghouse & scrubber equipment.** Single-vendor environmental package, factory pre-assembled where possible. *(committed)*
- **3.3 MCC & power distribution.** MCC packages, transformers, switchgear. *(committed)*
- **3.4 SCADA & control system hardware.** PLC hardware, HMI workstations, network equipment. *(committed)*
- **3.5 Instrumentation bulk.** Field instruments, control valves, cable trays. *(committed)*
- **3.6 Structural steel & materials.** Structural steel for new furnace lines, refractory materials, piping bulk. *(committed)*
- **3.7 Demolition subcontract.** Selected demolition contractor for Furnace Lines A & B removal. *(committed; awarded at Week 6 post-charter)*
- **3.8 Construction subcontracts — mechanical, electrical, I&C.** Three subcontract packages. *(at draft stage this was `[NEEDS PM REVIEW: subcontractor selection in progress, expected Week 12]`; all three subcontracts awarded by Week 14)*
- **3.9 Factory acceptance testing.** FAT witnessing for furnace package, MCCs, SCADA. *(committed)*
- **3.10 Logistics & site delivery.** Heavy-lift coordination, delivery sequencing, site lay-down management. *(committed)*

### 4.0 Demolition

- **4.1 Demolition planning & permits coordination.** Method statement, isolation plan, client permit-to-work coordination. *(committed)*
- **4.2 Isolation & lockout of Lines A & B from Line C.** Physical and electrical isolation; coordination with client production. *(committed; Line C continuity is a hard charter constraint)*
- **4.3 Hazardous material survey & removal.** Asbestos and lead-paint survey, abatement contractor coordination, regulated disposal. *(committed; surveys completed Weeks 4-5)*
- **4.4 Furnace Line A demolition.** Sequenced removal of refractory, structure, ducting, electrical. *(committed)*
- **4.5 Furnace Line B demolition.** Sequenced removal of refractory, structure, ducting, electrical. *(committed; Line B demolition follows Line A in series to manage site logistics)*
- **4.6 Latent-defect discovery management.** Procedure for handling discovered conditions not in scope; T&M variation vehicle activates per contract. *(committed; two latent defects encountered during demolition were absorbed through this work package)*
- **4.7 Waste management & disposal.** Scrap metal recovery, hazardous waste manifests, general construction waste. *(committed)*
- **4.8 Site restoration for new construction.** Foundation surface prep, layout marking, services rough-in. *(committed)*

### 5.0 Construction — New Furnace Lines

- **5.1 Foundation & civil preparation.** Foundation excavation, formwork, rebar, concrete pour for Lines A & B foundations. *(committed)*
- **5.2 Structural steel installation.** Erection of structural steel for new furnace lines. *(committed)*
- **5.3 Furnace Line A mechanical installation.** Furnace shell, refractory, charging mechanism, off-gas hood, water cooling. *(committed; target Mechanical Complete 15 April year+1 per charter §6)*
- **5.4 Furnace Line B mechanical installation.** Same scope as 5.3 for Line B. *(committed; target Mechanical Complete 30 May year+1 per charter §6)*
- **5.5 Refractory installation.** Specialist refractory subcontractor; dry-out procedures. *(committed)*
- **5.6 Process piping.** Cooling water, compressed air, hydraulics, process gases. *(committed)*
- **5.7 Electrical installation — Lines A & B.** MCC installation, cable pulling, terminations, motor connections. *(committed)*
- **5.8 Instrumentation installation.** Field-instrument installation, calibration, loop checks. *(committed)*

### 6.0 Construction — Environmental Controls

- **6.1 Baghouse foundation & erection.** Foundation, structural support, baghouse module installation. *(committed)*
- **6.2 Scrubber foundation & erection.** Foundation, structural support, scrubber installation. *(committed)*
- **6.3 Ducting & process connections.** Off-gas ducting from furnaces to baghouse to scrubber to stack. *(committed)*
- **6.4 Environmental instrumentation.** Temperature, pressure, flow, draft instrumentation. *(committed)*
- **6.5 Emissions monitoring system (CEMS).** Continuous emissions monitoring for Rule 27 compliance reporting. *(committed; CEMS commissioning is a Rule 27 prerequisite for restart)*

### 7.0 SCADA & Controls Upgrade

- **7.1 SCADA server & HMI installation.** Server rack installation, HMI workstations in control room. *(committed)*
- **7.2 PLC & control network installation.** PLC panels, fibre network, switches, gateways. *(committed)*
- **7.3 Application software configuration.** Control narratives implemented, alarm setup, trend configuration. *(committed)*
- **7.4 SCADA integration with Line C (existing).** Integration with Ironvale's existing Line C SCADA; data-sharing without operational coupling. *(committed; this is the highest-risk integration point per Risk Register R3)*
- **7.5 Operator training material development.** Procedures, training modules, OEM-provided materials integration. *(committed)*
- **7.6 SCADA factory & site acceptance testing.** FAT, SAT, performance verification. *(committed)*

### 8.0 Tie-ins & Plant Shutdown

- **8.1 Tie-in engineering & dry-run planning.** Detailed sequencing, dry-run scripts, contingency plans, rollback procedures. *(committed; the shutdown is contractually fixed at 15-22 June year+1)*
- **8.2 Pre-shutdown off-site pre-assembly.** Maximise off-site pre-assembly to minimise on-site shutdown work. *(committed; this is the dominant schedule-mitigation strategy)*
- **8.3 Plant shutdown coordination with client.** Pre-shutdown checklist, daily coordination, contingency triggers. *(committed)*
- **8.4 Tie-in execution (Week 47 shutdown).** Physical tie-ins to crucible bays, ancillary services, electrical, SCADA. *(committed; 7-day window per charter Assumption 2)*
- **8.5 Crucible bay connection verification.** Hot-metal handling verification, ladle interface checks, conveyor alignment. *(committed)*
- **8.6 Post-tie-in restart support.** First-week production support, on-site Northwood team during ramp. *(committed)*

### 9.0 Commissioning & Performance Test

- **9.1 Pre-commissioning checks.** Loop checks, motor rotations, interlock verifications, water-cooling system flush. *(committed)*
- **9.2 Cold commissioning.** Power-on tests, mechanical run-in without process load. *(committed)*
- **9.3 Hot commissioning (furnace light-off).** Refractory dry-out, first heat, controlled ramp to operating temperature. *(committed; refractory dry-out is a vendor-specified procedure)*
- **9.4 14-day production performance test.** Per charter Objective 1; production rate, yield, energy efficiency verified against targets. *(committed; this is the contractual performance test)*
- **9.5 Emissions performance verification (Rule 27).** CEMS-based verification of compliance with state air-quality limits. *(committed; this is the contractual basis for restart authorisation)*
- **9.6 State regulator sign-off.** Submission, site visit, formal sign-off. *(committed; dependency on state inspector availability `[NEEDS PM REVIEW: confirm inspector booking 30 days ahead of expected ready date]`)*
- **9.7 Operator training delivery.** Classroom and on-the-job training of Ironvale operators. *(committed)*
- **9.8 Punch list management.** Identification, tracking, closure of punch items. *(committed)*

### 10.0 Project Close

- **10.1 Mechanical Completion certificate.** Issuance per contract, target 30 June year+1. *(committed)*
- **10.2 As-built documentation handover.** As-built drawings, equipment manuals, spare parts list, vendor documentation. *(committed)*
- **10.3 Warranty documentation.** 12-month warranty period commences at Mechanical Completion. *(committed; warranty is shorter than Northwood standard 24 months due to T&M structure — see charter §4.1)*
- **10.4 Lessons learned.** Internal lessons-learned session; report distributed to operations and other industrial projects. *(committed; the Ironvale lessons-learned writeup is a referenced artefact in the Northwood lessons library)*
- **10.5 Financial close — T&M reconciliation.** Final invoice reconciliation against cap, retention release, change-order close. *(committed)*
- **10.6 Contract close & demobilisation.** Demobilisation of Northwood site team, site restoration to client agreement, final acceptance. *(committed)*

## 3. WBS dictionary — major work packages

WBS dictionary entries are required for any work package with non-trivial scope, dependencies, or risk. Below, the seven highest-impact packages on this project. (Full project dictionary maintained as a separate spreadsheet; this section shows the discipline.)

**1.6 Stakeholder & client coordination.** Includes the embedded-engineer arrangement with T. Hartnett, biweekly client status meetings, monthly executive touch-base with the client Operations Manager, and regulator-liaison meetings on permit progress. Owner: PM. Deliverables: stakeholder register (Planning), engagement log (ongoing), monthly status report (ongoing). Dependencies: charter §5 stakeholder identification; client introduces regulator contact at Week 6.

**2.5 I&C / SCADA system architecture design.** Defines the new SCADA's hardware, software, and network architecture for Lines A & B and the integration architecture with existing Line C. Owner: Lead Controls Engineer *(at draft stage this was `[NEEDS PM REVIEW: confirm assignment]`; assigned Week 2)*. Deliverables: System Architecture Document (Week 10), Network Diagram (Week 12), Integration Specification (Week 14). Dependencies: 2.1 Existing conditions survey complete; client provides Line C SCADA documentation. Risk linkage: R3 SCADA integration with Line C — owner mitigation actions tracked here.

**3.1 Furnace long-lead equipment — Lines A & B.** Single-vendor procurement of two complete furnace packages. PO release 15 January year+1 (charter milestone). Manufacturing lead time *(at draft stage this was `[NEEDS PM REVIEW: vendor lead time at PO acceptance]`; vendor confirmed 14 weeks ex-works on PO acceptance)*. Delivery to site target 30 April year+1, on the critical path for Furnace Line A Mechanical Completion. Owner: Procurement Lead. Deliverables: PO with negotiated terms (Week 18), FAT report (delivered with equipment), shipping documentation. Dependencies: 2.2 Process engineering 90% complete prior to PO; vendor financial-health review at PO release.

**4.6 Latent-defect discovery management.** Standing work package activated whenever a latent defect is discovered during demolition. Procedure: field engineer documents condition within 4 hours; T&M variation request submitted within 24 hours; client cost-share threshold per contract Schedule 3. Owner: PM. Deliverables: variation request packages (as triggered), variation register (running). Dependencies: contract Schedule 3 thresholds; client representative T. Hartnett authorised to approve up to client-defined limit. Risk linkage: R1 Latent defects — this work package is the mitigation vehicle.

**7.4 SCADA integration with Line C (existing).** The highest-risk integration point on the project. Approach: data-sharing-only integration; no operational control coupling between new SCADA and Line C SCADA. Owner: Lead Controls Engineer. Deliverables: Integration Specification (Week 14), integration test plan (Week 30), integration site-acceptance test (Week 42), commissioning of the integration during the Plant Shutdown week. Dependencies: 7.2 PLC & control network installation complete; client provides Line C SCADA access. Risk linkage: R3 SCADA-Line-C integration.

**8.4 Tie-in execution (Week 47 shutdown).** The contractually-fixed 7-day plant shutdown window during which all tie-ins must be completed and the new lines made ready for restart. Owner: Construction Manager *(at draft stage this was `[NEEDS PM REVIEW: confirm CM assignment]`; assigned Week 4)*. Deliverables: detailed shutdown sequence with hourly granularity (Week 38), dry-run completion report (Week 44), tie-in completion certificate (Week 47). Dependencies: 8.2 Pre-assembly complete by Week 46; client production halt confirmed Week 45. Risk linkage: R2 Shutdown window exceeds 7 days — this work package is where that risk realises if it does.

**9.4 14-day production performance test.** The contractual performance test that verifies Objective 1 (320 MW... wait, that's Mariposa. For Ironvale it's furnace production rate, yield, energy efficiency targets per charter Objective 1). Owner: Commissioning Manager *(at draft stage this was `[NEEDS PM REVIEW: confirm CM assignment]`; assigned Week 36)*. Deliverables: test procedure (Week 44), test execution log (during test), performance test report (Week 49). Dependencies: 9.3 Hot commissioning complete and stable production demonstrated; client and regulator availability for test witnessing.

## 4. WBS conventions used

Five conventions to imitate when authoring a new WBS:

1. **Deliverable-oriented, not activity-oriented.** Each work package describes *what is produced*, not *what is done*. "Furnace Line A mechanical installation" (deliverable: installed Line A) rather than "install Furnace Line A" (activity). PMBOK 100% Rule: every deliverable is captured at exactly one place.

2. **Three levels of decomposition by default; deeper where risk or coordination demands.** Most projects need Level 1 (project) → Level 2 (phase/branch) → Level 3 (work package). Decompose to Level 4 (sub-work-package) only where a Level-3 package has significant internal coordination complexity that benefits from explicit decomposition (e.g., a tie-in week that has hourly granularity).

3. **WBS dictionary required for non-trivial work packages.** Owner, deliverables, dependencies, risk linkage. Trivial admin packages (Project Planning, HSE Management) do not need full dictionary entries; coordination-heavy or risk-critical packages do.

4. **Hedging discipline at the package level.** Where a package owner, duration estimate, or third-level decomposition has not yet been committed, use the inline italic annotation form: `*(at draft stage this was [NEEDS PM REVIEW: <value>]; <how resolved>)*`. Per-package, not section-wide.

5. **Risk register cross-reference where applicable.** Work packages that exist *because of* a specific risk (e.g., 4.6 Latent-defect discovery management) carry a `Risk linkage:` clause in their dictionary entry. This is the data structure that ties the Risk Register and the WBS together — a quality enterprise PMOs prize and many WBS documents miss.

## 5. Notes on the format (for the agent reading this as a worked example)

Three patterns the WBS Builder should imitate when drafting a WBS for a new project:

1. **Numbered hierarchy with consistent depth.** Level 1 is the project. Level 2 is the major phase or branch (PM, Engineering, Procurement, Demolition where relevant, Construction by discipline if useful, Commissioning, Close). Level 3 is the work package. Numbering follows the standard outline convention (1.0, 1.1, 1.1.1 if Level 4 is used).

2. **The 100% Rule.** Every element of project scope appears exactly once. If a question arises about where to put something, choose the placement that best aligns with how the work will be planned, scheduled, and reported — not where it conceptually "could" go.

3. **WBS dictionary discipline.** Major work packages get a dictionary entry covering Owner, Deliverables, Dependencies, Risk linkage. The dictionary is not the same as the WBS tree — it is a *companion* artefact. In the worked example above, the tree is in §2 and the dictionary is in §3. The agent should produce both, with the dictionary covering at least the five-to-seven highest-impact work packages.
