-- Migration 0024 — risk register enrichment
-- Adds quantitative EMV, inherent→residual tracking, threat/opportunity +
-- response strategy, and a score trend, onto the existing qualitative register.
-- All additive + nullable (risk_type defaults 'threat'), so existing rows are safe.
-- Generator 14 (scripts/generators/14-enrich-risks.ts) backfills the values.

-- 1) Quantitative impact + Expected Monetary Value (EMV = P% × cost impact)
alter table risks add column if not exists probability_pct    numeric(5,2);
alter table risks add column if not exists cost_impact_usd     numeric(15,2);
alter table risks add column if not exists schedule_impact_days int;
alter table risks add column if not exists emv_usd numeric(15,2)
  generated always as (round(coalesce(probability_pct,0)/100.0 * coalesce(cost_impact_usd,0), 2)) stored;

-- 2) Inherent (existing probability/impact/score) → residual (post-mitigation)
alter table risks add column if not exists residual_probability     text
  check (residual_probability in ('L','M','H'));
alter table risks add column if not exists residual_impact          text
  check (residual_impact in ('L','M','H'));
alter table risks add column if not exists residual_score           int;
alter table risks add column if not exists residual_probability_pct numeric(5,2);
alter table risks add column if not exists residual_emv_usd numeric(15,2)
  generated always as (round(coalesce(residual_probability_pct,0)/100.0 * coalesce(cost_impact_usd,0), 2)) stored;

-- 3) Threat vs opportunity + PMBOK response strategy
alter table risks add column if not exists risk_type text not null default 'threat'
  check (risk_type in ('threat','opportunity'));
alter table risks add column if not exists response_strategy text
  check (response_strategy in ('Avoid','Transfer','Mitigate','Accept','Escalate','Exploit','Share','Enhance'));

-- 4) Score trend over reporting weeks: jsonb array of {w:int, s:int}
alter table risks add column if not exists score_trend jsonb;
