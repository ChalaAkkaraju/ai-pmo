---
title: "AI PMO — Construction Manager"
subtitle: "User guide · You run site execution. You log construction issues, raise field-driven change entries, and track weekly variance impacts on the schedule."
---

# Your dashboard

When you sign in you land on a view weighted to your role. You can read everything you have access to, and act through the assistant.

![Construction Manager — role dashboard](../book/figures/role-demo-construction-manager-dashboard.png)

# Your AI agents

You interact with everything through one place — the **Ask AI Assistant** (bottom-right). It auto-routes your request to the right specialist; you can override with the agent dropdown. These are the agents your role can call:

| Agent | What it does | Try asking |
|---|---|---|
| **Issue Logger** | Raises issues and triages the log (severity, age, ownership). | "Summarise the open issues; flag overdue high-severity ones." |
| **Variance Analyst** | CPI/SPI, cost & schedule variance, contingency, projected margin. | "Summarise the variance position and flag concerns." |
| **Change Order Reviewer** | Raises change/trend entries and reviews a CO four ways. | "Review the open change orders — which threaten margin?" |


# What you can do — and where

Your write actions, and the context each one needs:

| Action | Allowed | Where |
|---|:---:|---|
| Raise a risk | — | On a project page |
| Log an issue | ✓ | On a project page |
| Raise a change / trend entry | ✓ | On a project page |
| Assign a task | ✓ | Project page or portfolio dashboard |
| Ask / analyse | ✓ | Project (this project) or portfolio (across projects) |

Risk, issue and change entries always attach to a **project**, so those actions appear only when you are inside one. Assigning a task and asking for analysis work on the **portfolio dashboard** too — the analysis just widens to the whole portfolio. Everything you create is tagged **agent-raised** and you confirm it before it is saved — risks and issues live in AI PMO’s own register; a change order stays provisional until it is booked into SAP PS.

# Indicative prompts

The assistant shows role-aware starter chips when the chat is empty; these are the kinds of things to type.

## Create / update / assign

- "Log an issue: a module arrived with shipping damage requiring on-site repair."
- "Add a change/trend entry: differing site conditions at the foundations."
- "Assign a task to Engineering: resolve the design clash at WBS 1.4.2 — high urgency."

## Ask the agent

- "Summarise the open issues; flag the overdue high-severity ones."
- "Is the project on schedule? Summarise the latest variance and what is slipping."
- "Review the open change orders affecting field execution."

# A worked example

On the project page, type *"log an issue: shipping damage on a module needs on-site repair"* → the Issue Logger drafts it → confirm (it becomes I-A01). Then *"assign a task to Engineering: confirm the repair procedure — high urgency."*

# Tips & hand-offs

Design questions → **Engineering Manager**; commercial recovery of a change → the **Commercial Manager**.

> Every entry you raise and every task you assign is drafted by the agent and **confirmed by you** before it is saved — nothing is written silently. Risks and issues you raise live in AI PMO’s own register; a change order stays provisional until it is booked into SAP PS.
