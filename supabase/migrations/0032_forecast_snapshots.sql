-- 0032 — month-end forecast snapshots: the time series behind month-over-month
-- cost & revenue forecasting. Each row is one project's forecast as reported at
-- a month-end close: budget (BAC), earned value, actual cost, the re-forecast
-- EAC/ETC/VAC and CPI/SPI, plus the revenue side — contract value, cost-based
-- percentage of completion, recognised revenue and billed. From the series we
-- derive the EAC and recognised-revenue trend and the period-over-period EAC
-- movement (how much of the change is scope vs cost performance).

create table if not exists forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  period date not null,                         -- month-end close (YYYY-MM-01)
  bac numeric(15, 2) not null default 0,        -- budget at complete
  ev numeric(15, 2) not null default 0,         -- earned value to date
  ac numeric(15, 2) not null default 0,         -- actual cost to date
  eac numeric(15, 2) not null default 0,        -- estimate at complete (= ac + etc)
  etc numeric(15, 2) not null default 0,        -- estimate to complete
  vac numeric(15, 2) not null default 0,        -- bac - eac
  cpi numeric(6, 3),
  spi numeric(6, 3),
  contract_value numeric(15, 2) not null default 0,   -- revised contract (sold + approved changes)
  poc_pct numeric(5, 2),                        -- cost-based percentage of completion
  recognised_revenue numeric(15, 2) not null default 0,
  billed numeric(15, 2) not null default 0,
  forecast_margin numeric(15, 2) not null default 0,  -- contract - eac
  source_system text not null default 'SAP_PS' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, period)
);
create index if not exists forecast_snapshots_project_idx on forecast_snapshots(project_id, period);
alter table forecast_snapshots enable row level security;
