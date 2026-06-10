# Issue Management: Aging, SLA, Priority & Escalation

## Turning an issue log into a managed queue

*Business Edition · Chapter A12 — pairs with the Technical Edition's issue-metrics library*

## The question this answers

Most issue logs are a flat list that grows until someone panics. The questions
that matter — *which issues are overdue, which are about to be, what should I work
on first, and what needs to go up the chain right now?* — go unanswered because
the log carries no notion of time or urgency. A12 turns the log into a managed
queue with aging, service levels, priority and escalation.

## A risk that happened

First, the link to A11: an **issue is a risk that has materialised.** Risk
management is about things that *might* happen; issue management is about things
that *have*. When a live risk triggers, it leaves the register and enters the
issue log — which is why issues carry cost and schedule impact, and why a healthy
process tracks the hand-off rather than letting risks quietly disappear.

## Aging and SLAs

Every open issue has an **age** — how long since it was raised — and a **service
level (SLA)**: the number of weeks it *should* take to resolve, defaulted by
severity (a High issue gets a tighter SLA than a Low). Comparing the two sorts
every issue into an aging band:

- **On track** — comfortably within SLA.
- **At risk** — past 75% of its SLA; about to breach.
- **Overdue** — past SLA; breached.

This single derivation changes the log from "here is everything" to "here is what
is slipping," which is the only view a manager can act on.

## Priority: what to work on first

Not all open issues deserve equal attention. AI PMO scores **priority = severity ×
age (capped)** — so a high-severity issue that has been festering rises to the top,
while a fresh low-severity one sits below it. The queue sorts itself by genuine
urgency rather than by whoever shouted last.

## Escalation: what needs to go up now

Some issues shouldn't wait for the next review. AI PMO flags an issue for
**escalation** when it is open, high-severity, and either already overdue *or* has
no owner — and hasn't been escalated already. That rule catches exactly the two
failure modes that hurt: serious issues breaching their SLA, and serious issues
that nobody owns. Surfacing them automatically is the difference between
escalation-by-process and escalation-by-accident.

## Resolution speed (MTTR)

Looking backwards, **mean time to resolve (MTTR)** — the average weeks from raised
to closed — measures how fast the team actually clears issues. Trended, it shows
whether the project is keeping pace or falling behind, and it is the honest
counterpart to the open-queue view: a small open log with a worsening MTTR is not
the good news it appears to be.

## Why this matters

Aging plus SLA gives **early warning** before a breach; priority gives a **defensible
work order**; escalation gives a **safety net** for the serious and the orphaned;
MTTR gives a **throughput trend.** Together they convert an inert list into a
queue that tells the team what to do next and tells management what is at risk —
the operational complement to the financial chapters.

## A worked example

Illustratively, a project with 40 open issues:

- **6 overdue, 5 at risk** — eleven need attention now or imminently, not forty.
- **Top of the priority queue:** a high-severity interface issue, 9 weeks old
  against a 4-week SLA — high severity × large age puts it first.
- **3 flagged for escalation** — high-severity and overdue or unowned; these go up
  this week regardless of the review cycle.
- **MTTR trending from 3.1 → 3.8 weeks** — resolution is slowing even as the open
  count looks stable; a leading sign the team is losing ground.

## How AI PMO implements it

Synthesis over the issue log: it derives age, looks up the severity-based SLA,
assigns the aging band, scores priority, applies the escalation rule, and computes
MTTR — then rolls these into an issue-health panel and feeds them to the Issue
Logger agent. It reads the log; it does not run the issue workflow.

## What it does not do

It does not assign, resolve, or own issues, and it does not replace a ticketing or
field-issue system where one exists (it would consume that feed). It makes the
queue legible and the urgent visible.

---

*Cross-reference: implemented in the Technical Edition's issue-metrics library
(age vs severity-based SLA → On track / At risk / Overdue; priority = severity ×
age; escalation rule; MTTR). Receives materialised risks from A11.*
