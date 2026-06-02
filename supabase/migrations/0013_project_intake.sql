-- =============================================================================
-- PMO LLM Demo — migration 0013: project intake (web form front door)
-- =============================================================================
-- Adds two NULLABLE, additive columns to `projects` so the new per-segment
-- intake web form (app/access/[token]/intake/[segment]) can persist the rich
-- sheet without needing a wide set of typed columns:
--
--   intake_json  jsonb  — the full filled Project Data Sheet (site address,
--                         commercial terms, schedule dates, segment-specific
--                         technical facts, governance, risk confirmations).
--                         Core facts also land in their typed columns; this is
--                         the complete record for traceability + Charter
--                         grounding later.
--   created_via  text   — 'intake_form' for rows created from the web form,
--                         NULL for seeded rows. Lets the dashboard tell
--                         user-created projects apart from the seed portfolio.
--
-- Run via: Supabase Dashboard → SQL Editor → New query → paste this → Run.
-- Safe to run multiple times (IF NOT EXISTS).
-- =============================================================================

alter table projects add column if not exists intake_json jsonb;
alter table projects add column if not exists created_via text;

-- Optional helper index for "show me projects created from the form".
create index if not exists projects_created_via_idx on projects(created_via);
