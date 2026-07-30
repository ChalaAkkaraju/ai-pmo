# The Problem AI PMO Solves

## Why "are we healthy?" is the one question neither system can answer

![The welcome gateway — what AI PMO is, in one screen.](book/figures/00-welcome-gateway.png)

Every large EPC contractor runs its projects on two authoritative systems that do not talk to each other in the way the work demands — and the questions that decide a project's fate all fall in the gap between them.

On one side sits the **ERP — SAP Project System (PS)**: the system of record for the **commercials**. The WBS, the budget, commitments and purchase orders, actual cost, billing, revenue recognition. It knows, to the cent, what the project has cost and what it is owed.

On the other sits the **scheduler — Primavera P6 or Microsoft Project**: the system of record for **time**. The activity network, the logic, the critical path, physical progress. It knows when things happen and how far along they are.

Both are excellent at their jobs. Neither, on its own, can tell you whether the project is actually *healthy* — because health lives in the **combination**.

## The seam is where the answers live

![The executive portfolio dashboard — AI PMO's synthesis across SAP PS and the scheduler.](book/figures/01-portfolio-dashboard.png)

The questions executives and project-controls leads actually ask all sit across the seam between cost and time:

- *Are we getting value for the money we've spent?* — needs cost (SAP) **and** progress (scheduler).
- *What will this finish at, and when?* — needs the cost run-rate **and** the schedule trajectory.
- *How much revenue can we book, and how much cash will it tie up?* — needs contract and cost **and** billing timing.
- *Is our risk and change exposure eroding the margin we sold?* — needs the commercial baseline **and** the live registers.

None of these can be answered inside either system alone. In most organisations they are answered — slowly, monthly — by an analyst exporting both systems into a spreadsheet, reconciling them by hand, and writing a narrative. That spreadsheet *is* the missing layer: fragile, late, person-dependent, and invisible to everyone but its author.

## What AI PMO is

AI PMO is that missing layer, built properly: an **AI-assisted PMO intelligence layer** that sits across the SAP PS ↔ scheduler seam, joins the two systems on the **WBS code**, and **synthesises** the answers — earned value, forecasts, revenue recognition, cash flow, margin bridges, risk and change exposure — with a plain-language narrative and recommendations on top.

It does not replace either system of record. It reads their authoritative data and produces the decision-grade synthesis neither can produce alone. It is not an ERP and not a scheduler: it does not own the cost ledger, run the critical-path engine, or store transactional truth. A capability belongs in AI PMO only if it is **synthesised** from a system of record or read from a named source. The moment it would need to *own* transactional data, it has left its lane.

## Why now

Two things make this layer buildable today that weren't a few years ago. The data in SAP PS and the schedulers is now reliably accessible through modern APIs, and large language models can turn reconciled numbers into the narrative and recommendations that used to require a senior analyst. AI PMO is what you get when you point those two capabilities at the seam every EPC business already feels but few have systematised.

> **The truth about a project lives in the seam between cost and time** — the one place neither system of record can see, and the one place AI PMO is built to stand.
