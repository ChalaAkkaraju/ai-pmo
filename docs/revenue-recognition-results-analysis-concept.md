# Revenue Recognition

## How AI PMO shows what you've actually earned (IFRS 15 / Results Analysis)

*Business Edition · Chapter A7 — pairs with the Technical Edition's results-analysis library*

![The Revenue-recognition lens: cost-based POC, recognised revenue, cost of sales, margin, and WIP/deferred.](book/figures/13-project-revenue-recognition.png)

## The question this answers

A project can have spent a great deal of money, invoiced the client for a great
deal more, and still not be able to put either of those numbers in the profit
and loss account as revenue. **Revenue recognition** answers a precise,
audited question: *of this contract, how much revenue have we earned to date —
and therefore how much profit can we book?*

It is one of the three money questions AI PMO keeps deliberately separate:

- **Earned value** (Chapter A5) — how much *work* have we accomplished, for
  performance management?
- **Forecasting to EAC** (Chapter A6) — what will the job *finish* at?
- **Revenue recognition** (this chapter) — how much can we *recognise in the
  accounts* right now?

This is the chapter that turns project progress into a number an auditor will
accept.

## Why recognition is not the same as earned value

This is the single most important idea in the chapter, and the reason it is a
chapter of its own rather than a footnote to earned value.

Earned value is a *managerial* measure. It uses physical or schedule-based
progress to tell a project manager whether the work is ahead or behind and over
or under cost. It is internal, fast, and tuned for control.

Revenue recognition is a *financial* measure. It feeds the audited statements,
so it must follow an accounting standard (IFRS 15), use a consistent and
defensible basis, and reconcile to the general ledger. It is external, formal,
and tuned for assurance.

The two can legitimately give different "percent complete" figures for the same
project on the same day, because they are measuring different things for
different audiences. A project that is 60% complete by physical progress might
recognise revenue at 71% on a cost basis. **Neither is wrong.** Treating them as
interchangeable is the classic error that AI PMO is built to avoid — which is
why the app labels the Results Analysis panel "independent of the managerial
earned value on the EV tab," and builds it from the posted Results Analysis figures rather
than reusing the earned-value percentage.

## The method: cost-based percentage-of-completion

Revenue is recognised **over time** using the **cost-based
percentage-of-completion (POC)** method — the mechanism SAP PS runs as
*Results Analysis*. AI PMO does not perform the recognition itself — it displays the figure the system of record (SAP PS) posts, then explains the method and reconciles it against billing. In plain terms: revenue is recognised in proportion to the
cost you have incurred against the total cost you expect to incur.

Results Analysis applies the method phase by phase (at the WBS level); AI PMO reads the posted figures and rolls them up:

1. **Percentage of completion.** For each phase,
   *POC = actual cost to date ÷ planned (or expected) cost*, capped at 100%.
   This is purely cost-based and is computed independently of earned value.

2. **Planned revenue.** Each phase carries a share of the total contract value,
   set by its planned margin, and scaled so the phases sum to the full contract.

3. **Recognised revenue.** *Recognised = POC × planned revenue.* This is the
   revenue you may book for the phase to date.

4. **Cost of sales.** The actual cost incurred — what it cost to earn that
   recognised revenue.

5. **Recognised margin.** *Margin = recognised revenue − cost of sales*, with the
   margin percentage being margin ÷ recognised revenue.

Because recognition is driven by cost incurred, a phase that has spent 71% of
its expected cost recognises 71% of its planned revenue — regardless of how the
scheduler rates its physical progress.

## Three numbers, three questions

On a mature project AI PMO holds three different "value earned / value billed"
numbers at once, and the discipline is to never confuse them:

| Figure | Basis | Question it answers |
| --- | --- | --- |
| Earned value (EV $) | Physical / schedule progress × budget | How much work have we *done*? |
| Recognised revenue | Cost-based POC × contract (IFRS 15) | How much can we *book*? |
| Billed to date | Invoices raised against the contract | How much have we *asked the client to pay*? |

These rarely match, and the *gaps between them* are themselves the insight — as
the next section shows.

## The balance-sheet side: WIP versus deferred revenue

Recognition and billing run on different clocks. You recognise revenue as you
earn it; you bill it according to the contract's payment milestones. The
difference between the two lands on the balance sheet:

- **WIP — work in progress (a contract asset).** When you have *recognised more
  than you have billed*, the excess is revenue you have earned but not yet
  invoiced. It is an asset: the client owes it to you even though no invoice has
  gone out. *WIP = recognised revenue − billed* (when positive).

- **Deferred revenue (a contract liability).** When you have *billed more than you
  have recognised* — front-loaded or milestone billing ahead of the work — the
  excess is money received (or invoiced) for work not yet earned. It is a
  liability: you still owe the client the work. *Deferred = billed − recognised
  revenue* (when positive).

AI PMO computes both automatically per phase and for the project, so a commercial
lead can see at a glance whether the project is a net lender to the client
(carrying WIP) or has been paid ahead (carrying deferred revenue) — a direct
read on cash and on commercial risk.

## Why IFRS 15

IFRS 15 ("Revenue from Contracts with Customers") is the governing standard, and
the method above is its application to long-duration construction-type contracts.
The standard's logic, in brief: revenue is recognised as the entity satisfies a
**performance obligation**. For an EPC contract the obligation is typically
satisfied **over time** (the asset is built on the customer's site / to the
customer's control as it progresses), so revenue is recognised progressively
rather than all at completion. A cost-based input method — cost incurred relative
to total expected cost — is an accepted way to measure that progress.

Using a standard, rather than an internal rule of thumb, is what makes the number
audit-ready: it is consistent across projects, defensible to a reviewer, and
reconcilable to the ledger.

## A worked example

Take a project mid-execution, as AI PMO's Results Analysis panel would show it:

- **Recognised revenue: $387.9M** — cost-based POC applied across the phases.
- **Cost of sales: $351.3M** — actual cost incurred to earn it.
- **Recognised margin: $36.6M (9%)** — recognised revenue minus cost of sales.
- **Billed to date: $440.7M** — invoices raised against the contract.
- **Deferred revenue: $52.8M** — because billed ($440.7M) exceeds recognised
  ($387.9M), the $52.8M difference is a *contract liability*: the project has
  been paid ahead of the work it has earned.

The story the numbers tell: the job is recognising a thin 9% margin so far, and
— importantly — it is **billed ahead of recognition by $52.8M**. That is healthy
for cash (the client has funded work not yet earned) but it is a liability to
discharge: that revenue can only be booked as the remaining cost is incurred. A
controller reading this knows not to mistake the strong billing position for
booked profit.

Had the position been reversed — recognised exceeding billed — the same panel
would instead show **WIP / unbilled** (a contract asset), flagging revenue earned
but not yet invoiced, and a prompt to get the billing out.

## How AI PMO implements it

True to its operating model, AI PMO **synthesises** recognition from data that
lives in the system of record; it does not own the ledger.

- It reads the posted Results Analysis figures per WBS phase (POC, recognised
  revenue, cost of sales, recognised margin), the contract value, and the billing
  events.
- It rolls the phases up to a project position, computes the margin percentage,
  and derives WIP versus deferred from recognised-minus-billed.
- It keeps the figure **independent of earned value by construction** — the
  recognition POC is cost-based and computed separately, so the managerial and
  financial views can never silently contaminate each other.
- It surfaces the result in the Cost tab's Revenue-recognition lens and lets the
  Cost Controller agent reason across all three figures — earned value,
  recognised revenue, and billing — when it writes commentary.

The system of record for the posting stays in SAP (Results Analysis); AI PMO adds
the cross-phase synthesis, the WIP/deferred read, and the plain-language
interpretation.

## What it deliberately does not do

AI PMO does not *post* revenue, run the RA calculation inside the ledger, or
override the auditor's basis. It consumes the recognised figures and explains
them. Recognition policy, cut-off, and the formal posting remain finance's and
SAP's responsibility — AI PMO's job is to make the earned-versus-billed-versus-
recognised picture legible and to connect it back to cost, schedule and change,
which the ledger alone never shows.

---

*Cross-reference: the computation is implemented in the Technical Edition's
results-analysis library (cost-based POC per phase; WIP = recognised − billed
when positive, deferred = billed − recognised when positive). Pairs with A5
(Earned value) and A6 (Forecasting to EAC) to complete the money-story arc.*
