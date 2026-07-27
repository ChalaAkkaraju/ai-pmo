-- =============================================================================
-- PMO LLM Demo — migration 0014: project intake drafts
-- =============================================================================
-- Lets a PM / Engineering Manager save a half-filled intake form and come back
-- to finish + submit it later. A draft is NOT a project and carries NO project
-- code — the code is only assigned when the draft is submitted via
-- POST /api/projects (so codes are never burned on abandoned drafts).
--
--   segment              which segment form the draft belongs to
--   name                 convenience copy of the project name for listing
--   payload              the full form state { values: {...}, refCode: "..." }
--   created_by_role_type the role that owns the draft (drafts list per role)
--
-- Writes go through the service-role route handler (/api/projects/drafts);
-- server components read via the service-role client. RLS is enabled so the
-- table is closed to anon/auth by default.
--
-- Run via: Supabase Dashboard → SQL Editor → New query → paste this → Run.
-- Safe to run multiple times (IF NOT EXISTS).
-- =============================================================================

create table if not exists project_drafts (
  id uuid primary key default gen_random_uuid(),
  segment text not null check (segment in ('renewables', 'water', 'industrial', 'power')),
  name text,
  payload jsonb not null default '{}',
  created_by_role_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_drafts_role_idx on project_drafts(created_by_role_type);

-- Keep updated_at fresh on every save.
create or replace function set_project_drafts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists project_drafts_updated_at on project_drafts;
create trigger project_drafts_updated_at
  before update on project_drafts
  for each row execute function set_project_drafts_updated_at();

-- RLS on; no anon/auth policies — only the service-role client touches this.
alter table project_drafts enable row level security;
