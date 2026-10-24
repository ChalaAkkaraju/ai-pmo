# The IT Portfolio — A Second Kind of Project

## Why IT projects need their own rules

![The IT portfolio workspace — the annual cycle at a glance: envelope by bucket, what is awaiting a decision, and what is running.](book/figures/20-it-portfolio-overview.png)

Everything in the earlier parts of this book is about **revenue projects**: work sold to a customer under a contract, judged on margin sold against margin forecast, on earned value against actual cost, on cash in against cash out. Those are the right questions for a project that earns its keep.

An IT project earns nothing directly. It is **overhead** — money the company chooses to spend on itself in the hope of a benefit that arrives later, somewhere else in the business, and is often hard to measure. That single difference changes almost every governance question:

- *Should we do it at all?* A customer project has already been sold; the question is how to deliver it. An IT project has to compete for a fixed pot of money against every other idea, and the pot is set once a year in the annual operating plan.
- *How much is it allowed to cost?* A customer project has a contract value. An IT project has an **envelope**: the slice of the year's budget it was granted, and the point in its life at which scope and cost were locked.
- *Who is allowed to say yes?* A customer project's commercial authority sits with the account. An IT project draws on company money, so authority is **delegated by amount** — small decisions close to the work, large ones at a board — and the delegation itself has to be visible and auditable.
- *When does it stop?* A customer project ends when the contract is fulfilled. An IT project can be **deferred** (parked for a later year), **held** (paused, with a deadline to decide), or **cancelled** at any gate — and cancelling early is meant to be normal, not a failure.

Because the money is the company's own, scrutiny on IT spend is typically *higher* than on revenue work, not lower. The people who run it — the CIO, the bucket owners, the investment board, Finance — need to see, at any moment, what has been promised, what has been committed, and what is still unallocated.

## Two clocks

The cleanest way to understand the IT workspace is that every IT project runs on **two clocks at once**.

The **funding clock** runs on the fiscal year. Once a year the company sets an IT envelope, splits it into **buckets** by business technology, and ranks the candidate projects inside each bucket against a **waterline** — the line below which there is no money. Projects above the line are granted an envelope for the year; those below are deferred. A multi-year project has to come back every year for its next slice, so nothing runs on last year's approval by accident.

The **delivery clock** runs on the project's own stages. Each project follows a **stage-gate template** chosen by its category, and one of those gates — **Stage Gate 1, the commit gate** — is where scope and budget are locked into a baseline. Before it, the project is exploring and can be stopped cheaply; after it, every change to scope or cost is a **change order** with a funding source and a named approver.

The two clocks are deliberately independent. Being above the waterline does not commit the project — it grants the money for the year, subject to passing the commit gate. Passing the commit gate does not guarantee next year's slice — the project still comes back to the waterline. Keeping the clocks apart is what lets a company fund boldly and commit carefully.

> **Agile does not change this picture.** Iterative delivery changes the *delivery* clock — shorter increments, a guardrail instead of a fixed scope — but not the *funding* clock. The envelope is still granted by year and bucket, and the commit gate still exists; it commits to a capacity and a set of outcomes rather than a detailed scope. The current release supports the classic stage-gate templates; the Agile guardrail template is planned as a later increment.

## What stays the same

The IT workspace is not a second application. It lives in the same AI PMO, on the same database, behind the same login, with the same **Ask AI Assistant** floating alongside every page. What the shared platform gives IT for free is considerable:

- **One project record.** An IT project is a project — with a code, a WBS, a schedule, risks, issues, actions and planning artefacts — and it carries the SAP reference like everything else. Only the money story differs.
- **The same discipline about the assistant.** Simple data entry (a continuation request, a displacement, a benefits report) is a plain form. The assistant is used where reasoning is needed: challenging a business case, drawing a waterline, assembling a gate package, judging a continuation.
- **Role-based views.** Each person sees only the project type they work in, and the app tells them what is theirs to do. An IT project manager never sees a revenue project's margin bridge; a revenue commercial manager never sees an IT waterline.
- **The same colour grammar.** The IT pages are built with the revenue dashboard's visual language — a hero, a ribbon, coloured cards and tabs — so a reader who knows one workspace can read the other.

## Where IT sits among the four PMOs

IT is the **second project type** on the platform after Revenue, and the first of the *overhead* types. The design keeps it independent of Revenue — an IT project does not depend on a revenue project's people or money, and the two are never added together — while sharing the structures that later types will reuse. Capital projects (appropriation-governed) and R&D / NPI projects (gate-governed) follow the same pattern in later phases: their own funding clock, their own delivery clock, and a shared project record. That is why the schema was extended with a *project type* rather than a separate module: the same platform, four different sets of rules.

The chapters that follow take the two clocks in turn — the funding clock, then the delivery clock — before turning to who is allowed to decide what, the workspace as each role experiences it, and the agents that reason over all of it.

> **An IT project is judged on a different question.** Not *"are we making the margin we sold?"* but *"is this still the best use of the company's own money, and are we committing to it carefully?"* The workspace is built to answer that question every day of the year.
