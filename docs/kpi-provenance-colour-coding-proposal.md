# Proposal — colour‑coding KPIs by system of origin

*Status: proposed, mocked up, not implemented. Reversible — would ship behind a toggle, off by default.*

## Summary

A dashboard enhancement that tints each KPI by the system its data comes from — SAP PS, the external scheduler, or AI PMO's own synthesis — so a viewer can see at a glance where every number originates, and in particular which numbers AI PMO computes rather than passes through. It is a quiet provenance layer that sits alongside the existing health colours, not a replacement for them.

![Mockup of the dashboard KPI ribbon with data-source colour coding — blue accents for SAP PS figures, amber for scheduler-driven figures, green for AI PMO’s synthesised metrics. The number’s colour still carries health: note Portfolio SPI sits on a green (AI PMO) accent yet shows a red value because it is off track — the two signals coexist.](kpi-provenance-mockup.png)

*Above: the proposed look with the "Show data sources" toggle on. Toggling it off returns the dashboard to today’s clean view.*

## Why it fits AI PMO

AI PMO already tags every record in its canonical model with the system it came from (the provenance behind the SAP ↔ scheduler ↔ AI PMO architecture). This proposal simply makes that invisible provenance visible on the dashboard. It reinforces the core positioning — AI PMO is an intelligence layer that reads the systems of record and synthesises the metrics they cannot produce alone — and it gives the audit‑minded viewer data lineage at a glance.

## How it works — two independent signals

The design keeps two meanings on two separate visual channels so they never collide:

- **Health / tone** stays on the number's colour — red for off track, amber for watch, green for on track — exactly as today.
- **Provenance** goes on a thin coloured left accent and a small named source tag (for example, "AI PMO").

Because the source is also written in words, colour is never the only signal (accessible and colour‑blind safe), and a green "AI PMO" accent is never mistaken for a green "on‑track" number. Worked example: Portfolio SPI shows a green accent (AI‑synthesised) with a red value (behind schedule) — both read clearly, side by side.

## Colour mapping

| System of origin | Colour | Example KPIs |
| --- | --- | --- |
| SAP PS — system of record | Blue | Approved budget, open commitment, recognised revenue, billed |
| Scheduler (P6 / MS Project) — system of record | Amber | % complete, schedule variance |
| AI PMO — reads + synthesises | Green | Portfolio CPI, SPI, forecast (EAC), forecast variance (VAC) |

The flagship indices — CPI, SPI, earned value — are deliberately green even though they are blends of SAP cost and scheduler progress. Rather than fudge a single source, they are marked as "computed by AI PMO from the systems of record." That contrast is the whole point: green marks where AI PMO adds something neither source system produces on its own.

## Interaction

A "Show data sources" toggle turns the provenance layer on and off — clean by default for a first glance, on when lineage matters. A small legend sits beside the KPI ribbon, and each card carries a hover tooltip naming the exact source and formula (for example, "CPI = EV ÷ AC, derived from SAP cost and scheduler progress").

## Variants

- **Full (recommended for the story):** left accent bar plus a named source tag — most informative at a glance.
- **Light:** a corner dot plus tooltip only — quieter and less busy, but the source is not named without hovering.

## Trade‑offs and open questions

The full variant adds some visual density (an accent and a tag on every card); the toggle and the light variant both mitigate that. Two decisions remain open: whether the layer should be always‑on or a toggle that defaults off, and whether to use the full bar‑and‑tag treatment or the lighter dot‑only one.

## Extending to individual project views

The same colour language extends naturally to a single project — and arguably lands harder there, because one project screen shows a richer mix of sources side by side: SAP cost, scheduler progress, AI‑synthesised earned value, and AI‑authored narrative all at once.

![A project view with data‑source colour coding: each tab carries a source dot, the Overview KPI strip is colour‑coded, and the Structure tab shows AI‑authored scope (dashed green) becoming the SAP system of record (solid blue) once booked.](kpi-provenance-project-mockup.png)

*Above: a project's tab bar (each tab dotted by its primary source), the Overview KPI strip, and the Structure‑tab provenance flip.*

The project tabs map onto the three sources almost one‑to‑one:

| Source | Project surfaces |
| --- | --- |
| SAP PS (blue) | Structure / WBS, Cost, Commitment, Billing, Results Analysis, budget & margin |
| Scheduler (amber) | Schedule / Gantt, % complete, resource demand |
| AI PMO (green) | Overview indices (CPI / SPI / EV), Variance, Risks, Issues, authored Charter & Planning narratives |

The standout is the Structure tab. AI PMO authors a proposed WBS, and "Book to SAP PS" turns it into the system of record — the record's source system going from APP to SAP PS. Colour‑coding makes that visible: green proposed scope literally becomes blue once booked. It is the one place provenance changes in front of the user, and the clearest single‑screen demonstration of the "author, then hand to the system of record" story.

This raises one design decision. At the project level green carries two meanings — "synthesised" (CPI / SPI / EV, derived) and "authored" (the proposed WBS, before booking). The mock distinguishes them with solid green for synthesised metrics and a dashed outline for authored‑but‑not‑yet‑booked scope. Worth deciding whether that distinction earns its keep or adds avoidable complexity.

Two guard‑rails carry over from the portfolio view. Apply the coding at the panel / tab grain — a source dot on each tab, an accent on each card — not per row; tagging every cost line or task would be noise. And drive every surface (dashboard, project, analytics) from the same legend and one global "Show data sources" toggle, so it reads as a single visual language rather than a per‑page feature.

## Questions to put to users during the demo

1. Does knowing each KPI's source system help you trust the number, or is it noise?
2. Does the "green = AI‑synthesised" distinction land — is it clear that CPI / SPI are computed, not raw figures?
3. Would you want this always on, or as a toggle you switch on when you care about lineage?
4. Full named tags, or just a subtle dot?
5. Are blue / amber / green the right mappings, or would your teams read other colours more naturally?
