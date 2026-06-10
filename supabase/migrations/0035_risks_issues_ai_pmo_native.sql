-- 0035_risks_issues_ai_pmo_native.sql
-- Correct provenance: no ERP owns a risk/issue register — AI PMO is the system
-- of record for risks and issues. They were defaulted to SAP_PS in 0034 by
-- mistake. Re-tag them as APP (AI PMO) and make that the default. The agent-vs-
-- seed distinction lives in created_via ('agent' = raised through the assistant).
-- change_orders are unchanged: SAP PS legitimately owns those.

update risks  set source_system = 'APP' where source_system = 'SAP_PS';
update issues set source_system = 'APP' where source_system = 'SAP_PS';
alter table risks  alter column source_system set default 'APP';
alter table issues alter column source_system set default 'APP';
