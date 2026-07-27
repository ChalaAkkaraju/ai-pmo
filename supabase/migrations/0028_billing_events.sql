-- Migration 0028 — billing events (the revenue / billed side)
-- Earned revenue (work done, % complete × contract) is what EV measures in
-- revenue terms; billed revenue is what's actually been invoiced. The gap is
-- net unbilled (work-in-progress) — or, if negative, over-billing / advances.
-- Neither the scheduler nor a billing system shows this alone. WBS-tied.

create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_code text,                                 -- phase/WBS the invoice maps to (nullable = project-level)
  invoice_number text not null,
  billing_type text not null default 'Progress'
    check (billing_type in ('Milestone', 'Progress', 'Advance', 'Retention release')),
  amount numeric(15, 2) not null default 0,      -- billed amount
  billed_week int,
  status text not null default 'Invoiced'
    check (status in ('Planned', 'Invoiced', 'Paid')),
  source_system text not null default 'SAP_PS' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists billing_events_project_idx on billing_events(project_id);
create index if not exists billing_events_wbs_idx on billing_events(project_id, wbs_code);
alter table billing_events enable row level security;
