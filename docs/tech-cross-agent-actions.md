# Cross-Agent Actions

## Technical Edition · Chapter B11 — the assign→respond loop (`action_items`)

AI PMO's agents and human roles coordinate through a lightweight task layer rather
than ad-hoc messages. Migrations 0009–0011 add `action_items` (assigner role, owner
role, project, body, status, response) and the canonical status set.

The loop: any role (or agent) **assigns** an action to another role on a project; the
owner sees it on an action ribbon and in a popup, **responds**, and the status moves
through a canonical lifecycle. Three analytics pages roll the open/closed actions up
across the portfolio. Generator 20 simulates 312 actions from the risk and issue
registers (owner→role mapping, weighted status) plus a few portfolio-level items, so
the loop is populated for the demo.

It is a deliberately **thin register** — it exists because no system-of-record owns
cross-discipline project actions, and the data feeds the watchlist and analytics
(the scope-charter exception). It does not attempt to be a ticketing system.
