# Education-layer migration plan — app as the source of truth

**Decided 2026-06-05.** Principle: the running app is the single source of truth for the
education layer. Explainers live as in-app pages (live, interactive, never drifting from the
build); standalone documents become **derived exports** generated *from* those pages, not
separately authored. This supersedes the earlier "docs consolidation" proposal — instead of
consolidating documents into fewer documents, the content moves into the app.

## Decisions taken

- **Concepts / "under the hood" page (RAG, model routing, stack): deferred.** Keep the education
  layer focused on the PMO story for now; the deep-tech concept docs stay as working files and a
  `/learn/concepts` page can come later.
- **Keep `.docx` companions** — but as *derived exports regenerated from the in-app pages*, kept
  for when an editable Word file is genuinely needed. The app page is authoritative; the doc is
  generated from it. The md+docx parallel rule still applies to working/meta docs.
- **Add print-to-PDF** on each education page so a portable copy comes straight from the live page.

## Fate of every current document

### Becomes / feeds an in-app page (education)

| Document(s) | Destination | Status |
|---|---|---|
| AI-PMO-Process-and-Architecture-Note (+ v2) | `/architecture` | live — retire docs after |
| PMO_LLM_Executive_Brief | `/welcome` + `/about` | live — retire after |
| PMO_LLM_Agent_Routing_Design | `/agents` (+ short routing note) | live — add note |
| AI-PMO-Integration-Sync-Contract | **NEW `/learn/integration`** | to build |
| AI-PMO-Integration-Build-Roadmap | **NEW `/learn/roadmap`** | to build |
| canonical model (only partly shown today) | **NEW `/learn/data-model`** | to build |
| PMO_LLM_Pilot_Walkthrough | the live app *is* the walkthrough | retire |

### Stays a working / meta file (never user-facing education)

Build_Rulebook · Design-and-Deadcode-Audit · Strategy · Expansion_Strategy · the whole
`PMO_LLM_Test_Pack/` · repo `docs/` (interview-prep, pre-deploy-checklist, reading-list) · the
READMEs (repo + scripts). The deep-tech concept docs (AI_Concepts, RAG, OpenRouter, Stack,
Engineering_Detail) also stay here until/if the optional concepts page is built.

### Keep as sample / asset data

`runs/` (sample agent outputs) · `contract-templates/` (intake data sheets) · the resume PDF.

### Retire

Everything in `_to_delete/` · all `~$*.docx` Word lock/temp files · the superseded education docs
(architecture note v1+v2, exec brief, pilot walkthrough) *once their pages are confirmed live*.

## Target information architecture

A `/learn` hub as the front door, indexing the explainers in reading order with an audience tag
(Exec / PM / Technical):

> Start here → About → Architecture → Process flow → PMBOK coverage → The 14 agents →
> Data model → Integration & sync → Roadmap → *(Concepts — later)*

Each page carries a print-to-PDF action. Existing pages (`/welcome`, `/about`, `/architecture`,
`/framework`, `/agents`) are wired into the hub; three new pages fill the gaps.

## Execution order

1. **`/learn` hub** + wire the existing pages into it — gives the layer a front door immediately.
2. **Build the three gap pages**: `/learn/data-model`, `/learn/integration`, `/learn/roadmap`
   (content lifted from the sync-contract + roadmap docs + the canonical model).
3. **Print-to-PDF** on the education pages (print CSS), and regenerate the kept `.docx` companions
   from those pages.
4. **Retire / clean** the external docs — junk (`_to_delete/`, `~$` temps) now; the superseded
   education docs once their pages are live.
5. *(Later, optional)* `/learn/concepts` — under-the-hood (RAG, routing, stack); refresh the
   OpenRouter content first (likely stale — now on cloud Opus).

## Out of scope / notes

- No code in the planning step. Build begins at step 1 on the go-ahead.
- Header nav stays uncrowded; `/learn` is reached from `/welcome` and cross-links, mirroring the
  existing explainer-page pattern.
