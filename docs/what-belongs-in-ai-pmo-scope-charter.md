# What belongs in AI PMO — scope, boundaries, and the capability map

*A capability chapter for the AI PMO book. It defines what the product is for, the single test that keeps it focused, and an honest map of EPC controls coverage — so every future "can we add X?" can be answered on principle rather than appetite.*

## The intent, in one paragraph

AI PMO is the **synthesis and decision layer** over a project's systems of record. It does not own transactional data. SAP PS owns cost, commitment, actuals, the WBS and revenue; the scheduler (Primavera P6 / Microsoft Project) owns activities, logic, dates and progress. AI PMO **reads both, joins them on the WBS code, and produces what neither can alone** — earned value, forecasting to EAC, variance and change narrative, risk and trend intelligence, recommendations, cross‑project roll‑ups, and the AI agents. Its value is being the analytical layer that a controls team would otherwise hand‑assemble over weeks. The day it becomes the place where people *do the work* — enter punch items, log incidents, sign inspection plans — it has stopped being AI PMO and started being a worse version of tools that already exist.

## The scope test

Every proposed capability must pass one test, and it is the same provenance model the product is built on. The capability must be either:

- **Synthesised** by AI PMO from data that already exists in a system of record, or
- **Consumed** from a named system of record (SAP, the scheduler, or another).

If a capability is *neither* synthesis *nor* attributable to a source system, it is scope creep. Tagging every data point with its `source_system` is not just provenance for the dashboard — it is the discipline that protects the product.

## Three buckets

Applying the test sorts any capability into one of three responses.

**1. Build it — synthesis (core AI PMO).** Reads SAP and/or the scheduler and produces analysis neither system gives you. This is where AI PMO should keep getting deeper: earned value and forecasting (done), the change & trend register (done), cash‑flow forecasting, and the schedule‑analytics frontier — critical path and float, schedule quality (DCMA‑style), and probabilistic P50/P80 finish. These deepen the spine without widening the footprint.

**2. Consume it — a read‑only connector (don't own).** The disciplines with **no home in SAP or the scheduler** — engineering deliverables, completions/turnover, HSE, quality — live in *specialist* systems (Aconex / ProjectWise, WinPCS / GoCompletions, Enablon / Intelex, a QMS). The right move is the **same integration pattern already built**: ingest a feed and synthesise it (fold deliverable % into progress and EV; surface HSE leading indicators and NCR counts on the dashboard). AI PMO stays the synthesis layer; the source of truth stays the specialist tool. This is the honest answer for any capability not covered by SAP or the scheduler — **make it a connector, not a module.**

**3. Don't own it — out of scope.** The scheduling *engine* itself (read P6's CPM output; never recalculate the network), the cost ledger (SAP), and above all **operational field workflow** — executing punch lists, HSE incident case management, inspection sign‑offs. Those need dedicated, often mobile, workflow tools. Consume a summary metric for reporting if it helps; never rebuild the workflow.

## The EPC capability map

| Controls discipline | Coverage | Disposition |
| --- | --- | --- |
| Cost control / earned value / forecast to EAC | Full | Core (built) |
| Change & trend, claims recovery | Trend register built | Core (built) |
| Risk & issues | Full (EMV, contingency, lifecycle) | Core (built) |
| Cash‑flow forecast | Gap | **Build — synthesis** |
| Schedule analytics (critical path, float, DCMA quality, P50/P80 finish) | Consumes dates / % only | **Build — synthesis** (highest‑value gap) |
| Progress measurement (rules of credit) | Task % drives EV | Build — synthesis |
| Procurement expediting (delivery vs need‑date) | Commitment only | Build — synthesis (SAP × scheduler join) |
| Engineering deliverables / document control | None | **Consume** (EDMS connector) |
| Completions / commissioning | Milestones only | **Consume** (completions‑system connector) |
| HSE incidents & indicators | Role only | **Consume** (EHS connector) |
| Quality (NCR, ITP) | Partial via issues | **Consume** (QMS connector) |
| Interface register | None | Thin register (no system; feeds schedule risk) |
| Construction field workflow (IWP execution) | — | **Out of scope** |
| Scheduling engine / cost ledger | Consumed | **Out of scope** (consume only) |

## The thin‑register exception

There is one justified exception to "don't own": a lightweight **register of record** is acceptable when (a) the organisation genuinely has *no* system for it, **and** (b) it directly feeds cost, schedule or risk synthesis. The **trend register** qualifies — most firms run trends in spreadsheets, and it feeds the forecast. The **interface register** would qualify — often spreadsheets, and it feeds schedule risk. HSE incidents and punch lists do **not** qualify: they have systems and they are operational. Hold that line.

## Why restraint is the product

The temptation with a gap analysis is to fill every gap until the tool does everything adequately and nothing exceptionally — at which point it competes with mature point solutions it cannot beat, and the one thing that made it valuable (the synthesis nobody else does) is buried under modules. So the honest answer to "what should be in AI PMO" is narrow on purpose: **the synthesis, a growing set of read‑only connectors to whatever the organisation already runs, and only the rare controls register that has no home and feeds the spine.** Everything else it consumes or ignores. That restraint is not a limitation of the product — it *is* the product.
