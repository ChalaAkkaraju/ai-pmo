-- =============================================================================
-- 0019 — as-sold baseline (three-state margin reconciliation).
--
-- Captures the AS-SOLD state frozen at booking, so the layer can reconcile:
--   as-sold (what we won)  →  as-planned (current WBS budget)  →  as-built (EAC).
-- The headline question: "are we delivering the margin we sold?"
--
--   projects.sold_contract_value  — original contract at booking
--   projects.sold_margin_pct      — margin % at booking (cached for display)
--   projects.baseline_captured_at — when the baseline was frozen
--   work_packages.baseline_bac    — frozen as-sold budget per WBS element
--                                   (budget_bac stays the current/as-planned one)
--
-- Run via: Supabase Dashboard -> SQL Editor -> paste -> Run. Idempotent.
-- =============================================================================

alter table projects
  add column if not exists sold_contract_value numeric(18, 2),
  add column if not exists sold_margin_pct numeric(6, 2),
  add column if not exists baseline_captured_at timestamptz;

alter table work_packages
  add column if not exists baseline_bac numeric(15, 2);
