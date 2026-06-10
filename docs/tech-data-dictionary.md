# Data Dictionary

## Technical Edition · Appendix — the canonical model

AI PMO's schema is a provenance-tagged canonical model: each table carries the data
of a project-controls domain, joined on the **WBS code**, with a `source_system`
tag recording whether a row is a system-of-record fact (SAP PS, scheduler) or AI-PMO
synthesis. The core tables:

| Table | Holds | Notes |
| --- | --- | --- |
| `roles` | Access roles + URL `token` | Token *is* the auth mechanism; 10 demo roles |
| `projects` | Project header, contract & budget, window dates | `contract_value_current`, `approved_budget_current`, `sold_contract_value`, `contract_finish` |
| `work_packages` | Canonical WBS (the join key) | Authoring/booking provenance (0018) |
| `tasks` | Schedule activities + `%complete` | The scheduler side of the seam |
| `cost_actuals` | Actual cost, by `value_category` (element) | The SAP cost side (0027) |
| `purchase_orders` | Commitments (`po_value`, `received_value`) | Open commitment = po − received (0027) |
| `billing_events` | Invoices raised (Invoiced/Paid) | Cash-in + billed-to-date (0028) |
| `results_analysis` | Cost-based POC recognised revenue per phase | IFRS 15; independent of EV (0029) |
| `forecast_snapshots` | Monthly EV/EAC/revenue time series | Anchored to live EV (0032) |
| `change_orders` | Changes & trends | `status` incl. Absorbed/Withdrawn, `recovery_confidence` (0031) |
| `risks` | Risk register | `emv_usd`, `residual_emv_usd`, probabilities (risk enrichment) |
| `issues` | Issue log | `severity`, `sla_weeks`, `escalated` (0026) |
| `variance_reports` | Period CPI/SPI/contingency | Drives the watchlist |
| `milestones` | Contract & schedule milestones | |
| `resource_assignments` | Resource demand/actuals (hours, rate) | (0027) |
| `action_items` | Cross-agent task assignments | assign→respond loop (0009–0011) |
| `agent_outputs` | AI-written narratives (audit log) | The non-reproducible data |
| `portfolio_patterns` | Cross-project emergence signals | Dashboard insight |
| `sync_runs` / `sync_exceptions` | Integration run + exception log | (0020, 0030) |
| `project_drafts` | Half-filled intake forms | (0014) |
| `worked_examples` / others | Seed & demo support | |

**Conventions.** Money is stored in dollars (some derived figures in `_m` millions);
the WBS code joins cost and schedule; Level-2 (`a.b`) is the phase grouping; all
portfolio reads paginate via `selectAll` (B18). Migrations are immutable and numbered
(`0001`…`0033`); generators are idempotent and re-runnable (skip unless `--force`).
