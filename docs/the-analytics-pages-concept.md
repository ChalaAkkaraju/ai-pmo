# The Analytics Pages

## Portfolio deep-dives behind the dashboard

*Business Edition · Part IV — the deep-dive companion to the dashboard (A16)*

![Portfolio earned value analytics — the CPI×SPI quadrant and the worst-performers register.](book/figures/02-portfolio-earned-value.png)

## Dashboard versus analytics

The dashboard (A16) is the one-screen summary: headline numbers, each one click from a
quick drill modal. The **Analytics pages** are where that click *lands in full* — a
dedicated, portfolio-wide page per domain, reached from every "see all" link and from
the analytics navigation. The relationship is deliberate: the dashboard answers "is
anything wrong?"; the analytics pages answer "show me everything, sorted and
filterable, so I can work it."

Every analytics page shares one shape: **charts on top, a register below.** The charts
give the distribution and the outliers; the register is a sortable, filterable table of
the underlying records across all active projects, each row linking to its project. One
layout, seven lenses.

## Earned value

The portfolio earned-value page plots every project on a **CPI × SPI quadrant** — the
four corners being on-track, over-cost, behind-schedule, and both — so the projects in
trouble separate themselves visually. Below it, a searchable **worst-performers
register** ranks projects by cost performance. This is where "Cost off-track" on the
dashboard becomes the full league table (method: A5/A13).

## Risks

![Portfolio risk analytics — EMV exposure and the risk heatmap.](book/figures/04-portfolio-risks.png)

The risk page totals **EMV exposure** across the portfolio, shows the **inherent vs
residual heatmap** (probability × impact, before and after mitigation), and lists the
full risk register — filterable by class, status and owner. It is the portfolio view of
A11: where the risk price sits and whether mitigation is buying it down.

## Changes

![Portfolio change & trend — funded vs absorbed, with revenue-at-risk.](book/figures/05-portfolio-changes.png)

The changes page is the portfolio trend register: KPIs for total changes, executed and
in-pipeline, cumulative revenue and net margin, plus the exposure pair — **Absorbed
(unfunded)** and **Revenue-at-risk**. Donuts break changes down by status and segment, a
bar ranks them by driver, and the register lists every change order. This is the full
view behind the dashboard's change-exposure KPIs and mini-charts (A10).

## Cash flow

![Portfolio funding exposure with drill to segment and project.](book/figures/03-portfolio-cash-flow.png)

The cash-flow page is the portfolio funding-exposure explorer: the whole book's cash
curve — total working capital, peak funding requirement and cash-positive crossover —
with **drill-down from portfolio to segment to a single project** (A8). It answers the
treasurer's question at every level of zoom.

## Issues, resources and actions

Three further pages complete the set:

- **Issues** — portfolio issue health (aging, SLA breaches, severity mix) and the full
  issue register (A12).
- **Resources** — resource demand rolled up by role and segment, with segment
  drill-down — the visibility view over who is needed where.
- **Actions** — the cross-agent action analytics: open and closed assignments across the
  portfolio, the assign→respond loop made visible (B11).

## Why the pages matter

The dashboard is for *noticing*; the analytics pages are for *working*. Together they
give the two modes a portfolio lead actually needs — a glance that flags the problem and
a workbench that lets them sort, filter and act on every record behind it — without ever
leaving the synthesis layer for a spreadsheet. And because every page reads the full
portfolio, they all rely on paginated queries so no project is ever silently dropped
(B18).

---

*Cross-reference: the analytics pages are the portfolio expression of the capability
chapters — earned value (A5/A13), risk (A11), issues (A12), change (A10), cash flow (A8)
— and the destination of the dashboard's drill-throughs (A16).*
