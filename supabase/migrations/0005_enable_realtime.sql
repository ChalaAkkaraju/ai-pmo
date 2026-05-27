-- =============================================================================
-- Migration 0005 — enable Supabase Realtime on agent_outputs
-- =============================================================================
-- Browser clients subscribe to INSERTs on agent_outputs so that new agent
-- invocations appear live in the dashboard's "Recent agent activity" feed
-- without a page refresh.
--
-- Two pieces required:
--   1. RLS SELECT policies for anon/authenticated. Realtime needs the role
--      to be able to read the row in order to deliver the change notification.
--   2. Add agent_outputs to the supabase_realtime publication so changes are
--      broadcast over WebSocket.
--
-- See PMO_LLM design notes for the realtime-broadcast rationale.
-- =============================================================================

-- Allow anon (browser client with anon key) and authenticated SELECT on
-- agent_outputs and projects. The demo gates access via URL tokens server-side;
-- there's no PII in the synthetic data, so open browser-side SELECT is fine.

drop policy if exists "anon can read agent_outputs" on agent_outputs;
create policy "anon can read agent_outputs"
  on agent_outputs for select to anon using (true);

drop policy if exists "auth can read agent_outputs" on agent_outputs;
create policy "auth can read agent_outputs"
  on agent_outputs for select to authenticated using (true);

drop policy if exists "anon can read projects" on projects;
create policy "anon can read projects"
  on projects for select to anon using (true);

drop policy if exists "auth can read projects" on projects;
create policy "auth can read projects"
  on projects for select to authenticated using (true);

-- Add agent_outputs to the supabase_realtime publication. Idempotent via
-- the duplicate_object exception handler so re-running the migration is safe.

do $$
begin
  alter publication supabase_realtime add table agent_outputs;
exception when duplicate_object then
  raise notice 'agent_outputs already in supabase_realtime publication';
end$$;
