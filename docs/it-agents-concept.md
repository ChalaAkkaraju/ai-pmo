# The IT Agents — Reasoning Over the Two Clocks

## Four new specialists, one adapted

The revenue roster described earlier in the book — charter, WBS, schedule, risk, status and the rest — works unchanged on an IT project, because an IT project is still a project. What IT needed was reasoning about the things revenue projects do not have: a business case competing for company money, a waterline, a commit gate with exit criteria, and a yearly decision to keep going. Four new agents cover those, and one existing agent learned an extra question.

| Agent | The question it answers | Where it sits | Try asking |
|---|---|---|---|
| **Business Case Reviewer** | Is this case honest, do its numbers hold, and is it ready to rank? | Project — before the waterline | "Review this business case — is the value claim honest, do the numbers hold, and is it ready to rank?" |
| **Waterline Ranker** | Given the envelope, where does the line fall in each bucket, and what sits just below it? | Portfolio — the annual cycle | "Rank the FY2027 IT portfolio within each bucket and show me the waterline and what sits just below it." |
| **Gate Reviewer** | Is the package ready for this gate, and what would a Go lock? | Project — at every gate, strictest at Stage Gate 1 | "Prepare the Stage Gate 1 package for this project and score the exit criteria." |
| **Continuation Reviewer** | Does the remaining spend still buy the remaining benefit? | Project — before next year's waterline | "Should this project be funded for next fiscal year? Judge the remaining spend against the remaining benefit." |
| **Change Order Reviewer** (adapted) | Is this change sound — and which pot should pay for it? | Project — after commit | "Review this change order and tell me which funding source it belongs to." |

Each follows a stated method, does a few things well, and refuses to do the things that belong to a human decision body. None of them approves anything.

## Business Case Reviewer — the sceptic at intake

IT projects are overhead, so a CFO trusts only a case that says plainly what kind of value it claims. The reviewer reads a submitted case the way a sceptical finance partner would. It **classifies the value claim** — hard saving, soft benefit, risk reduction, enablement or compliance — and tests the evidence for it, calling out a soft benefit dressed as a hard saving. It **recomputes ROI and payback** from budget and annual benefit and flags where the stated figures disagree with the arithmetic. It **lists what the commit package will need** that is missing — sponsor, benefits owner, category, bucket, fiscal year — and it **names the assumptions** that would change the ranking if they turned out to be wrong.

Its verdict is one of: ready to rank, needs corrections, not ready, or belongs in the mandatory compliance lane. It never approves or rejects the project — that is the waterline's job — and it never invents a benefit, an owner or a figure the case did not contain. The portfolio manager, the sponsor, the bucket owner, the board and Finance can all ask it; the sponsor usually asks first.

## Waterline Ranker — drawing the line

The ranker is the funding-clock chapter as an agent. For a fiscal year it **ranks every project within its bucket** — on the ranking score in discretionary buckets, on cost-to-comply and deadline in the mandatory lane — **walks the cumulative down the list** against the bucket's allocation less reserve, and **draws the line**. Its output shows what is funded, what is deferred, what sits just below the line and by how much, and it **flags continuations**, which it judges on the marginal case rather than the original one. It closes with the decisions the bodies now face: envelopes to approve, projects to defer, continuations to call.

Two refusals define it. It **does not compare across buckets** or add value across them — projects compete inside their bucket, and the bucket split is the board's decision, not the ranker's. And it **does not decide the size of the envelope**; it shows where the line falls given the envelope it is handed. The portfolio manager runs it before submitting a waterline; a bucket owner or board member can run it to check the shape before the meeting.

## Gate Reviewer — the package before the meeting

Before any gate, the reviewer reads the project's template for the gate it is at and **scores every exit criterion** — met, partly met, not met, or no evidence — against what is actually in the workspace: the charter, the estimate, the risk register, the issues, the sanction events. At the commit gate it **checks the estimate against the envelope** granted at the waterline and flags a return to portfolio when it exceeds tolerance. It **recommends** one of Go, Go with conditions, Hold (with a trigger and a time box), Recycle, Cancel, or Return to portfolio, and — at Stage Gate 1 — it **states exactly what a Go would lock** as the baseline sanction event, so the attendees know what they are committing to.

It is deliberately strict at the commit gate and asks a different question at later gates: is cost-to-complete still justified by the benefit still achievable? It never takes the decision, and it never scores missing evidence as anything but missing. The project manager asks it to assemble the package; the sponsor, the bucket owner, the board and Finance ask it to check one.

## Continuation Reviewer — sunk cost does not count

Budgets are approved by year, so a project running into next year must be re-approved for its next slice. The honest test is not the original business case but the **marginal** one: does the remaining spend still buy the remaining benefit? The reviewer **restates the baseline** from the sanction events, change orders, fiscal years approved and spend to date; **computes cost-to-complete and the benefit still achievable**, and the marginal ROI or payback; **attributes any slippage to its causes**, separating out people who were displaced to incidents, other projects or revenue work rather than letting the slip be absorbed; checks the business need still exists; and recommends continue, reduce scope, defer, cancel, or re-baseline through the commit gate. It ends by stating the **consequence for the bucket** at next year's waterline.

It does not re-underwrite the original case and it does not invent actuals — where none are supplied it says so. The portfolio manager, the bucket owner, the board and Finance use it; the project manager cannot, which is deliberate.

## Change Order Reviewer — which pot pays

The revenue roster's Change Order Reviewer already reviews a change four ways for commercial exposure. On an IT project it adds one more judgement: **the funding source**. It says whether the change fits inside the project's own contingency (the sponsor decides), needs the bucket's reserve (the bucket owner up to the delegation limit, otherwise the CIO), or would push another project below the waterline (the investment board decides) — and it says in one sentence why. When asked to raise the change, it drafts the entry with the funding source already set, for the user to confirm on the editable card before anything is saved.

## Who may ask which agent

Agent access is governed per role, exactly as it is for revenue roles. The pattern for IT follows the seat's authority:

- The **portfolio manager** has all four IT agents plus the change order, portfolio risk, status, risk and issue agents.
- The **project manager** has the planning roster (charter, stakeholders, WBS, schedule, budget, communications), the Gate Reviewer and the Change Order Reviewer, and the reporting agents — but not the Waterline Ranker or the Continuation Reviewer, which belong to the funding side.
- The **sponsor** has the Business Case Reviewer, Gate Reviewer and Change Order Reviewer — the three that touch what the sponsor decides — plus status, risk and issues.
- The **bucket owner** and **board member** have the funding-side agents (Business Case Reviewer, Waterline Ranker, Continuation Reviewer) and the Gate Reviewer; the bucket owner also has the Change Order Reviewer, the board member the Portfolio Risk Reviewer.
- **Finance** has the three agents whose subject is the numbers — Business Case, Continuation and Gate Reviewer — and the Cost Controller.

An agent a role is not allowed to use does not appear in that role's assistant, and the router will not select it.

## The same discipline as the rest of the platform

Every IT agent is grounded on the workspace's own data before a model sees a word of it: the business case as entered, the ranking as computed, the exit criteria as configured in the template, the sanction events as recorded. Each cites the figures it used and says what is missing rather than filling the gap. And each ends where a human begins — with a recommendation and its evidence, never with an approval. The bodies decide; the record shows they did.

> **The agents reason; the matrix decides.** Four specialists cover the questions that make IT different — is the case honest, where is the line, is the gate ready, should it continue — and hand every answer to a named seat with the authority to act on it.
