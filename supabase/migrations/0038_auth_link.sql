-- =============================================================================
-- PMO LLM Demo — link Supabase Auth users to role rows
-- =============================================================================
-- Introduces real per-person authentication. Each existing `roles` row (one per
-- colleague) gains a 1:1 link to a Supabase Auth user (auth.users), which holds
-- the email + password. Identity now flows:
--     session  ->  auth.uid()  ->  roles.user_id  ->  the role row
--
-- Nothing downstream of roles.id changes: agent_outputs.invoked_by_role_id,
-- allowed_agents, can_write, and all app-layer role slicing keep working.
--
-- The URL `token` is being retired as the auth mechanism. We only make it
-- nullable here (so new roles can be created without one); a later migration
-- drops the column once password login is proven in production.
-- =============================================================================

-- 1:1 link to the auth user that owns this role. ON DELETE SET NULL so removing
-- an auth user doesn't cascade-delete the role row (and its agent_outputs FK).
alter table roles
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create index if not exists roles_user_id_idx on roles(user_id);

-- Token is no longer required (identity comes from the session).
alter table roles alter column token drop not null;

-- -----------------------------------------------------------------------------
-- Helper: the role_type of the currently-authenticated user.
-- SECURITY DEFINER so it can read `roles` regardless of the caller's own RLS,
-- and safe because it only ever returns the caller's OWN role_type (keyed on
-- auth.uid()). Used by RLS policies in migration 0039 and available to the app.
-- -----------------------------------------------------------------------------
create or replace function auth_role_type()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_type from roles where user_id = auth.uid()
$$;

grant execute on function auth_role_type() to authenticated;
