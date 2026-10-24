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
  ));

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
