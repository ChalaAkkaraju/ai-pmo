-- =============================================================================
-- PMO LLM Demo — migration 0003: add 'power' as a fourth segment
-- =============================================================================
-- Phase 2.4 introduced a portfolio expansion from 4 projects to ~100 with a
-- realistic EPC firm distribution (renewables 35 / water 25 / industrial 25 /
-- power 15). The original schema only allowed the first three segments via
-- CHECK constraint; this migration broadens it to include 'power'.
--
-- Run via: Supabase Dashboard → SQL Editor → New query → paste this → Run
-- Safe to run multiple times (DROP IF EXISTS pattern).
-- =============================================================================

-- Drop the old check constraint (if present) and add the new one
alter table projects drop constraint if exists projects_segment_check;
alter table projects add constraint projects_segment_check
  check (segment in ('renewables', 'water', 'industrial', 'power'));

-- Sanity: confirm no existing rows would violate the new constraint
-- (none should, since this is purely additive)
do $$
declare
  bad_count int;
begin
  select count(*) into bad_count
    from projects
    where segment not in ('renewables', 'water', 'industrial', 'power');
  if bad_count > 0 then
    raise exception 'Found % project rows with segment outside the allowed set', bad_count;
  end if;
end$$;
