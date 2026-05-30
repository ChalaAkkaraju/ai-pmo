-- =============================================================================
-- Migration 0011 — normalise risks.status into five canonical buckets
-- =============================================================================
-- The seeded register accumulated ~18 free-text status variants
-- ("Realised — closed", "Active — buffer intact", "Realised (once, contained)"
-- …) which overwhelm users. Collapse every value to one of five buckets,
-- matching lib/risk-status.ts canonicalRiskStatus():
--
--   Open · Active · Mitigated · Realised · Not materialised
--
-- Order of the CASE arms matters: "Active — mitigated to date" must land in
-- Active (tested before the bare 'mitigat' check), and Realised wins first.
-- Idempotent — re-running it leaves already-canonical values unchanged.
-- =============================================================================

update risks
set status = case
  when lower(status) like 'realised%' or lower(status) like 'realized%' then 'Realised'
  when lower(status) like 'active%' then 'Active'
  when lower(status) like '%not materialis%' or lower(status) like '%not materializ%' then 'Not materialised'
  when lower(status) like '%mitigat%' then 'Mitigated'
  else 'Open'
end;
