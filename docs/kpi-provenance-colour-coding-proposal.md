# Colour-Coding KPIs by System of Origin

## Seeing at a glance where every number on the dashboard comes from

![The dashboard KPI ribbon with data-source colour coding — blue accents for SAP PS figures, amber for scheduler-driven figures, green for AI PMO's synthesised metrics. The number's colour still carries health: Portfolio SPI sits on a green (AI PMO) accent yet shows a red value because it is off track — the two signals coexist.](kpi-provenance-mockup.png)

An executive reading a KPI wants to know two things at once: *is this number good or bad, and can I trust where it came from?* AI PMO answers both. It tints each KPI by the system its data originates in — SAP PS, the external scheduler, or AI PMO's own synthesis — so a viewer can see which numbers are systems-of-record facts and which AI PMO computes rather than passes through. It is a quiet provenance layer that sits alongside the existing health colours, not a replacement for them.

## Why it fits

AI PMO already tags every record in its canonical model with the system it came from — the provenance behind the SAP ↔ scheduler ↔ AI PMO architecture. Colour-coding makes that invisible lineage visible on the dashboard. It reinforces the core positioning: AI PMO is an intelligence layer that reads the systems of record and synthesises the metrics they cannot produce alone — and it gives the audit-minded viewer data lineage at a glance.

## Two signals, two channels

The design keeps two meanings on two separate visual channels so they never collide:

- **Health** stays on the number's colour — red for off track, amber for watch, green for on track.
- **Provenance** goes on a thin coloured left accent and a small named source tag (for example, "AI PMO").

Because the source is also written in words, colour is never the only signal — accessible and colour-blind safe — and a green "AI PMO" accent is never mistaken for a green "on-track" number. Portfolio SPI shows a green accent (AI-synthesised) with a red value (behind schedule); both read clearly, side by side.

## The colour mapping

| System of origin | Colour | Example KPIs |
| --- | --- | --- |
| SAP PS — system of record | Blue | Approved budget, open commitment, recognised revenue, billed |
| Scheduler (P6 / MS Project) — system of record | Amber | % complete, schedule variance |
| AI PMO — reads + synthesises | Green | Portfolio CPI, SPI, forecast (EAC), forecast variance (VAC) |

The flagship indices — CPI, SPI, earned value — are deliberately green even though they blend SAP cost with scheduler progress. Rather than fudge a single source, they are marked as "computed by AI PMO from the systems of record." That contrast is the whole point: green marks where AI PMO adds something neither source system produces on its own.

## Interaction

A **"Show data sources" toggle** turns the provenance layer on and off — clean by default for a first glance, on when lineage matters. A small legend sits beside the KPI ribbon, and each card carries a hover tooltip naming the exact source and formula, for example *"CPI = EV ÷ AC, derived from SAP cost and scheduler progress."* The full treatment pairs a left accent bar with a named source tag; a lighter corner-dot-plus-tooltip variant keeps busy screens quiet.

## The same language on a single project

The colour language extends naturally to one project — and arguably lands harder there, because a single project screen shows a richer mix of sources side by side: SAP cost, scheduler progress, AI-synthesised earned value, and AI-authored narrative all at once.

![A project view with data-source colour coding: each tab carries a source dot, the Overview KPI strip is colour-coded, and the Structure tab shows AI-authored scope (dashed green) becoming the SAP system of record (solid blue) once booked.](kpi-provenance-project-mockup.png)

The project tabs map onto the three sources almost one-to-one:

| Source | Project surfaces |
| --- | --- |
| SAP PS (blue) | Structure / WBS, Cost, Commitment, Billing, Results Analysis, budget & margin |
| Scheduler (amber) | Schedule / Gantt, % complete, resource demand |
| AI PMO (green) | Overview indices (CPI / SPI / EV), Variance, Risks, Issues, authored Charter & Planning narratives |

The standout is the Structure tab. AI PMO authors a proposed WBS, and "Book to SAP PS" turns it into the system of record — the record's source going from APP to SAP PS. Colour-coding makes that visible: green proposed scope literally becomes blue once booked. It is the one place provenance changes in front of the user, and the clearest single-screen demonstration of the "author, then hand to the system of record" story. Green carries two shades of meaning here — solid green for synthesised metrics (CPI / SPI / EV, derived) and a dashed outline for authored-but-not-yet-booked scope — so the two never blur.

Two guard-rails keep it coherent. The coding sits at the panel and tab grain — a source dot on each tab, an accent on each card — never per row, because tagging every cost line or task would be noise. And every surface, from dashboard to project to analytics, is driven by the same legend and one global "Show data sources" toggle, so it reads as a single visual language rather than a per-page feature.

> **Colour carries health; the accent carries provenance** — so a viewer knows in one glance both whether a number is good and how much to trust its source.
