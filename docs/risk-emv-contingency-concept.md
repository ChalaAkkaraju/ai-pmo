# Risk: Expected Value, Residual Exposure & Contingency

## What is this project's risk worth — and does the buffer cover it?

![The project risk register: inherent vs residual EMV, with mitigation.](book/figures/15-project-risks.png)

A risk register that only says *"high / medium / low"* cannot answer the question a finance director actually asks: *how much money is this project's risk worth, has our mitigation actually bought it down, and is our contingency enough to cover what's left?* AI PMO makes risk quantitative and connects it straight to the contingency buffer — pricing the register the team maintains rather than running the workshop that fills it.

## Expected Monetary Value

The basic unit is **Expected Monetary Value (EMV)** — *probability × impact*. A threat with a 30% chance of a $10M overrun carries an EMV of $3M. Summing EMV across the register turns a list of worries into a single, comparable number: the risk-weighted cost the project is carrying. Opportunities (favourable risks) carry a positive EMV — potential upside — and are tracked separately from threats.

## Inherent versus residual: did mitigation work?

The same risk has two EMVs:

- **Inherent EMV** — *before* mitigation: the raw probability × impact.
- **Residual EMV** — *after* mitigation: the reduced probability (and/or impact) once the agreed actions are in place.

The gap between them is the **reduction** — *(inherent − residual) ÷ inherent* — and it is the single most useful management number here, because it quantifies what mitigation has actually achieved. A register where inherent and residual are equal is a register where nothing has been *done*; a large reduction is mitigation earning its keep. AI PMO rolls this up to a portfolio exposure: total inherent, total residual, and the percentage bought down.

Only *live* risks — open or actively managed — count toward residual exposure. Risks that have not materialised carry no remaining exposure, and ones that *have* materialised have become issues or realised cost.

## Is the contingency enough?

Quantified residual exposure lets AI PMO do what a colour-coded register cannot: test the **adequacy of contingency.** Coverage is *remaining contingency ÷ residual exposure*, and it sorts projects into bands — **Adequate**, **Tight**, **Exposed** — so a portfolio lead can see at a glance which projects are under-buffered for the risk they still carry. The buffer becomes a calculated position measured against the exposure that remains, not a round-number guess.

![Portfolio risk analytics — EMV exposure and the risk heatmap.](book/figures/04-portfolio-risks.png)

## Why this matters

Three things a qualitative register can't give you, all here: a **portfolio risk price** you can compare and trend, **evidence that mitigation is working** (the buy-down), and an **early warning when the buffer is thin** for the exposure that remains. Risk stops being a compliance artefact and becomes a number that participates in the cost and contingency conversation.

## A worked example

Illustratively, a project's register:

- **Inherent EMV: $14M** — raw risk-weighted exposure.
- **Residual EMV: $9M** — after mitigation; a **36% reduction** — mitigation is working, but $9M of live exposure remains.
- **Remaining contingency: $7M** → **coverage 0.78 → "Tight."** The buffer sits below the residual exposure; the project is under-provisioned for the risk it still carries and should either draw down risk further or top up contingency.

> **A priced register turns risk into a number the buffer can be judged against** — the difference between a compliance colour-code and a contingency you can defend.

*Worked figures use the synthetic demonstration portfolio.*
