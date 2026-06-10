# The EPC Project-Controls Capability Map

*Who owns what across SAP PS, the scheduler, AI PMO — and what still lives offline*

![The capability coverage framework, rendered in the app.](book/figures/07-coverage-framework.png)

## Purpose

Most "where does AI PMO fit?" conversations stall because nobody has written
down the **whole** capability surface of an EPC project first. The PMBOK
knowledge areas are too generic; a single tool's brochure is too narrow. This
chapter lays out the full set of project-controls and delivery capabilities an
EPC organisation actually runs, and assigns each one to the system that should
own it:

- **SAP PS (ERP)** — the system of record for cost, commitment, revenue and the
  controlling structure.
- **Scheduler (Primavera P6 / MS Project)** — the system of record for time,
  logic and physical progress.
- **AI PMO** — the synthesis and decision layer that sits across the seam
  between the two and turns their data into earned value, forecasts, narrative
  and recommendations.
- **Offline** — capabilities no core system owns today; they live in specialist
  point tools or in spreadsheets. Flagging these honestly is the point of the
  exercise: it shows the integration frontier and stops AI PMO from quietly
  claiming work it does not do.

The map doubles as a scoping instrument. Every future "can we add X?" can be
answered by finding X on this map and reading off whether it is *owned*
elsewhere (so AI PMO **synthesises** or **consumes** it) or genuinely
*unowned* (so it stays offline, or — rarely — becomes a thin register).

## How to read the map

Each capability is marked in four columns.

**System-of-record markers (SAP PS, Scheduler):**

- **Owns** — authoritative source; the master record lives here.
- **Supports** — holds or handles part of the capability, but is not the master.
- **—** — not applicable.

**AI PMO role** (its discipline is never to own transactional data, only to act on it):

- **Synthesise** — derives intelligence (EV, forecast, variance, margin,
  narrative) from data already in a system of record. AI PMO owns the
  *computation*, never the inputs.
- **Consume** — reads a feed from a specialist system and presents or
  synthesises on top of it; the source of truth stays in that system.
- **Author→Book** — AI proposes (e.g., a scope-true WBS), a human approves, and
  it is *booked* into the system of record, which then owns it. The upstream
  bookend.
- **Register** — AI PMO owns a deliberately lightweight register, used **only**
  where no system exists *and* the data feeds cost/schedule/risk synthesis (the
  trend register is the canonical case). The narrow exception, not the rule.
- **—** — no role.

**Offline / specialist** — names the kind of point tool or manual method that
holds the capability today when no core system does.

> **A note on the SAP-vs-scheduler boundary.** SAP PS *can* hold networks and
> dates, and a scheduler *can* hold costs — but in mainstream EPC practice the
> cost/commercial system of record is SAP PS and the schedule system of record
> is P6 or MS Project, joined on the WBS code. This map assumes that common
> split. An organisation running SAP-only or scheduler-only shifts a few rows,
> but the AI PMO and Offline columns are unaffected.

---

## 1. Project structure & scope

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Project definition & WBS (control structure) | **Owns** | — | Author→Book | — |
| Activity / schedule breakdown | — | **Owns** | — | — |
| Scope baseline / statement of work | Supports | — | Synthesise (scope-true WBS) | Contract & SoW documents |
| Scope-change identification | — | — | Synthesise (trend) | — |
| Deliverables / document register | — | — | Consume | EDMS (Aconex, ProjectWise, SharePoint) |

## 2. Estimating & budgeting

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Conceptual / detailed estimate | — | — | — | Estimating tool (e.g. CCS Candy, spreadsheets) |
| Cost breakdown structure (CBS) | **Owns** | — | — | — |
| Approved budget baseline (BAC) | **Owns** | — | Synthesise (estimate→budget reconciliation) | — |
| Contingency / management reserve | Supports | — | Synthesise (risk-based sizing) | Risk tool |
| Cost loading of the WBS | **Owns** | — | — | — |

## 3. Planning & scheduling

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| CPM network / logic | — | **Owns** | — | — |
| Baseline schedule | — | **Owns** | — | — |
| Critical path & float analysis | — | **Owns** | Synthesise (read & flag) | — |
| Resource-loaded schedule | — | **Owns** | — | — |
| Schedule levelling | — | **Owns** | — | — |
| Progress measurement / rules of credit | — | Supports | Synthesise | Progress tool / spreadsheet |
| Schedule quality (DCMA 14-point) | — | — | Synthesise *(future)* | Acumen Fuse / spreadsheet |
| Quantitative schedule risk analysis (P50/P80) | — | Supports | Synthesise *(future)* | Safran Risk / Primavera Risk / @RISK |

## 4. Cost control

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Commitments / PO tracking | **Owns** | — | Synthesise | — |
| Actual cost capture (FI/CO) | **Owns** | — | — | — |
| Accruals / cost-to-date | **Owns** | — | Synthesise | — |
| Cost by element / value category | **Owns** | — | Synthesise | — |
| Forecast cost (ETC / EAC) | Supports | — | **Synthesise (flagship)** | — |
| Cash-flow forecast & funding exposure | Supports | Supports | **Synthesise** | — |

## 5. Earned value management

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| PV / EV / AC | Supports (AC) | Supports (progress) | **Synthesise** | — |
| CPI / SPI & variances | — | — | **Synthesise** | — |
| Earned schedule (ES, SPI(t)) | — | — | Synthesise | — |
| Performance measurement baseline (PMB) | Supports | Supports | Synthesise | — |
| EV by WBS branch | — | — | Synthesise | — |

## 6. Progress & productivity

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Physical / quantity progress | — | Supports | Synthesise | Quantity tracking / spreadsheet |
| Labour hours (actual) | **Owns** (CATS) | — | Synthesise | — |
| Productivity factors (PF) | — | — | Synthesise | Spreadsheet |
| Performance dashboards | — | — | Synthesise | — |

## 7. Change & trend management

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Trend register | — | — | **Register** | (historically spreadsheet) |
| Change orders / variations (commercial) | **Owns** | — | Synthesise | — |
| Unfunded / absorbed change | Supports | — | Synthesise | — |
| Margin impact of change | — | — | Synthesise | — |
| Recovery confidence / revenue-at-risk | — | — | Synthesise | — |

## 8. Risk & opportunity management

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Risk register | — | — | **Register** | Risk tool (Predict!, ARM) |
| Qualitative assessment (P×I) | — | — | Synthesise | Risk tool |
| Quantitative risk analysis (QRA / EMV) | — | — | Synthesise | @RISK / Safran |
| Risk-based contingency (P50/P80) | — | — | Synthesise | Risk tool |
| Mitigation actions & residual risk | — | — | Synthesise + Register | — |

## 9. Issues & actions

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Issue log | — | — | **Register** | Spreadsheet |
| Action / commitment tracking | — | — | Register | Spreadsheet |
| Cross-party action assignment | — | — | Register | — |

## 10. Procurement & contracts

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Purchase requisition / PO | **Owns** | — | Consume | — |
| Vendor master / management | **Owns** | — | — | — |
| Materials management / inventory | **Owns** (MM) | — | — | — |
| Expediting / delivery tracking | Supports | — | Consume | Expediting tool / spreadsheet |
| Subcontract administration | Supports | — | Synthesise | CLM / spreadsheet |
| Contract & claims management | Supports | — | Synthesise | Contract-lifecycle tool |

## 11. Revenue & commercial (Results Analysis)

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Revenue recognition (IFRS 15 / cost-based POC) | **Owns** (RA) | — | Synthesise | — |
| Billing / invoicing / payment applications | **Owns** | — | Synthesise | — |
| WIP / contract asset & liability | **Owns** | — | Synthesise | — |
| Margin bridge (as-sold → as-built) | Supports | — | Synthesise | — |

## 12. Resource management

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Resource demand (from schedule) | — | **Owns** | Synthesise | — |
| Resource actuals (timesheets) | **Owns** (CATS) | — | Synthesise | — |
| Resource levelling / availability | — | Owns | — | HR system / spreadsheet |
| Portfolio resource view | — | — | Synthesise | — |

## 13. Document & data management

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Engineering deliverables register | — | — | Consume | EDMS (Aconex, ProjectWise, SharePoint) |
| Transmittals / RFIs / submittals | — | — | Consume | EDMS |
| Master data & numbering standards | Supports | — | — | EDMS / standards |

## 14. Quality (QA / QC)

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| ITP / inspection records | — | — | Consume | QMS / completions tool |
| NCR / corrective-action management | — | — | Consume | QMS |
| Quality dashboards | — | — | Synthesise (from feed) | QMS |

## 15. HSE / safety

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Incident / near-miss management | — | — | Consume | HSE system (Enablon, Intelex) |
| Observations / permit-to-work | — | — | Consume | HSE system |
| Leading & lagging HSE metrics | — | — | Synthesise (from feed) | HSE system |

## 16. Interface & coordination management

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Interface register | — | — | Register *(candidate)* | Spreadsheet / interface tool |
| Interface-point status & forecast | — | — | Synthesise | — |

## 17. Completions & handover

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Systems / subsystems completion | — | — | Consume | Completions tool (WinPCS, GoCompletions) |
| Punch-list management | — | — | Consume | Completions tool |
| MC / RFSU / handover dossiers | — | — | Consume | Completions tool / EDMS |

## 18. Reporting, governance & stakeholder

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Period status reports | — | — | **Synthesise** | — |
| Executive & portfolio dashboards | — | — | Synthesise | — |
| Stage-gate / governance reviews | Supports | — | Synthesise (narrative) | Governance documents |
| Stakeholder / communications register | — | — | Register *(candidate)* | Spreadsheet |
| Lessons learned / knowledge capture | — | — | Synthesise + Register | Spreadsheet / KM system |

## 19. Portfolio & multi-project

| Capability | SAP PS | P6 / MSP | AI PMO | Offline / specialist |
| --- | --- | --- | --- | --- |
| Portfolio cost / EV roll-up | — | — | **Synthesise** | — |
| Portfolio cash-flow & funding | — | — | Synthesise | — |
| Cross-project resource demand | — | — | Synthesise | — |
| Portfolio risk / change exposure | — | — | Synthesise | — |
| Benchmarking & trend analytics | — | — | Synthesise | — |

---

## What still lives offline — the gap list

The "Offline / specialist" column is the honest part of the map. Grouped by what
*should* happen to each item:

**A. Future "consume" connectors (a specialist system already owns it; AI PMO
should read its feed and synthesise on top).** This is the largest group and the
natural next integration frontier:

- Engineering deliverables / EDMS (Aconex, ProjectWise, SharePoint)
- Quality records — ITPs, NCRs, CARs (QMS)
- HSE — incidents, observations, permits (Enablon, Intelex)
- Completions & handover — systems completion, punch lists, MC/RFSU
- Expediting / delivery tracking
- Contract & claims management (contract-lifecycle tools)
- Schedule-risk and schedule-quality outputs (Safran/Primavera Risk, Acumen Fuse)

For all of these the rule holds: **AI PMO consumes, it does not own.** The
specialist tool remains the system of record; AI PMO adds the cross-discipline
synthesis (e.g. linking an open NCR or a slipping deliverable to the cost and
schedule impact those disciplines never see).

**B. Stay-offline / specialist engines (AI PMO uses the outputs, never replaces
the engine).** Some work is genuinely specialist and should remain so:

- Detailed estimating (estimating software)
- Quantitative cost/schedule risk *simulation* (Monte Carlo engines)

AI PMO consumes their results (an estimate basis, a P80 number) but building a
Monte Carlo engine or an estimating database would be scope creep.

**C. Thin-register candidates (no system exists, and the data feeds
cost/schedule/risk synthesis).** A small set qualifies for the narrow
"Register" exception — the same logic that justified the trend register:

- Interface register
- Stakeholder / communications register
- Lessons-learned capture

These are optional. AI PMO should only absorb them where the alternative is a
spreadsheet *and* the content drives downstream synthesis; otherwise they stay
offline.

## At a glance

Reading down the columns tells the story of the operating model:

- **SAP PS owns** the cost, commitment, revenue and structural records — the
  *what it cost and what we're owed* spine.
- **The scheduler owns** logic, dates, float and progress — the *when* spine.
- **AI PMO owns almost nothing transactional.** Its column is overwhelmingly
  **Synthesise**, with a single upstream **Author→Book** hook, a handful of
  **Consume** feeds, and a deliberately short list of thin **Registers**. That
  is the design working as intended: the value is in the synthesis across the
  seam, not in re-owning data the core systems already hold.
- **The Offline column is the roadmap.** Most of it is "consume later"; a little
  of it is "leave it to the specialists"; a sliver is "absorb as a thin
  register." Nothing on it is a reason to turn AI PMO into an ERP or a scheduler.

## How this map governs scope

This is the test, restated against the full surface: a capability belongs in AI
PMO only if it is **synthesised** from a system of record, **consumed** from a
named specialist system, or — rarely — held as a **thin register** because no
system exists and it feeds synthesis. Everything else is owned by SAP PS, owned
by the scheduler, or honestly marked offline until a connector earns its place.
The map keeps the product pointed at its actual job: making a dense, multi-system
EPC project legible and decision-ready, without pretending to be the systems
underneath it.
