-- =============================================================================
-- PMO LLM Demo — expand role set from 4 seeded / 5 staged to 10 seeded roles
-- =============================================================================
-- Migrates the role catalog to a fuller EPC PMO org (the "Medium" build).
--
-- Net effect after applying this migration:
--   • CHECK constraint on roles.role_type now allows 10 role types.
--   • 6 new role rows are seeded:
--       commercial          → A. Whitfield   (was staged but never seeded)
--       project_controls    → K. Müller     (new)
--       program_manager     → S. Park        (new)
--       engineering_manager → D. Sato        (new)
--       construction_manager→ T. O'Brien     (new)
--       hse_manager         → F. Mahmoud     (new)
--
-- All roles remain portfolio-level (see lib/roles.ts for allowed_agents +
-- dashboard_sections definitions — this seed only sets the DB-side allowed_agents
-- array, which is currently used as a soft permission check at the runner layer).
--
-- Idempotency: the `on conflict (token) do update` clause makes this safe to
-- re-run. The token columns intentionally follow the existing
-- `demo-<role>-token-replace-me` pattern so the project's pre-deploy checklist
-- and seed conventions stay consistent.
-- =============================================================================

-- 1) Expand the CHECK constraint to cover the new role types.
alter table roles drop constraint if exists roles_role_type_check;

alter table roles add constraint roles_role_type_check
  check (role_type in (
    'pm',
    'procurement',
    'risk',
    'sponsor',
    'commercial',
    'project_controls',
    'program_manager',
    'engineering_manager',
    'construction_manager',
    'hse_manager'
  ));

-- 2) Seed the 6 new role rows. Upsert by token so this is replayable.
insert into roles (token, name, role_type, allowed_agents) values
  (
    'demo-commercial-token-replace-me',
    'A. Whitfield',
    'commercial',
    array['change_order_reviewer', 'variance_analyst']
  ),
  (
    'demo-project-controls-token-replace-me',
    'K. Müller',
    'project_controls',
    array['variance_analyst', 'schedule_reasoner', 'budget_builder']
  ),
  (
    'demo-program-manager-token-replace-me',
    'S. Park',
    'program_manager',
    array[
      'stakeholder_analyst', 'schedule_reasoner', 'budget_builder',
      'communications_planner', 'issue_logger', 'variance_analyst',
      'change_order_reviewer', 'risk_analyst', 'portfolio_risk_reviewer',
      'closeout_reporter'
    ]
  ),
  (
    'demo-engineering-manager-token-replace-me',
    'D. Sato',
    'engineering_manager',
    array['charter_drafter', 'stakeholder_analyst', 'wbs_builder', 'risk_analyst']
  ),
  (
    'demo-construction-manager-token-replace-me',
    'T. O''Brien',
    'construction_manager',
    array['issue_logger', 'variance_analyst', 'change_order_reviewer']
  ),
  (
    'demo-hse-manager-token-replace-me',
    'F. Mahmoud',
    'hse_manager',
    array['issue_logger', 'portfolio_risk_reviewer']
  )
on conflict (token) do update set
  name = excluded.name,
  role_type = excluded.role_type,
  allowed_agents = excluded.allowed_agents;
