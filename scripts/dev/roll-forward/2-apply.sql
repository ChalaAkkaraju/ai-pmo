-- =====================================================================
-- ROLL FORWARD - STEP 2: APPLY
--
-- Moves the demo data of each revenue project forward so its as-of week
-- lands on this week. All of a project's dates move together, so CPI, SPI,
-- margins, risks and the WBS are unchanged - only the calendar moves.
--
-- Left untouched: IT and R&D projects, projects created from the
-- new-project form, and anything created after a project was seeded
-- (e.g. agent drafts you ran later). Runs as ONE transaction: if any
-- statement fails, nothing is changed. Safe to re-run: projects that are
-- already current are skipped.
--
-- Run 1-preview.sql first. Paste this whole file into the Supabase SQL
-- Editor and Run. The last result shows what moved.
-- =====================================================================
begin;

drop table if exists rf;
create temp table rf as
with ntp as (
  select project_id, min(due_date) as ntp
  from milestones
  where name = 'Notice to proceed (NTP)'
  group by project_id
), base as (
  select p.id as project_id, p.code,
         coalesce(n.ntp + coalesce(p.current_week, 0) * 7,
                  p.start_date + coalesce(p.current_week, 0) * 7) as as_of
  from projects p
  left join ntp n on n.project_id = p.id
  where coalesce(to_jsonb(p) ->> 'project_type', 'revenue') = 'revenue'   -- works with or without the column
    and coalesce(p.created_via, '') <> 'intake_form'
)
select project_id, code, as_of,
       ((current_date - as_of) / 7) * 7 as shift_days,          -- whole weeks
       (extract(year from current_date)::int * 12 + extract(month from current_date)::int)
     - (extract(year from as_of)::int * 12 + extract(month from as_of)::int) as shift_months
from base
where as_of is not null
  and current_date - as_of >= 28;

do $$
declare
  r record;
  has_col boolean;
  -- calendar dates: shifted by whole weeks
  date_cols text[][] := array[
    ['projects', 'start_date'], ['projects', 'contract_finish'],
    ['tasks', 'start_date'], ['tasks', 'finish_date'],
    ['milestones', 'due_date'], ['milestones', 'achieved_date'],
    ['work_packages', 'target_finish']
  ];
  -- monthly periods: shifted by whole months (two steps, to avoid
  -- clashing with unique (project_id, period) keys mid-update)
  period_tables text[] := array['cost_actuals', 'forecast_snapshots',
    'resource_assignments', 'results_analysis'];
  -- timestamps: only rows from the seeding era move; capped at now()
  ts_cols text[][] := array[
    ['projects', 'created_at'], ['projects', 'last_synced_at'],
    ['projects', 'synced_at'], ['projects', 'baseline_captured_at'],
    ['tasks', 'created_at'], ['tasks', 'synced_at'],
    ['milestones', 'created_at'], ['milestones', 'synced_at'],
    ['work_packages', 'created_at'], ['work_packages', 'synced_at'], ['work_packages', 'booked_at'],
    ['cost_actuals', 'created_at'], ['cost_actuals', 'synced_at'],
    ['forecast_snapshots', 'created_at'], ['forecast_snapshots', 'synced_at'],
    ['resource_assignments', 'created_at'], ['resource_assignments', 'synced_at'],
    ['results_analysis', 'created_at'], ['results_analysis', 'synced_at'],
    ['purchase_orders', 'created_at'], ['purchase_orders', 'synced_at'],
    ['billing_events', 'created_at'], ['billing_events', 'synced_at'],
    ['change_orders', 'created_at'], ['change_orders', 'synced_at'],
    ['risks', 'created_at'], ['risks', 'updated_at'],
    ['issues', 'created_at'], ['issues', 'updated_at'],
    ['action_items', 'created_at'], ['action_items', 'updated_at'], ['action_items', 'responded_at'],
    ['variance_reports', 'created_at'],
    ['agent_outputs', 'invoked_at'], ['agent_outputs', 'created_at'], ['agent_outputs', 'edited_at']
  ];
  t text; c text; key text; i int;
begin
  for i in 1 .. array_length(date_cols, 1) loop
    t := date_cols[i][1]; c := date_cols[i][2];
    key := case when t = 'projects' then 'id' else 'project_id' end;
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = t and column_name = c) into has_col;
    if has_col then
      execute format('update public.%I x set %I = x.%I + rf.shift_days from rf where x.%I = rf.project_id and x.%I is not null',
                     t, c, c, key, c);
    end if;
  end loop;

  foreach t in array period_tables loop
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = t and column_name = 'period') into has_col;
    if has_col then
      execute format('update public.%I x set period = (x.period + make_interval(months => 1200 + rf.shift_months))::date from rf where x.project_id = rf.project_id', t);
      execute format('update public.%I x set period = (x.period - make_interval(months => 1200))::date where x.period >= date ''2100-01-01''', t);
    end if;
  end loop;

  for i in 1 .. array_length(ts_cols, 1) loop
    t := ts_cols[i][1]; c := ts_cols[i][2];
    key := case when t = 'projects' then 'id' else 'project_id' end;
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = t and column_name = c) into has_col;
    if has_col then
      execute format('update public.%I x set %I = least(x.%I + make_interval(days => rf.shift_days), now()) from rf where x.%I = rf.project_id and x.%I is not null and x.%I < (rf.as_of + 2)',
                     t, c, c, key, c, c);
    end if;
  end loop;
end $$;

commit;

-- What moved (the last result shown in the SQL Editor)
select count(*) as projects_moved,
       min(shift_days) as min_shift_days, max(shift_days) as max_shift_days,
       min(shift_months) as min_shift_months, max(shift_months) as max_shift_months,
       (select max(period) from cost_actuals ca join rf on rf.project_id = ca.project_id) as latest_cost_period_now
from rf;
