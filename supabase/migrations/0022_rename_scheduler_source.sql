-- 0022_rename_scheduler_source.sql
-- Rename the scheduler source_system value DATAVERSE -> MS_PROJECT and migrate
-- existing rows. Microsoft Planner/Dataverse is the lightweight tier; the demo's
-- two schedulers are now Primavera P6 + Microsoft Project. Run on existing DBs;
-- on a fresh DB migration 0017/0020 already create MS_PROJECT, so the updates
-- below are simply no-ops.

alter table work_packages drop constraint if exists work_packages_source_system_check;
alter table tasks drop constraint if exists tasks_source_system_check;
alter table milestones drop constraint if exists milestones_source_system_check;
alter table cost_actuals drop constraint if exists cost_actuals_source_system_check;
alter table resource_assignments drop constraint if exists resource_assignments_source_system_check;
alter table sync_runs drop constraint if exists sync_runs_source_system_check;

update projects             set source_system='MS_PROJECT' where source_system='DATAVERSE';
update work_packages        set source_system='MS_PROJECT' where source_system='DATAVERSE';
update tasks                set source_system='MS_PROJECT' where source_system='DATAVERSE';
update milestones           set source_system='MS_PROJECT' where source_system='DATAVERSE';
update cost_actuals         set source_system='MS_PROJECT' where source_system='DATAVERSE';
update resource_assignments set source_system='MS_PROJECT' where source_system='DATAVERSE';
update sync_runs            set source_system='MS_PROJECT' where source_system='DATAVERSE';
update sync_exceptions      set source_system='MS_PROJECT' where source_system='DATAVERSE';

alter table work_packages        add constraint work_packages_source_system_check        check (source_system in ('APP','SAP_PS','MS_PROJECT','P6'));
alter table tasks                add constraint tasks_source_system_check                check (source_system in ('APP','SAP_PS','MS_PROJECT','P6'));
alter table milestones           add constraint milestones_source_system_check           check (source_system in ('APP','SAP_PS','MS_PROJECT','P6'));
alter table cost_actuals         add constraint cost_actuals_source_system_check         check (source_system in ('APP','SAP_PS','MS_PROJECT','P6'));
alter table resource_assignments add constraint resource_assignments_source_system_check check (source_system in ('APP','SAP_PS','MS_PROJECT','P6'));
alter table sync_runs            add constraint sync_runs_source_system_check            check (source_system in ('SAP_PS','MS_PROJECT','P6'));
