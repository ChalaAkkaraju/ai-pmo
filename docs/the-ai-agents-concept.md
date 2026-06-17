# The AI Agents — Your Specialist Team

AI PMO is not a single chatbot. It is a **roster of specialist agents** — fifteen of them — each one grounded in a recognised project‑management method and each responsible for a narrow, well‑understood job. One agent drafts a charter; another reasons about the critical path; another controls the cost‑to‑cash position; another reviews a change order four ways for commercial exposure. You never have to remember which is which: you type what you need in plain language and the system routes you to the right specialist.

This chapter explains **what the agents are, how you work with them, what they can read and write, and which agents each role is allowed to use** — the governance model that keeps a powerful capability safe.

## One surface for everything: the Ask AI Assistant

Every interaction with the agents happens in one place — the **Ask AI Assistant**, the floating panel in the bottom‑right of every page. There is deliberately no second console, no separate "create a risk" form, no admin screen. Whether you are *asking* a question, *raising* a risk, or *assigning* a task to a colleague, you do it by typing into the same assistant. This is the single most important design decision in the product: **one surface, so there is one place to learn, one place to govern, and one audit trail.**

The assistant is **context‑aware**. When you open it on a project page it works against that project's data; on the portfolio dashboard it works across the whole portfolio. The header always tells you which.

When the panel is empty it offers **role‑aware starter prompts** — a "Create / Update / Assign" row and an "Ask agent" row — so the actions available to you are discoverable without reading a manual. Pick one, edit it, and send.

> **Auto‑routing.** By default the assistant is set to **Auto**: you type, and a lightweight router reads your request and picks the right specialist. Power users can override the choice with the agent dropdown, but most of the time you should not have to think about which agent you need — that is the router's job.

## The roster

Each agent does a few things well and deliberately *not* others (so it never strays outside its competence). The table below is the quick reference; ask the assistant the example prompt to see any agent in action.

| Agent | What it answers | Try asking |
|---|---|---|
| **Charter Drafter** | The founding charter — scope, deliverables, milestones, governance | "Draft the charter for this project." |
| **Stakeholder Analyst** | Who has a stake, and how to engage each | "Build the stakeholder register." |
| **WBS Builder** | The work broken into deliverable packages | "Build the WBS to Level 1–3." |
| **Schedule Reasoner** | Critical path, float, sequencing risk | "What's the critical path, and what's most at risk?" |
| **Cost Planner** | Approved/quoted cost total allocated across categories and time-phased | "Allocate the approved budget across the major cost categories." |
| **Communications Planner** | Who hears what, how often, through which channel | "Build the comms plan." |
| **Issue Logger** | What open issues matter most, and why | "Summarise the open issues; flag overdue high‑severity ones." |
| **Variance Analyst** | Are we on cost and on schedule? (CPI/SPI) | "Summarise the variance position and flag concerns." |
| **Change Order Reviewer** | Is a change order commercially sound? | "Review CO‑U01 — is margin protected?" |
| **Risk Analyst** | The project risk register, made current and readable | "What are the top risks to watch, and why?" |
| **Lessons‑Learned Synthesiser** | The lessons worth adopting firm‑wide | "What are the top three firm‑level lessons here?" |
| **Closeout Reporter** | How the project actually went, vs baseline | "Draft the closeout executive summary." |
| **Portfolio Risk Reviewer** | Risk patterns that span *many* projects | "Where is cross‑cutting risk emerging across the portfolio?" |
| **Status Reporter** | The one‑page weekly status, tailored to the reader | "Write this week's status report for the sponsor." |
| **Cost Controller** | Commitment, cost‑to‑date, and earned‑vs‑billed | "Give me the cost and commitment position." |

Every agent is grounded in a standard — PMBOK knowledge areas for the planning and control agents, Earned Value Management for variance, a four‑frame commercial analysis for change orders, IFRS‑15 / results‑analysis for revenue. The methods are not improvised; they are the reason the answers are defensible.

## Two ways an agent helps: reading and writing

Most of what you ask an agent to do is **read‑and‑synthesise**: summarise the variance, surface the top risks, explain where the critical path runs. The agent reads the project's data and gives you a grounded answer — fast, between the formal monthly reviews.

But the agents can also **write** — and they do it through the same chat, never a separate form:

- **Raise an entry.** Type "log a vendor risk: the sole‑source transformer supplier may slip delivery by six weeks" and the Risk Analyst drafts a structured risk and shows you an editable **confirm card** in the chat. You review the inferred fields, correct anything, and click **Add to register**. The same flow raises **issues** and **change / trend entries**.
- **Assign a task.** Type "assign a task to Procurement: pre‑qualify a second transformer supplier — high urgency" and the agent drafts it into an **Assign actions** card; confirm, and it lands in that colleague's action queue.

Two principles govern every write:

> **Human in the loop.** The agent never writes silently. It *drafts*; you *confirm*. The confirm card is always the last step, so nothing reaches the register or a colleague's queue without your explicit click.

> **Provenance is honest.** AI PMO owns the things no ERP does — the **risk register and the issue log live here**, so a risk or issue you raise through the agent is simply **agent‑raised** in AI PMO’s own register. A **change order** is different: SAP PS is its system of record, so a change you raise is **provisional until it is booked into SAP PS**, and it round‑trips out through the existing export — clearly marked until then. Either way, everything you raise is tagged so its origin is never in doubt.

## Who can do what — agents by role

Not every role can use every agent. Each role is granted only the agents that fit its remit — a least‑privilege model — so the starter prompts and the create/assign actions a person sees are exactly the ones they are allowed to use. A read‑only role sees no create or assign actions at all.

The table below shows the **create and assign** capabilities by role (the read‑and‑analyse asks adapt the same way — Procurement sees the change‑order ask, the Cost Controller sees the cost‑and‑commitment ask, and so on).

| Role | Raise risk | Log issue | Change / trend | Assign task |
|---|:---:|:---:|:---:|:---:|
| **Senior PM (PMO Director)** | ✓ | ✓ | ✓ | ✓ |
| **Program Manager** | ✓ | ✓ | ✓ | ✓ |
| **Risk Analyst** | ✓ | ✓ | — | ✓ |
| **Procurement Strategist** | ✓ | — | ✓ | ✓ |
| **Commercial Manager** | — | — | ✓ | ✓ |
| **Construction Manager** | — | ✓ | ✓ | ✓ |
| **Engineering Manager** | ✓ | — | — | ✓ |
| **HSE Manager** | — | ✓ | — | ✓ |
| **Project Controls Manager** | — | — | — | ✓ |
| **VP Sponsor** | — | — | — | — |

Each cell follows directly from the agents the role holds: raising a **risk** needs the Risk Analyst, logging an **issue** needs the Issue Logger, a **change / trend** entry needs the Change Order Reviewer, and **assigning** a task needs write access. The **VP Sponsor** is read‑only by design — an executive who consumes status, variance and patterns but does not edit state — so the Sponsor sees analysis prompts only. The same gate is enforced on the server, not just hidden in the interface, so the permission is real.

## Where these work: project vs portfolio

The table above answers *what* a role may do. *Where* it can do it depends on the context the assistant is in — and the assistant adapts its starter prompts to match (the same role sees one set of chips on a project page and a different set on the portfolio dashboard).

The rule is simple: **a risk, issue or change entry is always raised against a specific project**, so those actions are offered only when you are inside one. Assigning a task and asking for analysis work in both places — the analysis simply widens from a single project to the whole portfolio.

| What you do | On a project page | On the portfolio dashboard |
|---|---|---|
| **Raise a risk / issue / change** | Yes — attached to that project | Open a project first (entries belong to a project) |
| **Assign a task** | Yes — scoped to the project | Yes — portfolio‑level |
| **Ask / analyse** | *This* project: variance, top risks, cost position | *Across* projects: which need attention, where risk 