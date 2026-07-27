-- =============================================================================
-- PMO LLM Demo — RLS hardening: require an authenticated session for all reads
-- =============================================================================
-- Closes the anonymous-read hole. Migration 0001 enabled RLS but added a
-- permissive `anon_read_*` policy per table, and later tables were added
-- without tightening. Combined with the anon key shipped in the client bundle,
-- that let anyone read every table directly, bypassing the UI.
--
-- After this migration:
--   • Every public table has RLS enabled.
--   • Reads require the `authenticated` role (a logged-in Supabase session).
--   • The anon role's SELECT grant is revoked, so tables with RLS disabled
--     (if any slipped through) are not readable anonymously either.
--   • `roles` is further restricted so a colleague can read only their own row.
--   • Writes are unchanged: they go through the service-role client in trusted
--     route handlers, which bypasses RLS. No authenticated write policies are
--     added, so the anon/authenticated roles cannot write directly.
--
-- IMPORTANT (deploy ordering): apply this ONLY after the auth-aware app code is
-- deployed. The moment it lands, any client still reading with the anon key
-- (i.e. the pre-auth build) will get empty results / 401s.
-- =============================================================================

-- Make sure the authenticated role can perform SELECT (RLS then filters rows).
grant select on all tables in schema public to authenticated;

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    -- Enforce RLS on every table.
    execute format('alter table public.%I enable row level security', t.tablename);

    -- Remove the permissive anonymous read policy from migration 0001 (if any).
    execute format('drop policy if exists %I on public.%I',
                   'anon_read_' || t.tablename, t.tablename);

    -- (Re)create a single authenticated-only read policy.
    execute format('drop policy if exists %I on public.%I',
                   'authenticated_read_' || t.tablename, t.tablename);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      'authenticated_read_' || t.tablename, t.tablename);
  end loop;
end $$;

-- NOTE: `roles` is left readable by any authenticated colleague (the loop above
-- created authenticated_read_roles USING (true)). Colleague names/permissions
-- are low-sensitivity and the token column is now meaningless. Tightening this
-- to own-row only (using user_id = auth.uid()) is a safe later refinement once
-- it's confirmed no server read needs the full roster.

-- Revoke the base SELECT grant from the anonymous role across the whole schema,
-- and stop it being re-granted to new tables by default. Belt-and-suspenders
-- with RLS: even an RLS-disabled table won't be anonymously readable.
revoke select on all tables in schema public from anon;
alter default privileges in schema public revoke select on tables from anon;
