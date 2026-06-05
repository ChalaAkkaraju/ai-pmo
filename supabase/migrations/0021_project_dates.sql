-- 0021_project_dates.sql
-- Absolute, top-down project window on the project header.
--
-- Until now a project had only `current_week` (a relative cursor) and a free-text
-- `hard_deadline_description`. There was no committed start/finish to validate the
-- scheduler's task dates against. These two columns give the Schedule Reasoner a
-- contractual window: every scheduler task start/finish should fall inside
-- [start_date, contract_finish]. This is independent of the bottom-up forecast and
-- of the per-WBS target_finish envelopes (migration 0017 / generator 12) — those
-- are management dates per work package; this is the whole-project commitment.

alter table projects
  add column if not exists start_date date,
  add column if not exists contract_finish date;

comment on column projects.start_date is 'Contractual project start (as-sold). Top-down window lower bound for schedule validation.';
comment on column projects.contract_finish is 'Contractual project finish (as-sold). Top-down window upper bound for schedule validation.';
