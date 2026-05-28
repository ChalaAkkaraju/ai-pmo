# AI PMO

A methodology-aware, multi-agent system for EPC (engineering, procurement, construction) project-management offices. Thirteen specialist agents grounded in PMBOK 7 and a cross-cutting risk taxonomy, coordinated by a small auto-router that picks the right specialist from natural-language prompts. Built as a personal learning project; engineered to the standard a real commercial product would require, minus the go-to-market layer.

> **Personal portfolio project.** This is a self-directed build by [Chala Akkaraju](https://github.com/ChalaAkkaraju), an SAP PS solution architect pivoting into AI Solutions Architecture. The deliberate scope is to demonstrate end-to-end enterprise-AI engineering competence — architecture, data, evaluation, reliability — without commercialisation work. Not affiliated with any employer.

## What it does

The demo lets up to ten colleagues across a realistic PMO org (PMO Director, Procurement, Risk, Sponsor, Commercial, Project Controls, Program Manager, Engineering Manager, Construction Manager, HSE Manager) collaboratively interact with a portfolio of 100 active and historical capital projects across four industry segments (renewables, water, industrial, power). Each colleague accesses the system via a unique URL token; they share the same project state with role-appropriate filtering; updates from any colleague's agent invocation propagate to others in real time.

Behind the chat surface, prompts route to one of thirteen specialist agents — Charter Drafter, Stakeholder Analyst, WBS Builder, Schedule Reasoner, Budget Builder, Communications Planner, Issue Logger, Variance Analyst, Change Order Reviewer, Risk Analyst, Lessons-Learned Synthesiser, Closeout Reporter, Portfolio Risk Reviewer. The router (a cheap Claude Haiku 4.5 classifier) picks the right specialist from the user's prompt; the specialist itself (Claude Opus 4.7 via OpenRouter) generates the grounded response using the project's actual data passed in via context.

## Headline features

- **Auto-routing.** Type any prompt; a Haiku classifier picks the appropriate specialist agent. Users can override the routing decision via a dropdown if they want a specific agent.
- **Floating "Ask AI Assistant" widget** persistent on every page. Context-aware: knows which project page you're on and scopes the invocation accordingly.
- **Two-ribbon BI dashboard** with 6 portfolio KPIs, theme-drill-down by segment, a "Hot 5" list of projects of concern with composite scoring, and a live activity feed of recent invocations broadcasted via Supabase Realtime.
- **Per-project visualizations**: 3×3 risk heat-map, variance-trend chart with contingency burn-down, Gantt-style schedule strip, hierarchical WBS tree.
- **Polished printable report viewer** at `/access/<token>/report/<output-id>`. Two-tier layout (Summary + Full detail), letterhead with brand mark, project context strip, request quote, footer. **Searchable PDF download** via a server-side Puppeteer route — Chromium headless renders the same page server-side and captures it as a real PDF with selectable, copyable, searchable text (no rasterization).
- **Quick + full response modes.** Chat-panel responses default to a 250-word brief (~$0.06, ~12s). Opening the polished report regenerates in long-form (~$0.30, ~30s) and caches per browser session.
- **Agent catalog page** at `/access/<token>/agents` — documents what each of the 13 specialists does and doesn't do, scope, sample prompts, methodology grounding.
- **Empirical reliability evaluation.** Formal consistency test of the Risk Analyst agent (5 runs, same prompt, same project): 5/5 decision agreement, 5/5 factual agreement, healthy prose variation. Full methodology + raw outputs at [`docs/eval/consistency-2026-05-27/`](./docs/eval/consistency-2026-05-27/).

## Architecture

```
Browser (5 colleagues, each with unique /access/<token> URL)
   │
   ▼
Next.js 16 (App Router + Turbopack)
   │
   ├──► Supabase (Postgres + Realtime broadcast + RLS)
   │        - projects, risks, issues, change_orders,
   │          variance_reports, agent_outputs, roles
   │
   ├──► OpenRouter
   │        ├──► Claude Haiku 4.5  (router — picks specialist)
   │        └──► Claude Opus 4.7   (specialist agent generation)
   │
   └──► Static worked-example library + agent system prompts
            (committed to repo; loaded into context at invocation time)
```

Methodology grounding: PMBOK 7 process model, cross-cutting risk taxonomy (six classes: vendor concentration, regulatory deadline, site-conditions variance, resource scarcity, client-driven scope, weather sensitivity). The agent prompts and worked-example anchors live in `lib/agent-prompts/` and `scripts/seed-content/archive/`.

## Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI primitives, Inter typography, `react-markdown` + `remark-gfm`
- **PDF generation**: `puppeteer` (headless Chromium) via a server-side API route — produces searchable PDFs with real text layers
- **Backend**: Next.js API routes (serverless), Zod request validation
- **Database**: Supabase Postgres, Row-Level Security, Realtime broadcast on the `agent_outputs` table
- **Inference**: Anthropic Claude Opus 4.7 (specialists) + Claude Haiku 4.5 (router), accessed via OpenRouter
- **Auth**: URL-token in a proxy (`proxy.ts`) — no user accounts, no passwords; tokens cookie-persist after first visit
- **Local dev**: Single Windows tree, `pnpm dev` with Turbopack hot-reload
- **Repo**: GitHub (private)

## Roles

All ten roles are portfolio-level — each colleague sees the full ~100-project portfolio with a role-scoped slice.

| Role | Scope | Agents available |
|---|---|---|
| Senior PM (PMO Director) | All 100 projects + all artefacts | All 13 agents |
| Portfolio Procurement Strategist | Procurement slice across portfolio | Risk Analyst, Variance Analyst, Change Order Reviewer, Portfolio Risk Reviewer |
| Portfolio Risk Analyst | Risks + cross-cutting patterns across portfolio | Risk Analyst, Portfolio Risk Reviewer, Lessons-Learned Synthesiser, Issue Logger |
| VP Sponsor | Executive view + status reports + change orders (read-only) | Closeout Reporter, Portfolio Risk Reviewer |
| Commercial Manager | Change-order four-frame dynamics + margin protection | Change Order Reviewer, Variance Analyst |
| Project Controls Manager | Cost & schedule analytics — CPI/SPI health, baseline reasoning | Variance Analyst, Schedule Reasoner, Budget Builder |
| Program Manager — Renewables | Multi-project programme oversight + escalations | Stakeholder Analyst, Schedule Reasoner, Budget Builder, Communications Planner, Issue Logger, Variance Analyst, Change Order Reviewer, Risk Analyst, Portfolio Risk Reviewer, Closeout Reporter |
| Engineering Manager | Early-phase planning + engineering risk identification | Charter Drafter, Stakeholder Analyst, WBS Builder, Risk Analyst |
| Construction Manager | Execution-phase site issues + variance + field change orders | Issue Logger, Variance Analyst, Change Order Reviewer |
| HSE Manager | Safety incidents + cross-cutting HSE pattern detection | Issue Logger, Portfolio Risk Reviewer |

Even though each role has a narrower default agent set, the full 13-agent catalog is browsable from every role's `/agents` page so colleagues can see what the broader system offers.

## Running locally

Prerequisites: Node.js 22+ (LTS), [pnpm](https://pnpm.io/) (enable via `corepack enable pnpm`), a Supabase project, an OpenRouter API key.

```powershell
# Clone and install
git clone https://github.com/ChalaAkkaraju/ai-pmo.git
cd ai-pmo
pnpm install

# Environment variables
copy .env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY

# Database migrations (Supabase CLI)
pnpm supabase db push

# Seed projects + agent worked examples
pnpm seed

# Start dev server
pnpm dev
```

Open `http://localhost:3000` and click through to any of the seeded role tokens.

## Project structure

```
app/                  Next.js App Router routes
├── access/[token]/     Token-gated dashboard pages
│   ├── page.tsx         Two-ribbon dashboard (KPIs + theme drill-down)
│   ├── projects/[code]/ Per-project page (tabs + visualisations)
│   ├── agents/          Agent catalog page
│   └── report/[id]/     Polished printable report viewer
└── api/
    └── agent/          Agent invocation endpoint (POST)

components/           React components (dashboard, widget, charts, report)
lib/
├── agent-prompts/      13 specialist agent system prompts (.md)
├── agent-router.ts     Haiku classifier — picks specialist from prompt
├── agent-runner.ts     End-to-end orchestrator (validate, route, ground, call, write)
├── agent-context.ts    Builds the LLM input from project state + worked example
└── openrouter.ts       Anthropic call via OpenRouter

scripts/
├── seed.ts             Seeds Supabase from worked examples + Mariposa runs
├── seed-content/       Worked-example library + 31 Phase 0/1 outputs
├── generators/         Procedural variation scripts (4 → 100 projects)
└── consistency-test.mjs N-run reliability test runner

docs/eval/            Empirical evaluations of system behaviour
supabase/migrations/  Database schema + seeds (5 migrations)
```

## Deployment

Vercel auto-deploys `main` to production. Required environment variables match the local `.env.local` set. The Hobby plan's 60-second timeout fits Opus 4.7 long-mode regeneration (~30-40s) tightly; if longer prompts hit timeouts, Vercel Pro raises the limit to 300s.

## Evaluations

Reliability and consistency evaluations live at [`docs/eval/`](./docs/eval/). Currently:

- **[Risk Analyst consistency test (2026-05-27)](./docs/eval/consistency-2026-05-27/README.md)** — five sequential invocations against the same project with the same prompt; comparison of decision stability, factual grounding, and prose variation. Result: 5/5 decision agreement, 5/5 factual citation agreement, healthy prose variation, one minor inconsistency identified (variable depth of data citation across runs). Includes a discussion of production-grade architectural patterns to apply if a wider evaluation surfaces real gaps.

## Why this exists

For someone evaluating this repo as a portfolio piece: the goal of this build is to demonstrate that enterprise-AI systems can be engineered to the same standard as commercial software — with grounded reasoning, methodology-aware behaviour, reliability evaluation, real-time multi-user state, and end-to-end deployment — while being honest about the limits and remaining work. The evaluation documents are part of that demonstration: not "the system works perfectly," but "here is how I tested it, here is what I found, here is what I would do differently in production."

## License

Personal portfolio project. Not for redistribution without explicit permission.
