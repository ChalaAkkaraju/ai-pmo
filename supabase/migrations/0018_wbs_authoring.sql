-- =============================================================================
-- 0018 — AI-authored WBS → book-to-ERP lifecycle.
--
-- An app-native project (created in the app, not yet in SAP) can have a WBS
-- AUTHORED by AI and reviewed by a human BEFORE it is "booked" into SAP PS.
-- Until booked it is a proposal; on booking it becomes the system-of-record
-- structure (source_system flips to SAP_PS, external_id stamped).
--
--   status = 'proposed'  → AI draft, awaiting human approval + booking
--   status = 'active'    → real WBS (SAP-synced or booked); the default
--
-- Run via: Supabase Dashboard -> SQL Editor -> paste -> Run. Idempotent.
-- =============================================================================

alter table work_packages
  add column if not exists status text not null default 'active'
    check (status in ('proposed', 'active')),
  add column if not exists booked_at timestamptz,
  add column if not exists authored_by_role_type text;

create index if not exists work_packages_status_idx on work_packages(project_id, status);
