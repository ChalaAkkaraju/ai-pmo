# Colour & Iconography

## How AI PMO makes a dense PMO legible at a glance

*Business Edition · Chapter A15 (appendix) — the visual design language*

![The dashboard's visual language — colour by theme, icon by capability.](book/figures/01-portfolio-dashboard.png)

## Why a visual language

A portfolio dashboard can show a hundred numbers; a good one lets you *read* them
without consciously decoding. AI PMO uses a consistent visual language so that
meaning is carried by colour and icon, not just by labels — a reader learns the
code once and then navigates by it everywhere in the product. This chapter records
that language so it stays consistent as the product grows.

## Colour carries meaning

Colour is never decorative; each hue maps to a concept, and that mapping holds
across every screen:

- **Amber — cost.** Where the money went; cost-to-date, the cost lens.
- **Emerald — earned / revenue.** Earned value, recognised revenue, things going
  right.
- **Sky blue — cash.** Cash flow, funding, financing.
- **Orange — commitment.** Committed but not yet spent (open POs).
- **Red — risk / threat.** Risk exposure, breaches, things requiring attention.
- **Fuchsia — change.** Change orders and trend exposure.
- **Rose — variance.** Deviation from plan.
- **Indigo — structure.** The WBS and project structure.
- **Violet — schedule.** Time, dates, the calendar.
- **Cyan — resources.** People and capacity.
- **Blue — planning.** Plans and artefacts.
- **Slate — overview / neutral.** Summary and context.

Because the mapping is fixed, a splash of red anywhere reads as risk, amber as
cost, sky as cash — before a single label is read.

## Iconography

Every capability carries an icon drawn from the same lexicon — a receipt for cost,
a rising line for earned value, waves for cash flow, a shield for risk, a gauge or
chart for performance — so tabs and cards are recognisable by shape as well as
colour. On the workspace tabs the icons sit muted until a tab is active, when both
the icon and its underline light up in the capability's colour; the active view
announces itself in its own hue.

## Caption discipline: what each thing answers

Alongside colour and icon, each capability earns a one-line caption that states the
*question it answers*, not the feature name — for example, on the cost lenses:

- **Cost-to-date — amber, receipt** — "what we've spent."
- **Revenue recognition — emerald, rising line** — "what we've earned."
- **Cash flow — sky, waves** — "what we finance."

The pattern — colour for theme, icon for recognition, caption for the question — is
what lets a non-specialist read a dense PMO screen the way a specialist does.

## Trustworthy numbers: provenance by colour

The same discipline extends to *where a number comes from.* A figure that is a
system-of-record fact reads differently from one AI PMO has synthesised or
forecast, and from one a human has overridden. Encoding provenance — fact vs
synthesis vs forecast vs human judgement — visually means a reader always knows how
much to trust a number, which is the foundation of the whole product's credibility
(see A14, KPI provenance).

## Why this matters

In an EPC portfolio the failure mode is not too little data, it is too much,
undifferentiated. A consistent visual language is the cheapest, highest-leverage
way to make a complex product *feel* simple — and it is a deliberate design
decision, not an accident of styling, which is why it is documented here as part
of the method rather than left to taste.

---

*Cross-reference: pairs with A14 (KPI provenance & trustworthy numbers). The colour
and icon tokens are implemented centrally in the Technical Edition (shared badge,
chart-palette and tab-accent definitions) so the language stays consistent by
construction.*
