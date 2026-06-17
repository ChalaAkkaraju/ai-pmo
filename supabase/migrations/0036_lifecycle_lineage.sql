-- 0036 — lifecycle lineage: let a change/trend trace back to the issue and/or
-- risk it came from.
--
-- Both columns are nullable ON PURPOSE. The risk → issue → trend/change chain is
-- CONDITIONAL, not mandatory: most risks never materialise, many issues are born
-- directly (something just happened that was never on the register), and some
-- trends arise on their own. We record lineage only where a real hand-off
-- happened, so most rows carry no upstream link.
--
-- Note: issue → risk lineage already exists as issues.linked_risk
-- ("Materialised from risk"). This migration adds the downstream side so a
-- change/trend can point back at the issue and/or risk it came from.

alter table change_orders add column if not exists source_issue_id text;  -- e.g. 'I-021' — issues.issue_id, scoped to the same project
alter table change_orders add column if not exists source_risk_id  text;  -- e.g. 'R-009' — risks.risk_id, scoped to the same project

comment on column change_orders.source_issue_id is
  'Optional lifecycle lineage: the issue (issues.issue_id, same project) this change/trend materialised from. Nullable — most rows have no upstream.';
comment on column change_orders.source_risk_id is
  'Optional lifecycle lineage: the risk (risks.risk_id, same project) this change/trend traces to. Nullable — most rows have no upstream.';
