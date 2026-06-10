# The Cash-Flow Library

## Technical Edition · Chapter B14 — `lib/cash-flow.ts` (pairs with Business A8)

Pure synthesis over the forecast snapshots; no migration, no generator.

## `deriveCashFlow(points, finishIso, opts)`

Builds two cumulative curves on a monthly timeline and the funding gap between them:

```
payLagM = 1, collectLagM = 2, retentionPct = 5   // defaults, adjustable

cumCost  : AC history, then ramping AC→EAC by finish (smoothstep)
cumBill  : billed history, then ramping billed→contract×(1−retention) (smoothstep)

cashOutCum = cumCost[m − payLagM]       // pay later than you incur
cashInCum  = cumBill[m − collectLagM]    // collect later than you bill
net        = cashInCum − cashOutCum      // funding exposure (≤0 = financing)
```

Returns the series plus `currentNet`, `peakFunding` (the trough — max financing
need), `peakPeriod`, and `cashPositivePeriod` (first zero-crossing after the peak).
The lag and retention assumptions are returned with the result so the UI can show
them.

## `aggregateCashFlow(items)`

Rolls many projects' curves onto a shared monthly timeline. `evalAt` evaluates each
project's cumulative value *as of* a period (0 before it starts, its final value
after it ends), so the portfolio sum is correct across projects with different
windows. Produces the portfolio `CashAgg`; the page computes it again per segment and
per project for the drill-down.

## Consumers

The project Cost tab's Cash-flow lens (`components/cash-flow.tsx`) and the portfolio
Analytics → Cash flow page with segment/project drill (`cash-flow-explorer.tsx`).
