-- =============================================================================
-- Migration 0010 — action_item responses (close the loop)
-- =============================================================================
-- When the assigned role agrees with a drafted response, they "Accept & save"
-- it. The response text is stored on the action, stamped with who responded and
-- when. The raiser (e.g. the Risk Analyst who flagged the mitigation) then sees
-- the answered action in a "Responses to actions you raised" panel — live via
-- the existing action_items realtime publication (migration 0009).
--
-- Additive + nullable: existing rows stay NULL. No backfill needed.
-- =============================================================================

alter table action_items add column if not exists response_md text;
alter table action_items add column if not exists responded_by_role_type text;
alter table action_items add column if not exists responded_at timestamptz;
