# Variance Analysis: CV, SV, VAC & the TCPI Reality Test

## How far off are we — and is recovery still realistic?

![Project variance analysis.](book/figures/17-project-variance.png)

Indices like CPI and SPI tell you a project is off track. Variance analysis turns that into the questions a leader actually has to answer: *how many dollars and weeks are we off, how far off will we finish, and — the one most reports avoid — can we still recover?* AI PMO reads the gaps and applies the honesty test.

## Where we are, in money

Two variances locate the project against its plan, both stated in dollars so they carry a size, not an adjective:

- **Cost variance (CV) = EV − AC.** Earned value minus actual cost. Negative means you have spent more than the work is worth — over cost.
- **Schedule variance (SV) = EV − PV.** Earned value minus planned value. Negative means you have accomplished less than planned by now — behind schedule.

Expressed as a figure — and as a percentage of work done — these say not "behind" but *"$8M of work behind."*

## Where we'll end up

**Variance at completion (VAC) = BAC − EAC** — the budget at completion minus the forecast at completion. It is the bottom line: the total over- or under-run the project is heading for if nothing changes, with VAC% (VAC ÷ BAC) sizing it against the budget. CV tells you where you are; VAC commits to where you'll land.

## The reality test most reports omit

The **To-Complete Performance Index (TCPI)** asks: *what cost efficiency must the remaining work run at to still hit the target?* AI PMO computes two:

- **TCPI to budget = (BAC − EV) ÷ (BAC − AC)** — the efficiency the rest of the job needs to finish on the original budget.
- **TCPI to forecast = (BAC − EV) ÷ (EAC − AC)** — the efficiency needed to hit the current forecast.

The test is the comparison with current CPI. If a project runs at CPI 0.90 and the TCPI to recover the budget is 1.15, the message is blunt: *you have never performed better than 0.90, and now you'd need 1.15 for the rest of the job — the budget is gone; re-baseline the forecast and stop pretending.* A TCPI more than about 0.05 above demonstrated CPI is, in practice, not recoverable. This single comparison kills the most common reporting fiction — the perpetual "we'll claw it back next quarter."

## A worked example

A project part-way through:

- **CV = −$6M (CPI 0.92)** — $6M over cost on the work done so far.
- **SV = −$4M (SPI 0.96)** — modestly behind plan.
- **VAC = −$18M (−4.5% of BAC)** — heading for an $18M overrun on current performance.
- **TCPI to budget = 1.14 vs CPI 0.92** — recovery to budget needs efficiency the project has never shown; **not recoverable.** The honest action is to adopt the forecast, re-baseline to the EAC, and manage the $18M — not to promise it back.

AI PMO owns none of these inputs. It reads the earned-value figures (BAC, PV, EV, AC), derives CV, SV, VAC and both TCPIs, then classifies recoverability by comparing TCPI against CPI — the evidence behind the Variance Analyst's commentary. It diagnoses the gap and flags when recovery is no longer credible; re-baselining and setting the forecast belong to the forecasting and change processes it triggers.

> **CV and SV size the position, VAC commits to a landing, and TCPI tests whether recovery is arithmetically possible** — moving a status conversation from optimism to evidence.

*Worked figures use the synthetic demonstration portfolio.*
