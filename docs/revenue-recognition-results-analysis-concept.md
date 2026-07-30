# Revenue Recognition

## Of this contract, how much have we actually earned — and therefore how much profit can we book?

![The Revenue-recognition lens: cost-based POC, recognised revenue, cost of sales, margin, and WIP/deferred.](book/figures/13-project-revenue-recognition.png)

A project can have spent a great deal of money, invoiced the client for a great deal more, and still not be able to put either number in the profit-and-loss account as revenue. **Revenue recognition** answers a precise, audited question: *of this contract, how much revenue have we earned to date — and therefore how much profit can we book?* It turns project progress into a number an auditor will accept.

## Why recognition is not earned value

This is the single most important idea here, and the reason recognition is treated apart from earned value rather than as a footnote to it.

**Earned value** is a *managerial* measure. It uses physical or schedule-based progress to tell a project manager whether the work is ahead or behind and over or under cost. Internal, fast, tuned for control.

**Revenue recognition** is a *financial* measure. It feeds the audited statements, so it must follow an accounting standard (IFRS 15), use a consistent and defensible basis, and reconcile to the general ledger. External, formal, tuned for assurance.

The two can legitimately give different "percent complete" figures for the same project on the same day, because they measure different things for different audiences. A project 60% complete by physical progress might recognise revenue at 71% on a cost basis. **Neither is wrong.** Treating them as interchangeable is the classic error AI PMO is built to avoid — which is why it labels the Results Analysis panel *"independent of the managerial earned value on the EV tab,"* and builds it from the posted Results Analysis figures rather than reusing the earned-value percentage.

## The method: cost-based percentage-of-completion

Revenue is recognised **over time** using the **cost-based percentage-of-completion (POC)** method — the mechanism SAP PS runs as *Results Analysis*. AI PMO does not perform the recognition; it displays the figure SAP PS posts, then explains the method and reconciles it against billing. In plain terms: revenue is recognised in proportion to the cost incurred against the total cost expected.

Results Analysis applies the method phase by phase at the WBS level; AI PMO reads the posted figures and rolls them up:

1. **Percentage of completion.** For each phase, *POC = actual cost to date ÷ planned (or expected) cost*, capped at 100%. Purely cost-based, computed independently of earned value.
2. **Planned revenue.** Each phase carries a share of the total contract value, set by its planned margin and scaled so the phases sum to the full contract.
3. **Recognised revenue.** *Recognised = POC × planned revenue* — the revenue you may book for the phase to date.
4. **Cost of sales.** The actual cost incurred to earn that recognised revenue.
5. **Recognised margin.** *Margin = recognised revenue − cost of sales*, with margin percentage being margin ÷ recognised revenue.

Because recognition is driven by cost incurred, a phase that has spent 71% of its expected cost recognises 71% of its planned revenue — regardless of how the scheduler rates its physical progress.

## Three numbers, three questions

On a mature project AI PMO holds three different "value earned / value billed" numbers at once, and the discipline is never to confuse them:

| Figure | Basis | Question it answers |
| --- | --- | --- |
| Earned value (EV $) | Physical / schedule progress × budget | How much work have we *done*? |
| Recognised revenue | Cost-based POC × contract (IFRS 15) | How much can we *book*? |
| Billed to date | Invoices raised against the contract | How much have we *asked the client to pay*? |

These rarely match, and the *gaps between them* are themselves the insight.

## WIP versus deferred revenue

Recognition and billing run on different clocks. You recognise revenue as you earn it; you bill it according to the contract's payment milestones. The difference lands on the balance sheet:

- **WIP — work in progress (a contract asset).** When you have *recognised more than you have billed*, the excess is revenue earned but not yet invoiced. The client owes it to you even though no invoice has gone out. *WIP = recognised revenue − billed* (when positive).
- **Deferred revenue (a contract liability).** When you have *billed more than you have recognised* — front-loaded or milestone billing ahead of the work — the excess is money invoiced for work not yet earned. You still owe the client the work. *Deferred = billed − recognised revenue* (when positive).

AI PMO computes both automatically, per phase and for the project, so a commercial lead can see at a glance whether the project is a net lender to the client (carrying WIP) or has been paid ahead (carrying deferred revenue) — a direct read on cash and on commercial risk.

## Why IFRS 15

IFRS 15 ("Revenue from Contracts with Customers") is the governing standard, and the method above is its application to long-duration construction-type contracts. Revenue is recognised as the entity satisfies a **performance obligation**. For an EPC contract the obligation is typically satisfied **over time** — the asset is built on the customer's site, under the customer's control, as it progresses — so revenue is recognised progressively rather than all at completion. A cost-based input method — cost incurred relative to total expected cost — is an accepted way to measure that progress. Using a standard rather than an internal rule of thumb is what makes the number audit-ready: consistent across projects, defensible to a reviewer, and reconcilable to the ledger.

## A worked example

Take a project mid-execution, as AI PMO's Results Analysis panel would show it:

- **Recognised revenue: $387.9M** — cost-based POC applied across the phases.
- **Cost of sales: $351.3M** — actual cost incurred to earn it.
- **Recognised margin: $36.6M (9%)** — recognised revenue minus cost of sales.
- **Billed to date: $440.7M** — invoices raised against the contract.
- **Deferred revenue: $52.8M** — because billed ($440.7M) exceeds recognised ($387.9M), the $52.8M difference is a *contract liability*: the project has been paid ahead of the work it has earned.

The story: the job is recognising a thin 9% margin so far, and it is **billed ahead of recognition by $52.8M**. That is healthy for cash — the client has funded work not yet earned — but it is a liability to discharge: that revenue can only be booked as the remaining cost is incurred. A controller reading this knows not to mistake the strong billing position for booked profit. Had the position been reversed, recognised exceeding billed, the same panel would show **WIP / unbilled** — a contract asset flagging revenue earned but not yet invoiced, and a prompt to get the billing out.

AI PMO **synthesises** this from data that lives in SAP; it does not own the ledger. It reads the posted Results Analysis figures per WBS phase (POC, recognised revenue, cost of sales, recognised margin), the contract value, and the billing events; rolls the phases up to a project position; and derives WIP versus deferred from recognised-minus-billed. The recognition POC stays cost-based and computed separately, so the managerial and financial views can never silently contaminate each other. Recognition policy, cut-off, and the formal posting remain finance's and SAP's responsibility — AI PMO's job is to make the earned-versus-billed-versus-recognised picture legible and connect it back to cost, schedule and change.

> **Recognised revenue is what you may book, not what you have done or what you have billed** — treating the three as one number is the classic error that turns a strong billing position into imaginary profit.

*Worked figures use the synthetic demonstration portfolio.*
