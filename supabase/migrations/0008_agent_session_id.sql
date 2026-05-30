-- 0008_agent_session_id.sql
-- Add a nullable session_id to agent_outputs so multiple agent invocations
-- belonging to the same chat thread can be grouped into a "session".
--
-- Nullable, no backfill: existing rows stay NULL (they predate session
-- tracking). True session counts on the Usage page accrue from the first
-- invocation logged after this migration is applied and the app is redeployed.

alter table agent_outputs add column if not exists session_id text;

create index if not exists agent_outputs_session_idx on agent_outputs(session_id);
