-- 0023_project_co_provenance.sql
-- Project header + change orders are SAP-sourced (system of record).
-- Booking flow: CPQ wins the deal -> feeds SAP -> SAP creates the shell project
-- (header + as-sold baseline) -> AI PMO mirrors it. AI PMO authors only the WBS
-- and books it back once; it never invents the project header. Change-order
-- financials (cost/revenue/budget/margin) are owned by the ERP.
--
-- Existing seeded projects represent SAP-shelled projects -> default SAP_PS.
-- Projects stood up inside AI PMO via the intake form are app-native until
-- booked -> tagged APP.

alter table projects
  add column if not exists source_system text not null default 'SAP_PS'
    check (source_system in ('APP','SAP_PS','MS_PROJECT','P6')),
  add column if not exists external_id text,
  add column if not exists synced_at timestamptz;

update projects set source_system = 'APP' where created_via is not null;

alter table change_orders
  add column if not exists source_system text not null default 'SAP_PS'
    check (source_system in ('APP','SAP_PS','MS_PROJECT','P6')),
  add column if not exists external_id text,
  add column if not exists synced_at timestamptz;
