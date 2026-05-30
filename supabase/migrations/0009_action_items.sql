-- =============================================================================
-- Migration 0009 — action_items (cross-agent task assignment)
-- =============================================================================
-- A Risk Analyst (or, later, an Issue Logger) surfaces a mitigation action and
-- names the role that should own it (e.g. Procurement Strategist). On user
-- confirmation, that action is committed here as a shared work item. The
-- assigned role sees it in their dashboard queue, can change its status, and
-- can trigger a specialist agent to draft their response.
--
-- Design notes:
--   * source_type/source_id/source_ref are generic so issues (and change
--     orders) can hang off this table later with no schema change. v1 wires
--     risks only; source_id may be NULL when the action was raised from a
--     freshly-generated agent register that doesn't map to a seeded risk row.
--   * created_from_output_id ties every action back to the exact agent run
--     that raised it — the audit trail that makes the handoff defensible.
--   * assigned_to_role_type / raised_by_role_type mirror the RoleType union in
--     lib/types.ts. raised_by_agent_type mirrors the AgentType union.
--   * Realtime + anon SELECT follow the same pattern as migration 0005 so the
--     receiver's queue updates live without a refresh. No PII in this data.
-- =============================================================================

create table if not exists action_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  source_type text not null default 'risk' check (source_type in ('risk', 'issue')),
  source_id uuid,
  source_ref text,
  description text not null,
  assigned_to_role_type text not null,
  raised_by_role_type text,
  raised_by_agent_type text,
  status text not null default 'Open' check (
    status in ('Open', 'Acknowledged', 'In progress', 'Done')
  ),
  urgency text not null default 'M' check (urgency in ('L', 'M', 'H')),
  due_week int,
  created_from_output_id uuid references agent_outputs(id) on delete set null,
  assignment_flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists action_items_assigned_idx on action_items(assigned_to_role_type);
create index if not exists action_items_project_idx on action_items(project_id);
create index if not exists action_items_source_idx on action_items(source_type, source_ref);

-- Keep updated_at fresh on status changes.
create or replace function set_action_items_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists action_items_updated_at on action_items;
create trigger action_items_updated_at
  before update on action_items
  for each row execute function set_action_items_updated_at();

-- Realtime: anon/auth SELECT so the browser client can subscribe, plus add the
-- table to the supabase_realtime publication. Writes still go through the
-- service-role route handler (/api/actions), never the browser.

alter table action_items enable row level security;

drop policy if exists "anon can read action_items" on action_items;
create policy "anon can read action_items"
  on action_items for select to anon using (true);

drop policy if exists "auth can read action_items" on action_items;
create policy "auth can read action_items"
  on action_items for select to authenticated using (true);

do $$
begin
  alter publication supabase_realtime add table action_items;
exception when duplicate_object then
  raise notice 'action_items already in supabase_realtime publication';
end$$;
