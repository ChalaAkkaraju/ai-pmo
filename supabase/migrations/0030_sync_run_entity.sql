-- Migration 0030 — per-object (per-API) sync runs.
-- In real SAP each canonical object comes from a DIFFERENT OData service, run
-- on its own schedule (WBS from Enterprise Project, cost from a CO/journal API,
-- commitment from Purchasing, billing from Billing Document, RA from a CO CDS).
-- Tagging each sync run with the entity + the source endpoint lets the UI show
-- per-feed freshness and status instead of one combined number.

alter table sync_runs add column if not exists entity text;        -- wbs | cost | commitment | billing | results_analysis | tasks | resources
alter table sync_runs add column if not exists api_endpoint text;  -- the source OData service / connector the run pulled from
create index if not exists sync_runs_entity_idx on sync_runs(project_id, source_system, entity, started_at desc);

-- Exceptions are scoped to the object too, so syncing one API only clears /
-- requeues that object's exceptions (not the whole source's).
alter table sync_exceptions add column if not exists entity text;
