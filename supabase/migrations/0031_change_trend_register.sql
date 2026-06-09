-- 0031 — change & trend register: unfunded (absorbed) changes + claim recovery.
-- Every change enters as a TREND (Anticipated / Under analysis / Priced = open,
-- in negotiation), then resolves to one of: a funded change order (Executed /
-- Complete), Absorbed (work done under the proceed obligation but the customer
-- won't pay — a straight margin hit), or Rejected / Withdrawn (no impact).
-- Open trends carry a recovery_confidence: the cost is forecast NOW (you can't
-- stop work), the revenue is a claim AT RISK until agreed — mirroring the
-- IFRS 15 variable-consideration constraint (no revenue until "highly probable").

alter table change_orders drop constraint if exists change_orders_status_check;
alter table change_orders add constraint change_orders_status_check
  check (status in ('Anticipated', 'Under analysis', 'Priced', 'Executed', 'Complete', 'Absorbed', 'Rejected', 'Withdrawn'));

alter table change_orders add column if not exists recovery_confidence int;  -- 0..100, claim recovery probability for OPEN trends
