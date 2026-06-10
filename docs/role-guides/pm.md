---
title: "AI PMO — Senior PM (PMO Director)"
subtitle: "User guide · You hold the portfolio. You can run any of the fifteen agents, raise any entry, and assign work to anyone — the full toolkit."
---

# Your dashboard

When you sign in you land on a view weighted to your role. You can read everything you have access to, and act through the assistant.

![Senior PM (PMO Director) — role dashboard](../book/figures/role-demo-pm-dashboard.png)

# Your AI agents

You interact with everything through one place — the **Ask AI Assistant** (bottom-right). It auto-routes your request to the right specialist; you can override with the agent dropdown. These are the agents your role can call:

| Agent | What it does | Try asking |
|---|---|---|
| **Charter Drafter** | Drafts the project charter — scope, milestones, governance. | "Draft the charter for this project." |
| **Stakeholder Analyst** | Builds the stakeholder register and engagement approach. | "Build the stakeholder register." |
| **WBS Builder** | Breaks scope into a deliverable WBS (Level 1–3). | "Build the WBS to Level 1–3." |
| **Schedule Reasoner** | Reasons about the critical path, float and sequencing risk. | "What's the critical path, and what's most at risk?" |
| **Budget Builder** | Allocates budget across the cost categories. | "Build the cost breakdown structure." |
| **Communications Planner** | Builds the communications plan. | "Build the comms plan." |
| **Issue Logger** | Raises issues and triages the log (severity, age, ownership). | "Summarise the open issues; flag overdue high-severity ones." |
| **Variance Analyst** | CPI/SPI, cost & schedule variance, contingency, projected margin. | "Summarise the variance position and flag concerns." |
| **Change Order Reviewer** | Raises change/trend entries and reviews a CO four ways. | "Review the open change orders — which threaten margin?" |
| **Risk Analyst** | Raises risks and keeps the project risk register current. | "What are the top risks to watch, and why?" |
| **Lessons-Learned Synthesiser** | Synthesises lessons worth adopting firm-wide. | "What are the top firm-level lessons here?" |
| **Closeout Reporter** | Drafts the closeout report against baseline. | "Draft the closeout executive summary." |
| **Portfolio Risk Reviewer** | Spots risk patterns that span multiple projects. | "Where is cross-cutting risk emerging across the portfolio?" |
| **Status Reporter** | Writes the one-page weekly status, tailored to the reader. | "Write this week's status report for the sponsor." |
| **Cost Controller** | Commitment, cost-to-date, cost by element, earned-vs-billed. | "Give me the cost and commitment position." |


# What you can do — and where

Your write actions, and the context each one needs:

| Action | Allowed | Where |
|---|:---:|---|
| Raise a risk | ✓ | On a project page |
| Log an issue | ✓ | On a project page |
| Raise a change / trend entry | ✓ | On a project page |
| Assign a task | ✓ | Project page or portfolio dashboard |
| Ask / analyse | ✓ | Project (this project) or portfolio (across projects) |

Risk, issue and change entries always attach to a **project**, so those actions appear only when you are inside one. Assigning a task and asking for analysis work on the **portfolio dashboard** too — the analysis just widens to the whole portfolio. Everything you create is tagged **agent-raised** and you confirm it before it is saved — risks and issues live in AI PMO’s own register; a change order stays provisional until it is booked into SAP PS.

# Indicative prompts

The assistant shows role-aware starter chips when the chat is empty; these are the kinds of things to type.

## Create / update / assign

- "Log a risk: a sole-source vendor may slip delivery by ~6 weeks."
- "Log an issue: the GSU transformer failed factory test, deferring delivery."
- "Add a change/trend entry: client-directed scope addition to the switchyard."
- "Assign a task to Procurement: pre-qualify a second transformer supplier — high urgency."

## Ask the agent

- "Summarise this project's health — cost, schedule, and what needs my attention."
- "Which three projects need attention this week, and why? Cite the variance reports."
- "Write this week's status report for the sponsor."
- "Where is cross-cutting risk emerging across the portfolio?"

# A worked example

Type *"log a vendor risk: the sole-source transformer supplier may slip delivery by six weeks."* The Risk Analyst drafts a structured risk — Probability H, Impact H, vendor-concentration class — and shows a confirm card. Review, **Add to register** (it becomes R-A01, agent-raised), then *"assign a task to Procurement: pre-qualify a second supplier — high urgency"* to put the mitigation in their queue.

# Tips & hand-offs

You can do everything, but delegate the deep work: cross-project risk patterns to the **Risk Analyst**, change-order commercial reviews to the **Commercial Manager**, site issues to the **Construction Manager**.

> Every entry you raise and every task you assign is drafted by the agent and **confirmed by you** before it is saved — nothing is written silently. Risks and issues you raise live in AI PMO’s own register; a change order stays provisional until it is booked into SAP PS.
