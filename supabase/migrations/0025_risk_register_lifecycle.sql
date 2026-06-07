-- Migration 0025 — risk register lifecycle + structure links
-- WBS linkage (risk meets the canonical join key), realised actuals (for EMV
-- forecast accuracy), and velocity/proximity (urgency). Additive + nullable.
-- Generator 15 (scripts/generators/15-enrich-risks-2.ts) backfills.

alter table risks add column if not exists wbs_code          text;            -- WBS element the risk threatens
alter table risks add column if not exists realised_cost_usd numeric(15,2);   -- actual cost for Realised risks (vs predicted EMV)
alter table risks add column if not exists proximity_weeks   int;             -- weeks until potential impact (urgency)
alter table risks add column if not exists velocity          text
  check (velocity in ('Slow', 'Medium', 'Fast'));                             -- how fast it escalates once triggered
