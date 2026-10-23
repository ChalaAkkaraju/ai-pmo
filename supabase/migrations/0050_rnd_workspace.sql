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
  ));

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
  ));

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
  ));

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
