-- =============================================================================
-- PMO LLM Demo — migration 0016: record who created a project
-- =============================================================================
-- Adds created_by_role_type so the dashboard "Recently added" popover can show
-- "by {role}" (e.g. by Senior PM) instead of just "added X ago". Set by
-- POST /api/projects from the creating role's token. NULL for seeded projects.
--
-- Run via: Supabase Dashboard → SQL Editor → New query → paste this → Run.
-- Safe to run multiple times (IF NOT EXISTS).
-- =============================================================================

alter table projects add column if not exists created_by_role_type text;
