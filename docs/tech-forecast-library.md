# The Forecast Library

## Technical Edition · Chapter B13 — `lib/forecast.ts` + `forecast_snapshots` (pairs with Business A6)

Forecasting adds the **time dimension** the point-in-time metrics lack. It rests on
a monthly snapshot table plus pure decomposition functions.

## The snapshot model

`forecast_snapshots` (migration 0032) stores one row per `(project_id, period)` with
`bac, ev, ac, eac, etc, vac, cpi, spi, contract_value, poc_pct, recognised_revenue,
billed, forecast_margin`. Generator 22 builds it **anchored to live EV**: it
recomputes the current BAC/EV/AC/CPI/EAC by mirroring `computeEv`, makes that the
latest close, and back-casts N earlier months with smooth easing (`ease = t*t*(3-2t)`)
so the series *ends* exactly at the live EV card's EAC and drifts believably — no
zigzag, numbers that tie under scrutiny.

## EAC methods

Three standard forecasts, chosen by reliability of the trend:

```
eac1 = bac / cpi                       // performance continues
eac2 = ac + (bac - ev)                 // remainder at budget
eac3 = ac + (bac - ev) / (cpi * spi)   // cost- and schedule-weighted
```

## Functions

`parseForecast` returns a sorted, typed series; `eacMovement` decomposes the latest
ΔEAC into a **scope** component `(Δbac)/prevCPI` and a **performance** residual, so a
forecast change reads as "X from scope growth, Y from performance" rather than an
unexplained jump.

## Consumers

The forecast-trend chart (margin-at-complete band + transposed month table), the
cash-flow library (cost/EAC and billing series), and the Variance Analyst.
