# Per-Object Integration Sync

## Technical Edition · Chapter B6 — ingest, parity & round-trip

The integration layer (B4/B5) is exercised per source object rather than as a single
monolithic sync. Migration 0030 generalised `sync_runs` / `sync_exceptions` to carry
an `entity` and `endpoint`, so each API — commitments, billing, results analysis,
cost elements, labour actuals, change orders, milestones — syncs independently with
its own run record and exception list.

The admin page exposes an object dropdown ("sync this API"), a data-freshness table
(when each object last synced), and CSV templates for the file/manual channel. A
round-trip download re-exports each object so file parity can be checked, and a
`source_system` column on all seven objects shows whether each row is an SAP feed or
AI-PMO-authored. The pattern mirrors the adapter / mapper / ingestion / exception
design proven in the sync contract (B4) — extended object by object so partial
integration (some feeds live, others manual) is a first-class state, not a failure.
