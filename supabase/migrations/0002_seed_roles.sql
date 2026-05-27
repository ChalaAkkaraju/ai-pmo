-- =============================================================================
-- PMO LLM Demo — seed initial role tokens
-- =============================================================================
-- Seeds four portfolio-level role rows with reasonable default tokens.
-- The user should regenerate tokens via the seed script before sharing URLs
-- with colleagues (uuid is unguessable but post-seed token-rotation is
-- supported via the roles.token column).
-- =============================================================================

-- Use generate_random_uuid() for unguessable tokens. Replace these defaults
-- with whatever tokens the seed script generates per colleague.
insert into roles (token, name, role_type, allowed_agents) values
  (
    'demo-pm-token-replace-me',
    'J. Okafor',
    'pm',
    array[
      'charter_drafter', 'stakeholder_analyst', 'wbs_builder',
      'schedule_reasoner', 'budget_builder', 'communications_planner',
      'issue_logger', 'variance_analyst', 'change_order_reviewer',
      'risk_analyst', 'lessons_learned_synthesiser', 'closeout_reporter',
      'portfolio_risk_reviewer'
    ]
  ),
  (
    'demo-procurement-token-replace-me',
    'M. Patel',
    'procurement',
    array['risk_analyst', 'variance_analyst', 'change_order_reviewer']
  ),
  (
    'demo-risk-token-replace-me',
    'R. Yuen',
    'risk',
    array['risk_analyst', 'portfolio_risk_reviewer', 'lessons_learned_synthesiser', 'issue_logger']
  ),
  (
    'demo-sponsor-token-replace-me',
    'L. Andersen',
    'sponsor',
    array['closeout_reporter', 'portfolio_risk_reviewer']
  );
