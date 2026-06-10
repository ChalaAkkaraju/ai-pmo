-- 0034_app_raised_entries.sql
-- Let a role raise a risk / issue / change-order entry *through the agent*.
-- These rows are app-raised (provisional) until booked back to the system of
-- record, so we tag provenance the same way projects/change_orders already do.

alter table risks  add column if not exists source_system text not null default 'SAP_PS'
  check (source_system in ('APP','SAP_PS','MS_PROJECT','P6'));
alter table risks  add column if not exists created_via text;            -- e.g. 'agent'
alter table risks  add column if not exists created_by_role_type text;   -- who raised it

alter table issues add column if not exists source_system text not null default 'SAP_PS'
  check (source_system in ('APP','SAP_PS','MS_PROJECT','P6'));
alter table issues add column if not exists created_via text;
alter table issues add column if not exists created_by_role_type text;

-- change_orders already has source_system (0023); just add the who/how tags.
alter table change_orders add column if not exists created_via text;
alter table change_orders add column if not exists created_by_role_type text;
