alter table issues add column if not exists sla_weeks            int;
alter table issues add column if not exists cost_impact_usd      numeric(15,2);
alter table issues add column if not exists schedule_impact_days int;
alter table issues add column if not exists escalated            boolean not null default false;
alter table issues add column if not exists root_cause           text check (root_cause in ('Design','Vendor / supply','Workmanship / quality','Site conditions','Resource / labour','Coordination / interface','Regulatory / permit','Client / scope','Weather','Other'));
alter table issues add column if not exists recurrence           text check (recurrence in ('First occurrence','Recurring'));