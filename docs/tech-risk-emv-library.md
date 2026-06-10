# The Risk-EMV Library

## Technical Edition · Chapter B16 — `lib/risk-emv.ts` (pairs with Business A11)

Pure quantitative-risk functions over the risk register.

## Exposure

`isLive(status)` keeps only open / actively-managed threats (residual exposure
remains). `computeExposure(risks)` returns:

```
inherentEmv   = Σ emv_usd            (live threats, pre-mitigation)
residualEmv   = Σ residual_emv_usd   (post-mitigation)
reductionPct  = (inherentEmv − residualEmv) / inherentEmv
opportunityUpside, realisedCost, liveThreats
```

The reduction percentage is the headline "did mitigation work?" number; opportunities
(favourable risks) and realised cost are tracked separately from threat exposure.

## Contingency adequacy

`computeContingencyAdequacy` tests the buffer against what remains:

```
coverage = remainingContingency / residualExposure
band     = coverage ≥ 1.0 → 'Adequate'
           coverage ≥ 0.75 → 'Tight'
           else            → 'Exposed'
```

P50/P80 sizing is the conceptual frame; where a formal Monte Carlo P80 exists it is
consumed rather than re-derived.

## Consumers

The risk exposure panel, the inherent/residual heatmap toggle, the portfolio risk
analytics (EMV), and the Risk Analyst agent. A materialised risk crosses into the
issue log (B-issues / Business A12).
