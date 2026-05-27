# AI PMO — Study Reading List

A sequenced reading plan to internalize the project before interviews. Build outward from the *why* to the *how* to the *evidence*. ~3 hours total, best spread across a few sittings.

Each `.md` doc below has a matching `.docx` in the same folder (open whichever you prefer). Parent-folder docs live at `C:\Claude\Projects\PMO LLM\`; repo docs live under `pmo-llm-demo\`.

---

## Read 1 — Frame the WHY (~20 min)

**File:** `C:\Claude\Projects\PMO LLM\PMO_LLM_Strategy.md` (or `.docx`)

The project's mission: what problem it solves, for whom, why with AI. Goal: be able to say in two sentences what AI PMO does that a spreadsheet doesn't.

*Caveat: written before the recent features (auto-router, floating widget, report viewer). Treat as the strategic frame, not the current feature inventory.*

## Read 2 — See the WHAT, as of today (~10 min)

**File:** GitHub front page — `https://github.com/ChalaAkkaraju/ai-pmo`
(local: `C:\Claude\Projects\PMO LLM\pmo-llm-demo\README.md`)

The current-state snapshot: headline features, architecture diagram, role list, stack. Goal: give a one-minute spoken tour from memory. Memorize the architecture diagram.

## Read 3 — Internalize the HOW (~45 min)

**File:** `C:\Claude\Projects\PMO LLM\PMO_LLM_Engineering_Detail.md` (or `.docx`)

Components, data flow, design choices. Cross-reference with the README diagram. Goal: draw the component diagram on a whiteboard and explain why each piece is separate (e.g., why the router and the specialist are different model calls).

*Same caveat as Read 1 — predates some recent features.*

## Read 4 — Build AI vocabulary (~60 min, two sittings)

**Files:**
- `C:\Claude\Projects\PMO LLM\PMO_LLM_AI_Concepts_Explained.md` (or `.docx`) — first
- `C:\Claude\Projects\PMO LLM\PMO_LLM_RAG_Explained.md` (or `.docx`) — second

Grounding, retrieval, context windows, agents, model selection, prompting. The RAG doc matters even though AI PMO doesn't use RAG — interviewers ask "would you add RAG here? when? why not?" Goal: define grounding, RAG, agentic AI, worked-example prompting in 2-3 sentences each, and know which apply to AI PMO and which don't.

## Read 5 — The reliability story (~20 min)

**File:** `C:\Claude\Projects\PMO LLM\pmo-llm-demo\docs\eval\consistency-2026-05-27\README.md` (or `.docx`)
(also on GitHub under `docs/eval/`)

The empirical evaluation — your most defensible portfolio artifact. Memorize: 5/5 decision agreement, 5/5 factual citation, the one inconsistency (variable data-citation depth), and the four production patterns (two-layer architecture, structured intermediates, vote-and-converge, cache+invalidate). This is the answer to "how do you evaluate LLM systems?"

## Read 6 — Engineering principles (~30 min, optional)

**File:** `C:\Claude\Projects\PMO LLM\PMO_LLM_Build_Rulebook.md` (or `.docx`)

Decisions and tradeoffs. Less interview-essential but good for "what would you do differently?" If short on time, read just the decisions-and-rationale section.

---

## Then — synthesis exercise (~30 min, your own writing)

Write your own one-page talking points: (a) 60-second elevator pitch, (b) 5-minute architecture walkthrough, (c) anticipated questions + answers. The act of writing it is where the synthesis happens.

## Companion: the interview prep guide

A fuller version of (c) is already written for you at:
`C:\Claude\Projects\PMO LLM\pmo-llm-demo\docs\interview-prep.md` (and `.docx`)
— elevator pitch, walkthrough outline, 16 Q&As, key numbers, things-not-to-say, questions to ask the interviewer.

---

## Quick map of where everything lives

- **Strategic / educational docs** (Strategy, Engineering Detail, AI Concepts, RAG, Build Rulebook): `C:\Claude\Projects\PMO LLM\` (parent folder)
- **Repo docs** (README, this reading list, interview prep, pre-deploy checklist, consistency eval): `C:\Claude\Projects\PMO LLM\pmo-llm-demo\` and on GitHub at `github.com/ChalaAkkaraju/ai-pmo`
- **Historical / superseded docs** (Phase 0/1 memos, old setup guides): `C:\Claude\Projects\PMO LLM\archive\phase0_1\`
