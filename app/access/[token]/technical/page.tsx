/**
 * Technical notes — deeper reference material for a technical audience.
 * First section: a detailed AI PMO vs SAP AI-agents comparison (captured from
 * research, June 2026). Structured to grow — advanced AI concepts (tokens,
 * context engineering, fine-tuning, MCP, MoE) will be added over time.
 * Education surface; valid token only.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

type Close = 'Closest match' | 'Partial' | 'Name-only' | 'No equivalent';
const CLOSE_CLS: Record<Close, string> = {
  'Closest match': 'bg-emerald-100 text-emerald-800',
  'Partial': 'bg-amber-100 text-amber-800',
  'Name-only': 'bg-slate-100 text-slate-700',
  'No equivalent': 'bg-rose-100 text-rose-800',
};

const COMPARE: Array<{ ours: string; sap: string; close: Close; note: string }> = [
  {
    ours: 'Charter Drafter · WBS Builder · Budget Builder',
    sap: 'Project Setup Agent (S/4HANA Cloud Public Edition)',
    close: 'Closest match',
    note: 'Same intent — speed up standing a project up with AI. SAP builds the project inside S/4 EPPM from templates; AI PMO authors a scope-true WBS, charter and budget and books it.',
  },
  {
    ours: 'Variance Analyst · Portfolio Risk Reviewer',
    sap: 'Project budget analytics + portfolio assistant (Joule for EPPM)',
    close: 'Partial',
    note: 'SAP surfaces schedule/cost variance and earned-value KPIs natively in S/4 and Joule summarises them — but only when cost and schedule both live inside S/4.',
  },
  {
    ours: 'Change Order Reviewer',
    sap: 'Change Record Management Agent',
    close: 'Name-only',
    note: 'SAP’s is engineering change records (supply chain / product) — not commercial change orders and their margin impact.',
  },
  {
    ours: 'Schedule Reasoner · Risk Analyst · Status Reporter · Stakeholder Analyst · Communications Planner · Issue Logger · Lessons-Learned Synthesiser · Closeout Reporter',
    sap: '— no SAP agent —',
    close: 'No equivalent',
    note: 'PMBOK process-area agents that are not core S/4 transactions, so SAP does not ship them.',
  },
];

const DISTINCT = [
  'Cross-system earned value — joining SAP PS cost with an external scheduler’s progress (the metric no single system owns)',
  'Schedule Reasoner — critical path, float and forecast-vs-contractual-window reasoning over a scheduler SAP can’t see',
  'Project risk register + cross-project portfolio patterns',
  'Audience-tailored RAG status brief (Status Reporter)',
  'PMBOK process agents: stakeholder, communications, issues, lessons learned, closeout',
];

const SAP_HAS = [
  'Finance — Cash Management, Dispute Resolution, AR/collections, billing/rebates',
  'Procurement — Bid Analysis, Tender Analysis, Supplier Onboarding, SOW creation',
  'Supply chain — Production Planning & Operations, Change Record Management',
  'HR (SuccessFactors) — People Intelligence, Career & Talent Development',
  'Travel & expense (Concur) — Receipt Analysis; industry agents (Utilities, Trade Classification)',
];

const SOURCES = [
  { label: 'SAP News — New Joule Agents (SAP Connect 2025)', url: 'https://news.sap.com/2025/10/sap-connect-business-ai-new-joule-agents-embedded-intelligence/' },
  { label: 'SAP News — Business AI Release Highlights Q1 2026', url: 'https://news.sap.com/2026/04/sap-business-ai-release-highlights-q1-2026/' },
  { label: 'SAP News — Sapphire 2026, the Autonomous Enterprise', url: 'https://news.sap.com/2026/05/sap-sapphire-sap-unveils-autonomous-enterprise/' },
  { label: 'sap.com — Joule Agents use cases by business function', url: 'https://www.sap.com/products/artificial-intelligence/ai-agents/agent-use-cases.html' },
  { label: 'SAP Community — Enterprise Portfolio & Project Management in S/4HANA Cloud 2025', url: 'https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-sap/enterprise-portfolio-and-project-management-in-sap-s-4hana-cloud-private/ba-p/14349843' },
  { label: 'AIMultiple — SAP AI Agents in 2026', url: 'https://aimultiple.com/sap-ai-agents' },
];

const PLANNED = ['Tokens & context windows', 'Context engineering', 'Fine-tuning vs prompting + RAG', 'Reasoning models', 'MCP (Model Context Protocol)', 'Mixture of experts'];

type Scope = 'project' | 'portfolio' | 'single-item';
const SCOPE: Record<Scope, { label: string; c: string }> = {
  project: { label: 'Project-level', c: '#10b981' },
  portfolio: { label: 'Portfolio-level', c: '#8b5cf6' },
  'single-item': { label: 'Single-item', c: '#0ea5e9' },
};

type Profile = { agent: string; scope: Scope; prompt: string; inputs: string; grounding: string; rules: string; boundary: string };
const PROFILES: Profile[] = [
  { agent: 'Charter Drafter', scope: 'project', prompt: 'charter_drafter.md',
    inputs: 'The intake form plus the project header — objectives, scope and the commercial baseline.',
    grounding: 'Project header (SAP-sourced) + a comparable past project’s charter (reference grounding) + the Northwood charter worked example.',
    rules: 'PMBOK §4.1 charter, the 12-section Northwood template; every inferred value is flagged [NEEDS PM REVIEW].',
    boundary: 'Does not analyse schedule detail or build the WBS; nothing is left for the model to decide later.' },
  { agent: 'Stakeholder Analyst', scope: 'project', prompt: 'stakeholder_analyst.md',
    inputs: 'Intake form + approved Charter.',
    grounding: 'Project header + a reference project’s stakeholder register + the worked example.',
    rules: 'PMBOK KA 13; influence/interest classification; 10–18 roles across client, regulator, community, vendor and internal.',
    boundary: 'No political judgements on named individuals; does not write the comms plan.' },
  { agent: 'WBS Builder', scope: 'project', prompt: 'wbs_builder.md',
    inputs: 'Intake + approved Charter + scope.',
    grounding: 'Project header + a reference project’s WBS + the worked example.',
    rules: 'PMBOK §5.4 — the 100% rule (all scope, counted once); Level-2 phase branches decomposed to Level 3; dictionary for the top work packages.',
    boundary: 'No Gantt charts or dates; no effort estimation. Authors the WBS that is then booked to SAP.' },
  { agent: 'Schedule Reasoner', scope: 'project', prompt: 'schedule_reasoner.md',
    inputs: 'Intake + Charter + the approved WBS; on the consume side, the scheduler’s tasks/milestones and the contractual window.',
    grounding: 'Project header + WBS + a reference project’s schedule + worked example; reads the canonical tasks/milestones and the project start/contract-finish for critical-path and window checks.',
    rules: 'PMBOK KA 6 critical-path analysis; the critical path as 3–7 sequential chains; reconciles the forecast against the contractual window.',
    boundary: 'Never produces dated P6 / MS Project schedules; does not commit durations or owners without PM input.' },
  { agent: 'Budget Builder', scope: 'project', prompt: 'budget_builder.md',
    inputs: 'Intake + Charter §7 commercial baseline + the approved WBS + Schedule Analysis. Authoritative (never invented): contract value, target margin, approved budget, contingency, contract type.',
    grounding: 'Project header (the control totals — SAP/CPQ shell) + the canonical WBS + a reference project’s cost baseline + the Northwood cost-baseline worked example + the risk register (for contingency mapping).',
    rules: 'PMBOK cost management; one P50 cost line per WBS Level-2 branch, totalling to the approved budget; contingency mapped to charter risks; cash flow tied to milestones.',
    boundary: 'Does not forecast actuals (no forecast engine) or generate ERP cost codes; flags inferred lines [NEEDS PM REVIEW].' },
  { agent: 'Communications Planner', scope: 'project', prompt: 'communications_planner.md',
    inputs: 'Intake + Charter + Stakeholder Register + WBS + Schedule + Cost Baseline.',
    grounding: 'Project header + a reference project’s comms plan + the worked example.',
    rules: 'PMBOK KA 10; maps who-needs-what; cadence, channels and escalation paths; reporting templates per audience.',
    boundary: 'Does not send emails or run meetings; plans the communication, people deliver it.' },
  { agent: 'Issue Logger', scope: 'project', prompt: 'issue_logger.md',
    inputs: 'The project’s issue log plus project context.',
    grounding: 'The canonical issues table (the live issue log) + the project header.',
    rules: 'Severity × age prioritisation; ownership-gap detection; flags items blocking closeout.',
    boundary: 'Does not resolve issues or assign new owners.' },
  { agent: 'Variance Analyst', scope: 'project', prompt: 'variance_analyst.md',
    inputs: 'The computed earned-value figures plus the variance-report history.',
    grounding: 'Structured facts — PV/EV/AC → CPI/SPI/EAC/VAC computed in code from the canonical WBS + cost + progress (not by the model) — plus the variance_reports table.',
    rules: 'Earned Value Management (PMBOK); summarise the latest position + trend across reporting weeks; flag thresholds and projected margin.',
    boundary: 'Does not compute portfolio-wide trend; does not replace the monthly variance committee.' },
  { agent: 'Change Order Reviewer', scope: 'single-item', prompt: 'change_order_reviewer.md',
    inputs: 'One change order + Charter + WBS + Cost Baseline + project.',
    grounding: 'The selected change_orders row + the project header + the canonical structure.',
    rules: 'Northwood four-frame analysis (scope / schedule / cost / contract); assess margin protection; recommend the approval routing.',
    boundary: 'Does not create change orders or negotiate commercial terms.' },
  { agent: 'Risk Analyst', scope: 'project', prompt: 'risk_analyst.md',
    inputs: 'The project’s risk register (or a project brief).',
    grounding: 'The canonical risks table + project context.',
    rules: 'PMBOK 7 risk management + Northwood’s six-class cross-cutting taxonomy; one cause→event→consequence sentence per risk; surfaces the top three to watch.',
    boundary: 'No cross-portfolio patterns (that is the Portfolio Risk Reviewer); no mitigations without project context.' },
  { agent: 'Lessons-Learned Synthesiser', scope: 'project', prompt: 'lessons_learned_synthesiser.md',
    inputs: 'The project’s records — risks, issues, change orders, variance and the planning artefacts.',
    grounding: 'The canonical domain tables (risks / issues / change_orders / variance_reports) + project context.',
    rules: 'Northwood situation→action→outcome→generalisation; 4–6 themes; 3–7 firm-level lessons each mapped to an adoption pathway; hedges uncertain causation.',
    boundary: 'Does not replace post-mortem facilitation; works only from what is in the data (no tacit knowledge).' },
  { agent: 'Closeout Reporter', scope: 'project', prompt: 'closeout_reporter.md',
    inputs: 'The full project record — baseline vs actual cost/schedule, scope changes, risk closeout, lessons, outstanding items.',
    grounding: 'Project header (baseline) + the canonical cost / schedule / change / risk data + variance_reports.',
    rules: 'PMBOK Close Project; final outcome vs the original baseline; scope-change history and risk closeout; Northwood closeout template.',
    boundary: 'Does not trigger contractual closeout activities or settle warranty claims.' },
  { agent: 'Portfolio Risk Reviewer', scope: 'portfolio', prompt: 'portfolio_risk_reviewer.md',
    inputs: 'Risks across multiple active projects in the portfolio.',
    grounding: 'The risks table across all active projects + the firm-level pattern catalogue (portfolio_patterns).',
    rules: 'Northwood cross-cutting taxonomy with a pattern-emergence threshold of 2+ projects; aggregate by class; recommend portfolio-level mitigation.',
    boundary: 'No single-project deep dives (that is the Risk Analyst); does not produce a project risk register.' },
  { agent: 'Status Reporter', scope: 'project', prompt: 'status_reporter.md',
    inputs: 'PM notes and observations + project data; plus the audience to tailor to.',
    grounding: 'The project data — variance, risks, issues, change orders, milestones — plus whatever the PM provides.',
    rules: 'PMBOK performance reporting; a one-page RAG report, audience-adapted (team / sponsor / client); always surfaces active change orders; substantiates the RAG the PM set.',
    boundary: 'Does not invent percentages, dates or costs; does not compute earned value (that is the Variance Analyst); does not pick the RAG colour for you.' },
];

export default async function TechnicalPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/access/${token}`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <Link href={`/access/${token}/welcome`} className="hover:underline">Welcome</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Technical notes</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">Technical notes</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        Deeper reference material for a technical audience. First up: how AI PMO&apos;s agents line up against SAP&apos;s own
        AI agents. More notes — the AI concepts at depth — will be added here over time.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">AI PMO vs SAP&apos;s AI agents</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          SAP is investing heavily in agentic AI — Joule Agents (30+ shipped, 200+ specialised planned), plus Joule
          Studio to build your own. Almost none overlap with AI PMO, because the two are built for opposite positions:
          SAP&apos;s agents are <span className="font-medium text-foreground">embedded inside S/4HANA</span> and automate
          transactions within one system; AI PMO is a <span className="font-medium text-foreground">synthesis layer</span>{' '}
          that reads across SAP PS and a separate scheduler. The agent-by-agent picture, as of June 2026:
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">AI PMO agent(s)</th>
                <th className="px-3 py-2 font-semibold">SAP&apos;s closest</th>
                <th className="px-3 py-2 font-semibold">How close</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {COMPARE.map((r) => (
                <tr key={r.ours} className="align-top">
                  <td className="px-3 py-3 font-medium text-foreground">{r.ours}</td>
                  <td className="px-3 py-3">
                    <div className="text-foreground/80">{r.sap}</div>
                    <div className="mt-1 text-[13px] text-muted-foreground">{r.note}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CLOSE_CLS[r.close]}`}>{r.close}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Distinctively AI PMO — no SAP equivalent</h3>
            <ul className="mt-3 space-y-2 text-[13px] text-foreground/85">
              {DISTINCT.map((d) => <li key={d} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" />{d}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border bg-muted/20 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">SAP ships, AI PMO deliberately doesn&apos;t</h3>
            <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
              {SAP_HAS.map((d) => <li key={d} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-muted-foreground/40" />{d}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-5 rounded-xl border-l-4 border-sky-400 bg-sky-50/50 px-4 py-3">
          <p className="text-sm font-semibold text-sky-800">The architectural difference (why there is so little overlap)</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/80">
            SAP&apos;s agents live inside one system of record and act on its data. An agent embedded in S/4 cannot compute
            earned value when the schedule lives in Primavera P6 or MS Project — it cannot see outside SAP. AI PMO sits
            above both and joins them on the WBS code, which is structurally the thing an embedded agent can&apos;t do.
            The flip side: SAP now ships <span className="font-medium">Joule Studio</span>, so a customer could build
            PMO-style agents on SAP&apos;s platform — SAP just doesn&apos;t deliver this project-controls synthesis suite
            out of the box.
          </p>
        </div>

        <div className="mt-5 rounded-lg border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources (captured June 2026)</p>
          <ul className="mt-2 space-y-1 text-[13px]">
            {SOURCES.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline decoration-dotted underline-offset-2 hover:text-sky-900">{s.label}</a></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Agent technical profiles</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          For each of the 14 agents: what it needs as input, where the app grounds it, the methodology rules it follows,
          and what it refuses to do. Each profile <span className="font-medium text-foreground">summarises the agent&apos;s prompt</span>{' '}
          (<code className="rounded bg-muted px-1 py-0.5 text-[12px]">lib/agent-prompts/&lt;agent&gt;.md</code>) — the prompt is the
          authoritative source; consult it for the full rules.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {PROFILES.map((p) => (
            <div key={p.agent} className="flex h-full flex-col rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{p.agent}</h3>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${SCOPE[p.scope].c}1f`, color: SCOPE[p.scope].c }}>{SCOPE[p.scope].label}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                <p className="text-[13px] leading-relaxed"><span className="font-semibold text-foreground/80">Inputs: </span><span className="text-muted-foreground">{p.inputs}</span></p>
                <p className="text-[13px] leading-relaxed"><span className="font-semibold text-foreground/80">Grounding: </span><span className="text-muted-foreground">{p.grounding}</span></p>
                <p className="text-[13px] leading-relaxed"><span className="font-semibold text-foreground/80">Rules: </span><span className="text-muted-foreground">{p.rules}</span></p>
                <p className="text-[13px] leading-relaxed"><span className="font-semibold text-foreground/80">Boundary: </span><span className="text-muted-foreground">{p.boundary}</span></p>
              </div>
              <p className="mt-2.5 text-[11px] text-muted-foreground/70">Source of truth: <code className="rounded bg-muted px-1 py-0.5">lib/agent-prompts/{p.prompt}</code></p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-dashed bg-muted/20 p-5">
        <h2 className="text-base font-semibold tracking-tight">More technical notes — planned</h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">The deeper AI concepts (beyond the business-friendly <Link href={`/access/${token}/concepts`} className="font-medium text-foreground hover:underline">Concepts deck</Link>) will land here:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLANNED.map((p) => <span key={p} className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">{p}</span>)}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/access/${token}/agents`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">The 14 agents →</Link>
        <Link href={`/access/${token}`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">Back to portfolio</Link>
      </div>
    </div>
  );
}
