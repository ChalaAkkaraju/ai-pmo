# Variance Analysis: CV, SV, VAC & the TCPI Reality Test

## Reading the gap between plan and performance — and what it takes to recover

*Business Edition · Chapter A13 — pairs with the Technical Edition's earned-value library*

![Project variance analysis.](book/figures/17-project-variance.png)

## The question this answers

Earned value (A5) gives the indices CPI and SPI; variance analysis turns those
into the management questions: *how many dollars and weeks are we off, how far off
will we finish, and — crucially — is recovery still realistic?* A13 is the chapter
that reads the gaps and applies the honesty test most reporting avoids.

## The variances: where we are

Two variances locate the project against its plan, both in money terms:

- **Cost variance (CV) = EV − AC.** Earned value minus actual cost. Negative means
  you have spent more than the work is worth — over cost.
- **Schedule variance (SV) = EV − PV.** Earned value minus planned value. Negative
  means you have accomplished less than planned by now — behind schedule.

Expressed as a money figure (and as a percentage of work done), these say not just
"behind" but "$8M of work behind" — a size, not an adjective.

## The forecast variance: where we'll end up

**Variance at completion (VAC) = BAC − EAC** — the budget at completion minus the
forecast at completion. It is the bottom line of variance analysis: the total
over- or under-run the project is heading for if nothing changes, with VAC% (VAC ÷
BAC) sizing it against the budget. CV tells you where you are; VAC tells you where
you'll land.

## The TCPI reality test

Here is the part most status reports quietly omit. The **To-Complete Performance
Index (TCPI)** asks: *what cost efficiency must the remaining work run at to still
hit the target?* AI PMO computes two:

- **TCPI to budget = (BAC − EV) ÷ (BAC − AC)** — the CPI the rest of the job needs
  to still finish on the original budget.
- **TCPI to forecast = (BAC − EV) ÷ (EAC − AC)** — the CPI needed to hit the
  current forecast.

The reality test is the comparison with current CPI. If a project is running at a
CPI of 0.90 and the TCPI to recover the budget is 1.15, the message is blunt: *you
have never performed better than 0.90, and now you'd need 1.15 for the rest of the
job — the budget is gone, stop pretending and re-baseline the forecast.* A TCPI
more than ~0.05 above demonstrated CPI is, in practice, not recoverable. This one
comparison prevents the most common reporting fiction — the perpetual "we'll claw
it back next quarter."

## Why this matters

CV and SV give an honest, sized statement of position; VAC commits to a landing
point; TCPI tests whether the recovery everyone hopes for is arithmetically
possible. Together they move a status conversation from optimism to evidence — and
they are the natural trigger for the forecasting (A6) and change (A10) processes
when the test says the plan no longer holds.

## A worked example

Illustratively, a project part-way through:

- **CV = −$6M (CPI 0.92)** — $6M over cost on the work done so far.
- **SV = −$4M (SPI 0.96)** — modestly behind plan.
- **VAC = −$18M (−4.5% of BAC)** — heading for an $18M overrun on current
  performance.
- **TCPI to budget = 1.14 vs CPI 0.92** — recovery to budget needs 1.14 efficiency
  the project has never shown; **not recoverable.** The honest action is to adopt
  the forecast (re-baseline to the EAC) and manage the $18M, not to promise it
  back.

## How AI PMO implements it

Synthesis over the earned-value inputs (BAC, PV, EV, AC): it derives CV, SV and
their percentages, VAC and VAC%, and both TCPIs, then compares TCPI against CPI to
classify recoverability — feeding the Variance Analyst agent's commentary. It owns
none of the inputs; it reads the gap and tells the truth about it.

## What it does not do

It does not re-baseline the project or set the forecast (that's the forecasting and
change processes); it diagnoses the variance and flags when recovery is no longer
credible, so those processes are triggered honestly.

---

*Cross-reference: implemented in the Technical Edition's earned-value library
(CV = EV − AC; SV = EV − PV; VAC = BAC − EAC; TCPI(BAC) = (BAC−EV)/(BAC−AC);
TCPI(EAC) = (BAC−EV)/(EAC−AC)). Builds directly on A5 (Earned value) and triggers
A6 (Forecasting).*
