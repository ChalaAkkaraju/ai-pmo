-- =============================================================================
-- PMO LLM Demo — initial schema
-- =============================================================================
-- Creates the eight tables that hold the multi-project portfolio state,
-- the role definitions (with URL tokens), the agent output audit log,
-- and the cross-cutting portfolio patterns.
--
-- Row-Level Security is enabled and a single permissive policy per table is
-- created; finer-grained role-based slicing is handled in the application
-- layer for the MVP (the application reads the role token from the cookie
-- and applies the slicing). RLS is in place so production hardening only
-- requires policy refinement, not schema change.
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- On hosted Supabase, extensions may live in the `extensions` schema rather than
-- `public`, which isn't on the default search_path during `supabase db push`.
-- Add it so extension-provided types (e.g. pgvector's `vector`) resolve. (uuid
-- generation uses the built-in gen_random_uuid(), so it needs no extension.)
set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- Roles (3-5 colleagues, each with a unique URL token)
-- -----------------------------------------------------------------------------
create table roles (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  name text not null,
  role_type text not null check (
    role_type in ('pm', 'procurement', 'risk', 'sponsor', 'commercial')
  ),
  allowed_agents text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index roles_token_idx on roles(token);

-- -----------------------------------------------------------------------------
-- Projects (portfolio members — typically 4 active at a time)
-- -----------------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  client text not null,
  contract_value_initial numeric(15, 2) not null,
  contract_value_current numeric(15, 2) not null,
  approved_budget_initial numeric(15, 2) not null,
  approved_budget_current numeric(15, 2) not null,
  contingency numeric(15, 2) not null,
  segment text not null check (
    segment in ('renewables', 'water', 'industrial')
  ),
  status text not null default 'Active' check (
    status in ('Active', 'SC', 'Closed')
  ),
  current_week int not null default 0,
  hard_deadline_description text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Issues (the append-only issue log per project)
-- -----------------------------------------------------------------------------
create table issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  issue_id text not null,
  description text not null,
  category text not null,
  severity text not null check (severity in ('L', 'M', 'H')),
  owner text,
  status text not null default 'Open' check (
    status in ('Open', 'In progress', 'Resolved', 'Closed')
  ),
  linked_wbs text[] default '{}',
  linked_risk text,
  opened_week int not null,
  closed_week int,
  closure_narrative text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, issue_id)
);

create index issues_project_idx on issues(project_id);
create index issues_status_idx on issues(status);

-- -----------------------------------------------------------------------------
-- Risks (the project risk register)
-- -----------------------------------------------------------------------------
create table risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  risk_id text not null,
  category text not null,
  description text not null,
  probability text not null check (probability in ('L', 'M', 'H')),
  impact text not null check (impact in ('L', 'M', 'H')),
  score int not null,
  response text not null,
  owner text not null,
  trigger text not null,
  status text not null,
  cross_cutting_class text not null check (
    cross_cutting_class in (
      'Vendor / supplier concentration',
      'Regulatory / external deadline',
      'Site-conditions variance',
      'Resource / labour scarcity',
      'Client-driven scope or sequence changes',
      'Weather / climate-sensitive construction',
      'Project-specific'
    )
  ),
  pattern_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, risk_id)
);

create index risks_project_idx on risks(project_id);
create index risks_class_idx on risks(cross_cutting_class);

-- -----------------------------------------------------------------------------
-- Change orders (per project)
-- -----------------------------------------------------------------------------
create table change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  co_id text not null,
  driver text not null,
  scope_summary text not null,
  cost_impact_m numeric(10, 3) not null,
  revenue_impact_m numeric(10, 3) not null,
  schedule_impact_days int not null default 0,
  margin_realized_pct numeric(5, 2),
  status text not null check (
    status in ('Anticipated', 'Under analysis', 'Priced', 'Executed', 'Complete', 'Rejected')
  ),
  approval_routing text,
  executed_week int,
  four_frame_analysis jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, co_id)
);

create index change_orders_project_idx on change_orders(project_id);

-- -----------------------------------------------------------------------------
-- Variance reports (per project, per reporting cadence)
-- -----------------------------------------------------------------------------
create table variance_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  report_week int not null,
  cpi numeric(5, 3) not null,
  spi numeric(5, 3) not null,
  cost_variance_m numeric(10, 3) not null,
  schedule_variance_days int not null default 0,
  contingency_consumed_m numeric(10, 3) not null default 0,
  projected_margin_pct numeric(5, 2) not null,
  buffer_intact_days int,
  full_report_md text not null,
  created_at timestamptz not null default now(),
  unique (project_id, report_week)
);

create index variance_project_week_idx on variance_reports(project_id, report_week);

-- -----------------------------------------------------------------------------
-- Agent outputs (audit log of every agent invocation)
-- -----------------------------------------------------------------------------
create table agent_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  agent_type text not null,
  invoked_by_role_id uuid not null references roles(id),
  invoked_at timestamptz not null default now(),
  user_prompt text not null,
  input_payload jsonb not null,
  output_md text not null,
  tokens_used int,
  cost_usd numeric(10, 4),
  created_at timestamptz not null default now()
);

create index agent_outputs_project_idx on agent_outputs(project_id);
create index agent_outputs_role_idx on agent_outputs(invoked_by_role_id);
create index agent_outputs_invoked_idx on agent_outputs(invoked_at desc);

-- -----------------------------------------------------------------------------
-- Portfolio patterns (cross-cutting; not project-scoped)
-- -----------------------------------------------------------------------------
create table portfolio_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern_id text unique not null,
  name text not null,
  cross_cutting_class text not null,
  status text not null check (
    status in ('candidate', 'confirmed', 'firm-level standard')
  ),
  evidence_md text not null,
  threshold_projects int not null default 0,
  supporting_projects text[] not null default '{}',
  recommended_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Worked examples library (vectorised for semantic retrieval)
-- -----------------------------------------------------------------------------
create table worked_examples (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null,
  past_project text not null,
  artefact_name text not null,
  content_md text not null,
  -- pgvector embedding column. 1536 dims matches OpenAI / Voyage; tune later.
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (agent_type, past_project, artefact_name)
);

create index worked_examples_agent_idx on worked_examples(agent_type);

-- =============================================================================
-- Row-Level Security
-- =============================================================================
-- For the MVP, RLS is enabled with a single permissive policy per table.
-- Role-based slicing happens in the application layer because the role context
-- is conveyed by URL token rather than Supabase Auth. Production hardening
-- would tighten RLS policies once Supabase Auth is layered in (post-MVP).
-- =============================================================================

alter table roles enable row level security;
alter table projects enable row level security;
alter table issues enable row level security;
alter table risks enable row level security;
alter table change_orders enable row level security;
alter table variance_reports enable row level security;
alter table agent_outputs enable row level security;
alter table portfolio_patterns enable row level security;
alter table worked_examples enable row level security;

-- Allow reads via the anon key (RLS still enforced on writes via service role
-- only). Application layer reads role via token and does the slicing.
create policy "anon_read_roles" on roles for select using (true);
create policy "anon_read_projects" on projects for select using (true);
create policy "anon_read_issues" on issues for select using (true);
create policy "anon_read_risks" on risks for select using (true);
create policy "anon_read_change_orders" on change_orders for select using (true);
create policy "anon_read_variance_reports" on variance_reports for select using (true);
create policy "anon_read_agent_outputs" on agent_outputs for select using (true);
create policy "anon_read_portfolio_patterns" on portfolio_patterns for select using (true);
create policy "anon_read_worked_examples" on worked_examples for select using (true);

-- Writes are service-role only (route handlers + seed scripts).
-- No write policies for anon — RLS blocks by default.

-- =============================================================================
-- Realtime publication
-- =============================================================================
-- Subscribe to mutating tables so the UI updates across colleagues.
-- =============================================================================

alter publication supabase_realtime add table issues;
alter publication supabase_realtime add table risks;
alter publication supabase_realtime add table change_orders;
alter publication supabase_realtime add table variance_reports;
alter publication supabase_realtime add table agent_outputs;
alter publication supabase_realtime add table portfolio_patterns;
