-- Migration 0026 — issue management enrichment
-- Aging/SLA target, cost & schedule impact, escalation state, root cause +
-- recurrence. Additive + nullable (escalated defaults false). Age, overdue,
-- priority, MTTR are computed at read time (they depend on current_week).
-- Generator 16 (scripts/generators/16-enrich-issues.ts) backfills the rest.

alter table issues add column if not exists sla_weeks            int;            -- target resolution weeks (by severity)
alter table issues add column if not exists cost_impact_usd      numeric(15,2);  -- cost the issue is causing/caused
alter table issues add column if not exists schedule_impact_days int;            -- schedule slip caused
alter table issues add column if not exists escalated            boolean not null default false;
alter table issues add column if not exists root_cause           text
  check (root_cause in (
    'Design', 'Vendor / supply', 'Workmanship / quality', 'Site conditions',
    'Resource / labour', 'Coordination / interface', 'Regulatory / permit',
    'Client / scope', 'Weather', 'Other'
  ));
alter table issues add column if not exists recurrence           text
  check (recurrence in ('First occurrence', 'Recurring'));
