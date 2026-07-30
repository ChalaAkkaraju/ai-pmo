# Issue Management: Aging, SLA, Priority & Escalation

## Turning an issue log into a managed queue

Most issue logs are a flat list that grows until someone panics. The questions that matter — *which issues are overdue, which are about to be, what should I work on first, and what needs to go up the chain right now?* — go unanswered because the log carries no notion of time or urgency. AI PMO turns the log into a managed queue with aging, service levels, priority and escalation, all derived from the log the team already keeps.

## A risk that happened

An **issue is a risk that has materialised.** Risk management is about things that *might* happen; issue management is about things that *have*. When a live risk triggers, it leaves the register and enters the issue log — which is why issues carry cost and schedule impact, and why a healthy process tracks the hand-off rather than letting risks quietly disappear.

## Aging and SLAs

Every open issue has an **age** — how long since it was raised — and a **service level (SLA)**: the number of weeks it *should* take to resolve, defaulted by severity (a High issue gets a tighter SLA than a Low). Comparing the two sorts every issue into an aging band:

- **On track** — comfortably within SLA.
- **At risk** — past 75% of its SLA; about to breach.
- **Overdue** — past SLA; breached.

This single derivation changes the log from *"here is everything"* to *"here is what is slipping"* — the only view a manager can act on.

## Priority: what to work on first

Not all open issues deserve equal attention. AI PMO scores **priority = severity × age (capped)** — so a high-severity issue that has been festering rises to the top, while a fresh low-severity one sits below it. The queue sorts itself by genuine urgency rather than by whoever shouted last.

## Escalation: what needs to go up now

Some issues shouldn't wait for the next review. AI PMO flags an issue for **escalation** when it is open, high-severity, and either already overdue *or* has no owner — and hasn't been escalated already. That rule catches exactly the two failure modes that hurt: serious issues breaching their SLA, and serious issues that nobody owns. Surfacing them automatically is the difference between escalation-by-process and escalation-by-accident.

## Resolution speed (MTTR)

Looking backwards, **mean time to resolve (MTTR)** — the average weeks from raised to closed — measures how fast the team actually clears issues. Trended, it shows whether the project is keeping pace or falling behind, and it is the honest counterpart to the open-queue view: a small open log with a worsening MTTR is not the good news it appears to be.

## Why this matters

Aging plus SLA gives **early warning** before a breach; priority gives a **defensible work order**; escalation gives a **safety net** for the serious and the orphaned; MTTR gives a **throughput trend.** Together they convert an inert list into a queue that tells the team what to do next and tells management what is at risk.

## A worked example

Illustratively, a project with 40 open issues:

- **6 overdue, 5 at risk** — eleven need attention now or imminently, not forty.
- **Top of the priority queue:** a high-severity interface issue, 9 weeks old against a 4-week SLA — high severity × large age puts it first.
- **3 flagged for escalation** — high-severity and overdue or unowned; these go up this week regardless of the review cycle.
- **MTTR trending from 3.1 → 3.8 weeks** — resolution is slowing even as the open count looks stable; a leading sign the team is losing ground.

## The full lifecycle — and why it is not a pipeline

Risk, issue and change are three points on one continuum, but the path between them is *conditional*, not a fixed sequence:

> **Risk** (it *might* happen) → *materialises* → **Issue** (it *has* happened) **and a Trend** (the cost/schedule movement it creates) → *worked* → a **funded change order** (the customer pays) **or** an **absorbed, unfunded change** (a straight margin hit).

Every step is optional. Most risks never materialise; many issues are **born directly**, with no prior risk; and some trends arise on their own. So the registers each stand alone — the chain exists only where a real hand-off happened, and a database that *enforced* it would be wrong. AI PMO captures that lineage without enforcing it: an issue points back to its risk (shown as *"Materialised from risk"*), and a change or trend points back to the issue or risk it came from (a *"Traces to …"* chip).

> **Aging, priority and escalation turn an inert list into a queue that tells the team what to do next** — and tells management what is at risk before it breaches.

*Worked figures use the synthetic demonstration portfolio.*
