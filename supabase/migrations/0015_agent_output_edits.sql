-- =============================================================================
-- PMO LLM Demo — migration 0015: human edits on agent outputs
-- =============================================================================
-- Lets a PM (or any write-capable role) review an agent's drafted artefact,
-- correct it, and save the edited version — WITHOUT losing the AI original.
--
--   edited_md            the human-corrected markdown (NULL = no edit; show
--                        the original output_md). Set when a PM saves edits.
--   edited_by_role_type  which role last edited it (provenance).
--   edited_at            when it was last edited.
--
-- The original AI draft stays in output_md untouched, so the audit trail of
-- "what the agent produced vs what the human changed" is preserved. The app
-- shows edited_md when present, else output_md.
--
-- Run via: Supabase Dashboard → SQL Editor → New query → paste this → Run.
-- Safe to run multiple times (IF NOT EXISTS).
-- =============================================================================

alter table agent_outputs add column if not exists edited_md text;
alter table agent_outputs add column if not exists edited_by_role_type text;
alter table agent_outputs add column if not exists edited_at timestamptz;
