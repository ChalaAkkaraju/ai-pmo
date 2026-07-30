# Forecasting Cost & Revenue to EAC

## What will this job finish at, what will we be paid, and what margin will we land?

Every month a project must answer one question honestly: *given what we now know, what will this cost to finish, what will we be paid, and what margin will we land?* The **Estimate at Complete (EAC)** is the cost half of that answer, recognised revenue is the income half, and the difference is the forecast margin. Doing this well, on a fixed cadence, is the single most important discipline in project controls — because the absolute number matters less than **how it moves, and why.**

AI PMO produces the answer continuously, drawing cost and progress from SAP and the scheduler joined on the WBS, so the forecast is seen *moving* rather than reconstructed by hand each month.

## The core identity

EAC is not a calculation, it is a **re-forecast**:

> **EAC = actual cost to date (AC) + estimate to complete (ETC)**

The actuals are a fact from the ledger. All the judgement sits in the **ETC** — the forward look. The monthly job is to refresh the actuals and the progress, re-estimate the ETC, and read off the EAC, the variance at complete (VAC = BAC − EAC), and the trend versus last month.

## Forecasting the ETC

Two registers of method work together:

- **Bottom-up re-estimate — the authoritative forecast.** Cost engineers re-estimate the remaining work package by package: remaining quantities at current rates, open commitments still to run off, and an allowance for scope not yet committed. This is the EAC of record because it reflects what the delivery team actually knows.
- **Earned-value formulaic EAC — the check, not the forecast.** Three quick extrapolations bracket the bottom-up number:
  - `EAC = BAC ÷ CPI` — today's cost efficiency continues (typical),
  - `EAC = AC + (BAC − EV)` — the remainder runs at plan (optimistic),
  - `EAC = AC + (BAC − EV) ÷ (CPI × SPI)` — both cost and schedule pressure persist (pessimistic).

If the bottom-up EAC falls outside that bracket, someone is being optimistic — the signal to challenge it. The reality test is the **To-Complete Performance Index**:

**TCPI = (BAC − EV) ÷ (EAC − AC)**

— the cost efficiency the *remaining* work must achieve to hit the chosen EAC. If the TCPI sits well above the run-rate CPI, the forecast is not credible and the EAC should move up.

## The monthly cycle

A disciplined period close runs in order:

1. **Cut-off and capture.** Freeze a date; pull actuals, open commitments, and physical progress (percent complete, installed quantities, timesheets).
2. **Update earned value.** EV = percent complete × BAC, per WBS.
3. **Re-forecast the ETC.** Bottom-up on the live and material packages, formulaic elsewhere; fold in open trends, absorbed cost, escalation, and contingency drawdown.
4. **Roll up the cost forecast.** EAC = AC + ETC; VAC = BAC − EAC; run the TCPI sanity check.
5. **Forecast revenue.**
6. **Margin and bridge.** Forecast margin = forecast revenue − EAC; reconcile as-sold → as-built.
7. **Variance / trend review.** The heart of the close: explain *why the EAC and recognised revenue moved this month versus last*. That movement, with causes, is the real output — not the absolute figure.
8. **Sign-off.** The monthly cost review challenges and approves the forecast.

## The revenue forecast

On lump-sum EPC, revenue is recognised **over time by percentage of completion**, and it follows the cost forecast rather than running independently:

- **POC** is cost-based — `AC ÷ EAC` — or measured from physical progress.
- **Recognised revenue = POC × (contract value + approved variations + probable claims)**, with claims constrained under IFRS 15 until recovery is *highly probable*.
- **Forecast revenue at complete** = contract value plus approved and probable changes — exactly the funded / at-risk split a trend register produces.

Each month the *incremental* revenue is recognised and reconciled to billing; the gap is work in progress (under-billed) or deferred revenue (over-billed).

## One physical-progress spine

The crucial discipline is that cost and revenue are **not** forecast independently. They reconcile through the same physical progress:

progress → earned value → EV/EAC → cost-based POC → recognised revenue → revenue − EAC = forecast margin.

If the cost POC and the revenue POC run off different progress, margin drifts and the forecast loses integrity. One spine, two readings.

## The control output: EAC movement

Because the absolute EAC matters less than its motion, the monthly deliverable is the **EAC movement** — the change versus the prior close, decomposed into its causes. The simplest useful split separates the period's EAC change into:

- a **scope** component — budget growth from approved changes, and
- a **cost-performance** component — the residual run-rate efficiency shift.

A rising EAC driven by *scope* is recoverable (it should be matched by a contract increase); a rising EAC driven by *performance* is margin erosion and demands action. Naming which is which, every month, is what turns a forecast into a control.

AI PMO keeps a **month-end forecast snapshot** per project — BAC, EV, AC, the re-forecast EAC / ETC / VAC and CPI / SPI, plus the revenue side (contract value, cost-based POC, recognised revenue, billed, forecast margin). From that series it derives, with no extra entry, a cost-and-revenue trend plotted across the closes, the EAC-movement decomposition for the latest close, and a reconciliation back to the trend register (funded changes lift the contract, absorbed cost lifts the EAC) and the margin bridge (as-sold → as-built). The same snapshots roll up to the portfolio, so *"is our forecast getting better or worse, and why?"* can be answered for every project at once.

> **A forecast that only updates the absolute EAC hides the story** — decomposing the monthly movement surfaces margin erosion while there is still time to act.
