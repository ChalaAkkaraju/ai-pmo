# The Commercial Libraries

## Technical Edition · Chapter B17 — margin · billing · commitment · results-analysis (pairs with Business A7/A9)

Four small pure libraries turn the cost-to-cash tables into commercial intelligence.

## `lib/margin.ts` — the margin bridge

`computeMarginBridge` derives three margins and the waterfall between them:
as-sold (`sold contract − frozen baseline budget`), as-planned (`current contract −
current WBS budget`), as-built (`current contract − EAC`); the deltas are attributed
to **budget growth**, **change orders**, and **performance**. The as-sold baseline is
frozen at booking (migration 0019 + generator 11).

## `lib/results-analysis.ts` — revenue recognition

`computeResultsAnalysis(rows, billingByPhase)` rolls the posted RA figures
(cost-based POC, `calculated_revenue`, `cost_of_sales`, `recognized_margin`) per WBS
phase to a project position, then derives `net = recognised − billed`,
`wip = max(0, net)` (contract asset) and `deferred = max(0, −net)` (contract
liability). Independent of EV by construction (migration 0029 + generator 19).

## `lib/cost-commitment.ts` + `lib/billing.ts`

Commitment from open purchase orders (`po_value − received_value`, open only) for the
Commitment tab; billing events (invoiced/paid) for the billing and cash-in series.
Together with cost actuals they give cost-to-date = actual + open commitment.

## Consumers

The Cost tab's three lenses (cost-to-date, revenue recognition, cash flow), the
Commitment tab, the margin bridge on Overview, and the Cost Controller agent — which
reasons across the three independent revenue figures (EV $, recognised revenue,
billed).
