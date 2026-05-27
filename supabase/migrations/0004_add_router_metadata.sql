-- =============================================================================
-- Migration 0004 — auto-router metadata
-- =============================================================================
--
-- Adds a column to agent_outputs that records when an output was produced via
-- the auto-router rather than explicit agent selection.
--
-- Backwards compatible: column is nullable. Existing rows (all of which were
-- explicit selections) keep routed_from_intent = NULL.
--
-- When the router fires:
--   - "auto"          → user picked Auto, router resolved to the agent
--   - "auto:fallback" → user picked Auto, router output was invalid, fell back
--                       to the first allowed agent for the role
--
-- See: PMO_LLM_Agent_Routing_Design.md
-- =============================================================================

alter table agent_outputs
  add column if not exists routed_from_intent text;

comment on column agent_outputs.routed_from_intent is
  'Non-null when this output was produced via the auto-router. "auto" = router selected the agent; "auto:fallback" = router output invalid, fell back to first allowed agent. NULL = explicit user selection.';
