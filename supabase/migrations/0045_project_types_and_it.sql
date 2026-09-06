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
  check (project_type in ('revenue', 'it', 'capital', 'rnd'));

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
  check (lifecycle_status in ('proposed', 'approved', 'deferred', 'active', 'on_hold', 'cancelled', 'closed'));

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
  ));

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
  check (source_system in ('SAP_PS', 'MS_PROJECT', 'P6', 'SOPHEON', 'ECOSYS', 'ACCOLADE', 'CORA'));

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
  ));

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
