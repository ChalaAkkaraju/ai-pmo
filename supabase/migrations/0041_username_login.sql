-- =============================================================================
-- PMO LLM Demo — username-based login
-- =============================================================================
-- Users sign in with a username; the email stays behind the scenes as the
-- Supabase Auth identifier. The username lives on roles and is resolved to the
-- account's email at sign-in (see app/login/actions.ts).
-- =============================================================================

alter table roles add column if not exists username text;

-- Case-insensitive uniqueness. NULLs allowed for rows not yet provisioned.
create unique index if not exists roles_username_lower_key on roles (lower(username));

-- Backfill existing rows from their linked auth user's email local-part
-- (e.g. j.okafor@demo.aipmo.local -> j.okafor). Safe because these local-parts
-- are already distinct.
update roles r
set username = lower(split_part(u.email, '@', 1))
from auth.users u
where u.id = r.user_id
  and r.username is null
  and u.email is not null;
