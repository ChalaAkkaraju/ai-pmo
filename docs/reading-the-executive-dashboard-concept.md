# Reading the Executive Dashboard

## Every KPI on the landing view — what it answers, and where it drills

*Business Edition · Chapter A16 — the guided tour of the portfolio dashboard*

![The executive portfolio dashboard — read top to bottom: headline health, then the money, then what needs attention, then the patterns underneath.](book/figures/01-portfolio-dashboard.png)

## How the page is meant to be read

The landing dashboard answers "how is the portfolio, really?" in a single screen,
and it is laid out to be read **top to bottom as a narrowing funnel**: the headline
health first, then the money, then what needs attention now, then the patterns
underneath, then the detail. Two rules hold everywhere: **every KPI is clickable**
— it opens a drill modal of the underlying records with a link to the full
analytics page — and **colour carries meaning** (A15), so the eye is drawn to the
right hue before a label is read. This chapter walks each section in order; each KPI
notes the question it answers and the chapter that explains its method.

## The hero

The top band is the one-glance verdict: a **headline** health statement, a **segment
donut** (the portfolio's mix by segment), a **lifecycle bar** (how many projects sit
in each delivery stage), and a **health pulse**. It exists to answer "should I be
worried?" before any number is studied.

## Portfolio earned value — the pulse

The first measured section is the portfolio **earned value** card: aggregate CPI and
SPI rolled up across every active project, with the S-curve and a RAG read. This is
the single most honest "on track?" number on the page — cost and schedule combined,
ungameable by either alone (the method is A5). It is the pulse the rest of the page
elaborates.

## Portfolio financial position — the money

A ribbon of the cost-to-cash figures, left to right following the money:

- **Open commitment** — value of open purchase orders; forward cost not yet incurred.
- **Recognised revenue** — what may be booked to date (cost-based POC, IFRS 15; A7).
- **Recognised margin** — recognised revenue minus cost of sales, as a percentage
  (A7/A9).
- **Net unbilled (WIP)** *or* **Deferred / over-billed** — the balance-sheet read:
  a contract asset when revenue is recognised ahead of billing, a contract liability
  when billed ahead (A7).
- **Billed to date** — invoices raised.
- **Change orders** — total revenue impact plus how many are in flight (A10).
- **Absorbed · unfunded** — cost eaten on changes that couldn't be recovered;
  margin leakage. Clicks through to the change register (A10).

Read together, this ribbon is the project's commercial position in seven numbers.

## Segments

Cards for each segment (renewables, water, industrial, power), each clickable to drill
into that segment's projects. This is the portfolio's structure — where the work, and
the exposure, concentrates.

## Portfolio watchlist — what needs attention

Where the financial ribbon is the position, the watchlist is the **alarm panel** —
every tile is a count or amount of something going wrong, each drilling to the records:

- **Open H issues** — open high-severity issues (A12).
- **Realised risks** — risks that have materialised (A11 → A12).
- **Cost off-track** — projects running CPI < 0.95 (A5/A13).
- **Schedule off-track** — projects running SPI < 0.95 (A5/A13).
- **Contingency drawn** — total contingency consumed across the portfolio (A11).
- **Patterns at emergence** — cross-project signals reaching their threshold.
- **Revenue at risk** — open-trend revenue weighted by unlikely recovery; the change
  exposure that threatens margin (A10).

If a manager reads only one section in a hurry, it is this one.

## Portfolio insights — the patterns underneath

Five mini-charts turn the counts into distributions, each bar/band clickable:

- **Risks by category** — where risk concentrates by cross-cutting class, with total
  EMV (A11).
- **Issues by severity** — the open issue mix, Low/Medium/High (A12).
- **Contingency consumption** — projects banded by share of contingency used (A11).
- **Change exposure by segment** — open-trend revenue-at-risk plus absorbed cost, by
  segment: *where* the change exposure sits (A10).
- **Change exposure by driver** — the same exposure by root-cause driver: *why* it is
  happening (A10).

These answer "what is driving the headline?" — the diagnostic layer beneath the
watchlist.

## Hot list, activity and role KPIs

Below the insights sit the operational tail: a **hot list** of the handful of projects
most needing attention (a composite of CPI/SPI deviation, open high issues and realised
risks), **your recent activity** (the agent narratives you've generated), and a
**role-specific KPI strip** — tiles chosen for the colleague's role (commercial, risk,
HSE, …) that are net-new versus the shared ribbons above. The page closes with the
action ribbon, where cross-agent tasks are assigned and answered (B11).

## How the dashboard varies by role

The same portfolio, seen from different chairs. The shared sections above — earned
value, financial position, watchlist, insights — are **identical for every role**:
there is one portfolio truth, not a set of per-role silos. What personalises the page
is the *lens*, not the data:

- **Identity.** The header carries the colleague's role title (Senior PM, Commercial
  Manager, Portfolio Risk Analyst, VP Sponsor, and so on — ten seeded roles).
- **The role KPI strip.** A "Your {role} KPIs" band of tiles chosen for that remit and
  net-new versus the shared ribbons — the Commercial Manager sees change-order
  economics, the Risk Analyst sees open / high / mitigated risk counts, the HSE Manager
  sees HSE metrics.
- **Agent access.** Each role may invoke a curated subset of the agent roster relevant
  to its work, so the assistant offers the right tools rather than all of them.
- **Write capability.** Create-capable roles (PM, commercial, controls, …) can launch
  project intake, assign tasks and run agents that change state; read-only roles — the
  VP Sponsor, for instance — get the same visibility without the controls.
- **Section emphasis.** Each role definition names the dashboard sections most relevant
  to it, so the page leads with what that colleague came to see.

The same portfolio, three different chairs — note the role title in the header and the bespoke KPI strip in each:

![The Commercial Manager's dashboard — change-order economics in the role KPI strip.](book/figures/role-demo-commercial-kpis.png)

![The Portfolio Risk Analyst's dashboard — open / high / mitigated risk counts.](book/figures/role-demo-risk-kpis.png)

![The HSE Manager's dashboard — HSE-specific KPIs.](book/figures/role-demo-hse-manager-kpis.png)

The design point: **one synthesis, many vantage points.** Access is conveyed by an
unguessable URL token per role, and the role definition (identity, agents, sections,
write permission) shapes the view — giving each colleague their relevant cut of a
single, shared portfolio truth.

## The two ideas that make it work

Everything above rests on two design choices covered elsewhere in this part:
**provenance** — every figure's source (system-of-record fact, AI synthesis, forecast,
human override) is encoded so the reader knows how much to trust it (A14) — and the
**visual language** — colour by theme, icon by capability, a one-line caption stating
the question each thing answers (A15). The dashboard is not a wall of numbers; it is a
single, readable argument about the health of the portfolio, and every number on it is
one click from the records behind it.

---

*Cross-reference: the dashboard composes the outputs of nearly every capability in
this book — earned value (A5), the money story (A7–A10), risk/issues/variance
(A11–A13) — behind the provenance (A14) and visual (A15) conventions. Implemented in
the Technical Edition across the dashboard page and client, reading the canonical
model via paginated portfolio queries (B18).*
