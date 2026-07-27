-- =============================================================================
-- PMO LLM — migration 0017: canonical model + provenance (integration backbone)
-- =============================================================================
-- Phase 0 of the Integration & Build Roadmap. Introduces the structured,
-- ingestion-shaped tables the synthesis layer reads, each row tagged with its
-- system of record. Mirrored rows are treated as READ-ONLY in the app; only
-- the ingestion layer (later, Phase 6) writes them. App-native rows
-- (is_app_native = true, source_system = 'APP') are the ones the app itself
-- creates today.
--
--   source_system : 'APP' | 'SAP_PS' | 'MS_PROJECT' | 'P6'
--   external_id   : the id in the source system (for idempotent sync)
--   synced_at     : when the row was last refreshed from its source
--
-- Join key: tasks.wbs_code and cost_actuals.wbs_code link to
-- work_packages.wbs_code — SAP cost (per WBS) meets scheduler progress (per
-- task) to make earned value possible.
--
-- Run via: Supabase Dashboard -> SQL Editor -> paste -> Run. Idempotent.
-- =============================================================================

-- Work packages — the WBS (scope), sourced from SAP PS.
create table if not exists work_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_code text not null,
  parent_wbs_code text,
  name text not null,
  responsible_role_type text,
  is_billing_element boolean not null default false,
  budget_bac numeric(15, 2),
  target_finish date,
  source_system text not null default 'APP' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  is_app_native boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, wbs_code)
);
create index if not exists work_packages_project_idx on work_packages(project_id);
create index if not exists work_packages_wbs_idx on work_packages(project_id, wbs_code);

-- Tasks — schedule activities, sourced from the scheduler (Microsoft Project / P6).
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  work_package_id uuid references work_packages(id) on delete set null,
  wbs_code text,
  name text not null,
  start_date date,
  finish_date date,
  duration_days int,
  percent_complete numeric(5, 2) not null default 0,
  predecessors text,
  is_critical boolean not null default false,
  owner_role_type text,
  source_system text not null default 'APP' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  is_app_native boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists tasks_project_idx on tasks(project_id);
create index if not exists tasks_wp_idx on tasks(work_package_id);
create index if not exists tasks_wbs_idx on tasks(project_id, wbs_code);

-- Milestones — contractual / key dates.
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  work_package_id uuid references work_packages(id) on delete set null,
  name text not null,
  due_date date,
  is_contractual boolean not null default false,
  achieved boolean not null default false,
  achieved_date date,
  source_system text not null default 'APP' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists milestones_project_idx on milestones(project_id);

-- Cost actuals — per WBS, by period, sourced from SAP PS (the money).
create table if not exists cost_actuals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_code text not null,
  period date not null,
  actual_cost numeric(15, 2) not null default 0,
  commitment numeric(15, 2) not null default 0,
  planned_value numeric(15, 2),
  source_system text not null default 'SAP_PS' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cost_actuals_project_idx on cost_actuals(project_id);
create index if not exists cost_actuals_wbs_idx on cost_actuals(project_id, wbs_code, period);

-- Resource assignments — from the scheduler (visibility, not levelling).
create table if not exists resource_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  resource_name text not null,
  resource_role text,
  period date,
  planned_work_hours numeric(12, 2),
  allocation_pct numeric(5, 2),
  source_system text not null default 'APP' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists resource_assignments_project_idx on resource_assignments(project_id);
create index if not exists resource_assignments_task_idx on resource_assignments(task_id);

-- Provenance on the existing projects table.
alter table projects add column if not exists source_system text not null default 'APP';
alter table projects add column if not exists external_id text;
alter table projects add column if not exists last_synced_at timestamptz;

-- RLS on (service-role only; the ingestion layer and server routes write).
alter table work_packages enable row level security;
alter table tasks enable row level security;
alter table milestones enable row level security;
alter table cost_actuals enable row level security;
alter table resource_assignments enable row level security;
