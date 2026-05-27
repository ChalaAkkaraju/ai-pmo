# PMO LLM Demo

**Phase 2 of the PMO LLM project — interactive multi-user demo of the methodology-aware agentic system for EPC project management.**

## What this is

A Next.js 14 + Supabase + OpenRouter web application that lets 3-5 colleagues collaboratively interact with the 13-agent EPC PMO system across a 4-project portfolio (Mariposa Phase 1 + 3 placeholder projects). Each colleague holds a portfolio-level role (Senior PM, Procurement Strategist, Risk Analyst, VP Sponsor); they access via unique URL tokens; they share the same project state with role-appropriate slicing; state updates propagate across colleagues in real time via Supabase Realtime.

The demo is the Phase 2 deliverable of the PMO LLM project. The Phase 1 lifecycle simulation (25 first-shot 30/30 frontier-ceiling outputs across the agent system) provides the worked-example anchors and the seeded project state.

## Architecture

```
Browser (3-5 colleagues, each with unique URL token)
   ↓
Next.js 14 App Router (Vercel-hosted)
   ↓
   ├─→ Supabase (Postgres + RLS + Realtime + pgvector)
   ├─→ OpenRouter API (Opus 4.7 inference)
   └─→ Static worked-example library (committed to repo)
```

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes (serverless on Vercel)
- **Database**: Supabase Postgres with Row-Level Security and Realtime
- **Vector store**: Supabase pgvector (worked-example semantic retrieval)
- **Inference**: Anthropic Claude Opus 4.7 via OpenRouter
- **Auth**: URL token in Next.js middleware (no user accounts)
- **Deployment**: Vercel (free tier)
- **Repo**: GitHub (private)

## Roles in the demo

Four portfolio-level roles for the 3-5 colleague pilot:

| Role | Access | Agents available |
|---|---|---|
| Senior PM (PMO Director) | All 4 projects, all artefacts | All 13 agents |
| Portfolio Procurement Strategist | Procurement-side slice across all 4 projects | Risk Analyst (v3), Variance Analyst, Change Order Reviewer |
| Portfolio Risk Analyst | Risks across all 4 projects + cross-cutting patterns | Risk Analyst (v3), Portfolio Risk Reviewer, Lessons-Learned Synthesiser |
| VP Sponsor | Executive view + status reports + change orders requiring approval | Closeout Reporter, Portfolio Risk Reviewer (read-only) |

A fifth role (Commercial Manager) is staged but not seeded by default.

## Local development

```bash
# Clone to WSL filesystem for Node.js performance
cd ~/code
git clone <repo-url> pmo-llm-demo
cd pmo-llm-demo

# Install dependencies
pnpm install

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL, anon key, service role key, and OpenRouter key

# Run Supabase migrations
pnpm supabase db push

# Seed Mariposa project state from runs/run01-31
pnpm seed

# Start dev server
pnpm dev
```

## Deployment

Push to `main` → Vercel auto-deploys to production. Pull-requests get preview deployments.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (defaults to `anthropic/claude-opus-4-7`)

## Phase 2 build schedule

| Sub-phase | What | Status |
|---|---|---|
| 2.1 Foundation | Scaffold + schema + auth + deployment pipeline | In progress |
| 2.2 Data layer + state seeding | Schema + Mariposa state from runs/ + 3 placeholder projects | Not started |
| 2.3 Agent invocation | OpenRouter proxy + role-permissions + Realtime | Not started |
| 2.4 UI build | Role landing, project dashboard, chat-style agent UI, portfolio view | Not started |
| 2.5 Polish + demo prep | Visual polish + pre-loaded scenarios + walkthrough docs | Not started |

## Related documents (project root)

- `../PMO_LLM_Executive_Brief.docx` — 5-min entry point
- `../PMO_LLM_Engineering_Detail.docx` — 25-min technical depth
- `../PMO_LLM_Build_Rulebook.docx` — engineering principles + 25-result change log
- `../runs/run01-31.md/.docx` — the agent outputs that seed this demo's state
- `../PMO_LLM_Test_Pack/agents/*.md` — agent prompts
- `../PMO_LLM_Test_Pack/archive/` — worked examples (past-project archive)

## License

Personal portfolio project. Not for redistribution without explicit permission.
