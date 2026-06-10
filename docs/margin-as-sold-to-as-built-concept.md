# Margin: As-Sold → As-Planned → As-Built

## Where the profit you signed up for actually goes

*Business Edition · Chapter A9 — pairs with the Technical Edition's margin library*

![The project Overview, where the margin bridge sits alongside earned value.](book/figures/10-project-overview.png)

## The question this answers

Every project is won on a margin — the profit the bid promised. By completion it
has almost always become a *different* margin. The interesting question is never
just "what's our margin now?" but **"how did we get from the margin we sold to the
margin we're forecasting, and what moved it?"** A9 is the bridge that decomposes
that journey into named, attributable steps, so erosion is explained rather than
merely observed.

## Three margins, one project

AI PMO tracks the same project's margin at three points in its life:

- **As-sold** — the margin at booking: *sold contract value − the frozen baseline
  budget*. This is what the deal promised and what the business expects to keep.
- **As-planned** — the margin in the current plan: *current contract value −
  current WBS budget*. The team has detailed and re-estimated; the plan may have
  moved off the bid.
- **As-built** — the forecast margin at completion: *current contract value −
  estimate at completion (EAC)*. This is where the job is actually heading, given
  performance to date.

As-sold is the promise, as-planned is the intention, as-built is the truth. The
gaps between them are the story.

## The bridge: what moved the margin

Reading left to right from as-sold to as-built, AI PMO attributes the change to
named drivers — the same idea as a profit bridge in an annual report:

- **Budget growth** — where the as-planned budget grew above the as-sold baseline
  (re-estimation, scope detailing). Erodes margin if revenue didn't follow.
- **Change orders** — funded variations that move *both* revenue and cost; their
  net effect on margin can be accretive or dilutive.
- **Performance / forecast** — the move from as-planned to as-built, i.e. the
  cost over- or under-run the EAC now predicts versus the plan.

Each step is a labelled increment in the waterfall, so a reviewer sees not just
that margin fell from, say, 12% to 8%, but that *3 points went to budget growth on
the baseline and 1 point to a cost overrun the forecast now carries, partly offset
by an accretive change order.* That is a conversation about causes, not a number
to argue about.

## Why this matters

Margin erosion discovered at completion is a post-mortem; margin erosion
*attributed in-flight* is a management lever. If the bridge shows the loss is
budget growth on the baseline, that points to estimating discipline; if it is
performance, that points to execution; if it is dilutive change, that points to
commercial terms. The same headline number demands different responses depending
on *which step* moved it — and only the bridge tells you which.

It also keeps the three margins honest about provenance: as-sold comes from the
frozen booking baseline, as-planned from the live plan, as-built from the EAC —
each a different source, never silently blended.

## A worked example

Illustratively, a job booked at a 12% margin:

- **As-sold: 12%** — sold contract over the frozen baseline budget.
- **As-planned: 9%** — the baseline budget grew 3 points on re-estimation; revenue
  was unchanged, so margin fell.
- **As-built: 8%** — a cost overrun the EAC now forecasts costs a further point,
  partly offset by a small accretive change order.

The takeaway is specific: most of the erosion (3 of the 4 points) happened at
*planning* — the bid was optimistic against the detailed estimate — not in the
field. That sends the lesson upstream to estimating, where execution metrics alone
would have wrongly blamed the site team.

## How AI PMO implements it

Pure **synthesis**. AI PMO reads the frozen as-sold baseline (booking), the
current contract and WBS budget (the plan), and the EAC (the forecast), and
computes the three margins and the bridge increments between them — attributing
each to budget growth, change orders, or performance. It owns none of these
inputs; it composes them into the waterfall and the plain-language read. The
baseline is the system-of-record booking figure, so the "promise" end of the
bridge is auditable.

## What it does not do

It does not re-baseline the budget, approve changes, or set the forecast — those
live in the cost system and the change process. It explains the margin journey
those produce.

---

*Cross-reference: implemented in the Technical Edition's margin library
(as-sold = sold contract − baseline budget; as-planned = current contract −
current budget; as-built = current contract − EAC; bridge attributes the deltas to
budget growth, change orders, and performance). Builds on A6 (EAC) and A10
(Change & Trend).*
