/**
 * Technical · 14 agent technical profiles. Reference page. Each profile
 * summarises the agent's prompt (lib/agent-prompts/<agent>.md, authoritative).
 * Valid token only.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';

export const dynamic = 'force-dynamic';

interface PageProps { params: Promise<{ token: string }>; }

type Scope = 'project' | 'portfolio' | 'single-item';
const SCOPE: Record<Scope, { label: string; c: string }> = {
  project: { label: 'Project-level', c: '#10b981' },
  portfolio: { label: 'Portfolio-level', c: '#8b5cf6' },
  'single-item': { label: 'Single-item', c: '#0ea5e9' },
};

type Profile = { agent: string; scope: Scope; prompt: string; inputs: string; grounding: string; rules: string; boundary: string };
const PROFILES: Profile[] = [
  { agent: 'Charter Drafter', scope: 'project', prompt: 'charter_drafter.md', inputs: 'The intake form plus the project header — objectives, scope and the commercial baseline.', grounding: 'Project header (SAP-sourced) + a comparable past project’s charter (reference grounding) + the Northwood charter worked example.', rules: 'PMBOK §4.1 charter, the 12-section Northwood template; every inferred value is flagged [NEEDS PM REVIEW].', boundary: 'Does not analyse schedule detail or build the WBS; nothing is left for the model to decide later.' },
  { agent: 'Stakeholder Analyst', scope: 'project', prompt: 'stakeholder_analyst.md', inputs: 'Intake form + approved Charter.', grounding: 'Project header + a reference project’s stakeholder register + the worked example.', rules: 'PMBOK KA 13; influence/interest classification; 10–18 roles across client, regulator, community, vendor and internal.', boundary: 'No political judgements on named individuals; does not write the comms plan.' },
  { agent: 'WBS Builder', scope: 'project', prompt: 'wbs_builder.md', inputs: 'Intake + approved Charter + scope.', grounding: 'Project header + a reference project’s WBS + the worked example.', rules: 'PMBOK §5.4 — the 100% rule (all scope, counted once); Level-2 phase branches decomposed to Level 3; dictionary for the top work packages.', boundary: 'No Gantt charts or dates; no effort estimation. Authors the WBS that is then booked to SAP.' },
  { agent: 'Schedule Reasoner', scope: 'project', prompt: 'schedule_reasoner.md', inputs: 'Intake + Charter + the approved WBS; on the consume side, the scheduler’s tasks/milestones and the contractual window.', grounding: 'Project header + WBS + a reference project’s schedule + worked example; reads the canonical tasks/milestones and the project start/contract-finish for critical-path and window checks.', rules: 'PMBOK KA 6 critical-path analysis; the critical path as 3–7 sequential chains; reconciles the forecast against the contractual window.', boundary: 'Never produces dated P6 / MS Project schedules; does not commit durations or owners without PM input.' },
  { agent: 'Budget Builder', scope: 'project', prompt: 'budget_builder.md', inputs: 'Intake + Charter §7 commercial baseline + the approved WBS + Schedule Analysis. Authoritative (never invented): contract value, target margin, approved budget, contingency, contract type.', grounding: 'Project header (the control totals — SAP/CPQ shell) + the canonical WBS + a reference project’s cost baseline + the Northwood cost-baseline worked example + the risk register (for contingency mapping).', rules: 'PMBOK cost management; one P50 cost line per WBS Level-2 branch, totalling to the approved budget; contingency mapped to charter risks; cash flow tied to milestones.', boundary: 'Does not forecast actuals (no forecast engine) or generate ERP cost codes; flags inferred lines [NEEDS PM REVIEW].' },
  { agent: 'Communications Planner', scope: 'project', prompt: 'communications_planner.md', inputs: 'Intake + Charter + Stakeholder Register + WBS + Schedule + Cost Baseline.', grounding: 'Project header + a reference project’s comms plan + the worked example.', rules: 'PMBOK KA 10; maps who-needs-what; cadence, channels and escalation paths; reporting templates per audience.', boundary: 'Does not send emails or run meetings; plans the communication, people deliver it.' },
  { agent: 'Issue Logger', scope: 'project', prompt: 'issue_logger.md', inputs: 'The project’s issue log plus project context.', grounding: 'The canonical issues table (the live issue log) + the project header.', rules: 'Severity × age prioritisation; ownership-gap detection; flags items blocking closeout.', boundary: 'Does not resolve issues or assign new owners.' },
  { agent: 'Variance Analyst', scope: 'project', prompt: 'variance_analyst.md', inputs: 'The computed earned-value figures plus the variance-report history.', grounding: 'Structured facts — PV/EV/AC → CPI/SPI/EAC/VAC computed in code from the canonical WBS + cost + progress (not by the model) — plus the variance_reports table.', rules: 'Earned Value Management (PMBOK); summarise the latest position + trend across reporting weeks; flag thresholds and projected margin.', boundary: 'Does not compute portfolio-wide trend; does not replace the monthly variance committee.' },
  { agent: 'Change Order Reviewer', scope: 'single-item', prompt: 'change_order_reviewer.md', inputs: 'One change order + Charter + WBS + Cost Baseline + project.', grounding: 'The selected change_orders row + the project header + the canonical structure.', rules: 'Northwood four-frame analysis (scope / schedule / cost / contract); assess margin protection; recommend the approval routing.', boundary: 'Does not create change orders or negotiate commercial terms.' },
  { agent: 'Risk Analyst', scope: 'project', prompt: 'risk_analyst.md', inputs: 'The project’s risk register (or a project brief).', grounding: 'The canonical risks table + project context.', rules: 'PMBOK 7 risk management + Northwood’s six-class cross-cutting taxonomy; one cause→event→consequence sentence per risk; surfaces the top three to watch.', boundary: 'No cross-portfolio patterns (that is the Portfolio Risk Reviewer); no mitigations without project context.' },
  { agent: 'Lessons-Learned Synthesiser', scope: 'project', prompt: 'lessons_learned_synthesiser.md', inputs: 'The project’s records — risks, issues, change orders, variance and the planning artefacts.', grounding: 'The canonical domain tables (risks / issues / change_orders / variance_reports) + project context.', rules: 'Northwood situation→action→outcome→generalisation; 4–6 themes; 3–7 firm-level lessons each mapped to an adoption pathway; hedges uncertain causation.', boundary: 'Does not replace post-mortem facilitation; works only from what is in the data (no tacit knowledge).' },
  { agent: 'Closeout Reporter', scope: 'project', prompt: 'closeout_reporter.md', inputs: 'The full project record — baseline vs actual cost/schedule, scope changes, risk closeout, lessons, outstanding items.', grounding: 'Project header (baseline) + the canonical cost / schedule / change / risk data + variance_reports.', rules: 'PMBOK Close Project; final outcome vs the original baseline; scope-change history and risk closeout; Northwood closeout template.', boundary: 'Does not trigger contractual closeout activities or settle warranty claims.' },
  { agent: 'Portfolio Risk Reviewer', scope: 'portfolio', prompt: 'portfolio_risk_reviewer.md', inputs: 'Risks across multiple active projects in the portfolio.', grounding: 'The risks table across all active projects + the firm-level pattern catalogue (portfolio_patterns).', rules: 'Northwood cross-cutting taxonomy with a pattern-emergence threshold of 2+ projects; aggregate by class; recommend portfolio-level mitigation.', boundary: 'No single-project deep dives (that is the Risk Analyst); does not produce a project risk register.' },
  { agent: 'Status Reporter', scope: 'project', prompt: 'status_reporter.md', inputs: 'PM notes and observations + project data; plus the audience to tailor to.', grounding: 'The project data — variance, risks, issues, change orders, milestones — plus whatever the PM provides.', rules: 'PMBOK performance reporting; a one-page RAG report, audience-adapted (team / sponsor / client); always surfaces active change orders; substantiates the RAG the PM set.', boundary: 'Does not invent percentages, dates or costs; does not compute earned value (that is the Variance Analyst); does not pick the RAG colour for you.' },
];

export default async function AgentProfilesPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/access/${token}`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <Link href={`/access/${token}/technical`} className="hover:underline">Technical notes</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Agent profiles</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">Agent technical profiles</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        For each of the 14 agents: what it needs as input, where the app grounds it, the methodology rules it follows, and
        what it refuses to do. Each profile <span className="font-medium text-foreground">summarises the agent&apos;s prompt</span>{' '}
        (<code className="rounded bg-muted px-1 py-0.5 text-[12px]">lib/agent-prompts/&lt;agent&gt;.md</code>) — the prompt is the
        authoritative source; consult it for the full rules.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {PROFILES.map((p) => (
          <div key={p.agent} className="flex h-full flex-col rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{p.agent}</h2>
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

      <div className="mt-8"><Link href={`/access/${token}/technical`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">← Technical notes</Link></div>
    </div>
  );
}
