# Earned Value, in Plain Terms

## The three numbers that say whether a project is really on track

*Business Edition · Chapter A5 — the flagship synthesis; pairs with the Technical Edition's earned-value library*

![Earned value on a project: the S-curve (PV/EV/AC), CPI/SPI, earned schedule, and EV by WBS branch.](book/figures/11-project-earned-value.png)

## The question this answers

"Are we on track?" usually gets answered with one of two half-truths: *"we've spent
60% of the budget"* (which says nothing about how much work that bought) or *"we're
60% done"* (which says nothing about what it cost). Earned value is the method that
puts the two together into one honest answer. It is AI PMO's flagship capability
because it is the purest example of synthesis across the seam: cost from SAP,
progress from the scheduler, judgement from neither alone.

## Three numbers

Earned value rests on three figures, all expressed in money:

- **Planned Value (PV)** — the budgeted cost of the work you *planned* to have done
  by now. The baseline.
- **Earned Value (EV)** — the budgeted cost of the work you have *actually* done.
  Physical progress, priced at budget. *This is the number neither system holds:*
  it comes from applying the scheduler's progress to SAP's budget.
- **Actual Cost (AC)** — what that work actually cost. From SAP.

The trick is that all three are in the same unit — budgeted dollars — so they can
be compared directly. EV is the pivot: it translates "how much work" into "how much
that work was worth," which is what lets cost and schedule finally be compared on
one scale.

## Two indices

From the three numbers come the two ratios that summarise health:

- **Cost Performance Index (CPI) = EV ÷ AC.** Above 1.0, the work is costing less
  than budgeted; below 1.0, more. *"For every dollar spent, how many dollars of
  work did we get?"*
- **Schedule Performance Index (SPI) = EV ÷ PV.** Above 1.0, ahead of plan; below,
  behind. *"How much of the planned work have we actually accomplished?"*

A CPI of 0.92 and an SPI of 0.96 is an instantly readable verdict: somewhat over
cost, slightly behind — and, importantly, a verdict a spreadsheet reconciliation
would have taken a week to produce.

## Earned schedule: time, in time units

Classic SPI has a known flaw — at the very end of a project it always drifts to 1.0
even if the job finishes late, because EV inevitably catches PV. **Earned schedule**
fixes this by measuring schedule performance in *time* rather than dollars: it asks
*at what past date was today's earned value the plan?* and reports the gap in weeks.
AI PMO computes it alongside SPI so the schedule read stays honest right through to
completion.

## Down to the WBS

A portfolio-level CPI hides as much as it reveals. AI PMO breaks earned value down
to each WBS branch, so "the project is at 0.92" becomes "engineering is fine,
procurement is carrying the overrun" — turning a headline into an actionable
location. The same synthesis runs up to the portfolio and down to the branch.

## Why this matters

Earned value is the one number that cannot be gamed by looking at cost or schedule
alone, and it is the foundation the rest of the money story builds on: the forecast
(A6) extrapolates it, variance analysis (A13) reads its gaps, and revenue
recognition (A7) deliberately stands apart from it. It is the difference between
*reporting activity* and *measuring performance.*

## A worked example

Illustratively, mid-project: planned to have completed $100M of work (PV), actually
completed $96M (EV), and spent $104M to do it (AC).

- **SPI = 96 ÷ 100 = 0.96** — 4% behind plan.
- **CPI = 96 ÷ 104 = 0.92** — getting 92 cents of work per dollar spent; 8% over.
- Read together: the project is modestly behind and meaningfully over cost — a
  cost problem more than a schedule one, which points the response at productivity
  and rates, not just sequence.

## How AI PMO implements it

This is synthesis in its clearest form. AI PMO takes the budget and actual cost
from SAP PS and the physical progress from the scheduler, joins them on the WBS
code, and computes PV/EV/AC, CPI/SPI, earned schedule, and the per-branch
breakdown — rolling up to the portfolio and down to the WBS. It owns none of the
inputs; the entire value is in the join and the computation neither system performs
on its own.

## What it does not do

It does not set the budget, record the cost, or measure the physical progress —
those are SAP's and the scheduler's. It computes the one number that requires both.

---

*Cross-reference: implemented in the Technical Edition's earned-value library
(PV/EV/AC; CPI = EV/AC; SPI = EV/PV; earned schedule; per-WBS rollup). The
foundation for A6 (Forecasting), A13 (Variance), and the counterpoint to A7
(Revenue recognition).*
