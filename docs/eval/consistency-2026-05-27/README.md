# Agent Consistency Test — 2026-05-27

A formal reliability evaluation of the Risk Analyst agent. Five sequential
invocations against the same project with the same prompt and configuration,
compared for decision stability, factual grounding, and prose variation.

## Why this test

LLM-based agents are stochastic by construction. For a business-facing decision-
support tool (PMO, risk register review, capital project portfolio), two
things matter and they're not the same problem:

- **Accuracy.** Do the outputs cite real data from the underlying record,
  without hallucinating numbers or inventing risks?
- **Consistency.** When asked the same question twice with the same data,
  does the agent reach the same conclusion?

Accuracy is addressable through grounding (passing real database rows into
the agent's context window so the LLM has nothing to invent). Consistency is
harder; standard sampling-based LLMs vary even with identical inputs. This
test measures how big that variation actually is in our current build.

## Test design

| Parameter        | Value                                         |
|------------------|-----------------------------------------------|
| Agent            | `risk_analyst`                                |
| Project          | `NW-PWR-2686` (deep-fill project)             |
| Mode             | Quick (`concise: true`)                       |
| Runs             | 5 sequential                                  |
| Settings         | Production defaults (no temperature override) |
| Test duration    | 58.6 seconds wall-clock                       |
| Cost             | $0.228 total ($0.046 avg/run)                 |
| Tokens consumed  | 36,132 total (7,226 avg/run)                  |
| `skip_log: true` | Yes — outputs excluded from activity feed     |

**Exact prompt used:**

> Review the current risk register and identify which two risks deserve the
> most management attention through the remaining warranty tail. Three
> sentences each.

**Reproducible via** `scripts/consistency-test.mjs` (configurable via
`AGENT_TYPE`, `PROJECT_CODE`, `RUNS`, `CONCISE`, `PROMPT` env vars).

## Results

The five raw outputs are alongside this file as `run-01.md` through
`run-05.md`. The per-run metadata (timing, tokens, cost, output character
count) is in `summary.json`.

### Decision consistency: 5/5

Every run identified the same two risks as the answer to the question:

| Run | Top risk #1                | Top risk #2          |
|-----|----------------------------|----------------------|
| 1   | R-004 (Interconnection COD)| R-002 (PSD / BACT)   |
| 2   | R-004 (Interconnection COD)| R-002 (PSD / BACT)   |
| 3   | R-004 (Interconnection COD)| R-002 (PSD / BACT)   |
| 4   | R-004 (Interconnection COD)| R-002 (PSD / BACT)   |
| 5   | R-004 (Interconnection COD)| R-002 (PSD / BACT)   |

Identical ranking. Identical honourable-mentions list (R-001 hydrogen scope
already mitigated via CO-001, R-003 geotech retired post-foundations). At
the level of "what's the answer to the business question," the system gave
the same answer every time.

### Factual consistency: 5/5

Every run cited the same underlying data points from the project state
passed in via the agent prompt:

| Fact                                       | Cited in runs |
|--------------------------------------------|---------------|
| SPI 0.931                                  | 5/5           |
| 26-day schedule buffer to ISO/RTO COD      | 5/5           |
| R-004 = Interconnection COD                | 5/5           |
| R-002 = PSD / BACT permit                  | 5/5           |
| I-003 = first-fire slip                    | 5/5           |
| I-005 = GSU energisation re-baselined      | 5/5           |
| CO-001 executed, R-001 marked mitigated    | 5/5           |
| Foundations bearing load, R-003 retired    | 5/5           |

No hallucinated risk IDs, no invented numbers, no fabricated issue IDs.
Every claim traces back to a database row that the agent prompt explicitly
includes in context. Grounding is working as designed.

### Prose variation: present, low-stakes

Run-to-run wording differs. The same recommendation appears with different
phrasing:

- Run 1: *"monitor punch-list burn-down weekly and protect any remaining schedule float"*
- Run 3: *"lock the revised commissioning sequence, track buffer weekly, and pre-position the ISO/RTO delay-notification protocol"*
- Run 4: *"weekly COD-path review with ISO liaison and a formal recovery plan if SPI drops below 0.92"*

All three describe the same underlying ask (weekly cadence on the COD path,
formalised escalation). A human risk analyst going through the same data on
different days would produce similar variation. For business readers this
is invisible; for character-level diffing this looks like a difference but
isn't one substantively.

### Follow-up question variation: each run surfaced a different facet

The five "next step" suggestions diverged. Each is a valid follow-up:

| Run | Next-step question                                              |
|-----|-----------------------------------------------------------------|
| 1   | Confirm CEMS/stack-test schedule + current ISO COD float        |
| 2   | Confirm I-003/I-005 reflected in latest COD reforecast          |
| 3   | Confirm GSU-driven commissioning resequence is re-baselined     |
| 4   | Confirm BACT determination is final + formalise SPI floor       |
| 5   | Refresh response fields; explicitly link I-003/I-005 to R-004   |

Different angles of the same risk picture. Closer to "what should we ask
the PM next" than to "we disagree about the answer." For a decision-support
tool this is arguably desirable — five runs surface five distinct prompts
the team should consider, instead of five identical paragraphs.

### One genuine inconsistency: data citation depth

Run 5 was the only run that cited the project's contingency position
(*"$8.5M of $20.8M remaining against ongoing CPI erosion"*). The data was
in the agent's context for all five runs (it's part of the project-state
payload), but only one run pulled it forward into the output. This is the
kind of minor consistency gap that would be addressable architecturally —
e.g., by requiring the agent to emit a structured "key context cited" field
before generating prose. It's not present in the current build.

## What this test does not cover

Five runs is a smell test, not a statistical evaluation. Confidence
intervals on a sample of five are wide. To make claims about consistency
rates ("the agent agrees with itself 85% of the time"), 20-30 runs per
condition would be the right shape.

The test also only exercises one specific scenario:

- One agent (Risk Analyst) — not the other 12
- One project — well-grounded with rich data
- One prompt — ranking-style, constrained
- One mode — quick (concise) responses
- Default temperature — no determinism overrides

Open-ended generative prompts ("draft a stakeholder communication plan from
scratch"), portfolio-level prompts that synthesize across 100 projects,
adversarial prompts that challenge the agent's prior answer, and full-mode
long-form outputs all have more degrees of freedom and would likely show
more variation.

## What this result means in production terms

For a properly grounded ranking-style question, the current architecture
clears the bar businesses care about: same data + same question → same
decision + same supporting facts. Variation lives in prose and in
follow-up question framing — places where stochasticity is closer to
"different valid angles" than "different conclusions."

If a deployment surfaced a real consistency problem (which this test gives
no evidence of, but a wider evaluation might), there are well-understood
architectural patterns to apply:

- **Two-layer architecture.** Facts come from deterministic SQL/computation;
  the LLM only writes the narrative wrapper.
- **Structured intermediates.** Agent emits JSON
  (`{ top_risks: [R-004, R-002], confidence: high, ... }`); a deterministic
  formatter renders prose. Variation in prose is fine because the
  underlying decision is captured in the structured layer.
- **Vote-and-converge.** Run N times, take majority. Statistical confidence
  in exchange for higher cost.
- **Cache and invalidate.** First call generates and caches; subsequent
  calls return the cached output until the underlying data changes.
  Deterministic per data version.

None are required by this test's evidence. They are documented here as the
known toolbox for the day a production deployment surfaces a genuine
consistency-related complaint.

## Recommendation

Ship the current build to pilot. The reliability layer that matters most
for business trust (decision consistency on a grounded question) is solid.
The variation that exists is either invisible to readers or actively useful
(different next-step prompts). Hardening can be evidence-driven from real
pilot feedback rather than speculative.

This evaluation document itself is part of the deliverable. For roles in
AI Solutions Architecture, an evidence-based reliability claim ("here's the
test I ran, here's the result, here's what I'd do if it had been different")
is more compelling than a perfect-looking demo without verification.
