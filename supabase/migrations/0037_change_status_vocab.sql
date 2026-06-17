-- 0037 — change_orders status vocabulary (the business-facing lifecycle labels
-- used throughout the documentation). Remaps the open-pipeline and funded
-- states to clearer terms and adds an explicit "In negotiation" stage.
--
--   Anticipated      -> Identified
--   Under analysis   -> Quantified
--   Priced           -> Submitted to client
--   Executed         -> Approved            (funded change order)
--   Complete         -> Approved
--   Rejected         -> Withdrawn           (no impact)
--
-- 'Absorbed' (unfunded — a margin hit) and 'Withdrawn' are unchanged.
-- 'In negotiation' is a new open-pipeline stage (no historical rows map to it).

-- Drop the constraint first so the remap can't transiently violate it.
alter table change_orders drop constraint if exists change_orders_status_check;

update change_orders set status = 'Identified'          where status = 'Anticipated';
update change_orders set status = 'Quantified'          where status = 'Under analysis';
update change_orders set status = 'Submitted to client' where status = 'Priced';
update change_orders set status = 'Approved'             where status in ('Executed', 'Complete');
update change_orders set status = 'Withdrawn'            where status = 'Rejected';

alter table change_orders add constraint change_orders_status_check
  check (status in ('Identified', 'Quantified', 'Submitted to client', 'In negotiation', 'Approved', 'Absorbed', 'Withdrawn'));
