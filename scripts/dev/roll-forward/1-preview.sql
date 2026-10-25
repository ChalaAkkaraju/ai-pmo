-- =====================================================================
-- ROLL FORWARD - STEP 1: PREVIEW (read-only, changes nothing)
--
-- Shows, per revenue project, the date its demo data was generated for
-- ("as_of"), and how far step 2 would move it so that as-of = this week.
-- Paste into the Supabase SQL Editor and Run.
-- =====================================================================
with ntp as (
  select project_id, min(due_date) as ntp
  from milestones
  where name = 'Notice to proceed (NTP)'
  group by project_id
), base as (
  select p.id as project_id, p.code, p.name, p.status, p.current_week,
         coalesce(n.ntp + coalesce(p.current_week, 0) * 7,
                  p.start_date + coalesce(p.current_week, 0) * 7) as as_of
  from projects p
  left join ntp n on n.project_id = p.id
  where coalesce(to_jsonb(p) ->> 'project_type', 'revenue') = 'revenue'   -- works with or without the column
    and coalesce(p.created_via, '') <> 'intake_form'
)
select code, name, status, current_week, as_of,
       ((current_date - as_of) / 7) * 7 as shift_days,
       (extract(year from current_date)::int * 12 + extract(month from current_date)::int)
     - (extract(year from as_of)::int * 12 + extract(month from as_of)::int) as shift_months,
       case when as_of is null then 'SKIP: no dates'
            when current_date - as_of < 28 then 'SKIP: already current'
            else 'WILL MOVE' end as action
from base
order by action desc, as_of, code;
