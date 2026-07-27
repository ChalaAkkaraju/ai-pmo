-- =============================================================================
-- PMO LLM Demo — admin user administration
-- =============================================================================
-- Adds a dedicated admin capability on top of the session+role auth:
--   • is_admin              — this account can manage users (create, assign
--                             role, enable/disable). Orthogonal to role_type.
--   • disabled              — a soft lock; disabled accounts are treated as
--                             signed-out by the app and banned in Supabase Auth.
--   • must_change_password  — admin-created users must set their own password
--                             on first login before using the app.
--
-- Also introduces a dedicated 'admin' role_type: a pure user-administration
-- login with no PMO dashboard and no agents.
-- =============================================================================

alter table roles add column if not exists is_admin boolean not null default false;
alter table roles add column if not exists disabled boolean not null default false;
alter table roles add column if not exists must_change_password boolean not null default false;

-- Allow the dedicated admin role_type.
alter table roles drop constraint if exists roles_role_type_check;
alter table roles add constraint roles_role_type_check
  check (role_type in (
    'pm', 'procurement', 'risk', 'sponsor', 'commercial',
    'project_controls', 'program_manager', 'engineering_manager',
    'construction_manager', 'hse_manager', 'admin'
  ));

-- Seed a single Administrator role row (its auth user + password are created by
-- scripts/seed-users.ts from users.seed.json, keyed by role_type 'admin').
-- token is left NULL — identity comes from the session, not a URL token.
insert into roles (name, role_type, is_admin, allowed_agents)
select 'Administrator', 'admin', true, '{}'
where not exists (select 1 from roles where role_type = 'admin');

-- Helper: is the current session an admin? SECURITY DEFINER, own-row only.
create or replace function auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from roles where user_id = auth.uid()), false)
$$;

grant execute on function auth_is_admin() to authenticated;
