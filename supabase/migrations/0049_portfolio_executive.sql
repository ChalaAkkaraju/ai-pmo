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
  ));

insert into roles (name, role_type, project_types, allowed_agents)
select 'Dana Whitfield', 'portfolio_executive', '{revenue,it,capital,rnd}',
       '{executive_briefing_writer,governance_health_reviewer,portfolio_risk_reviewer,lessons_learned_synthesiser}'
where not exists (select 1 from roles where role_type = 'portfolio_executive');
