# AI PMO — Interview Prep Synthesis

A study guide for talking about AI PMO in AI Solutions Architect / AI Strategy interviews. Organized around the questions that actually come up, with answers grounded in the system you built. Read this once before any conversation; you'll be substantively more prepared than most candidates.

This document covers the elevator pitch, the 5-minute walkthrough, ~15 questions you'll be asked, key numbers worth memorizing, and a few things *not* to say. Designed to be skimmed in 20 minutes.

---

## How to position this project honestly

Before the talking points, one framing note. AI PMO is a personal learning project built with substantial AI assistance from Claude (Anthropic). The honest framing in interviews is: **you designed the system, you made the architectural decisions, you ran the evaluation, you debugged the production issues — Claude wrote a lot of the code under your direction**. That's how serious engineers work with LLMs today. Don't claim you typed every line; don't undersell the architectural and evaluation judgment, which is entirely yours. Hiring managers know the difference. A senior architect who can articulate *why* a multi-agent system was the right shape, *how* they evaluated reliability, and *what* they'd do differently in production — that's the role.

---

## The 60-second elevator pitch

> AI PMO is a methodology-aware, multi-agent system for engineering, procurement, and construction project management offices. Fourteen specialist agents — each anchored to a PMBOK 7 process or risk-management discipline — coordinate via a small Claude Haiku router that picks the right specialist from natural-language prompts. The system runs against a 100-project portfolio across four industry segments, with five colleague roles (PM Director, Procurement, Risk, Sponsor, Commercial) accessing role-scoped views via URL tokens. State changes broadcast across colleagues in real time. I built it as a personal project to demonstrate end-to-end enterprise AI engineering — grounded reasoning, reliability evaluation, real-time multi-user state — at a standard that would hold up in a regulated commercial environment, minus the go-to-market layer. The reliability of the agents has been empirically tested: a five-run consistency evaluation on the Risk Analyst produced 5/5 decision agreement and 5/5 factual citation agreement on a grounded ranking question, with prose variation in places where stochasticity doesn't undermine trust.

Memorize this. Practice it out loud until you can deliver it in one breath without sounding rehearsed. Vary the words a little each time so it sounds natural.

---

## The 5-minute architecture walkthrough

If asked "walk me through this system" with more time, hit these beats in order, ideally while drawing on a whiteboard:

1. **The user enters via a URL token** — each colleague has a unique link. A proxy validates the token and resolves it to a role, which gates which agents and which data slices they can see. No passwords, no accounts.

2. **The dashboard renders the portfolio view** — 100 projects across renewables, water, industrial, and power. Six KPIs at the top (contract value, budget, active count, weighted CPI/SPI, open H-severity issues, realised risks). Four theme cards below that drill into segment-level detail. A "Hot 5" panel surfaces projects of concern via composite scoring. A live activity feed shows what other colleagues are asking, broadcast via Supabase Realtime.

3. **The user invokes an agent** — either from the floating "Ask AI Assistant" button on every page, or from a project-specific tab. A natural-language prompt hits the `/api/agent` endpoint.

4. **The agent runner orchestrates**: validates the token, decides which specialist should handle the prompt (auto-routing via Claude Haiku 4.5 — cheap, fast classifier), loads the project state from Supabase, assembles the LLM input (agent system prompt + worked example anchor + project state JSON + user prompt), and calls Claude Opus 4.7 via OpenRouter.

5. **The agent emits markdown** — grounded in the project data passed in via context, anchored methodologically to PMBOK 7 patterns and a six-class cross-cutting risk taxonomy. The output is stored in Supabase and broadcast to all viewers via Realtime.

6. **The user can open the response as a polished printable report** in a new tab. A two-tier layout (Summary + Full detail, auto-split on the first H2), letterhead, project context strip, and a real **searchable** PDF download via a server-side Puppeteer route — headless Chromium renders the same page server-side and captures it with proper text layers, so the text is selectable, copyable, and Ctrl-F searchable in the PDF.

7. **Methodology grounding throughout** — every agent prompt is anchored to a PMBOK 7 process or a risk-taxonomy discipline. The worked-example library (three historical projects: Riverside Water, Skyhawk Solar, Ironvale Smelter) provides anchor exemplars that the agent draws from for style and structure.

Mention the consistency test toward the end: "I formally evaluated the Risk Analyst agent — 5/5 decision agreement across five runs, no hallucinated facts, prose variation where it doesn't undermine trust."

---

## Likely questions, with answers grounded in this project

### Q1. Why a multi-agent system instead of one big agent?

Single-agent systems with very long prompts tend to dilute specialty. A general-purpose agent handed the entire PMBOK 7 process model, six risk classes, and 100-project portfolio context in one prompt would lose precision on any specific job. The fourteen specialists in AI PMO are each tuned to one discipline — Charter Drafter, Risk Analyst, Variance Analyst, etc. — with focused system prompts and worked-example anchors specific to that discipline. Decomposition also makes evaluation tractable: I can evaluate Risk Analyst's reliability without entangling it with how Charter Drafter behaves. And it enables auto-routing, which means the user doesn't need to know which specialist to invoke — a cheap Haiku classifier maps prompts to specialists in a fraction of the cost of running Opus.

### Q2. How does your auto-router work, and why use a cheap model for it?

The router is a Claude Haiku 4.5 call that receives the user's prompt plus the list of allowed agents (filtered by the user's role) and returns a single token — the agent type. About 200ms, ~$0.001 per call. Haiku is more than capable of routing classification; using Opus for routing would be using a Ferrari to drive to the mailbox. If the router returns garbage or times out, the runner falls back to a sensible default specialist for the role. Routing decisions are logged with the output so the chain is transparent to the user — they see "Auto → Risk Analyst" in the UI.

### Q3. How do you ground the agents in real data — do you use RAG?

No RAG, by deliberate choice. RAG is the right pattern when the relevant data corpus is large, unstructured, and the right context for any given prompt has to be retrieved on the fly — think 50,000-page document collections. AI PMO's data is structured: ~100 projects, each with bounded sets of risks, issues, change orders, variance reports. For any agent invocation, the *relevant* data is determined by the prompt's context (which project, which agent) and can be loaded with a few SQL queries. So I do *contextual grounding*: when Risk Analyst is invoked on project X, the runner pulls X's full risk register, issue log, change orders, and variance history, and includes them verbatim in the LLM input. The agent has no opportunity to hallucinate a risk that doesn't exist because the actual rows are right there. The consistency test confirmed zero hallucinated risk IDs across five runs.

### Q4. When would you add RAG?

Three triggers. First, if the data corpus grew past what fits in Opus's context window per invocation — if I had 100,000 projects and the agent needed to synthesize across all of them, I'd add semantic retrieval to pre-filter. Second, if I introduced unstructured corpora: contracts, regulatory text, lessons-learned narratives from prior projects. Those benefit from embeddings-based retrieval because the right paragraph isn't predictable from the prompt. Third, if I added cross-project pattern recognition where the agent needs to find similar historical situations — that's a retrieval problem that grounding can't handle. Today AI PMO doesn't need any of these.

### Q5. How did you select your models? Why Opus 4.7 + Haiku 4.5?

Opus 4.7 for the specialists because the quality of reasoning matters more than cost for the user-facing output. A risk analysis from a sponsor's perspective needs precision in the framing, awareness of contractual nuance, and the methodological rigor of someone trained in PMBOK 7. That's frontier-level work; Haiku and Sonnet would degrade visibly. Haiku 4.5 for the router because routing is a classification task: pick from a list of 14. Doesn't need frontier capability, does need to be fast and cheap because it runs on every invocation. Net cost balance: ~$0.06 quick-mode call ends up being mostly Opus (the router is ~2% of the total). I considered cloud-only on Opus alone before realizing the routing cost made the system needlessly expensive for high-frequency use.

### Q6. How do you ensure agent outputs are consistent across runs?

I ran a formal evaluation: five sequential Risk Analyst invocations against the same project with the same prompt, default settings (no temperature override). All five returned the same two risks in the same ranking, citing the same data points — SPI 0.931, 26-day buffer, the same issue IDs as precursors. The variation that exists is in prose phrasing and in which follow-up question the agent surfaces — neither of which undermines decision trust. For production-grade hardening, four architectural patterns are available depending on which failure mode shows up at scale: a two-layer architecture where facts come from deterministic queries and the LLM only writes narrative; structured intermediate outputs (the agent emits JSON, a deterministic formatter renders prose); vote-and-converge for statistical confidence; or cache-and-invalidate so identical-data calls return cached outputs. The eval document at `docs/eval/consistency-2026-05-27/` captures the methodology and result with raw outputs.

### Q7. What's your formal evaluation strategy beyond the consistency test?

The consistency test is one of several reliability axes. The full strategy includes: (1) consistency — same input → same output, tested empirically; (2) accuracy — claims trace back to the source data, addressed by contextual grounding and verified during the consistency test; (3) factuality — no invented IDs or numbers, verified by cross-referencing outputs against the database; (4) methodology adherence — do the agents follow PMBOK 7 patterns, evaluated via the worked-example library acting as exemplars; (5) cost / latency / token-efficiency — instrumented per call. What's not yet covered: adversarial prompts ("are you SURE about R-004?"), portfolio-level prompts that synthesize across 100 projects, and long-form generative tasks where there's no constrained answer to grade against. Those would be the next evaluations to run.

### Q8. What happens if the LLM hallucinates a risk that doesn't exist?

In the current architecture, this can't happen at the *fact* level — the agent is grounded in the actual risk register rows, so it can only reference risks that are in the data. What it *can* do is misinterpret what a row means (e.g., describe a risk's status incorrectly), and there's no automated check today. The consistency test verified the agent reads the data correctly in this specific case, but it's a sample of one project and one prompt. For production, I'd add output validation: after the agent returns markdown, a small validator pass would extract claimed facts ("agent says R-004 has score 6") and verify them against the source ("R-004 actually has score 6"). Discrepancies flag the output for human review before it reaches the user.

### Q9. How would you deploy this in a regulated environment (e.g., financial services, healthcare)?

Several things would change. First, the LLM provider relationship: a regulated environment usually requires data residency guarantees, signed BAAs, audit logging of every prompt and response. Anthropic offers these through the API at Enterprise tier; OpenRouter sits in the middle and wouldn't usually be acceptable. Second, output validation becomes mandatory — every agent output gets fact-checked against the source data before it can be shown. Third, access auditing — the URL token model would be replaced with proper SSO + RBAC + per-action audit trails. Fourth, PII handling — the project state passed into LLM context would need to be reviewed for sensitive data, and either redacted or routed through a model with appropriate data-residency. Fifth, cost: regulated tier pricing is materially higher than self-serve. The architecture stays the same; the operational layer around it grows substantially.

### Q10. How does cost scale as you add users and projects?

Linearly with invocations, not with users or projects. Each invocation costs ~$0.06 in quick mode, ~$0.30 in full mode. So a 50-user pilot doing 10 invocations per user per day is ~$30/day, ~$900/month. Data storage in Supabase is negligible. Where I'd worry is: (a) if users hit the polished report viewer heavily, each first-view triggers a full-mode regeneration at ~$0.30; we mitigate that with sessionStorage caching but it's still per-session, not per-system; (b) if portfolio-level prompts become common and pull 100-project state into context, token cost per call goes up materially because the context window fills with structured data. Optimizations available: cache full-mode outputs in the database keyed by output_id, batch similar prompts into single calls, switch to Sonnet for non-critical agents.

### Q11. What would you do differently if you started over?

Three things. First, I'd separate interpretation from decision inside the specialist agents from day one — have them emit structured JSON ("top_risks: [R-004, R-002], reasoning: ..., confidence: high") that a deterministic formatter renders into prose. Today they're bundled and that produces the small variation we saw in the consistency test. Second, I'd build the evaluation harness BEFORE the UI, not after. Having `consistency-test.mjs` from week one would have surfaced reliability problems earlier when they were cheaper to fix. Third, I'd version the agent prompts as proper data assets with semver, not just markdown files in the repo — production agents need prompt version pinning to make eval results reproducible.

### Q12. What are the biggest weaknesses of the system today?

Three real ones. First, no automated output validation — I trust the LLM to faithfully summarize the grounded data, but nothing programmatically checks every claim against the source. Second, single-LLM dependency — if Anthropic has an outage or rate-limits, the system stops working. A production version would have a fallback model (e.g., Sonnet via the same provider, or an alternate provider). Third, the consistency test is a sample of five; statistical confidence in consistency claims would need 20-30 runs per condition across multiple agents and prompts. I name these honestly in the eval document. A weaker candidate would either claim the system is perfect or list cosmetic weaknesses; naming substantive limitations is what hiring managers are looking for.

### Q13. Have you heard of the agent classification — purpose, sensing, interpretation, decision, orchestration?

Yes, that's the enterprise-AI five-layer framing (Gartner, Forrester, vendor whitepapers). Mapped to AI PMO: the sensing layer is the project-state loader that pulls Supabase data; orchestration is the agent runner that sequences validate-route-load-call-write; the auto-router is an explicit decision agent for "which specialist?"; interpretation and decision are bundled inside each specialist's LLM call — which, as I mentioned earlier, is where the consistency test's small variations come from. There's no explicit purpose agent; intent is encoded implicitly in the role definitions and agent prompts. The taxonomy is more of a thinking tool than a rigorous classification, but it's useful for diagnosing where in the pipeline a failure happens.

### Q14. How do you approach AI safety in enterprise systems?

Safety in this context means a few different things and they're worth separating. *Output safety* — preventing the model from producing harmful content — is largely handled by the provider (Anthropic) and is a non-issue for project-management data. *Decision safety* — preventing the system from making consequential decisions autonomously without human review — is architectural: AI PMO is *decision support*, not *decision-making*. Every agent output is a recommendation for a human to act on, not an automated action. *Data safety* — preventing leakage of sensitive project data to the LLM provider — would be the main concern in a regulated deployment, addressed by enterprise-tier provider agreements and PII redaction. *Reliability safety* — preventing users from over-trusting outputs — is addressed by the "AI-assisted briefing" disclaimer at the bottom of every report, plus the consistency evaluation that establishes empirical trust bounds. In an interview, having all four buckets distinct shows you've thought about safety as a system property, not as a content filter.

### Q15. If a hiring manager asks "what do you NOT know yet about this system?"

This is a good honest answer: "I haven't load-tested it. I don't know what happens at 100 concurrent users hitting the dev server — probably fine for a Vercel-hosted prototype, but I haven't verified. I also haven't done adversarial evaluation — what happens if a user tries to prompt-inject the agent? I've designed defensively (the user prompt is one of several inputs to the LLM, not the dominant one) but I haven't tried to break it. And I haven't validated agent behavior across the full 14-agent surface — only Risk Analyst has been formally evaluated; the other 13 are anchored to worked examples but not consistency-tested." This is an extremely strong answer because it shows engineering humility and a clear plan for what to do next.

### Q16. Tell me about a time you caught an AI mistake in practice.

This is a true story from building AI PMO, and it's a strong one because it's specific and shows the discipline rather than just describing it.

The system has an agent catalog — a page documenting what each of the 14 specialist agents does, with bullet points like "identifies 12-15 stakeholder roles" or "detects patterns across 3+ projects." That catalog was itself written by an LLM. While reviewing it, I questioned one quantitative claim — "identifies 12-15 stakeholder roles" — and instead of trusting it, I cross-checked it against the actual agent's system prompt, which is the authoritative source. The prompt specified a minimum of 10 and a maximum of 18 stakeholders. The catalog's "12-15" was invented — a plausible-sounding number the LLM had generated that nobody had verified.

That prompted a full audit. I checked all six quantitative claims in the catalog against their source prompts and the worked examples. Five of the six were wrong: the stakeholder count, the WBS hierarchy level (it claimed branches were at "Level 1" when the methodology puts them at Level 2), the critical-path unit (it said "6-9 milestones" when the prompt defines the critical path as "3-7 sequential chains"), the risk analysis length, and the lessons structure. One claim even contradicted itself — the portfolio agent's description said patterns emerge at "3+ projects" in one bullet and "2+ projects" in another; the source prompt confirmed the threshold is two. Only one claim — "12-section charter" — was correct, which I verified by counting the sections in an actual generated charter.

The lesson I draw from this, and the part that matters for the role: **LLM-generated content needs a grounding pass, and the grounding source cannot be another LLM.** It has to be the authoritative artifact — in this case the agent prompts and the worked examples. The failure mode isn't that the LLM lies; it's that it generates confident, specific, plausible detail that drifts from the source unless something checks it. The same discipline applies to the agent outputs themselves: that's why the architecture grounds every agent in real database rows rather than letting it generate facts, and why I ran the consistency evaluation rather than assuming the agents were reliable. Catching the catalog errors and running the consistency test are the same instinct applied at two layers — documentation and runtime.

If they push further ("how would you prevent this at scale?"), the answer is automated grounding checks: a validation pass that extracts quantitative claims and verifies them against the source, run in CI so the documentation can't drift from the prompts without a test failing. I haven't built that yet — today it's manual — but that's the productionization path.

---

### Q17. If you added RAG, would you store the chunks or regenerate them at query time?

This pairs with Q4 (when would you add RAG). It's the practitioner-level follow-up that separates someone who's read about RAG from someone who's implemented it.

Always **store**. Regenerating at query time would defeat the entire point. The lifecycle has two distinct phases. At **ingest time** — once, when a document enters the system — you split it into ~500-token chunks with a small overlap (so context isn't lost at boundaries), embed each chunk through an embedding model like `text-embedding-3-small` (which returns a ~1,536-dimensional vector — a numerical fingerprint of meaning), and store both the chunk text and its vector in a vector-search-capable database. In our stack the natural fit is Supabase's pgvector extension, which was actually in the original architecture diagram. At **query time**, every time a user asks something: embed just the question with the same model, similarity-search the stored vectors for the top-k most relevant chunks, and send those chunks plus the question to the specialist agent as context.

Three reasons regenerating at query time is wrong. First, you'd pay the embedding inference cost on every chunk on every query instead of paying it once at ingest — that's hundreds or thousands of model calls per question. Second, there'd be nothing to search against — the whole point of vector storage is that the index makes similarity lookup take 50-100 milliseconds even at millions of vectors. Without persistence, you'd be doing brute-force re-embedding instead of indexed retrieval. Third, latency would jump from sub-100ms to seconds per query, which kills the user experience.

The cost picture, if I ever needed to add this: embeddings ingest is about $0.02 per million tokens with modern small models, each vector is around 6KB so 10,000 chunks fit in 60MB, and pgvector retrieval is sub-100ms with proper indexing. So the decision to skip RAG in AI PMO today is purely about avoiding complexity I don't need — not about cost or feasibility. The day I add a corpus that doesn't fit in the LLM's context window (lessons-learned archive, contract library, regulatory text), the architecture has a clear extension point and Supabase already supports it.

---

### Q18. How did you build a multi-agent system this quickly, when a company like SAP — with vastly more resources — moves more slowly?

Good question, and the honest answer is that we aren't building the same thing, so the speed comparison is misleading. Five reasons, roughly in order of weight:

1. **"Agent" means something different on each side.** Mine are well-scoped LLM prompts — a system prompt, the right grounding, and computed facts handed in. SAP's are production enterprise features: multi-tenant, permissioned, audited, localized into 40-plus languages, integrated with real transactional data, reversible, supportable under an SLA, across public-cloud, private-cloud and on-prem editions. The engineering *around* the prompt is 10–100× the prompt itself.

2. **I read; they act.** My agents synthesise and *draft*, read-only, with a human approving everything. SAP's increasingly *execute* — release a production order, post a reconciliation, move real money. Writing to a system of record at scale needs rollback, approvals, and correctness against millions of real rows. That's where the time goes.

3. **Nothing is at stake for me.** No real users, no real data, no compliance surface, no liability, no security review, no backward compatibility. A learning project moves fast precisely *because* a wrong number hurts no one.

4. **Greenfield versus decades of legacy.** I built on a clean modern stack; SAP has to thread new behaviour through S/4HANA's ABAP and 30-year-old data models. Building fresh is far easier than retrofitting.

5. **The reasoning engine is now a commodity.** The genuinely hard part — the intelligence — is an API call to a frontier model. What used to need an ML team is now prompt-engineering plus grounding. That democratization, plus a narrow, self-defined scope (one domain, one methodology, data I control), is what lets a focused effort move quickly.

The honest caveat — and the part that actually shows judgment — is that this does **not** mean I out-engineered SAP. SAP shipped 30-plus agents in about a year, which is *fast* for an enterprise; they carry far more weight, not less skill. So I'd never frame it as "I built agents faster than SAP." The credible framing is: *the new tooling collapses the cost of the reasoning layer, so a focused team can build the cross-system synthesis SAP's embedded agents structurally can't — without taking on the transactional, regulated burden that makes SAP's work slow.* That's the consume-vs-build, complementary-not-competitive story, and the lesson worth drawing is about **leverage and scope, not speed as superiority**.

---

## Key numbers worth memorizing

| Fact | Value |
|---|---|
| Portfolio size | 100 projects |
| Industry segments | 4 (renewables, water, industrial, power) |
| Specialist agents | 14 |
| Roles | 5 (PM Director, Procurement, Risk, Sponsor, Commercial) |
| Routing model | Claude Haiku 4.5 (~$0.001/call, ~200ms) |
| Specialist model | Claude Opus 4.7 via OpenRouter |
| Quick-mode cost | ~$0.06 per invocation, ~12 seconds |
| Full-mode cost | ~$0.30 per invocation, ~30 seconds |
| Consistency test result | 5/5 decision agreement, 5/5 factual agreement |
| Methodology grounding | PMBOK 7 + 6-class cross-cutting risk taxonomy |
| Stack | Next.js 16, React 19, Supabase, OpenRouter |

---

## Things NOT to say

- **"It's production-ready."** It isn't. It's a portfolio-quality build. Acknowledging that is 