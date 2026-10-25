-- QA promotion: Capital workspace (0051) + demo role switcher (0052).
-- Safe to run more than once. Paste into the QA project's SQL editor and Run.

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
  ));

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
  ));

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

-- Check: expect 5 capital roles, 2 templates, 4 bodies, 13 rules, and your account flagged.
select (select count(*) from roles where role_type like 'capital_%') as capital_roles, (select count(*) from stage_templates where project_type='capital') as templates, (select count(*) from decision_bodies where project_type='capital') as bodies, (select count(*) from authority_matrix where project_type='capital') as rules, (select string_agg(name, ', ') from roles where demo_switcher) as switchers;
