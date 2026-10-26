-- PRODUCTION promotion: IT (0045-0049), R&D (0050), Capital (0051), demo role switcher (0052).
-- Additive only (new tables / columns / rows; widened checks). Safe to run more than once:
-- widened checks are added NOT VALID so a re-run never trips on rows a later section inserted.
-- Paste into the PRODUCTION project's SQL editor and Run.

-- ===== 0045_project_types_and_it.sql =====
-- =============================================================================
-- PMO LLM — migration 0045: project types, stage templates, sanction events,
--                            portfolio allocations, IT roles
-- =============================================================================
-- First foundation step for extending AI PMO beyond customer revenue projects
-- (proposal: AI-PMO-Multi-Project-Type-Proposal.docx §4.2). Pulled in by the
-- IT PMO workspace build; Capital and R&D reuse every object added here.
--
-- Design rules:
--   • Additive only. Revenue projects keep every existing column and default to
--     project_type = 'revenue', so nothing in the revenue product changes.
--   • One shared canonical model, discriminated by project_type. Workspaces
--     differ; storage does not.
--   • sanction_events is the unifying abstraction: a dated, versioned record of
--     what was authorised (contract value / waterline envelope / SG1 baseline /
--     AFE / gate budget). Revenue contract values are mirrored in as v1/v2;
--     the projects.contract_value_* columns are kept and remain the source the
--     existing code reads.
--   • stage_templates are reference data keyed (project_type, category); the
--     commit gate (scope + budget + accounting treatment locked) is a named
--     role in every template so portfolio reporting sees only pre-commit /
--     committed regardless of how many stages a category has.
--
-- Run via: Supabase Dashboard -> SQL Editor -> paste -> Run. Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. projects: type discriminator and portfolio / lifecycle columns
-- ---------------------------------------------------------------------------
alter table projects add column if not exists project_type text not null default 'revenue';
alter table projects drop constraint if exists projects_project_type_check;
alter table projects add constraint projects_project_type_check
  check (project_type in ('revenue', 'it', 'capital', 'rnd')) not valid;

-- One level below project_type (IT: design_development / deployment /
-- maintenance_upgrade; capital and R&D categories arrive with their phases).
alter table projects add column if not exists project_category text;

-- Portfolio bucket (IT: business-technology bucket; capital: lane; R&D: platform).
alter table projects add column if not exists portfolio_bucket text;

-- Fiscal year the project was submitted for, and the years it is approved for
-- (IT budgets are approved by year; multi-year projects re-seek continuation).
alter table projects add column if not exists fiscal_year int;
alter table projects add column if not exists fiscal_years_approved int[] not null default '{}';

-- Portfolio lifecycle, distinct from the delivery `status` (Active/SC/Closed)
-- the revenue product already uses.
alter table projects add column if not exists lifecycle_status text not null default 'active';
alter table projects drop constraint if exists projects_lifecycle_status_check;
alter table projects add constraint projects_lifecycle_status_check
  check (lifecycle_status in ('proposed', 'approved', 'deferred', 'active', 'on_hold', 'cancelled', 'closed')) not valid;

-- Stage-gate position (template chosen by category; seq into its stages[]).
alter table projects add column if not exists stage_template_id uuid;
alter table projects add column if not exists current_stage int;

-- For a project re-submitted in a later fiscal year (continuation).
alter table projects add column if not exists continuation_of_id uuid references projects(id) on delete set null;

-- Business case as submitted (value_type, roi_pct, payback_months,
-- strategic_score, benefit_summary, ...). Versioned copies are recorded as
-- sanction_events / gate_decisions; this is the current one.
alter table projects add column if not exists business_case jsonb;
alter table projects add column if not exists requested_budget numeric(15, 2);

-- Non-revenue projects have no segment. Keep the check for the values that
-- exist; allow NULL.
alter table projects alter column segment drop not null;

create index if not exists projects_type_idx on projects(project_type);
create index if not exists projects_type_fy_bucket_idx on projects(project_type, fiscal_year, portfolio_bucket);

-- ---------------------------------------------------------------------------
-- 2. stage_templates — gates per category; the commit gate is a named role
-- ---------------------------------------------------------------------------
create table if not exists stage_templates (
  id uuid primary key default gen_random_uuid(),
  project_type text not null check (project_type in ('revenue', 'it', 'capital', 'rnd')),
  category text not null,
  name text not null,
  description text,
  -- [{ seq, key, name, gate_name, is_commit, exit_criteria: [text], attendees: [text] }]
  stages jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_type, category)
);

alter table projects drop constraint if exists projects_stage_template_fk;
alter table projects add constraint projects_stage_template_fk
  foreign key (stage_template_id) references stage_templates(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. gate_decisions — one row per gate outcome on a project
-- ---------------------------------------------------------------------------
create table if not exists gate_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  stage_seq int not null,
  gate_name text not null,
  decision text not null check (decision in ('go', 'hold', 'kill', 'recycle', 'defer')),
  decided_on date not null default current_date,
  decided_by text,
  decided_by_role_type text,
  -- { must_meet: [{criterion, met}], should_meet: [{criterion, score}] }
  criteria_scores jsonb,
  -- Case values as re-underwritten at this gate (R&D) or confirmed (IT SG1).
  case_snapshot jsonb,
  notes text,
  source_system text not null default 'APP',
  external_id text,
  created_by_output_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists gate_decisions_project_idx on gate_decisions(project_id, stage_seq);

-- ---------------------------------------------------------------------------
-- 4. portfolio_allocations — fiscal year × bucket envelope and reserve
-- ---------------------------------------------------------------------------
create table if not exists portfolio_allocations (
  id uuid primary key default gen_random_uuid(),
  project_type text not null check (project_type in ('it', 'capital', 'rnd')),
  fiscal_year int not null,
  bucket text not null,
  allocated_amount numeric(15, 2) not null default 0,
  reserve_amount numeric(15, 2) not null default 0,
  -- Mandatory lanes (compliance) are ranked on cost-effectiveness, not ROI.
  is_mandatory_lane boolean not null default false,
  priority int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_type, fiscal_year, bucket)
);

-- ---------------------------------------------------------------------------
-- 5. sanction_events — what was authorised, by whom, when, for how much
-- ---------------------------------------------------------------------------
create table if not exists sanction_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in (
    'contract_value',      -- revenue: signed contract value (versioned by change orders)
    'waterline_envelope',  -- IT: fiscal-year envelope granted at the portfolio waterline
    'sg1_baseline',        -- IT: scope + budget locked at Stage Gate 1
    'continuation',        -- IT: next-fiscal-year slice re-approved
    'afe',                 -- capital: full-funds appropriation
    'supplementary_afe',   -- capital: AFE increase
    'gate_budget'          -- R&D: next-stage budget released at a gate
  )),
  version int not null default 1,
  amount numeric(15, 2) not null,
  fiscal_year int,
  authorised_by text,
  authorised_on date,
  document_ref text,
  notes text,
  source_system text not null default 'APP',
  external_id text,
  created_at timestamptz not null default now(),
  unique (project_id, kind, version)
);
create index if not exists sanction_events_project_idx on sanction_events(project_id);

-- Mirror existing revenue contract values so the abstraction is populated from
-- day one. v1 = initial; v2 = current when it differs. Idempotent.
insert into sanction_events (project_id, kind, version, amount, authorised_on, notes, source_system)
select p.id, 'contract_value', 1, p.contract_value_initial, p.created_at::date, 'Initial contract value (mirrored from projects)', 'APP'
from projects p
where p.project_type = 'revenue'
  and not exists (select 1 from sanction_events s where s.project_id = p.id and s.kind = 'contract_value' and s.version = 1);

insert into sanction_events (project_id, kind, version, amount, authorised_on, notes, source_system)
select p.id, 'contract_value', 2, p.contract_value_current, current_date, 'Current contract value after approved change orders (mirrored from projects)', 'APP'
from projects p
where p.project_type = 'revenue'
  and p.contract_value_current <> p.contract_value_initial
  and not exists (select 1 from sanction_events s where s.project_id = p.id and s.kind = 'contract_value' and s.version = 2);

-- ---------------------------------------------------------------------------
-- 6. change_orders — where the money for a change comes from
-- ---------------------------------------------------------------------------
-- Revenue change orders are customer-funded. IT change orders are zero-sum
-- inside the bucket, so routing follows consequence: project contingency ->
-- sponsor; bucket reserve -> bucket owner; displacing another project -> board.
alter table change_orders add column if not exists funding_source text;
alter table change_orders drop constraint if exists change_orders_funding_source_check;
alter table change_orders add constraint change_orders_funding_source_check
  check (funding_source is null or funding_source in (
    'customer', 'project_contingency', 'bucket_reserve', 'displacement', 'supplementary_afe'
  )) not valid;

-- ---------------------------------------------------------------------------
-- 7. source systems — the external planning tools join on the SAP reference
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['work_packages', 'tasks', 'milestones', 'cost_actuals', 'resource_assignments',
                           'purchase_orders', 'billing_events', 'results_analysis', 'forecast_snapshots']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I drop constraint if exists %I', t, t || '_source_system_check');
      execute format(
        'alter table %I add constraint %I check (source_system in (''APP'',''SAP_PS'',''MS_PROJECT'',''P6'',''SOPHEON'',''ECOSYS'',''ACCOLADE'',''CORA''))',
        t, t || '_source_system_check');
    end if;
  end loop;
end $$;

alter table sync_runs drop constraint if exists sync_runs_source_system_check;
alter table sync_runs add constraint sync_runs_source_system_check
  check (source_system in ('SAP_PS', 'MS_PROJECT', 'P6', 'SOPHEON', 'ECOSYS', 'ACCOLADE', 'CORA')) not valid;

-- ---------------------------------------------------------------------------
-- 8. roles — IT role types and a project_type scope
-- ---------------------------------------------------------------------------
-- NULL means "the default for this role type" (lib/roles.ts DEFAULT_ROLE_PROJECT_TYPES),
-- so roles created later through the admin screen scope correctly without
-- the screen knowing about workspaces. Set explicitly to override.
alter table roles add column if not exists project_types text[];

alter table roles drop constraint if exists roles_role_type_check;
alter table roles add constraint roles_role_type_check
  check (role_type in (
    'pm', 'procurement', 'risk', 'sponsor', 'commercial',
    'project_controls', 'program_manager', 'engineering_manager',
    'construction_manager', 'hse_manager', 'admin',
    'it_portfolio_manager', 'it_pm'
  )) not valid;

insert into roles (name, role_type, project_types, allowed_agents)
select 'Priya Raman', 'it_portfolio_manager', '{it}',
       '{business_case_reviewer,waterline_ranker,gate_reviewer,continuation_reviewer,change_order_reviewer,portfolio_risk_reviewer,status_reporter,risk_analyst,issue_logger}'
where not exists (select 1 from roles where role_type = 'it_portfolio_manager');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Daniel Osei', 'it_pm', '{it}',
       '{charter_drafter,stakeholder_analyst,wbs_builder,schedule_reasoner,budget_builder,communications_planner,issue_logger,risk_analyst,gate_reviewer,change_order_reviewer,status_reporter,lessons_learned_synthesiser,closeout_reporter}'
where not exists (select 1 from roles where role_type = 'it_pm');

-- ---------------------------------------------------------------------------
-- 9. IT stage templates (reference data)
-- ---------------------------------------------------------------------------
insert into stage_templates (project_type, category, name, description, stages)
select 'it', 'design_development', 'Design & development',
       'New capability built or configured in-house or with a partner. Scope and budget lock at Define (Stage Gate 1).',
       '[
         {"seq":0,"key":"discover","name":"Discover","gate_name":"Stage Gate 0","is_commit":false,
          "exit_criteria":["Charter drafted","Problem and outcome stated","Discovery allowance approved"],"attendees":["Sponsor","IT PMO"]},
         {"seq":1,"key":"define","name":"Define","gate_name":"Stage Gate 1 (commit)","is_commit":true,
          "exit_criteria":["Detailed scope confirmed","Bottom-up estimate verified","Capital vs expense split agreed with Finance","Technical feasibility confirmed","Resource plan committed","Benefits owner named"],"attendees":["Sponsor","IT PMO","Finance"]},
         {"seq":2,"key":"design","name":"Design","gate_name":"Design review","is_commit":false,
          "exit_criteria":["Solution design approved","Security and architecture review passed"],"attendees":["Sponsor","IT PMO","Architecture"]},
         {"seq":3,"key":"build","name":"Build","gate_name":"Build complete","is_commit":false,
          "exit_criteria":["Build complete against design","Unit and integration tests passed"],"attendees":["Sponsor","IT PMO"]},
         {"seq":4,"key":"test","name":"Test","gate_name":"Test sign-off","is_commit":false,
          "exit_criteria":["UAT signed off","Defects within tolerance","Cut-over plan approved"],"attendees":["Sponsor","IT PMO","Business owner"]},
         {"seq":5,"key":"deploy","name":"Deploy","gate_name":"Go-live","is_commit":false,
          "exit_criteria":["Deployed to production","Hypercare complete","Handover to support accepted"],"attendees":["Sponsor","IT PMO","Operations"]},
         {"seq":6,"key":"close","name":"Close","gate_name":"Closure","is_commit":false,
          "exit_criteria":["AuC settled to fixed assets / expense posted","Lessons learned recorded","Benefits tracking started"],"attendees":["Sponsor","Finance","IT PMO"]}
       ]'::jsonb
where not exists (select 1 from stage_templates where project_type = 'it' and category = 'design_development');

insert into stage_templates (project_type, category, name, description, stages)
select 'it', 'deployment', 'Deployment / rollout',
       'Installing or rolling out an existing capability. Scope and budget lock at Plan (Stage Gate 1).',
       '[
         {"seq":0,"key":"plan","name":"Plan","gate_name":"Stage Gate 1 (commit)","is_commit":true,
          "exit_criteria":["Rollout scope and sites confirmed","Estimate verified","Capital vs expense split agreed with Finance","Change-management plan approved"],"attendees":["Sponsor","IT PMO","Finance"]},
         {"seq":1,"key":"pilot","name":"Pilot","gate_name":"Pilot approval","is_commit":false,
          "exit_criteria":["Pilot success criteria met","Rollout plan confirmed"],"attendees":["Sponsor","IT PMO","Business owner"]},
         {"seq":2,"key":"rollout","name":"Rollout","gate_name":"Rollout complete","is_commit":false,
          "exit_criteria":["All sites / users migrated","Legacy decommission scheduled"],"attendees":["Sponsor","IT PMO"]},
         {"seq":3,"key":"stabilise","name":"Stabilise","gate_name":"Stabilisation sign-off","is_commit":false,
          "exit_criteria":["Support handover accepted","Incident rate within tolerance"],"attendees":["Sponsor","IT PMO","Operations"]},
         {"seq":4,"key":"close","name":"Close","gate_name":"Closure","is_commit":false,
          "exit_criteria":["AuC settled / expense posted","Lessons learned recorded","Benefits tracking started"],"attendees":["Sponsor","Finance","IT PMO"]}
       ]'::jsonb
where not exists (select 1 from stage_templates where project_type = 'it' and category = 'deployment');

insert into stage_templates (project_type, category, name, description, stages)
select 'it', 'maintenance_upgrade', 'Maintenance / upgrade',
       'Fixing or improving an existing system. Scope and budget lock at Assess (Stage Gate 1).',
       '[
         {"seq":0,"key":"assess","name":"Assess","gate_name":"Stage Gate 1 (commit)","is_commit":true,
          "exit_criteria":["Current-state assessment complete","Scope and estimate confirmed","Capital vs expense split agreed with Finance"],"attendees":["Sponsor","IT PMO","Finance"]},
         {"seq":1,"key":"plan","name":"Plan","gate_name":"Plan approval","is_commit":false,
          "exit_criteria":["Implementation plan approved","Downtime window agreed"],"attendees":["Sponsor","IT PMO"]},
         {"seq":2,"key":"implement","name":"Implement","gate_name":"Implementation complete","is_commit":false,
          "exit_criteria":["Upgrade applied","Regression tests passed"],"attendees":["Sponsor","IT PMO"]},
         {"seq":3,"key":"validate","name":"Validate","gate_name":"Validation sign-off","is_commit":false,
          "exit_criteria":["Business validation complete","Support handover accepted"],"attendees":["Sponsor","IT PMO","Operations"]},
         {"seq":4,"key":"close","name":"Close","gate_name":"Closure","is_commit":false,
          "exit_criteria":["Expense / AuC posted","Lessons learned recorded"],"attendees":["Sponsor","Finance","IT PMO"]}
       ]'::jsonb
where not exists (select 1 from stage_templates where project_type = 'it' and category = 'maintenance_upgrade');

-- ---------------------------------------------------------------------------
-- 10. RLS — same posture as migration 0039 for the new tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['stage_templates', 'gate_decisions', 'portfolio_allocations', 'sanction_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_read_' || t, t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', 'authenticated_read_' || t, t);
    execute format('revoke select on public.%I from anon', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- ===== 0046_it_governance.sql =====
-- =============================================================================
-- PMO LLM — migration 0046: governance (decision bodies, authority matrix,
--                            decision records), holds, resource displacement,
--                            benefits realisation, further IT roles
-- =============================================================================
-- Best-practice IT governance, independent of any one company:
--   • Funding authority, delivery authority and administration are held by
--     different people. The PMO proposes and records; a governance body
--     decides; the sponsor and gatekeepers deliver.
--   • A delegation-of-authority matrix maps (decision kind × amount band ×
--     funding source) to the body that must decide and the concurrences that
--     must be recorded first (Finance on the capital/expense split at the
--     commit gate; architecture at the design gate).
--   • Every funding decision is a two-step record: proposed → decided, with
--     attendees, conditions and minutes; the resulting sanction event or gate
--     decision links back to it.
--   • Holds are time-boxed. Displacement of shared people between project
--     types is logged, not absorbed. Benefits are reported after close.
--
-- Additive; revenue projects are untouched. Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Roles — the rest of the IT governance cast
-- ---------------------------------------------------------------------------
alter table roles drop constraint if exists roles_role_type_check;
alter table roles add constraint roles_role_type_check
  check (role_type in (
    'pm', 'procurement', 'risk', 'sponsor', 'commercial',
    'project_controls', 'program_manager', 'engineering_manager',
    'construction_manager', 'hse_manager', 'admin',
    'it_portfolio_manager', 'it_pm', 'it_sponsor', 'it_bucket_owner', 'it_board_member', 'it_finance'
  )) not valid;

insert into roles (name, role_type, project_types, allowed_agents)
select 'Alex Chen', 'it_board_member', '{it}', '{waterline_ranker,business_case_reviewer,continuation_reviewer,gate_reviewer,portfolio_risk_reviewer,status_reporter}'
where not exists (select 1 from roles where role_type = 'it_board_member');
insert into roles (name, role_type, project_types, allowed_agents)
select 'Sam Whitaker', 'it_bucket_owner', '{it}', '{waterline_ranker,business_case_reviewer,continuation_reviewer,gate_reviewer,change_order_reviewer,risk_analyst,issue_logger,status_reporter}'
where not exists (select 1 from roles where role_type = 'it_bucket_owner');
insert into roles (name, role_type, project_types, allowed_agents)
select 'Elena Novak', 'it_sponsor', '{it}', '{business_case_reviewer,gate_reviewer,change_order_reviewer,status_reporter,risk_analyst,issue_logger}'
where not exists (select 1 from roles where role_type = 'it_sponsor');
insert into roles (name, role_type, project_types, allowed_agents)
select 'Maria Lopez', 'it_finance', '{it}', '{business_case_reviewer,continuation_reviewer,gate_reviewer,cost_controller}'
where not exists (select 1 from roles where role_type = 'it_finance');

-- ---------------------------------------------------------------------------
-- 2. Decision bodies and membership
-- ---------------------------------------------------------------------------
create table if not exists decision_bodies (
  id uuid primary key default gen_random_uuid(),
  project_type text not null check (project_type in ('revenue', 'it', 'capital', 'rnd')),
  key text not null,                    -- investment_board | cio | bucket_owner:<bucket> | sponsor | finance | architecture
  name text not null,
  description text,
  quorum int not null default 1,
  -- A "role-type body": any signed-in user of this role type is a member
  -- (used for sponsor / finance). NULL = explicit membership only.
  member_role_type text,
  created_at timestamptz not null default now(),
  unique (project_type, key)
);

create table if not exists decision_body_members (
  id uuid primary key default gen_random_uuid(),
  body_id uuid not null references decision_bodies(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  is_chair boolean not null default false,
  is_voting boolean not null default true,
  created_at timestamptz not null default now(),
  unique (body_id, role_id)
);

-- ---------------------------------------------------------------------------
-- 3. Authority matrix — who decides what, by amount band and funding source
-- ---------------------------------------------------------------------------
create table if not exists authority_matrix (
  id uuid primary key default gen_random_uuid(),
  project_type text not null check (project_type in ('revenue', 'it', 'capital', 'rnd')),
  decision_kind text not null check (decision_kind in (
    'envelope_allocation',  -- the fiscal-year split by bucket and the reserves
    'waterline_approval',   -- granting a fiscal-year envelope to a project
    'continuation',         -- next-year slice for a running project
    'commit_baseline',      -- locking scope/budget at the commit gate
    'change_order',         -- a change after commit (by funding source)
    'reserve_draw',         -- in-year urgent draw on a bucket reserve
    'hold',                 -- putting a project on hold
    'cancel'                -- cancelling a project (pre- or post-commit)
  )),
  funding_source text,      -- change_order only: project_contingency | bucket_reserve | displacement
  post_commit boolean,      -- hold/cancel: NULL = either
  min_amount numeric(15, 2) not null default 0,
  max_amount numeric(15, 2),            -- NULL = no upper bound
  required_body_key text not null,      -- decision_bodies.key (bucket_owner:* resolves to the project's bucket)
  required_concurrences text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists authority_matrix_lookup_idx on authority_matrix(project_type, decision_kind);

-- ---------------------------------------------------------------------------
-- 4. Decision records — proposed → decided, with concurrences
-- ---------------------------------------------------------------------------
create table if not exists decision_records (
  id uuid primary key default gen_random_uuid(),
  project_type text not null check (project_type in ('revenue', 'it', 'capital', 'rnd')),
  decision_kind text not null,
  project_id uuid references projects(id) on delete cascade,   -- NULL for portfolio-level decisions
  fiscal_year int,
  amount numeric(15, 2),
  title text not null,
  -- What is being proposed (allocations, waterline rows, gate seq + criteria, change order id, ...).
  proposal jsonb not null default '{}',
  proposed_by_role_id uuid references roles(id) on delete set null,
  proposed_by_name text,
  proposed_at timestamptz not null default now(),
  required_body_key text not null,
  required_concurrences text[] not null default '{}',
  -- [{ body_key, outcome: 'concur'|'object', by_name, by_role_id, at, notes }]
  concurrences jsonb not null default '[]',
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'returned', 'withdrawn')),
  decided_body_key text,
  decided_by_role_id uuid references roles(id) on delete set null,
  decided_by_name text,
  decided_at timestamptz,
  attendees text[] not null default '{}',
  conditions text,
  minutes text,
  resulting_sanction_event_id uuid,
  resulting_gate_decision_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists decision_records_project_idx on decision_records(project_id);
create index if not exists decision_records_status_idx on decision_records(project_type, status);

-- Link the operational records back to the decision that authorised them.
alter table sanction_events add column if not exists decision_record_id uuid references decision_records(id) on delete set null;
alter table sanction_events add column if not exists authorised_by_body text;
alter table gate_decisions add column if not exists decision_record_id uuid references decision_records(id) on delete set null;
alter table gate_decisions add column if not exists hold_until date;   -- time box for a hold
alter table portfolio_allocations add column if not exists status text not null default 'approved' check (status in ('draft', 'proposed', 'approved'));
alter table portfolio_allocations add column if not exists decision_record_id uuid references decision_records(id) on delete set null;
alter table change_orders add column if not exists decision_record_id uuid references decision_records(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. Resource displacement log — the R&D / IT ↔ Revenue seam
-- ---------------------------------------------------------------------------
create table if not exists resource_displacements (
  id uuid primary key default gen_random_uuid(),
  from_project_id uuid not null references projects(id) on delete cascade,
  to_project_id uuid references projects(id) on delete set null,
  to_project_code text,                 -- kept even if the target is not in the app
  resource_name text not null,
  skill text,
  from_date date not null,
  to_date date,                         -- NULL = still displaced
  fte numeric(4, 2) not null default 1.0,
  schedule_impact_days int,
  reason text not null check (reason in ('revenue_ld_exposure', 'revenue_priority', 'incident', 'other')),
  notes text,
  logged_by_role_id uuid references roles(id) on delete set null,
  logged_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists resource_displacements_from_idx on resource_displacements(from_project_id);

-- ---------------------------------------------------------------------------
-- 6. Benefits realisation — reported by the benefits owner after close
-- ---------------------------------------------------------------------------
create table if not exists benefits_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  period text not null,                 -- e.g. 2026-Q4
  planned_benefit numeric(15, 2) not null default 0,
  realised_benefit numeric(15, 2) not null default 0,
  commentary text,
  reported_by text,
  reported_at timestamptz not null default now(),
  unique (project_id, period)
);

-- ---------------------------------------------------------------------------
-- 7. IT decision bodies (reference data; members are attached by the seed)
-- ---------------------------------------------------------------------------
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'investment_board', 'IT investment board', 'CIO (chair), Finance controller and bucket owners. Owns the envelope, the waterline, continuations, post-commit cancellations and displacing change orders.', 3, null
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'investment_board');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'cio', 'CIO', 'Delegated authority between the bucket-owner limit and the board threshold; in-year reserve draws within limit.', 1, null
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'cio');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'bucket_owner:infrastructure', 'Bucket owner — Infrastructure', 'Accountable for the Infrastructure bucket: ranks within it, approves within delegation.', 1, null
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'bucket_owner:infrastructure');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'bucket_owner:applications', 'Bucket owner — Applications', 'Accountable for the Applications bucket.', 1, null
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'bucket_owner:applications');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'bucket_owner:security', 'Bucket owner — Security', 'Accountable for the Security bucket.', 1, null
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'bucket_owner:security');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'bucket_owner:compliance', 'Bucket owner — Compliance', 'Accountable for the Compliance lane (ranked on cost-to-comply and deadline).', 1, null
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'bucket_owner:compliance');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'sponsor', 'Project sponsor', 'The business executive who owns the benefit. Decides inside the locked baseline (contingency, hold requests) and chairs the later gates. Cannot approve their own funding.', 1, 'it_sponsor'
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'sponsor');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'finance', 'Finance', 'Concurrence, not approval: business-case numbers before ranking and the capital / expense split at the commit gate.', 1, 'it_finance'
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'finance');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'it', 'architecture', 'Architecture & security review', 'Concurrence at the design gate.', 1, null
where not exists (select 1 from decision_bodies where project_type = 'it' and key = 'architecture');

-- ---------------------------------------------------------------------------
-- 8. IT authority matrix (defaults; edit rows to change thresholds)
-- ---------------------------------------------------------------------------
insert into authority_matrix (project_type, decision_kind, funding_source, post_commit, min_amount, max_amount, required_body_key, required_concurrences, notes)
select * from (values
  ('it', 'envelope_allocation', null, null, 0::numeric, null::numeric, 'investment_board', '{finance}'::text[], 'The split of the IT envelope by bucket and the reserves are always a board decision.'),
  ('it', 'waterline_approval',  null, null, 0,        500000,          'bucket_owner:*',   '{}',                'Small projects: the bucket owner grants the envelope within delegation.'),
  ('it', 'waterline_approval',  null, null, 500000,   2000000,         'cio',              '{}',                'Mid-band: CIO.'),
  ('it', 'waterline_approval',  null, null, 2000000,  null,            'investment_board', '{}',                'Above the board threshold, or strategic.'),
  ('it', 'continuation',        null, null, 0,        500000,          'bucket_owner:*',   '{finance}',         'Next-year slice judged on cost-to-complete vs remaining benefit; Finance confirms the numbers.'),
  ('it', 'continuation',        null, null, 500000,   2000000,         'cio',              '{finance}',         null),
  ('it', 'continuation',        null, null, 2000000,  null,            'investment_board', '{finance}',         null),
  ('it', 'commit_baseline',     null, null, 0,        500000,          'bucket_owner:*',   '{finance}',         'Finance must concur on the capital / expense split before any commit-gate Go.'),
  ('it', 'commit_baseline',     null, null, 500000,   2000000,         'cio',              '{finance}',         null),
  ('it', 'commit_baseline',     null, null, 2000000,  null,            'investment_board', '{finance}',         null),
  ('it', 'change_order',        'project_contingency', null, 0, null,  'sponsor',          '{}',                'Within the project''s own contingency the sponsor decides.'),
  ('it', 'change_order',        'bucket_reserve',      null, 0, 250000,'bucket_owner:*',   '{}',                'Drawing on the bucket reserve within the owner''s delegation.'),
  ('it', 'change_order',        'bucket_reserve',      null, 250000, null, 'cio',          '{}',                'Reserve draw above the owner''s delegation.'),
  ('it', 'change_order',        'displacement',        null, 0, null,  'investment_board', '{}',                'A change that would displace another project is a portfolio decision.'),
  ('it', 'reserve_draw',        null, null, 0,        500000,          'cio',              '{}',                'Urgent in-year need funded from reserve; board notified retrospectively.'),
  ('it', 'reserve_draw',        null, null, 500000,   null,            'investment_board', '{}',                null),
  ('it', 'hold',                null, false, 0,       null,            'sponsor',          '{}',                'Pre-commit hold: sponsor, time-boxed.'),
  ('it', 'hold',                null, true,  0,       null,            'bucket_owner:*',   '{}',                'Post-commit hold: bucket owner, time-boxed (two quarters max).'),
  ('it', 'cancel',              null, false, 0,       null,            'bucket_owner:*',   '{}',                'Cancelling before commit is cheap and should be normal.'),
  ('it', 'cancel',              null, true,  0,       null,            'investment_board', '{finance}',         'Cancelling after commit is an asset write-off decision: Finance concurs on AuC settlement.')
) as v(project_type, decision_kind, funding_source, post_commit, min_amount, max_amount, required_body_key, required_concurrences, notes)
where not exists (select 1 from authority_matrix where project_type = 'it');

-- ---------------------------------------------------------------------------
-- 9. RLS — same posture as 0039 / 0045
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['decision_bodies', 'decision_body_members', 'authority_matrix', 'decision_records', 'resource_displacements', 'benefits_reports']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_read_' || t, t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', 'authenticated_read_' || t, t);
    execute format('revoke select on public.%I from anon', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- ===== 0047_gate_resume.sql =====
-- 0047: a hold can be lifted early by the authority that placed it.
-- Adds 'resume' to the gate-decision vocabulary (recorded against the held stage).
alter table gate_decisions drop constraint if exists gate_decisions_decision_check;
alter table gate_decisions add constraint gate_decisions_decision_check
  check (decision in ('go', 'hold', 'kill', 'recycle', 'defer', 'resume')) not valid;

-- ===== 0048_displacement_reasons.sql =====
-- 0048: resource displacement is a general mechanism, not an IT ↔ Revenue one.
-- In IT the usual causes are incidents / run work, a higher-priority IT project,
-- or an audit. Revenue priority stays available for organisations that do share
-- people across PMOs (the R&D ↔ Revenue seam later).
alter table resource_displacements drop constraint if exists resource_displacements_reason_check;
alter table resource_displacements add constraint resource_displacements_reason_check
  check (reason in ('incident_run', 'higher_priority_project', 'audit_compliance', 'revenue_priority', 'revenue_ld_exposure', 'incident', 'other')) not valid;
update resource_displacements set reason = 'incident_run' where reason = 'incident';

-- ===== 0049_portfolio_executive.sql =====
-- 0049: the Portfolio Executive — the CFO's office / head of portfolio. Reads across
-- every project type (the cross-type layer at /portfolio/enterprise), writes nothing,
-- and carries only executive agents. Idempotent.
alter table roles drop constraint if exists roles_role_type_check;
alter table roles add constraint roles_role_type_check
  check (role_type in (
    'pm', 'procurement', 'risk', 'sponsor', 'commercial',
    'project_controls', 'program_manager', 'engineering_manager',
    'construction_manager', 'hse_manager', 'admin',
    'it_portfolio_manager', 'it_pm', 'it_sponsor', 'it_bucket_owner', 'it_board_member', 'it_finance',
    'portfolio_executive'
  )) not valid;

insert into roles (name, role_type, project_types, allowed_agents)
select 'Dana Whitfield', 'portfolio_executive', '{revenue,it,capital,rnd}',
       '{executive_briefing_writer,governance_health_reviewer,portfolio_risk_reviewer,lessons_learned_synthesiser}'
where not exists (select 1 from roles where role_type = 'portfolio_executive');

-- ===== 0050_rnd_workspace.sql =====
-- ---------------------------------------------------------------------------
-- 0050: R&D / NPI workspace — increment 1
--
-- Builds on 0045 (project types, stage templates, gate decisions, sanction
-- events) and 0046 (governance). Revenue and IT behaviour are untouched.
--
-- Why the schema bends where it does — the three ways R&D genuinely differs:
--
--   • The budget is deliberately re-set at every gate. A baseline-anchored CPI
--     therefore measures nothing. Measurement is gate-to-gate (burn against the
--     budget released at the last gate, sanction_events.kind = 'gate_budget')
--     and cycle time against a stage benchmark, because in NPI time-to-market
--     dominates cost.
--
--   • The business case is re-underwritten at each gate, so it is a time
--     series rather than a single record. business_case_versions below is the
--     structural twin of forecast_snapshots. The question no system asks today
--     is "does the case approved at Gate 3 still hold?" — this table is what
--     makes it answerable before Gate 4 rather than after.
--
--   • A kill is a GOOD outcome when it is early and cheap; a healthy pipeline
--     kills often. 'terminated' is therefore a lifecycle status distinct from
--     'cancelled', and kill quality is DERIVED from stage reached and spend at
--     kill (lib/rnd.ts) — never entered by hand, so nobody can grade their own
--     homework.
--
-- Idempotent throughout.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Lifecycle — a correct kill is not a cancellation
-- ---------------------------------------------------------------------------
alter table projects drop constraint if exists projects_lifecycle_status_check;
alter table projects add constraint projects_lifecycle_status_check
  check (lifecycle_status in (
    'proposed', 'approved', 'deferred', 'active', 'on_hold',
    'cancelled',   -- abandoned outside the gate process
    'closed',
    'terminated'   -- killed AT a gate, on the evidence, by the gate body
  )) not valid;

-- ---------------------------------------------------------------------------
-- 2. Roles — the R&D cast
-- ---------------------------------------------------------------------------
alter table roles drop constraint if exists roles_role_type_check;
alter table roles add constraint roles_role_type_check
  check (role_type in (
    'pm', 'procurement', 'risk', 'sponsor', 'commercial',
    'project_controls', 'program_manager', 'engineering_manager',
    'construction_manager', 'hse_manager', 'admin',
    'it_portfolio_manager', 'it_pm', 'it_sponsor', 'it_bucket_owner', 'it_board_member', 'it_finance',
    'portfolio_executive',
    'rnd_portfolio_manager', 'rnd_pm', 'rnd_sponsor', 'rnd_gatekeeper', 'rnd_board_member', 'rnd_finance'
  )) not valid;

insert into roles (name, role_type, project_types, allowed_agents)
select 'Ingrid Halvorsen', 'rnd_portfolio_manager', '{rnd}',
       '{business_case_reviewer,business_case_reconciler,gate_reviewer,portfolio_risk_reviewer,continuation_reviewer,status_reporter,lessons_learned_synthesiser}'
where not exists (select 1 from roles where role_type = 'rnd_portfolio_manager');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Tomas Ferreira', 'rnd_pm', '{rnd}',
       '{charter_drafter,wbs_builder,schedule_reasoner,budget_builder,risk_analyst,issue_logger,status_reporter,gate_reviewer,business_case_reconciler,stakeholder_analyst,communications_planner}'
where not exists (select 1 from roles where role_type = 'rnd_pm');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Marcus Bell', 'rnd_sponsor', '{rnd}',
       '{business_case_reviewer,business_case_reconciler,gate_reviewer,status_reporter,risk_analyst}'
where not exists (select 1 from roles where role_type = 'rnd_sponsor');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Yuki Tanaka', 'rnd_gatekeeper', '{rnd}',
       '{gate_reviewer,business_case_reviewer,business_case_reconciler,portfolio_risk_reviewer,continuation_reviewer,status_reporter}'
where not exists (select 1 from roles where role_type = 'rnd_gatekeeper');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Nina Kowalski', 'rnd_board_member', '{rnd}',
       '{gate_reviewer,business_case_reviewer,business_case_reconciler,portfolio_risk_reviewer,status_reporter}'
where not exists (select 1 from roles where role_type = 'rnd_board_member');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Aisha Rahman', 'rnd_finance', '{rnd}',
       '{business_case_reviewer,business_case_reconciler,gate_reviewer,cost_controller,continuation_reviewer}'
where not exists (select 1 from roles where role_type = 'rnd_finance');

-- ---------------------------------------------------------------------------
-- 3. business_case_versions — the case as a time series
--
-- One row per re-underwriting. version 1 is the case as first written; each
-- gate that re-opens the numbers adds a version carrying the gate it was
-- written at. Drift between versions is the signal (lib/rnd.ts caseDrift).
-- Nothing here is derived on write — ECV and drift are computed live, the same
-- discipline results-analysis.ts follows with the posted RA figure.
-- ---------------------------------------------------------------------------
create table if not exists business_case_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version int not null,
  -- Gate at which this version was underwritten; NULL = the original case,
  -- written before any gate was held.
  gate_stage_seq int,
  authored_on date not null default current_date,
  authored_by text,

  -- Commercial case
  npv numeric(15, 2),
  irr_pct numeric(6, 2),
  payback_months numeric(6, 1),
  peak_annual_sales numeric(15, 2),
  launch_date date,

  -- Cost to get there, split because ECV treats them at different points
  development_cost_estimate numeric(15, 2),
  launch_cost numeric(15, 2),

  -- The two probabilities ECV multiplies through. Held separately because a
  -- technically certain product that nobody wants and a moonshot with a
  -- guaranteed market fail in completely different ways.
  technical_success_pct numeric(5, 2) check (technical_success_pct between 0 and 100),
  commercial_success_pct numeric(5, 2) check (commercial_success_pct between 0 and 100),

  currency text not null default 'USD',
  is_current boolean not null default false,
  notes text,
  source_system text not null default 'APP',   -- APP | ACCOLADE
  external_id text,
  created_by_output_id uuid,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);
create index if not exists business_case_versions_project_idx on business_case_versions(project_id, version);
-- At most one current version per project.
create unique index if not exists business_case_versions_current_idx
  on business_case_versions(project_id) where is_current;

-- ---------------------------------------------------------------------------
-- 4. Stage templates — three R&D categories
--
-- Gate naming follows the stage-then-its-exit-gate convention set by the IT
-- templates in 0045. The commit gate is where technical feasibility is
-- demonstrated, which is also the IAS 38 point at which development cost stops
-- being expensed and starts being capitalised — one decision, two systems.
-- ---------------------------------------------------------------------------
insert into stage_templates (project_type, category, name, description, stages)
select 'rnd', 'new_product', 'New product development',
       'Full stage-gate for a new product or platform offering. Five gates; the case is re-underwritten at each one. Commit is Gate 3, where feasibility is demonstrated and development cost begins to capitalise.',
       '[
         {"seq":0,"key":"discovery","name":"Discovery","gate_name":"Gate 1 - Idea screen","benchmark_days":30,"is_commit":false,
          "exit_criteria":["Idea documented against a stated unmet need","Strategic fit to a platform or market confirmed","Obvious killers checked (IP, regulatory, safety)","Scoping allowance approved"],"attendees":["R&D PMO","Gatekeeper"]},
         {"seq":1,"key":"scoping","name":"Scoping","gate_name":"Gate 2 - Second screen","benchmark_days":45,"is_commit":false,
          "exit_criteria":["Preliminary market and technical assessment complete","Competitive position understood","Order-of-magnitude case built","Resource availability confirmed for case-building"],"attendees":["R&D PMO","Gatekeeper","Business sponsor"]},
         {"seq":2,"key":"build_case","name":"Build business case","gate_name":"Gate 3 - Go to development (commit)","benchmark_days":60,"is_commit":true,
          "exit_criteria":["Product definition agreed and signed by the business sponsor","Full business case built (NPV, peak sales, launch date)","Technical feasibility DEMONSTRATED - IAS 38 capitalisation starts here","Development plan and budget committed","Technical and commercial success probabilities stated and defended","Finance concurs on the capitalisation basis"],"attendees":["Gate board","Business sponsor","Finance","Technical review"]},
         {"seq":3,"key":"development","name":"Development","gate_name":"Gate 4 - Go to testing","benchmark_days":180,"is_commit":false,
          "exit_criteria":["Working product meets the agreed definition","Case re-underwritten against what development actually cost and learned","Test and validation plan approved","Manufacturing or delivery route confirmed"],"attendees":["Gate board","Business sponsor","Technical review"]},
         {"seq":4,"key":"test_validate","name":"Testing and validation","gate_name":"Gate 5 - Go to launch","benchmark_days":90,"is_commit":false,
          "exit_criteria":["Validation and field trials passed","Regulatory clearances obtained","Case re-underwritten with trial evidence","Launch plan and launch cost approved","Operations ready to support"],"attendees":["Gate board","Business sponsor","Finance","Operations"]},
         {"seq":5,"key":"launch","name":"Launch","gate_name":"Post-launch review","benchmark_days":60,"is_commit":false,
          "exit_criteria":["Launched to market","Actuals compared against the Gate 3 case and the variance explained","Capitalised development cost settled and amortisation started","Lessons learned recorded"],"attendees":["Gate board","Business sponsor","Finance","R&D PMO"]}
       ]'::jsonb
where not exists (select 1 from stage_templates where project_type = 'rnd' and category = 'new_product');

insert into stage_templates (project_type, category, name, description, stages)
select 'rnd', 'derivative', 'Derivative / line extension',
       'A variant, extension or cost-down of a product that already exists. The market is known, so the early screens collapse into one: three gates, not five.',
       '[
         {"seq":0,"key":"scoping","name":"Scoping","gate_name":"Gate 1 - Screen","benchmark_days":30,"is_commit":false,
          "exit_criteria":["Variant defined against a named customer or segment demand","Reuse of the parent platform assessed","Order-of-magnitude case built"],"attendees":["R&D PMO","Gatekeeper","Business sponsor"]},
         {"seq":1,"key":"case_design","name":"Case and design","gate_name":"Gate 2 - Go to development (commit)","benchmark_days":45,"is_commit":true,
          "exit_criteria":["Design delta from the parent product agreed","Business case built on incremental volume, not total volume","Technical feasibility demonstrated","Development budget committed","Finance concurs on the capitalisation basis"],"attendees":["Gate board","Business sponsor","Finance"]},
         {"seq":2,"key":"develop_validate","name":"Development and validation","gate_name":"Gate 3 - Go to launch","benchmark_days":120,"is_commit":false,
          "exit_criteria":["Variant built and validated","Case re-underwritten against actual development cost","Cannibalisation of the parent product quantified","Launch plan approved"],"attendees":["Gate board","Business sponsor","Finance"]},
         {"seq":3,"key":"launch","name":"Launch","gate_name":"Post-launch review","benchmark_days":45,"is_commit":false,
          "exit_criteria":["Launched","Incremental volume compared against the case","Capitalised cost settled","Lessons learned recorded"],"attendees":["Gate board","Business sponsor","R&D PMO"]}
       ]'::jsonb
where not exists (select 1 from stage_templates where project_type = 'rnd' and category = 'derivative');

insert into stage_templates (project_type, category, name, description, stages)
select 'rnd', 'platform_research', 'Platform / applied research',
       'Technology work with no product attached yet. Judged on knowledge gained and feasibility, not NPV. Two gates; the commit gate is the IAS 38 feasibility point, and until it is passed every dollar is expensed.',
       '[
         {"seq":0,"key":"explore","name":"Explore","gate_name":"Gate A - Feasibility screen","benchmark_days":60,"is_commit":false,
          "exit_criteria":["Research question stated as a testable hypothesis","Strategic relevance to a platform or roadmap named","Prior art and IP position reviewed","Kill criteria agreed IN ADVANCE, with a spend ceiling"],"attendees":["R&D PMO","Technical review"]},
         {"seq":1,"key":"investigate","name":"Investigate","gate_name":"Gate B - Technical feasibility (commit)","benchmark_days":180,"is_commit":true,
          "exit_criteria":["Hypothesis proven or disproven on the evidence","Technical feasibility demonstrated at the agreed confidence - IAS 38 capitalisation starts here if a product route exists","Receiving product programme named, or transfer to the shelf agreed","IP captured and protected"],"attendees":["Gate board","Technical review","Finance"]},
         {"seq":2,"key":"transfer","name":"Transfer","gate_name":"Transfer review","benchmark_days":30,"is_commit":false,
          "exit_criteria":["Knowledge transferred to the receiving programme or documented on the shelf","Cost expensed or capitalised per the Gate B determination","Lessons learned recorded, including a disproven hypothesis as a valid result"],"attendees":["R&D PMO","Technical review"]}
       ]'::jsonb
where not exists (select 1 from stage_templates where project_type = 'rnd' and category = 'platform_research');

-- ---------------------------------------------------------------------------
-- 5. Governance — a gate decision is its own decision kind
--
-- In IT the funding decision and the gate decision are separate events. In R&D
-- they are the same event: passing a gate releases the next stage's budget.
-- 'gate_decision' is that kind; the commit gate keeps using 'commit_baseline'
-- so the cross-type governance stats stay comparable.
-- ---------------------------------------------------------------------------
alter table authority_matrix drop constraint if exists authority_matrix_decision_kind_check;
alter table authority_matrix add constraint authority_matrix_decision_kind_check
  check (decision_kind in (
    'envelope_allocation', 'waterline_approval', 'continuation', 'commit_baseline',
    'change_order', 'reserve_draw', 'hold', 'cancel',
    'gate_decision'   -- R&D: a non-commit gate, which releases the next stage budget
  )) not valid;

-- decision_records.decision_kind is deliberately unconstrained in 0046 (the
-- authority matrix is the vocabulary of record); nothing to widen here.

insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'rnd', 'portfolio_board', 'R&D portfolio review board', 'Sets the annual R&D envelope by bucket, balances the pipeline across horizons, and decides anything above the gate board delegation. Quorum 3.', 3, null
where not exists (select 1 from decision_bodies where project_type = 'rnd' and key = 'portfolio_board');

insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'rnd', 'gate_board', 'Gate board', 'The standing gatekeepers. Decides go / kill / hold / recycle at each gate against that gate''s published criteria, and releases the next stage budget. Quorum 3.', 3, null
where not exists (select 1 from decision_bodies where project_type = 'rnd' and key = 'gate_board');

insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'rnd', 'rnd_head', 'Head of R&D', 'Delegated authority between the gate board limit and the portfolio board threshold; in-year reserve draws within limit.', 1, null
where not exists (select 1 from decision_bodies where project_type = 'rnd' and key = 'rnd_head');

insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'rnd', 'sponsor', 'Business sponsor', 'The commercial owner of the product. Owns the market side of the case, decides inside the committed budget, and cannot approve their own gate funding.', 1, 'rnd_sponsor'
where not exists (select 1 from decision_bodies where project_type = 'rnd' and key = 'sponsor');

insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'rnd', 'finance', 'Finance', 'Concurrence, not approval: the case numbers before a gate, and the IAS 38 capitalisation basis at the commit gate.', 1, 'rnd_finance'
where not exists (select 1 from decision_bodies where project_type = 'rnd' and key = 'finance');

insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'rnd', 'technical_review', 'Technical review', 'Advisory concurrence on feasibility claims at the commit gate. Non-voting: it judges whether the technical claim holds, not whether to fund it.', 1, null
where not exists (select 1 from decision_bodies where project_type = 'rnd' and key = 'technical_review');

-- Explicit membership: the gate board and the portfolio board.
insert into decision_body_members (body_id, role_id, is_chair, is_voting)
select b.id, r.id, (r.role_type = 'rnd_gatekeeper'), true
from decision_bodies b
join roles r on r.role_type in ('rnd_gatekeeper', 'rnd_board_member', 'rnd_portfolio_manager')
where b.project_type = 'rnd' and b.key = 'gate_board'
  and not exists (select 1 from decision_body_members m where m.body_id = b.id and m.role_id = r.id);

insert into decision_body_members (body_id, role_id, is_chair, is_voting)
select b.id, r.id, (r.role_type = 'rnd_board_member'), true
from decision_bodies b
join roles r on r.role_type in ('rnd_board_member', 'rnd_portfolio_manager', 'rnd_finance')
where b.project_type = 'rnd' and b.key = 'portfolio_board'
  and not exists (select 1 from decision_body_members m where m.body_id = b.id and m.role_id = r.id);

insert into decision_body_members (body_id, role_id, is_chair, is_voting)
select b.id, r.id, true, true
from decision_bodies b
join roles r on r.role_type = 'rnd_portfolio_manager'
where b.project_type = 'rnd' and b.key = 'rnd_head'
  and not exists (select 1 from decision_body_members m where m.body_id = b.id and m.role_id = r.id);

-- Technical review is advisory: a member, but explicitly non-voting.
insert into decision_body_members (body_id, role_id, is_chair, is_voting)
select b.id, r.id, false, false
from decision_bodies b
join roles r on r.role_type = 'rnd_pm'
where b.project_type = 'rnd' and b.key = 'technical_review'
  and not exists (select 1 from decision_body_members m where m.body_id = b.id and m.role_id = r.id);

-- ---------------------------------------------------------------------------
-- 6. R&D authority matrix
--
-- Thresholds sit lower than IT's on purpose: R&D money is released in small
-- slices early and large ones late, so the interesting delegation boundary is
-- an order of magnitude below IT's. Cancel BEFORE commit is deliberately the
-- cheapest decision in the matrix - killing early is the behaviour the process
-- exists to encourage, and making it a board event would suppress it.
-- ---------------------------------------------------------------------------
insert into authority_matrix (project_type, decision_kind, funding_source, post_commit, min_amount, max_amount, required_body_key, required_concurrences, notes)
select * from (values
  ('rnd', 'envelope_allocation', null, null, 0::numeric, null::numeric, 'portfolio_board', '{finance}'::text[], 'The annual R&D envelope and its split across buckets and horizons.'),
  ('rnd', 'gate_decision',    null, null, 0,      250000,  'gate_board',      '{}',          'Early gates release small budgets: the gate board decides alone.'),
  ('rnd', 'gate_decision',    null, null, 250000, 1000000, 'gate_board',      '{finance}',   'Once the slice is material, Finance concurs on the case numbers.'),
  ('rnd', 'gate_decision',    null, null, 1000000, null,   'portfolio_board', '{finance}',   'A large stage release is a portfolio decision, not a gate-board one.'),
  ('rnd', 'commit_baseline',  null, null, 0,      1000000, 'gate_board',      '{finance,technical_review}', 'Commit gate: Finance concurs on the IAS 38 capitalisation basis, Technical Review on the feasibility claim behind it.'),
  ('rnd', 'commit_baseline',  null, null, 1000000, null,   'portfolio_board', '{finance,technical_review}', null),
  ('rnd', 'continuation',     null, null, 0,      1000000, 'gate_board',      '{finance}',   'A programme crossing a fiscal boundary mid-stage is re-approved on cost-to-complete vs the current case.'),
  ('rnd', 'continuation',     null, null, 1000000, null,   'portfolio_board', '{finance}',   null),
  ('rnd', 'change_order',     'project_contingency', null, 0, null,    'sponsor',         '{}', 'Inside the committed budget the sponsor decides.'),
  ('rnd', 'change_order',     'bucket_reserve',      null, 0, 150000,  'gate_board',      '{}', 'Drawing on the bucket reserve within the gate board delegation.'),
  ('rnd', 'change_order',     'bucket_reserve',      null, 150000, null, 'rnd_head',      '{}', 'Reserve draw above the gate board delegation.'),
  ('rnd', 'change_order',     'displacement',        null, 0, null,    'portfolio_board', '{}', 'A change that would pull people off another programme is a portfolio decision - this is the R&D side of the shared-resource seam.'),
  ('rnd', 'reserve_draw',     null, null, 0,      250000,  'rnd_head',        '{}',        'Urgent in-year need funded from reserve; portfolio board notified retrospectively.'),
  ('rnd', 'reserve_draw',     null, null, 250000, null,    'portfolio_board', '{}',        null),
  ('rnd', 'hold',             null, false, 0,     null,    'sponsor',         '{}',        'Pre-commit hold: sponsor, time-boxed. Recycling at the gate is usually the better instrument.'),
  ('rnd', 'hold',             null, true,  0,     null,    'gate_board',      '{}',        'Post-commit hold: gate board, time-boxed. A held development programme loses its team, so holds are expensive here.'),
  ('rnd', 'cancel',           null, false, 0,     null,    'gate_board',      '{}',        'Killing before commit is cheap, correct and should be common. Deliberately the lightest authority in the matrix.'),
  ('rnd', 'cancel',           null, true,  0,     null,    'portfolio_board', '{finance}', 'Killing after commit writes off capitalised development cost: Finance concurs on the IAS 38 write-off.')
) as v(project_type, decision_kind, funding_source, post_commit, min_amount, max_amount, required_body_key, required_concurrences, notes)
where not exists (select 1 from authority_matrix where project_type = 'rnd');

-- ---------------------------------------------------------------------------
-- 7. RLS — same posture as 0039 / 0045
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['business_case_versions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_read_' || t, t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', 'authenticated_read_' || t, t);
    execute format('revoke select on public.%I from anon', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- ===== 0051_capital_workspace.sql =====
-- ---------------------------------------------------------------------------
-- 0051: Capital workspace — increment 1
--
-- Builds on 0045 (project types, stage templates, sanction events), 0046
-- (governance) and 0050 (gate_decision kind). Revenue, IT and R&D behaviour
-- are untouched.
--
-- Why capital bends the model where it does:
--
--   • Capital spend builds an ASSET. It is held as Assets under Construction
--     (AuC) while the project runs, settles to fixed assets at the in-service
--     date and then depreciates. So the money question is not margin but the
--     chain  Appropriated (AFE) -> Committed -> Actual -> Settled to AuC ->
--     Capitalised. Every capital control failure lives in a gap between two
--     links of that chain, and only a system holding both the AFE and the SAP
--     postings can show it end to end.
--
--   • Front-end loading (FEL1 Appraise -> FEL2 Select -> FEL3 Define) spends
--     small study budgets to buy down uncertainty before the AFE — the full
--     appropriation — is sanctioned at the end of FEL3. The AFE is the commit
--     gate. A supplementary AFE is a new sanction event, not an edit.
--
--   • Settlement is READ from SAP PS (settlement rules, settlement postings,
--     the fixed-asset register). The app never re-derives what SAP posted; it
--     checks readiness ahead of the in-service date, which is where late
--     discovery costs a fiscal year.
--
-- Idempotent throughout.
-- ---------------------------------------------------------------------------

-- 1. Roles ---------------------------------------------------------------
alter table roles drop constraint if exists roles_role_type_check;
alter table roles add constraint roles_role_type_check
  check (role_type in (
    'pm', 'procurement', 'risk', 'sponsor', 'commercial',
    'project_controls', 'program_manager', 'engineering_manager',
    'construction_manager', 'hse_manager', 'admin',
    'it_portfolio_manager', 'it_pm', 'it_sponsor', 'it_bucket_owner', 'it_board_member', 'it_finance',
    'portfolio_executive',
    'rnd_portfolio_manager', 'rnd_pm', 'rnd_sponsor', 'rnd_gatekeeper', 'rnd_board_member', 'rnd_finance',
    'capital_portfolio_manager', 'capital_pm', 'capital_sponsor', 'capital_committee_member', 'capital_finance'
  )) not valid;

insert into roles (name, role_type, project_types, allowed_agents)
select 'Omar Haddad', 'capital_portfolio_manager', '{capital}',
       '{afe_reviewer,settlement_readiness_reviewer,supplementary_afe_reviewer,gate_reviewer,portfolio_risk_reviewer,status_reporter,lessons_learned_synthesiser}'
where not exists (select 1 from roles where role_type = 'capital_portfolio_manager');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Rachel Kim', 'capital_pm', '{capital}',
       '{charter_drafter,stakeholder_analyst,wbs_builder,schedule_reasoner,budget_builder,communications_planner,risk_analyst,issue_logger,status_reporter,variance_analyst,gate_reviewer,afe_reviewer,supplementary_afe_reviewer,settlement_readiness_reviewer,closeout_reporter}'
where not exists (select 1 from roles where role_type = 'capital_pm');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Luis Moreno', 'capital_sponsor', '{capital}',
       '{afe_reviewer,supplementary_afe_reviewer,gate_reviewer,status_reporter,risk_analyst}'
where not exists (select 1 from roles where role_type = 'capital_sponsor');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Helen Brooks', 'capital_committee_member', '{capital}',
       '{afe_reviewer,supplementary_afe_reviewer,gate_reviewer,portfolio_risk_reviewer,status_reporter}'
where not exists (select 1 from roles where role_type = 'capital_committee_member');

insert into roles (name, role_type, project_types, allowed_agents)
select 'Victor Nguyen', 'capital_finance', '{capital}',
       '{settlement_readiness_reviewer,afe_reviewer,supplementary_afe_reviewer,cost_controller,gate_reviewer}'
where not exists (select 1 from roles where role_type = 'capital_finance');

-- The portfolio executive already sees all four types (0049); nothing to do.

-- 2. Stage templates: front-end loading ----------------------------------
insert into stage_templates (project_type, category, name, description, stages)
select 'capital', 'major', 'Major project (FEL)',
       'Full front-end loading for capital projects of material size: study budgets are released at FEL1 and FEL2, the AFE is sanctioned at the end of FEL3 (the commit gate), and the asset is settled and capitalised at handover.',
       '[
         {"seq":0,"key":"fel1","name":"FEL1 Appraise","gate_name":"Gate 1 - Appraise","is_commit":false,
          "exit_criteria":["Business need and strategic fit stated","Capex test answered: new asset, extended life or added capacity","Order-of-magnitude estimate (-50%/+100%)","Alternatives listed, including do-nothing"],"attendees":["Plant manager","Capital PMO"]},
         {"seq":1,"key":"fel2","name":"FEL2 Select","gate_name":"Gate 2 - Select","is_commit":false,
          "exit_criteria":["Preferred option selected against named alternatives","Conceptual estimate (-30%/+50%)","Preliminary schedule and in-service date","HSE and permitting screen complete"],"attendees":["Plant manager","Capital PMO","Engineering"]},
         {"seq":2,"key":"fel3","name":"FEL3 Define","gate_name":"Gate 3 - AFE sanction (commit)","is_commit":true,
          "exit_criteria":["Basis of design frozen","Definitive estimate (-10%/+15%) with contingency stated","Integrated schedule with in-service date","Execution plan and contracting strategy approved","Capitalisation basis and settlement rules agreed with Finance","Economics: NPV, IRR and payback on the definitive estimate"],"attendees":["Approving body for the AFE amount","Finance","Capital PMO"]},
         {"seq":3,"key":"execute","name":"Execute","gate_name":"Mechanical completion","is_commit":false,
          "exit_criteria":["Mechanical completion certified","Forecast at completion within AFE, or supplementary AFE approved","Settlement rules in place for every WBS element carrying cost"],"attendees":["Plant manager","Capital PMO","Finance"]},
         {"seq":4,"key":"commission","name":"Commission & handover","gate_name":"In-service / handover","is_commit":false,
          "exit_criteria":["Performance test passed","Asset placed in service and handed to operations","AuC settled to fixed assets; asset numbers and useful lives confirmed"],"attendees":["Plant manager","Operations","Finance"]},
         {"seq":5,"key":"close","name":"Close-out","gate_name":"Close-out","is_commit":false,
          "exit_criteria":["Final cost reported against AFE","Open commitments closed and WBS technically complete","Lessons learned recorded","Post-investment review scheduled"],"attendees":["Capital PMO","Finance"]}
       ]'::jsonb
where not exists (select 1 from stage_templates where project_type = 'capital' and category = 'major');

insert into stage_templates (project_type, category, name, description, stages)
select 'capital', 'minor', 'Minor project (single gate)',
       'Small, well-understood capital work (like-for-like replacement, minor upgrade). The FEL stages collapse into one Define stage; the AFE is still the commit gate.',
       '[
         {"seq":0,"key":"define","name":"Define","gate_name":"AFE sanction (commit)","is_commit":true,
          "exit_criteria":["Scope and estimate confirmed","Capex test answered","Capitalisation basis and settlement rules agreed with Finance","In-service date stated"],"attendees":["Approving body for the AFE amount","Finance"]},
         {"seq":1,"key":"execute","name":"Execute","gate_name":"Completion","is_commit":false,
          "exit_criteria":["Work complete","Forecast within AFE or supplementary approved"],"attendees":["Plant manager","Capital PMO"]},
         {"seq":2,"key":"handover","name":"Handover & close","gate_name":"In-service / close-out","is_commit":false,
          "exit_criteria":["Asset in service","AuC settled to fixed assets","Final cost reported against AFE"],"attendees":["Plant manager","Finance"]}
       ]'::jsonb
where not exists (select 1 from stage_templates where project_type = 'capital' and category = 'minor');

-- 3. Governance -----------------------------------------------------------
alter table authority_matrix drop constraint if exists authority_matrix_decision_kind_check;
alter table authority_matrix add constraint authority_matrix_decision_kind_check
  check (decision_kind in (
    'envelope_allocation', 'waterline_approval', 'continuation', 'commit_baseline',
    'change_order', 'reserve_draw', 'hold', 'cancel',
    'gate_decision',
    'afe_approval',       -- capital: the full appropriation at the commit gate
    'supplementary_afe'   -- capital: an increase to an approved AFE
  )) not valid;

insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'capital', 'capital_committee', 'Capital committee', 'Sets the annual capital envelope by category and sanctions AFEs above $10M, post-commit cancellations and their write-offs. Quorum 3.', 3, null
where not exists (select 1 from decision_bodies where project_type = 'capital' and key = 'capital_committee');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'capital', 'bu_head', 'Business unit head', 'Delegated authority between $1M and $10M, larger FEL study budgets, and post-commit holds.', 1, null
where not exists (select 1 from decision_bodies where project_type = 'capital' and key = 'bu_head');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'capital', 'plant_manager', 'Plant manager', 'Owns the asset and its site. Sanctions AFEs up to $1M and small FEL study budgets; pre-commit holds and cancellations.', 1, 'capital_sponsor'
where not exists (select 1 from decision_bodies where project_type = 'capital' and key = 'plant_manager');
insert into decision_bodies (project_type, key, name, description, quorum, member_role_type)
select 'capital', 'finance', 'Finance (fixed assets)', 'Concurrence, not approval: the capex/opex classification and the settlement basis on every AFE and supplementary, and the AuC write-off on a post-commit cancellation.', 1, 'capital_finance'
where not exists (select 1 from decision_bodies where project_type = 'capital' and key = 'finance');

-- The PMO sits on the committee as secretary and Finance attends to concur, but
-- neither votes: the proposer and the concurring function stay apart from the
-- decider. Only the chair holds the committee's vote in the demo cast.
insert into decision_body_members (body_id, role_id, is_chair, is_voting)
select b.id, r.id, (r.role_type = 'capital_committee_member'), (r.role_type = 'capital_committee_member')
from decision_bodies b join roles r on r.role_type in ('capital_committee_member', 'capital_portfolio_manager', 'capital_finance')
where b.project_type = 'capital' and b.key = 'capital_committee'
  and not exists (select 1 from decision_body_members m where m.body_id = b.id and m.role_id = r.id);
insert into decision_body_members (body_id, role_id, is_chair, is_voting)
select b.id, r.id, true, true
from decision_bodies b join roles r on r.role_type = 'capital_committee_member'
where b.project_type = 'capital' and b.key = 'bu_head'
  and not exists (select 1 from decision_body_members m where m.body_id = b.id and m.role_id = r.id);
insert into decision_body_members (body_id, role_id, is_chair, is_voting)
select b.id, r.id, true, true
from decision_bodies b join roles r on r.role_type = 'capital_sponsor'
where b.project_type = 'capital' and b.key = 'plant_manager'
  and not exists (select 1 from decision_body_members m where m.body_id = b.id and m.role_id = r.id);
insert into decision_body_members (body_id, role_id, is_chair, is_voting)
select b.id, r.id, true, true
from decision_bodies b join roles r on r.role_type = 'capital_finance'
where b.project_type = 'capital' and b.key = 'finance'
  and not exists (select 1 from decision_body_members m where m.body_id = b.id and m.role_id = r.id);

insert into authority_matrix (project_type, decision_kind, funding_source, post_commit, min_amount, max_amount, required_body_key, required_concurrences, notes)
select * from (values
  ('capital', 'envelope_allocation', null, null, 0::numeric, null::numeric, 'capital_committee', '{finance}'::text[], 'The annual capital envelope and its split across growth, sustaining, HSE/regulatory and cost reduction.'),
  ('capital', 'gate_decision',     null, null, 0,        250000,   'plant_manager',     '{}',        'FEL study budget up to $250k: the plant manager releases it.'),
  ('capital', 'gate_decision',     null, null, 250000,   null,     'bu_head',           '{}',        'A larger FEL study budget is a business-unit decision.'),
  ('capital', 'afe_approval',      null, null, 0,        1000000,  'plant_manager',     '{finance}', 'AFE up to $1M. Finance concurs on the capex classification and settlement basis.'),
  ('capital', 'afe_approval',      null, null, 1000000,  10000000, 'bu_head',           '{finance}', null),
  ('capital', 'afe_approval',      null, null, 10000000, null,     'capital_committee', '{finance}', 'AFE above $10M is sanctioned by the capital committee.'),
  ('capital', 'supplementary_afe', null, null, 0,        1000000,  'plant_manager',     '{finance}', 'Routed on the REVISED total AFE, not the increment: a supplementary that takes a project over a threshold goes to the higher authority.'),
  ('capital', 'supplementary_afe', null, null, 1000000,  10000000, 'bu_head',           '{finance}', null),
  ('capital', 'supplementary_afe', null, null, 10000000, null,     'capital_committee', '{finance}', null),
  ('capital', 'hold',              null, false, 0,       null,     'plant_manager',     '{}',        'Pre-AFE hold: plant manager, time-boxed.'),
  ('capital', 'hold',              null, true,  0,       null,     'bu_head',           '{}',        'Post-AFE hold: contractors stand by and AuC sits idle, so the business-unit head decides.'),
  ('capital', 'cancel',            null, false, 0,       null,     'plant_manager',     '{}',        'Stopping in FEL is cheap and correct: the study spend is expensed.'),
  ('capital', 'cancel',            null, true,  0,       null,     'capital_committee', '{finance}', 'Cancelling after AFE writes off the AuC balance: Finance concurs on the write-off.')
) as v(project_type, decision_kind, funding_source, post_commit, min_amount, max_amount, required_body_key, required_concurrences, notes)
where not exists (select 1 from authority_matrix where project_type = 'capital');

-- 4. Mirrored SAP PS / FI-AA data (read-only in the app) -------------------
create table if not exists capital_settlement_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_code text not null,
  receiver_type text not null check (receiver_type in ('auc', 'fixed_asset', 'cost_centre')),
  receiver_id text not null,
  percent numeric(6, 2) not null check (percent > 0 and percent <= 100),
  valid_from date,
  source_system text not null default 'SAP_PS',
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists capital_settlement_rules_project_idx on capital_settlement_rules(project_id, wbs_code);

create table if not exists capital_settlements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_code text not null,
  period date not null,
  settled_to_auc numeric(15, 2) not null default 0,
  capitalised_to_fa numeric(15, 2) not null default 0,
  expensed numeric(15, 2) not null default 0,
  source_system text not null default 'SAP_PS',
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists capital_settlements_project_idx on capital_settlements(project_id, period);

create table if not exists capital_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  asset_number text not null,
  description text not null,
  asset_class text,
  useful_life_years int,
  acquisition_value numeric(15, 2) not null default 0,
  capitalisation_date date,
  status text not null default 'auc' check (status in ('auc', 'capitalised', 'retired')),
  source_system text not null default 'SAP_PS',
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, asset_number)
);

do $$
declare
  t text;
begin
  foreach t in array array['capital_settlement_rules', 'capital_settlements', 'capital_assets']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_read_' || t, t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', 'authenticated_read_' || t, t);
    execute format('revoke select on public.%I from anon', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- ===== 0052_demo_role_switcher.sql =====
-- ---------------------------------------------------------------------------
-- 0052: Demo role switcher
--
-- A role row flagged demo_switcher lets the person signed in to it act as any
-- other (enabled) role — chosen from a "Switch role" menu in the header, or
-- defaulted from the address they came in on (it-*, rnd-*, capital-*). It is
-- a demonstration convenience, not a permission model: everything done while
-- switched is recorded against the role being acted as, exactly as if that
-- person had signed in. Everyone else keeps their single role.
-- ---------------------------------------------------------------------------
alter table roles add column if not exists demo_switcher boolean not null default false;

-- The owner's own login (matched by name; adjust in the admin data if renamed).
update roles set demo_switcher = true
where name ilike '%akkaraju%' and coalesce(disabled, false) = false;

-- Check
select (select count(*) from roles where role_type like 'it_%') as it_roles, (select count(*) from roles where role_type like 'rnd_%') as rnd_roles, (select count(*) from roles where role_type like 'capital_%') as capital_roles, (select count(*) from roles where role_type = 'portfolio_executive') as exec_roles, (select count(*) from stage_templates) as templates, (select string_agg(name, ', ') from roles where demo_switcher) as switchers;
