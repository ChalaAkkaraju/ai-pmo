-- =============================================================================
-- 0020 — Phase 6 integration: sync runs + exception queue.
--
-- sync_runs       — one row per ingestion run (source, channel, counts, status).
-- sync_exceptions — records that could not be ingested (unmapped WBS, validation,
--                   conflict, orphaned WBS) — queued for human resolution, never
--                   silently dropped.
--
-- Run via: Supabase Dashboard -> SQL Editor -> paste -> Run. Idempotent.
-- =============================================================================

create table if not exists sync_runs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  source_system text not null check (source_system in ('SAP_PS', 'DATAVERSE', 'P6')),
  channel text not null default 'api' check (channel in ('api', 'file', 'manual')),
  status text not null default 'success' check (status in ('success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_inserted int not null default 0,
  rows_updated int not null default 0,
  rows_skipped int not null default 0,
  exceptions int not null default 0,
  message text
);
create index if not exists sync_runs_project_idx on sync_runs(project_id, started_at desc);
create index if not exists sync_runs_source_idx on sync_runs(source_system, started_at desc);

create table if not exists sync_exceptions (
  id uuid primary key default uuid_generate_v4(),
  sync_run_id uuid references sync_runs(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  source_system text not null,
  kind text not null check (kind in ('unmapped_wbs', 'validation', 'conflict', 'orphaned_wbs')),
  external_id text,
  reason text not null,
  payload jsonb,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  created_at timestamptz not null default now()
);
create index if not exists sync_exceptions_status_idx on sync_exceptions(status, created_at desc);
create index if not exists sync_exceptions_project_idx on sync_exceptions(project_id);
