alter table risks add column if not exists probability_pct    numeric(5,2);
alter table risks add column if not exists cost_impact_usd     numeric(15,2);
alter table risks add column if not exists schedule_impact_days int;
alter table risks add column if not exists emv_usd numeric(15,2)
  generated always as (round(coalesce(probability_pct,0)/100.0 * coalesce(cost_impact_usd,0), 2)) stored;
alter table risks add column if not exists residual_probability     text check (residual_probability in ('L','M','H'));
alter table risks add column if not exists residual_impact          text check (residual_impact in ('L','M','H'));
alter table risks add column if not exists residual_score           int;
alter table risks add column if not exists residual_probability_pct numeric(5,2);
alter table risks add column if not exists residual_emv_usd numeric(15,2)
  generated always as (round(coalesce(residual_probability_pct,0)/100.0 * coalesce(cost_impact_usd,0), 2)) stored;
alter table risks add column if not exists risk_type text not null default 'threat' check (risk_type in ('threat','opportunity'));
alter table risks add column if not exists response_strategy text check (response_strategy in ('Avoid','Transfer','Mitigate','Accept','Escalate','Exploit','Share','Enhance'));
alter table risks add column if not exists score_trend jsonb;