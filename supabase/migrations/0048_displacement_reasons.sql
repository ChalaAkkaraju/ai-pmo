-- 0048: resource displacement is a general mechanism, not an IT ↔ Revenue one.
-- In IT the usual causes are incidents / run work, a higher-priority IT project,
-- or an audit. Revenue priority stays available for organisations that do share
-- people across PMOs (the R&D ↔ Revenue seam later).
alter table resource_displacements drop constraint if exists resource_displacements_reason_check;
alter table resource_displacements add constraint resource_displacements_reason_check
  check (reason in ('incident_run', 'higher_priority_project', 'audit_compliance', 'revenue_priority', 'revenue_ld_exposure', 'incident', 'other'));
update resource_displacements set reason = 'incident_run' where reason = 'incident';
