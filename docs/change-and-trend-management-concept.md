# Change & trend management — concept, justification, and the AI PMO model

*A capability chapter for the AI PMO book. Covers the conceptual model behind change and trend management, why it is modelled the way it is, and how AI PMO implements it.*

## The problem changes create

On any sizeable contract, the scope that gets delivered is never exactly the scope that was sold. Ground turns out different from the survey; the client asks for more; a design develops; an estimate proves light. Each of these moves cost — and sometimes revenue — away from the baseline. The discipline of capturing those movements, pricing them, and recovering what is recoverable is the difference between a project that holds its margin and one that quietly bleeds it.

The hard part is that most changes start life as a **grey area**. You rarely know at the moment of discovery whether the customer will pay. And critically, under most contracts you **cannot stop work** while you find out — the notice‑and‑proceed (or constructive‑change) obligation means you keep building, incurring cost, while the commercial outcome is still open. A change‑management model that only recognises a change once it has been formally agreed is therefore always behind reality.

## The certainty continuum

The cleanest way to think about changes is as a single continuum of **certainty**, not as separate registers competing for the same record:

| | Risk | Trend | Outcome |
| --- | --- | --- | --- |
| Nature | uncertain future event | emerging, near‑certain cost movement | resolved change |
| Probability | < 100% (P × I) | ≈ 100% (it is happening) | settled |
| Financial home | contingency (EMV) | cost forecast (EAC) | contract / margin |
| Resolves to | becomes a trend if it realises | a funded change order, or absorbed cost | — |

A risk that materialises becomes a trend. A trend, once worked, resolves into either a **funded change order** (the customer agrees to pay) or an **absorbed (unfunded) change** (the work was done but there is no recovery, so it lands as a straight margin hit). These are not three competing instruments — they are three points along one lifecycle.

## What a trend is, and the trend register

A **trend** is an emerging cost or schedule movement, logged the moment it is foreseen, before it has been formalised. The **trend register** is the ledger of those movements sitting between the budget baseline and the forecast at completion (EAC). It is the mechanism that explains *how the forecast moved* between formal change orders. Every potential change enters here first; the register then tracks each one through to its outcome.

Modelling changes trend‑first — rather than only recording change orders once executed — is what lets the forecast stay honest. The cost is recognised when it is foreseen, not when the paperwork catches up.

## Why an unfunded change is not a risk

It is tempting to push unfunded cost growth — an estimating error, rework, a productivity shortfall — into the risk register, which is already rich. That is wrong once the movement is certain, for three concrete reasons:

1. **It distorts the risk numbers.** A discovered error has a probability of one; logging it as a risk corrupts the expected‑monetary‑value exposure, which is meant to be *expected*, not *actual*.
2. **It double‑counts or misplaces the money.** Risk impact is covered by *contingency*; certain cost growth belongs in the *EAC*. Putting it in the risk register either double‑counts it or draws down contingency for something contingency was never meant to cover.
3. **It breaks an audit boundary.** Cost controllers and forecasters read the risk register and the cost forecast as distinct instruments. Blending certain cost growth into risks undermines the contingency‑drawdown discipline.

So: while a cost movement is genuinely uncertain, it is a risk (and is managed via mitigation and contingency). Once it is discovered and near‑certain, it leaves the risk register and becomes a trend.

## Working at risk: the proceed obligation

The proceed obligation is the heart of the model, not an edge case. Because work continues while the commercial position is unresolved, an open trend has a **split certainty**:

- The **cost is near‑certain** — you are spending it regardless — so it goes into the EAC now.
- The **revenue is uncertain** — it is a claim that depends on the customer agreeing — so it is carried *at risk* until settled.

This is where risk‑thinking legitimately re‑enters the picture: not on the cost, but on the **recovery**. Each open trend carries a **recovery confidence** — the probability that the customer funds it.

## Recovery confidence and revenue at risk

From recovery confidence, two honest forecast figures follow for the open (in‑negotiation) trends:

- **Expected recovery** = claimed revenue × recovery confidence.
- **Revenue at risk** = claimed revenue × (1 − recovery confidence).

Revenue at risk is the amount of cost already committed on unagreed changes that may never be recovered. It is the single most useful early‑warning number in change management, and it is invisible to any tool that only records changes once they are executed.

## The accounting gate: IFRS 15 variable consideration

The recovery‑confidence model is not just a controls convenience — it mirrors the revenue‑recognition rule. Under IFRS 15, a claim or unapproved variation is **variable consideration**, and revenue on it may not be recognised until recovery is *highly probable* of no significant reversal. Until that threshold is met, the cost is in the forecast but the revenue is **constrained**. A trend's recovery confidence is, in effect, the management view of that recognition gate: low confidence → constrained, no revenue taken; high confidence → recognisable.

## Mapping to SAP

The split maps cleanly onto an SAP‑centric estate, which is why it is faithful rather than abstract:

- A **funded change order** is an SD / contract change plus recognised PS revenue — the contract value grows.
- An **unfunded (absorbed) change** is **cost‑only on the WBS** — a budget supplement with no sales‑order change and no revenue.
- An **open trend** is forecast cost on the WBS with revenue held or blocked until the variation is approved.

The same data therefore reconciles to the SAP figures rather than living beside them.

## The AI PMO model

AI PMO implements the continuum as a single **change & trend register**. Every entry carries a lifecycle status and a recovery confidence, and resolves to one of three outcomes:

> **Identified → Quantified → Submitted to client → In negotiation →** then **Approved (funded change order)** · **Absorbed (unfunded — margin hit)** · **Withdrawn (no impact)**

From that single model the platform derives, with no extra data entry:

- a **funded / absorbed / at‑risk split** — recoverable revenue, absorbed cost (the margin hit), and revenue at risk with an average recovery confidence;
- a **status pipeline** from trend to outcome, with value at each stage;
- a **margin‑impact** read — whether the change book is accretive or dilutive against the project's base margin, with the absorbed and dilutive entries flagged;
- a **by‑driver** view (client‑directed scope, site conditions, design development, estimating & productivity, regulatory, supply & escalation);
- a **portfolio roll‑up** of the same, so exposure and revenue‑at‑risk are visible across every project at once.

A specialist agent (the change‑order reviewer) reasons over this register — change exposure, pricing, and margin protection — and the whole thing reconciles to the margin bridge (funded variations move the contract step; unfunded cost growth moves the budget and execution steps) and to earned value (an absorbed cost shows up as negative cost variance).

## Why it matters

Three reasons this model earns its place:

1. **Margin protection.** Absorbed cost is the silent killer of EPC margin. Making it a first‑class, named, quantified category — instead of an unexplained gap in the cost forecast — is what lets a team see it early and act.
2. **Forecast honesty.** Recognising cost when it is foreseen and revenue only when it is probable produces an EAC and a recognised‑revenue position that survive audit, rather than an optimistic one that unwinds later.
3. **A single source of truth across the lifecycle.** Risk, trend, and change order become states of one record, not three disconnected logs — so nothing falls between the registers, and the story of how margin moved from as‑sold to as‑built is complete.
