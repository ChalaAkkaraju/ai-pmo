# Reading the Executive Dashboard

## How is the portfolio, really — answered on a single screen

![The executive portfolio dashboard — read top to bottom: headline health, then the money, then what needs attention, then the patterns underneath.](book/figures/01-portfolio-dashboard.png)

The landing dashboard answers *"how is the portfolio, really?"* in one screen, laid out to be read **top to bottom as a narrowing funnel**: headline health first, then the money, then what needs attention now, then the patterns underneath, then the detail. Two rules hold everywhere. **Every KPI is clickable** — it opens a drill modal of the underlying records with a link to the full analytics page. And **colour carries meaning**, so the eye is drawn to the right hue before a label is read.

## The hero

The top band is the one-glance verdict: a **headline** health statement, a **segment donut** (the portfolio's mix by segment), a **lifecycle bar** (how many projects sit in each delivery stage), and a **health pulse**. It exists to answer "should I be worried?" before any number is studied.

## Portfolio earned value — the pulse

The first measured section is the portfolio **earned value** card: aggregate CPI and SPI rolled up across every active project, with the S-curve and a RAG read. This is the single most honest "on track?" number on the page — cost and schedule combined, ungameable by either alone. It is the pulse the rest of the page elaborates.

## Financial position — the money

A ribbon of the cost-to-cash figures, left to right following the money:

- **Open commitment** — value of open purchase orders; forward cost not yet incurred.
- **Recognised revenue** — what may be booked to date (cost-based POC, IFRS 15).
- **Recognised margin** — recognised revenue minus cost of sales, as a percentage.
- **Net unbilled (WIP)** *or* **Deferred / over-billed** — the balance-sheet read: a contract asset when revenue is recognised ahead of billing, a contract liability when billed ahead.
- **Billed to date** — invoices raised.
- **Change orders** — total revenue impact plus how many are in flight.
- **Absorbed · unfunded** — cost eaten on changes that couldn't be recovered; margin leakage. Clicks through to the change register.

Read together, this ribbon is the portfolio's commercial position in seven numbers.

## Segments

Cards for each segment — renewables, water, industrial, power — each clickable to drill into that segment's projects. This is where the work, and the exposure, concentrates.

## Watchlist — what needs attention

Where the financial ribbon is the position, the watchlist is the **alarm panel**: every tile is a count or amount of something going wrong, each drilling to the records:

- **Open H issues** — open high-severity issues.
- **Realised risks** — risks that have materialised.
- **Cost off-track** — projects running CPI < 0.95.
- **Schedule off-track** — projects running SPI < 0.95.
- **Contingency drawn** — total contingency consumed across the portfolio.
- **Patterns at emergence** — cross-project signals reaching their threshold.
- **Revenue at risk** — open-trend revenue weighted by unlikely recovery; the change exposure that threatens margin.

If a manager reads only one section in a hurry, it is this one.

## Insights — the patterns underneath

Five mini-charts turn the counts into distributions, each bar clickable:

- **Risks by category** — where risk concentrates by cross-cutting class, with total EMV.
- **Issues by severity** — the open issue mix, Low / Medium / High.
- **Contingency consumption** — projects banded by share of contingency used.
- **Change exposure by segment** — open-trend revenue-at-risk plus absorbed cost, by segment: *where* the exposure sits.
- **Change exposure by driver** — the same exposure by root-cause driver: *why* it is happening.

These answer "what is driving the headline?" — the diagnostic layer beneath the watchlist.

## The operational tail

Below the insights sit a **hot list** of the handful of projects most needing attention (a composite of CPI/SPI deviation, open high issues and realised risks), **your recent activity** (the agent narratives you've generated), and a **role-specific KPI strip** — tiles chosen for the colleague's role that are net-new versus the shared ribbons above. The page closes with the action ribbon, where cross-agent tasks are assigned and answered.

## How the dashboard varies by role

The same portfolio, seen from different chairs. The shared sections — earned value, financial position, watchlist, insights — are **identical for every role**: there is one portfolio truth, not a set of per-role silos. What personalises the page is the *lens*, not the data:

- **Identity.** The header carries the colleague's role title — Senior PM, Commercial Manager, Portfolio Risk Analyst, VP Sponsor, and so on across ten seeded roles.
- **The role KPI strip.** A "Your {role} KPIs" band chosen for that remit and net-new versus the shared ribbons — the Commercial Manager sees change-order economics, the Risk Analyst sees open / high / mitigated risk counts, the HSE Manager sees HSE metrics.
- **Agent access.** Each role may invoke a curated subset of the agent roster relevant to its work, so the assistant offers the right tools rather than all of them.
- **Write capability.** Create-capable roles — PM, commercial, controls — can launch project intake, assign tasks and run agents that change state; read-only roles such as the VP Sponsor get the same visibility without the controls.
- **Section emphasis.** Each role definition names the dashboard sections most relevant to it, so the page leads with what that colleague came to see.

The same portfolio, three different chairs — note the role title in the header and the bespoke KPI strip in each:

![The Commercial Manager's dashboard — change-order economics in the role KPI strip.](book/figures/role-demo-commercial-kpis.png)

![The Portfolio Risk Analyst's dashboard — open / high / mitigated risk counts.](book/figures/role-demo-risk-kpis.png)

![The HSE Manager's dashboard — HSE-specific KPIs.](book/figures/role-demo-hse-manager-kpis.png)

Access is conveyed by an unguessable URL token per role, and the role definition — identity, agents, sections, write permission — shapes the view, giving each colleague their relevant cut of a single, shared portfolio truth.

## What makes it work

Everything above rests on two design choices: **provenance** — every figure's source, whether a system-of-record fact, AI synthesis, forecast or human override, is encoded so the reader knows how much to trust it — and the **visual language** — colour by theme, icon by capability, a one-line caption stating the question each thing answers.

> **The dashboard is not a wall of numbers; it is a single, readable argument about the health of the portfolio** — and every number on it is one click from the records behind it.

*Worked figures use the synthetic demonstration portfolio.*
