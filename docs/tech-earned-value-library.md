# The Earned-Value Library

## Technical Edition · Chapter B12 — `lib/earned-value.ts` (pairs with Business A5/A13)

The earned-value library is the computational heart of AI PMO. It is a pure,
dependency-free module of functions over plain inputs — no I/O, no database — which
makes it trivially testable and reusable from pages, agents and the portfolio
roll-up alike.

## Inputs

`computeEv` assembles the three EVM primitives from canonical data joined on the
WBS code:

- **BAC / PV** from the work-package budgets and the planned curve.
- **EV** from each leaf work package's budget × the scheduler's `%complete` on its
  tasks — *the cross-seam join*: SAP budget meets scheduler progress.
- **AC** from `cost_actuals`, summed to the leaf.

## Core derivation

`deriveMetrics(bac, pv, ev, ac)` returns the full metric set:

```
cpi  = ev / ac
spi  = ev / pv
cv   = ev - ac          // cost variance
sv   = ev - pv          // schedule variance
eac  = ...              // three methods (see B13)
vac  = bac - eac
vacPct = vac / bac
tcpiBac = (bac - ev) / (bac - ac)   // CPI needed to hit budget
tcpiEac = (bac - ev) / (eac - ac)   // CPI needed to hit forecast
```

A `ready` flag guards against divide-by-zero and no-activity branches so the UI can
distinguish "on plan" from "no data."

## Per-WBS breakdown and roll-up

`computeEvByWbs` runs the same derivation per WBS branch (Level-2 phase grouping via
`wbs.split('.').slice(0,2).join('.')`), each with its own CPI/SPI and a RAG flag, so
a portfolio number resolves to a responsible branch. `rollUpEv` aggregates many
projects into a `PortfolioEv` for the dashboard, summing BAC/EV/AC before deriving
indices (never averaging indices — a classic EVM error the code avoids).

## Earned schedule

`earnedSchedule` measures schedule performance in time: it finds the past period at
which today's EV equalled the plan, giving `ES`, `SV(t)` and `SPI(t)` — correcting
SPI's end-of-project drift toward 1.0.

## Consumers

The EV tab card, the EV-by-WBS view, the portfolio EV analytics page, the
dashboard's portfolio pulse, the cash-flow and forecast libraries (which take EV
points), and the Variance Analyst agent.
