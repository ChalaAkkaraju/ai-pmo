alter table risks add column if not exists wbs_code          text;
alter table risks add column if not exists realised_cost_usd numeric(15,2);
alter table risks add column if not exists proximity_weeks   int;
alter table risks add column if not exists velocity          text check (velocity in ('Slow', 'Medium', 'Fast'));