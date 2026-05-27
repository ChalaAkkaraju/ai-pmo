# scripts/

Operational and one-off scripts for seeding, generating, and evaluating the AI PMO system.

## What lives here

```
scripts/
├── seed.ts                  Main seed orchestrator (Supabase → Postgres)
├── seeds/                   Individual seed modules (projects, risks, issues, ...)
├── seed-content/            Worked-example library
│   ├── archive/             Three Phase-1 reference projects (Riverside Water,
│   │                          Skyhawk Solar, Ironvale Smelter) + portfolio review.
│   │                          Used by agents as worked-example anchors.
│   └── mariposa/runs/       31 Phase 0/1 lifecycle outputs that seed
│                              Mariposa Wind Farm's project state.
├── generators/              Procedural-variation scripts that expanded the
│                              portfolio from 4 → 100 projects.
├── lib/                     Shared helpers (supabase admin client, logger)
├── consistency-test.mjs     Agent reliability test runner (5+ runs against
│                              the same prompt, captures outputs for comparison).
│                              See docs/eval/consistency-2026-05-27/ for an
│                              example run + analysis.
└── test-agent.ts            CLI invocation of a single agent (handy for
                               debugging without using the web UI).
```

## Common tasks

All commands run from the repo root in **Windows PowerShell** (`cd "C:\Claude\Projects\PMO LLM\pmo-llm-demo"`):

### Seed Supabase from scratch

```powershell
pnpm seed
```

The seed is **idempotent** — every row upserts by its natural key, so re-running won't duplicate. Mariposa state + worked examples + the procedurally-generated 96-project portfolio all land in Supabase.

### Run a one-off agent invocation from the CLI

```powershell
pnpm test:agent
```

Useful for testing prompt or routing changes without going through the browser.

### Run the consistency test

```powershell
node scripts/consistency-test.mjs
```

Defaults to Risk Analyst × 5 runs against project `NW-PWR-2686`, quick mode. Outputs land in `consistency-test/` (gitignored — preserved evaluations should be moved into `docs/eval/<date>/`).

Override via env vars: `AGENT_TYPE`, `PROJECT_CODE`, `RUNS`, `CONCISE`, `PROMPT`, `BASE_URL`.

```powershell
$env:PROJECT_CODE = "NW-IND-2508"; $env:RUNS = "10"; node scripts/consistency-test.mjs
```

### Regenerate the procedural portfolio

```powershell
pnpm tsx scripts/generators/01-archetypes.ts        # Define 10 project archetypes
pnpm tsx scripts/generators/02-procedural.ts        # Generate 96 project variations
pnpm tsx scripts/generators/03-insert-generated.ts  # Insert into Supabase
pnpm tsx scripts/generators/04-bulk-agent-outputs.ts # Charter + Stakeholders + WBS + Risk × 96
pnpm tsx scripts/generators/05-bulk-deep-fill.ts    # Schedule + Budget + Comms + Lessons + Closeout × 10
```

This is a one-time setup — once Supabase is populated, you don't re-run these unless you're starting over.

## Prerequisites

A working `.env.local` with these keys (see `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)
- `OPENROUTER_API_KEY`

For the consistency test specifically, the dev server must also be running (`pnpm dev` in a separate PowerShell window) since the test calls `http://localhost:3000/api/agent`.

## Troubleshooting

- **`Missing Supabase env vars`** — `.env.local` not loaded. Confirm the file exists and contains the four required keys.
- **`Could not read roles table`** — Supabase migrations haven't been applied. Run `pnpm supabase db push` (or apply via the Supabase dashboard SQL editor).
- **`ERR_PNPM_IGNORED_BUILDS`** — pnpm 11 wants explicit permission for native build scripts. Run `pnpm approve-builds` and approve `esbuild`, `sharp`, `unrs-resolver`, and `core-js`.
- **Consistency test gets HTTP errors** — the dev server isn't running, or `PROJECT_CODE` isn't a real project code. Confirm `pnpm dev` is live and the URL `http://localhost:3000/access/demo-pm-token-replace-me` loads.
