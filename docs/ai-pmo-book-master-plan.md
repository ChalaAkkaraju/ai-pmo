# AI PMO — The Book

## Master plan for two editions

This is the blueprint for turning the AI PMO project into a book — published as
**two editions that share one spine** but serve different readers:

- **Business Edition — *AI PMO: How It Works.*** For PMO leads, project-controls
  and commercial managers, and executives. It explains every capability: what
  question it answers, the formula in plain terms, why that method is the right
  one (the standards behind it), and a worked example. Almost no code.
- **Technical Edition — *AI PMO: Inside the Build.*** For solution architects, AI
  engineers and developers. It explains how it is actually built: the
  architecture, the canonical data model and provenance, the integration and
  sync contract, agent design and routing, the synthesis libraries, the
  generators, evaluation and deployment.

Both editions walk the same capability set in the same order, at two altitudes.
A reader can move from "what earned value tells me and why" (Business, Ch. A6)
to "how `deriveMetrics` computes it and which agent reads it" (Technical, Ch.
B13) by following a cross-reference. That parallel structure is the core design
of the book.

A great deal of the manuscript already exists as the concept notes, runbooks and
design documents written alongside the build. This plan's main job is to give
each of those a home, define the editorial voice for each edition, and list the
chapters still to write.

---

## The shared capability spine

Both editions are organised around the capability map (see
*epc-capability-coverage-map*). The money story is the heart of the book —
earned value, forecasting, revenue, cash flow, margin, change — because that is
where AI PMO's synthesis concentrates. Risk/issues/performance and the
presentation layer follow, then justification and governance. The Technical
Edition mirrors the same spine one layer down: for each capability, the
library that computes it, the agent that reasons over it, the data it reads.

---

## Volume A — Business Edition: *AI PMO: How It Works*

**Status key:** ★ drafted (source exists, needs light edit) · ◐ partial (some
source, needs work) · ○ gap (write new).

### Part I — Why AI PMO exists

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| A1 | The problem: the SAP PS ↔ scheduler seam | PMO_LLM_Executive_Brief; positioning memory; /about | ◐ |
| A2 | What AI PMO is — and is not | what-belongs-in-ai-pmo-scope-charter; /about | ★ |
| A3 | The EPC capability coverage map | epc-capability-coverage-map | ★ |
| A4 | The operating model: synthesise / consume / don't own | what-belongs-in-ai-pmo-scope-charter | ★ |

### Part II — The money story

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| A5 | Earned value, in plain terms | forecasting-cost-revenue-to-eac (EV portion); EV concepts | ◐ |
| A6 | Forecasting cost & revenue to EAC | forecasting-cost-revenue-to-eac-concept | ★ |
| A7 | Revenue recognition (IFRS 15 / Results Analysis) | code + RA panel; needs a concept chapter | ○ |
| A8 | Cash-flow forecast & funding exposure | scope-charter (cash-flow section); needs own chapter | ◐ |
| A9 | Margin: as-sold → as-built | margin-bridge build; needs concept chapter | ○ |
| A10 | Change & trend management | change-and-trend-management-concept | ★ |

### Part III — Risk, issues & performance

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| A11 | Risk register: EMV & P50/P80 contingency | risk-enrichment build; needs concept chapter | ○ |
| A12 | Issue management: aging, SLA, impact | issue-enrichment build; needs concept chapter | ○ |
| A13 | Variance analysis | variance build; needs concept chapter | ○ |

### Part IV — How AI PMO communicates intelligence

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| A14 | KPI provenance & trustworthy numbers | kpi-provenance-colour-coding-proposal | ★ |
| A15 | Colour & iconography: making a dense PMO legible | design-language memory; needs writing | ○ |
| A16 | Reporting, narrative & the agent assistant | PMO_LLM_Pilot_Walkthrough | ◐ |

### Part V — Justification & governance

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| A17 | Why these formulas (PMBOK / AACE / IFRS 15) | synthesise from concept chapters | ○ |
| A18 | Scope discipline revisited | what-belongs-in-ai-pmo-scope-charter | ★ |
| A19 | A worked example, end to end | PMO_LLM_Pilot_Walkthrough (rework) | ◐ |

**Appendices (Business):** Glossary of EPC & EVM terms ○ · Where AI PMO fits vs
ERP / scheduler / PPM suites (from *Cora-PPM-in-AI-PMO*) ★ · Future directions:
archetype expansion (from *PMO_LLM_Expansion_Strategy*) ◐.

---

## Volume B — Technical Edition: *AI PMO: Inside the Build*

### Part I — Architecture

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| B1 | System overview & stack (Next.js · Supabase · OpenRouter · Ollama) | PMO_LLM_Stack_Explained; PMO_LLM_Engineering_Detail | ★ |
| B2 | The canonical data model & provenance | AI-PMO-Process-and-Architecture-Note; AI-PMO-Integration-Sync-Contract | ★ |
| B3 | The WBS join key & the Level-2 phase model | Process-and-Architecture-Note | ★ |

### Part II — Data & integration

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| B4 | Integration architecture & the sync contract | AI-PMO-Integration-Sync-Contract; AI-PMO-Integration-Build-Roadmap | ★ |
| B5 | Adapters, mappers, ingestion & exceptions | sync-contract; integration per-object build | ◐ |
| B6 | Per-object sync, file parity & round-trip | recent integration build; needs writing | ○ |
| B7 | Source-system tagging & the book-to-ERP bookend | Process-and-Architecture-Note | ◐ |

### Part III — The agents

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| B8 | The agent roster & catalog (15 agents) | agent-technical-profiles; lib/agent-prompts | ★ |
| B9 | The agent prompt pattern & context grounding | lib/agent-prompts/*; PMO_LLM_Build_Rulebook | ◐ |
| B10 | Routing & the auto-router classifier | PMO_LLM_Agent_Routing_Design | ★ |
| B11 | Cross-agent actions (assign → respond) | action_items build; needs writing | ○ |

### Part IV — The synthesis libraries (the computation core)

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| B12 | Earned value & earned schedule (lib/earned-value) | code; PMO_LLM_Engineering_Detail | ◐ |
| B13 | Forecasting & EAC (lib/forecast) | code; forecasting concept | ◐ |
| B14 | Cash flow (lib/cash-flow) | code | ○ |
| B15 | Change orders & trend (lib/change-orders) | code; change concept | ◐ |
| B16 | Risk EMV & contingency (lib/risk-emv) | code | ○ |
| B17 | Margin · billing · commitment · results analysis (libs) | code | ○ |
| B18 | Portfolio reads & pagination (lib/select-all) | code; pagination feedback | ○ |

### Part V — Build practices, AI concepts & evaluation

| # | Chapter | Source material | Status |
| --- | --- | --- | --- |
| B19 | The generator pattern (deterministic seeding) | scripts/README; PMO_LLM_Build_Rulebook | ◐ |
| B20 | AI concepts in play (LLMs, RAG, prompting, OpenRouter) | PMO_LLM_AI_Concepts_Explained; PMO_LLM_RAG_Explained; PMO_LLM_OpenRouter_Explained | ★ |
| B21 | The build rulebook | PMO_LLM_Build_Rulebook | ★ |
| B22 | Evaluation & consistency testing | docs/eval/consistency-*; interview-prep (eval section) | ◐ |
| B23 | Deployment: local-first → Railway / Vercel | promote-to-cloud-runbook; pre-deploy-checklist | ★ |

**Appendices (Technical):** Data dictionary & migration history (derive from
migrations) ○ · Prompt library (lib/agent-prompts/*) ★ · Design-consistency &
dead-code audit (from *AI-PMO-Design-and-Deadcode-Audit*) ★.

---

## Source inventory → where each existing doc lands

| Existing doc | Edition / chapter | Reuse |
| --- | --- | --- |
| what-belongs-in-ai-pmo-scope-charter | A2 / A4 / A18 | As-is |
| epc-capability-coverage-map | A3 | As-is |
| forecasting-cost-revenue-to-eac-concept | A6 | As-is |
| change-and-trend-management-concept | A10 | As-is |
| kpi-provenance-colour-coding-proposal | A14 | As-is |
| Cora-PPM-in-AI-PMO | A-appendix | Light edit |
| PMO_LLM_Executive_Brief | A1 | Rework |
| PMO_LLM_Pilot_Walkthrough | A16 / A19 | Rework |
| PMO_LLM_Expansion_Strategy | A-appendix | Condense |
| AI-PMO-Process-and-Architecture-Note (+v2) | B2 / B3 / B7 | As-is |
| AI-PMO-Integration-Sync-Contract | B4 / B5 | As-is |
| AI-PMO-Integration-Build-Roadmap | B4 (context) | Condense |
| PMO_LLM_Stack_Explained | B1 | As-is |
| PMO_LLM_Engineering_Detail | B1 / B12–B13 | Split |
| agent-technical-profiles | B8 | As-is |
| PMO_LLM_Agent_Routing_Design | B10 | As-is |
| PMO_LLM_Build_Rulebook | B21 / B9 / B19 | As-is |
| PMO_LLM_AI_Concepts_Explained | B20 | As-is |
| PMO_LLM_RAG_Explained | B20 | As-is |
| PMO_LLM_OpenRouter_Explained | B20 | As-is |
| AI-PMO-Design-and-Deadcode-Audit | B-appendix | As-is |
| promote-to-cloud-runbook | B23 | As-is |
| pre-deploy-checklist | B23 | As-is |
| lib/agent-prompts/* (15) | B-appendix (Prompt library) | As-is |
| education-migration-plan, interview-prep, reading-list, PMO_LLM_Strategy | *Not book content* — internal / personal | Exclude |

---

## Gap list — chapters still to write

Ordered as a writing roadmap, business value first (the money story is the
book's centre of gravity), then the technical computation core.

**Business (write these first):**

1. A7 — Revenue recognition (IFRS 15 / Results Analysis) concept
2. A8 — Cash-flow forecast & funding exposure (promote the scope-charter section to a full chapter)
3. A9 — Margin: as-sold → as-built
4. A11 — Risk register: EMV & P50/P80 contingency
5. A12 — Issue management
6. A13 — Variance analysis
7. A15 — Colour & iconography (the design-language appendix already queued)
8. A17 — Why these formulas (standards grounding) — synthesised once the concept chapters exist
9. Glossary

**Technical (write alongside):**

10. B12–B18 — one chapter per synthesis library (EV, forecast, cash flow, change, risk, margin/billing/commitment/RA, pagination) — mostly extractable from code + the engineering detail doc
11. B6 — Per-object sync, file parity & round-trip
12. B11 — Cross-agent actions
13. Data dictionary & migration history (derive from the migration files)

---

## Conventions & production

- **Two artefacts per chapter:** every chapter is a Markdown file with a paired
  `.docx` generated by pandoc (the standing rule). Markdown is source of truth;
  `.docx` is the derived, distributable copy.
- **Voice:** Business Edition — plain language, formula-in-words, a worked
  example per capability, standards cited by name; minimal code. Technical
  Edition — precise, code- and schema-level, file paths and function names,
  diagrams.
- **No employer references** anywhere — no employer names, project counts,
  monetary figures, internal programme names or client lists. All examples use
  the generic synthetic portfolio.
- **Cross-references:** each capability's Business chapter links to its Technical
  counterpart and vice-versa (e.g. "A6 ↔ B13").
- **Proposed folder layout** (to adopt when we start consolidating):

  ```
  docs/book/
    00-front-matter.md
    business/   A1..A19 + appendices
    technical/  B1..B23 + appendices
    shared/     figures, glossary, capability map
  ```

  Existing chapters stay where they are until we choose to reorganise; this plan
  references them in place.

## Next actions

1. Lock the two tables of contents (this document).
2. Begin the Business gap list at A7 (Revenue recognition), continuing the
   concept-chapter pattern already established by A6 and A10.
3. Extract the Technical synthesis-library chapters (B12–B18) from the code as
   each capability's Business chapter is finalised, keeping the pair in step.
