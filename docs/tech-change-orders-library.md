# The Change-Orders Library

## Technical Edition · Chapter B15 — `lib/change-orders.ts` (pairs with Business A10)

Pure derivations over the `change_orders` table — no migration beyond the trend
fields, no generator at read time.

## Outcome classification

`classifyOutcome` maps each change order to **funded** / **absorbed** / **open** /
**withdrawn** from `status`. The trend model (migration 0031) added the `Absorbed`
and `Withdrawn` statuses and a `recovery_confidence` integer, so every change starts
life as a trend and resolves to a funded variation, an absorbed (unfunded) cost, or
a withdrawal.

## Derivations

- `summarizeChangeOrders(cos, soldContract)` — counts, cumulative cost/revenue,
  blended margin, sold→revised contract growth, and the exposure splits:
  `fundedRevenueM`, `absorbedCostM`, `openRevenueM`, `expectedRecoveryM`,
  `revenueAtRiskM` (= open revenue × (1 − recovery confidence)) and `avgRecoveryPct`.
  Revenue-at-risk mirrors the **IFRS 15 variable-consideration constraint**.
- `pipelineStages`, `marginImpact(cos, baseMargin)` (accretive/dilutive vs the base),
  `byDriver` and `categorizeDriver` (keyword buckets over the free-text `driver`
  field → Client-directed scope / Site conditions / Design development / Regulatory &
  permits / Supply & escalation / Estimating & productivity / Other).

## Consumers

The Changes tab panels, the portfolio Changes analytics page, the dashboard's
change-exposure KPIs and the by-segment / by-driver insight charts, and the Change
Order Reviewer agent. (Gotcha: `margin_realized_pct` can be null on trend/absorbed
rows — render guards required.)
