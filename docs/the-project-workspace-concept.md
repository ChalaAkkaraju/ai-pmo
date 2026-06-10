# The Project Workspace

## The individual-project view, tab by tab

*Business Edition · Part IV — the project-level companion to the portfolio dashboard (A16)*

![The project Overview — earned value, what needs attention, the margin bridge and the schedule envelope on one screen.](book/figures/10-project-overview.png)

## From portfolio to project

Click any project — from a dashboard drill, an analytics register, or the global search
— and you land in the **project workspace**: the single-project counterpart to the
portfolio dashboard. Where the dashboard answers "how is the *book*?", the workspace
answers "how is *this job*?" — and it does so through one tabbed page, colour-coded by
capability (A15), with a context-aware agent assistant floating alongside that already
knows which project you are looking at.

The tabs follow the project's own logic — structure, then time, then money, then the
registers, then the plan:

## Overview — the one-screen verdict

The landing tab leads with what matters: the project's **earned value** (CPI/SPI), a
**needs-attention** panel (open risks, high issues, actions awaiting response), the
**margin bridge** (as-sold → as-built; A9), and the **schedule envelope** (forecast
finish against the contract date). It is the project's health in one view, the same way
the hero is the portfolio's.

## Structure — the WBS

![The Structure tab — the canonical WBS with provenance.](book/figures/18-project-structure.png)

The canonical **work breakdown structure**: the colour-coded WBS tree that is the join
key between cost and schedule, with provenance showing which branches are booked to the
system of record and which were AI-authored and approved (the upstream bookend). Risks
and issues are shown mapped to their WBS branch.

## Schedule

The project timeline and milestones — the scheduler's contribution, framed as a
forecast-vs-contract reconciliation rather than a re-scheduling.

## Earned value

![The Earned value tab — S-curve, indices, earned schedule, EV by WBS and the forecast trend.](book/figures/11-project-earned-value.png)

The flagship tab: the **S-curve** (PV/EV/AC), CPI/SPI and earned schedule, **EV by WBS
branch** (which branch carries the overrun), and the **forecast-trend** chart with the
margin-at-complete band (A5, A6).

## Cost

![The Cost tab — four lenses behind one segmented control.](book/figures/12-project-cost-to-date.png)

A single financial tab with four lenses behind a segmented control, telling the money
story in order: **Cost-to-date** (where it went, by element and WBS phase),
**Commitment** (open POs, committed but not spent), **Revenue recognition** (cost-based
POC, WIP/deferred; A7), and **Cash flow** (funding exposure; A8).

## Risks & issues, Changes, Variance

The registers and their synthesis:

- **Risks & issues** — the project risk register (inherent/residual EMV, mitigation;
  A11) and the issue queue (aging, SLA, priority; A12).
- **Changes** — the change & trend register: pipeline, margin impact, drivers,
  funded-vs-absorbed and recovery confidence (A10).
- **Variance** — CV/SV, VAC and the TCPI recovery test (A13).

## Planning

The AI-authored planning artefacts for the project — charter, schedule analysis, budget
basis, communications and the rest — each editable with provenance, produced by the
planning agents.

## Why a single workspace

Before AI PMO, answering "how is this project?" meant opening SAP for cost, the scheduler
for time, and a stack of spreadsheets for the registers. The workspace collapses that
into one navigable page where every tab is the same project seen through a different
capability — cost and schedule already reconciled on the WBS, the registers quantified,
and an assistant on hand to narrate any of it. It is the portfolio dashboard's logic
applied one level down: one synthesis, many lenses, no spreadsheet.

---

*Cross-reference: the workspace tabs are the project-level expression of the capability
chapters — structure, earned value (A5), forecasting (A6), the money lenses (A7–A9),
change (A10), risk/issues (A11/A12), variance (A13). Implemented in the Technical
Edition as the tabbed project page reading the canonical model.*
