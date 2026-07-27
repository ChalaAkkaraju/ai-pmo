-- Migration 0027 — cost commitment & cost elements (the SAP PS cost layer)
-- SAP's cost lifecycle on a WBS is Budget → Commitment (PO raised) → Actual
-- (goods receipt / invoice). We already hold BAC (budget) and AC (actual);
-- this adds the commitment in the middle plus the cost-element breakdown and
-- labour hours. Everything ties to the WBS code — the canonical join key.

-- Purchase orders drive commitment. Open commitment = po_value − received_value.
create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_code text not null,                       -- ties the PO to the WBS
  po_number text not null,
  vendor text not null,
  value_category text not null default 'Materials/Equipment'
    check (value_category in ('Materials/Equipment', 'Subcontract', 'Travel & expenses', 'Other')),
  po_value numeric(15, 2) not null default 0,   -- committed total
  received_value numeric(15, 2) not null default 0,  -- goods-receipted / invoiced → becomes actual
  status text not null default 'Open'
    check (status in ('Open', 'Partially received', 'Closed')),
  raised_week int,
  source_system text not null default 'SAP_PS' check (source_system in ('APP', 'SAP_PS', 'MS_PROJECT', 'P6')),
  external_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists purchase_orders_project_idx on purchase_orders(project_id);
create index if not exists purchase_orders_wbs_idx on purchase_orders(project_id, wbs_code);
alter table purchase_orders enable row level security;

-- Cost element / SAP value category on each actual row (one row per WBS leaf
-- per category, so actuals slice by where the money goes).
alter table cost_actuals add column if not exists value_category text
  check (value_category in ('Labour', 'Materials/Equipment', 'Subcontract', 'Travel & expenses', 'Other'));

-- Labour hours actuals + a blended rate, alongside the planned hours we hold.
alter table resource_assignments add column if not exists actual_work_hours numeric(12, 2);
alter table resource_assignments add column if not exists hourly_rate numeric(10, 2);
