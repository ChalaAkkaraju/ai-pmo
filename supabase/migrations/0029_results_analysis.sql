-- Migration 0029 — Results Analysis (external / financial revenue recognition)
-- SAP PS keeps THREE independent figures, and they must not be derived from one
-- another:
--   • Earned value (EVA)        — internal, managerial, cost basis (project controls)
--   • Calculated/recognised rev — external, financial, posted via Results Analysis
--                                 (IFRS 15 / ASC 606), subject to audit
--   • Billed revenue            — external, contractual (invoices)
-- This table holds the RA output as its OWN posted source (provenance SAP_PS),
-- with its own POC — never recomputed from the EV %. Keyed to the WBS phase.

create table if not exists results_analysis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_code text,                                  -- WBS Level-2 phase
  period date not null,
  ra_method text not null default 'Cost-based POC',
  poc_pct numeric(5, 2),                          -- RA's own percentage of completion (independent of EV)
  planned_cost numeric(15, 2),                    -- phase planned cost (cost plan)
  planned_revenue numeric(15, 2),                 -- phase planned revenue (revenue plan)
  cost_of_sales numeric(15, 2),                   -- actual cost recognised to date
  calculated_revenue numeric(15, 2),             -- recognised revenue = POC × planned revenue
  recognized_margin numeric(15, 2),              -- calculated_revenue − cost_of_sales
  reserve numeric(15, 2) not null default 0,      -- anticipated-loss reserve (prudence)
  source_system text not null default 'SAP_PS' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists results_analysis_project_idx on results_analysis(project_id);
create index if not exists results_analysis_wbs_idx on results_analysis(project_id, wbs_code);
alter table results_analysis enable row level security;
