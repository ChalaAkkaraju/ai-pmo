# Seed scripts

## What this does

Populates the Supabase database with the Phase 2.2 demo state — Mariposa Wind Farm Phase 1 (the lifecycle simulation's anchor project) plus, in subsequent sub-tasks, three placeholder projects, narrative content (variance reports, agent outputs), and the worked-examples library with pgvector embeddings.

The seed is **idempotent** — each row upserts by its natural key (project code, issue ID within project, etc.), so re-running won't duplicate.

## What sub-task 1 ships (this session)

- `seed.ts` — orchestrator
- `lib/supabase-admin.ts` — service-role client (full database access, never use in browser code)
- `lib/log.ts` — minimal coloured logger
- `seeds/01-mariposa-project.ts` — Mariposa project row at Week 78 SC state ($148.85M post-CO-001, 9.5% margin)
- `seeds/02-mariposa-issues.ts` — all 31 issues from the lifecycle simulation, every one Closed at SC
- `seeds/03-mariposa-risks.ts` — all 12 risks with three-category closeout disposition (3 Realised / 8 Mitigated / 1 Not Materialised)
- `seeds/04-mariposa-change-orders.ts` — CO-001 with full four-frame commercial dynamics analysis as JSONB

After running, the Supabase tables `projects` / `issues` / `risks` / `change_orders` will contain Mariposa's structured state. Variance reports, agent outputs, portfolio patterns, placeholder projects, and worked examples come in subsequent sub-tasks.

## How to run

```bash
# From the repo root
cd ~/code/pmo-llm-demo

# Make sure dependencies are installed (dotenv was added for this sub-task)
pnpm install

# Make sure .env.local is filled in with Supabase service-role key
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY

# Run the seed
pnpm seed
```

Expected output (idempotent — second run shows the same):

```
════ PMO LLM Demo — Phase 2.2 seed ════

· Connected to Supabase. Found 4 role rows (expect 4).

1. Mariposa project row
✓ Mariposa project row seeded (id=abcdef12…)

2. Mariposa issues (31 rows)
✓ Seeded 31 issues, 0 updated.

3. Mariposa risks (12 rows)
✓ Seeded 12 risks, 0 updated.

4. Mariposa change orders (CO-001)
✓ Seeded 1 change orders, 0 updated.

════ Phase 2.2 sub-task 1 complete ════
```

## Verification in Supabase

After `pnpm seed` completes, in the Supabase dashboard → Table Editor:

- `projects` — 1 row, code `NW-REN-2511`, status `SC`, current_week `78`, contract_value_current `148850000`
- `issues` — 31 rows, all with status `Closed`; H-severity count = 7 (I-001, I-002, I-003, I-004, I-005, I-021, I-026)
- `risks` — 12 rows; 3 Realised, 8 Mitigated, 1 Not Materialised
- `change_orders` — 1 row, CO-001, $850k revenue / $780k cost / 8.2% margin

## Troubleshooting

**`Missing Supabase env vars` error.** Make sure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` filled in. The seed script auto-loads `.env.local` via `dotenv/config`.

**`Could not read roles table` error.** The 0001_init.sql migration hasn't been applied to your Supabase project. Apply it via the Supabase dashboard SQL editor or `supabase db push`. Then apply 0002_seed_roles.sql.

**Upsert error on `cross_cutting_class` check constraint.** A risk row has a class value that doesn't match the closed taxonomy. The 6 valid values plus `Project-specific` are encoded in TypeScript and match the schema CHECK constraint exactly. If this fires, somebody edited the seed data; cross-check against `lib/types.ts CrossCuttingClass`.

**TypeScript path-resolution error.** `tsx` should resolve relative imports without issues. If you see a path error, ensure you're running from the repo root (`pnpm seed` from `~/code/pmo-llm-demo`).

## What's next

After this seed completes successfully, the next sub-task (1b) adds:

- 4 variance reports (Week 0 framework + Week 28 + Week 52 + Week 78 final SC)
- 31 agent outputs as audit log entries (full markdown content per run)
- 4 portfolio patterns (Pattern 1 / 2 / 3 / 4 with closeout state)

After 1b, the Mariposa column of the eventual UI dashboard will have everything it needs to render. Sub-task 2 then adds three placeholder projects to demonstrate portfolio mode; sub-task 3 loads the worked-examples library.
