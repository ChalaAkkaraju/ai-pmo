'use client';

/**
 * Rich, lifecycle-grouped agent profiles. Each card leads with the same
 * scope-tinted hero as the /agents deck (icon + scope + name + purpose), then
 * the technical detail (PMBOK KA, model, reference-grounded, reads/feeds,
 * inputs/grounding/rules/boundary). "Meet the agent" opens the shared
 * AgentDetailCard in a modal. Name/purpose/methodology come from AGENT_CATALOG.
 */
import { useState } from 'react';
import Link from 'next/link';
import { X, ArrowRight, FileText } from 'lucide-react';
import { AGENT_CATALOG } from '@/lib/agent-catalog';
import type { AgentType } from '@/lib/types';
import { AgentDetailCard, AGENT_ICON } from './agent-detail-card';

type Phase = 'Initiation' | 'Planning' | 'Execution' | 'Monitoring' | 'Closeout' | 'Portfolio';
const PHASES: Phase[] = ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closeout', 'Portfolio'];
const PHASE_BLURB: Record<Phase, string> = {
  Initiation: 'Frame the project — charter and stakeholders.',
  Planning: 'Author the baseline — scope, schedule, cost, communications.',
  Execution: 'Run the work — log and triage what comes up.',
  Monitoring: 'Watch performance — earned value, change, risk, status.',
  Closeout: 'Wrap up — lessons and the final record.',
  Portfolio: 'Span every project — cross-cutting patterns.',
};

const SCOPE: Record<string, { label: string; c: string }> = {
  project: { label: 'Project-level', c: '#10b981' },
  portfolio: { label: 'Portfolio-level', c: '#8b5cf6' },
  'single-item': { label: 'Single-item', c: '#0ea5e9' },
};

interface Prof {
  at: AgentType; phase: Phase; ka: string; ref: boolean;
  inputs: string; grounding: string; rules: string; boundary: string;
  reads: string; feeds: string;
}

const PROFILES: Prof[] = [
  { at: 'charter_drafter', phase: 'Initiation', ka: 'PMBOK §4.1 — Develop Project Charter', ref: true,
    inputs: 'The intake form plus the project header — objectives, scope and the commercial baseline.',
    grounding: 'Project header (SAP-sourced) + a comparable past project’s charter (reference grounding) + the Northwood charter worked example.',
    rules: 'PMBOK §4.1 charter, the 12-section Northwood template; every inferred value is flagged [NEEDS PM REVIEW].',
    boundary: 'Does not analyse schedule detail or build the WBS; nothing is left for the model to decide later.',
    reads: 'Intake · project header', feeds: 'Stakeholder · WBS · Budget · Comms' },
  { at: 'stakeholder_analyst', phase: 'Initiation', ka: 'PMBOK KA 13 — Stakeholder Management', ref: true,
    inputs: 'Intake form + approved Charter.',
    grounding: 'Project header + a reference project’s stakeholder register + the worked example.',
    rules: 'PMBOK KA 13; influence/interest classification; 10–18 roles across client, regulator, community, vendor and internal.',
    boundary: 'No political judgements on named individuals; does not write the comms plan.',
    reads: 'Charter · intake', feeds: 'Communications Planner' },
  { at: 'wbs_builder', phase: 'Planning', ka: 'PMBOK §5.4 — Create WBS (100% rule)', ref: true,
    inputs: 'Intake + approved Charter + scope.',
    grounding: 'Project header + a reference project’s WBS + the worked example.',
    rules: 'PMBOK §5.4 — the 100% rule (all scope, counted once); Level-2 phase branches decomposed to Level 3; dictionary for the top work packages.',
    boundary: 'No Gantt charts or dates; no effort estimation. Authors the WBS that is then booked to SAP.',
    reads: 'Charter · scope', feeds: 'Schedule · Budget · booked to SAP PS' },
  { at: 'schedule_reasoner', phase: 'Planning', ka: 'PMBOK KA 6 — Schedule / critical path', ref: true,
    inputs: 'Intake + Charter + the approved WBS; on the consume side, the scheduler’s tasks/milestones and the contractual window.',
    grounding: 'Project header + WBS + a reference project’s schedule + worked example; reads the canonical tasks/milestones and the project start/contract-finish for critical-path and window checks.',
    rules: 'PMBOK KA 6 critical-path analysis; the critical path as 3–7 sequential chains; reconciles the forecast against the contractual window.',
    boundary: 'Never produces dated P6 / MS Project schedules; does not commit durations or owners without PM input.',
    reads: 'WBS · scheduler tasks · contract window', feeds: 'Budget · Variance' },
  { at: 'budget_builder', phase: 'Planning', ka: 'PMBOK KA 7 — Cost Management', ref: true,
    inputs: 'Intake + Charter §7 commercial baseline + the approved WBS + Schedule Analysis. Authoritative (never invented): contract value, target margin, approved budget, contingency, contract type.',
    grounding: 'Project header (the control totals — SAP/CPQ shell) + the canonical WBS + a reference project’s cost baseline + the Northwood cost-baseline worked example + the risk register (for contingency mapping).',
    rules: 'PMBOK cost management; one P50 cost line per WBS Level-2 branch, totalling to the approved budget; contingency mapped to charter risks; cash flow tied to milestones.',
    boundary: 'Does not forecast actuals (no forecast engine) or generate ERP cost codes; flags inferred lines [NEEDS PM REVIEW].',
    reads: 'Charter §7 · WBS · Schedule · risks', feeds: 'Variance · Margin bridge' },
  { at: 'communications_planner', phase: 'Planning', ka: 'PMBOK KA 10 — Communications', ref: true,
    inputs: 'Intake + Charter + Stakeholder Register + WBS + Schedule + Cost Baseline.',
    grounding: 'Project header + a reference project’s comms plan + the worked example.',
    rules: 'PMBOK KA 10; maps who-needs-what; cadence, channels and escalation paths; reporting templates per audience.',
    boundary: 'Does not send emails or run meetings; plans the communication, people deliver it.',
    reads: 'Charter · Stakeholders · WBS · Schedule · Cost', feeds: 'Status Reporter' },
  { at: 'issue_logger', phase: 'Execution', ka: 'Issue management', ref: false,
    inputs: 'The project’s issue log plus project context.',
    grounding: 'The canonical issues table (the live issue log) + the project header.',
    rules: 'Severity × age prioritisation; ownership-gap detection; flags items blocking closeout.',
    boundary: 'Does not resolve issues or assign new owners.',
    reads: 'issues table', feeds: 'Lessons · Closeout' },
  { at: 'variance_analyst', phase: 'Monitoring', ka: 'Earned Value Management (PMBOK)', ref: false,
    inputs: 'The computed earned-value figures plus the variance-report history.',
    grounding: 'Structured facts — PV/EV/AC → CPI/SPI/EAC/VAC computed in code from the canonical WBS + cost + progress (not by the model) — plus the variance_reports table.',
    rules: 'Earned Value Management (PMBOK); summarise the latest position + trend across reporting weeks; flag thresholds and projected margin.',
    boundary: 'Does not compute portfolio-wide trend; does not replace the monthly variance committee.',
    reads: 'computed EV · variance history', feeds: 'Status · Closeout' },
  { at: 'change_order_reviewer', phase: 'Monitoring', ka: 'Integrated change control (four-frame)', ref: false,
    inputs: 'One change order + Charter + WBS + Cost Baseline + project.',
    grounding: 'The selected change_orders row + the project header + the canonical structure.',
    rules: 'Northwood four-frame analysis (scope / schedule / cost / contract); assess margin protection; recommend the approval routing.',
    boundary: 'Does not create change orders or negotiate commercial terms.',
    reads: 'one change order · Charter · WBS · Cost', feeds: 'Budget · Margin bridge' },
  { at: 'risk_analyst', phase: 'Monitoring', ka: 'PMBOK KA 11 — Risk Management', ref: false,
    inputs: 'The project’s risk register (or a project brief).',
    grounding: 'The canonical risks table + project context.',
    rules: 'PMBOK 7 risk management + Northwood’s six-class cross-cutting taxonomy; quantifies EMV + inherent→residual; surfaces the top three to watch.',
    boundary: 'No cross-portfolio patterns (that is the Portfolio Risk Reviewer); no mitigations without project context.',
    reads: 'risks register', feeds: 'Portfolio Risk Reviewer · Budget (contingency)' },
  { at: 'lessons_learned_synthesiser', phase: 'Closeout', ka: 'Lessons learned / knowledge', ref: false,
    inputs: 'The project’s records — risks, issues, change orders, variance and the planning artefacts.',
    grounding: 'The canonical domain tables (risks / issues / change_orders / variance_reports) + project context.',
    rules: 'Northwood situation→action→outcome→generalisation; 4–6 themes; 3–7 firm-level lessons each mapped to an adoption pathway; hedges uncertain causation.',
    boundary: 'Does not replace post-mortem facilitation; works only from what is in the data (no tacit knowledge).',
    reads: 'risks · issues · COs · variance', feeds: 'Closeout · firm knowledge base' },
  { at: 'closeout_reporter', phase: 'Closeout', ka: 'PMBOK §4.7 — Close Project', ref: false,
    inputs: 'The full project record — baseline vs actual cost/schedule, scope changes, risk closeout, lessons, outstanding items.',
    grounding: 'Project header (baseline) + the canonical cost / schedule / change / risk data + variance_reports.',
    rules: 'PMBOK Close Project; final outcome vs the original baseline; scope-change history and risk closeout; Northwood closeout template.',
    boundary: 'Does not trigger contractual closeout activities or settle warranty claims.',
    reads: 'full project record · baseline vs actual', feeds: 'final closeout report' },
  { at: 'status_reporter', phase: 'Monitoring', ka: 'PMBOK §4.5 — Performance reporting', ref: false,
    inputs: 'PM notes and observations + project data; plus the audience to tailor to.',
    grounding: 'The project data — variance, risks, issues, change orders, milestones — plus whatever the PM provides.',
    rules: 'PMBOK performance reporting; a one-page RAG report, audience-adapted (team / sponsor / client); always surfaces active change orders; substantiates the RAG the PM set.',
    boundary: 'Does not invent percentages, dates or costs; does not compute earned value (that is the Variance Analyst); does not pick the RAG colour for you.',
    reads: 'variance · risks · issues · COs · milestones · PM notes', feeds: 'team / sponsor / client report' },
  { at: 'portfolio_risk_reviewer', phase: 'Portfolio', ka: 'Portfolio risk (cross-cutting taxonomy)', ref: false,
    inputs: 'Risks across multiple active projects in the portfolio.',
    grounding: 'The risks table across all active projects + the firm-level pattern catalogue (portfolio_patterns).',
    rules: 'Northwood cross-cutting taxonomy with a pattern-emergence threshold of 2+ projects; aggregate by class; recommend portfolio-level mitigation.',
    boundary: 'No single-project deep dives (that is the Risk Analyst); does not produce a project risk register.',
    reads: 'risks across active projects · patterns', feeds: 'portfolio-level mitigations' },
  { at: 'cost_controller', phase: 'Monitoring', ka: 'SAP PS cost lifecycle (Budget → Commitment → Actual) + earned-vs-billed', ref: false,
    inputs: 'Purchase-order commitments, cost actuals by element, labour hours, billing/invoices, and the cost baseline.',
    grounding: 'The canonical cost tables — purchase_orders, cost_actuals (by value category), resource_assignments (hours + rate), billing_events — joined on the WBS code.',
    rules: 'Reports cost-to-date = actual + open commitment; cost by element; labour productivity; commitment-aware EAC; earned vs billed revenue with net unbilled (WIP); everything reconciled to the WBS.',
    boundary: 'Does not compute the EVM variance indices in depth (that is the Variance Analyst); does not raise or approve POs, invoices or change orders.',
    reads: 'POs · cost actuals · hours · billing', feeds: 'Variance Analyst · Change Order Reviewer · Status Reporter' },
];

export function AgentProfilesRich({ token }: { token: string }) {
  const [open, setOpen] = useState<AgentType | null>(null);
  const entryOf = (at: AgentType) => AGENT_CATALOG.find((a) => a.agent_type === at);
  const refCount = PROFILES.filter((p) => p.ref).length;

  return (
    <div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border bg-card px-2.5 py-1 font-medium">15 specialist agents</span>
        <span className="rounded-full border bg-card px-2.5 py-1 font-medium">{refCount} reference-grounded authoring</span>
        <span className="rounded-full border bg-card px-2.5 py-1 font-medium">{15 - refCount} read-only synthesis</span>
        <span className="rounded-full border bg-card px-2.5 py-1 font-medium">All run on Claude Opus · a Haiku router triages</span>
      </div>

      {PHASES.map((phase) => {
        const ps = PROFILES.filter((p) => p.phase === phase);
        if (!ps.length) return null;
        return (
          <section key={phase} className="mt-7">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{phase}</h2>
              <span className="text-xs text-muted-foreground">{PHASE_BLURB[phase]}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ps.map((p) => {
                const entry = entryOf(p.at);
                const sc = SCOPE[entry?.scope ?? 'project'];
                const Icon = AGENT_ICON[p.at] ?? FileText;
                return (
                  <div key={p.at} className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
                    {/* scope-tinted hero, like the /agents deck */}
                    <div className="p-4" style={{ background: `linear-gradient(135deg, ${sc.c}1f, ${sc.c}08)`, borderBottom: `1px solid ${sc.c}26` }}>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: `${sc.c}26`, color: sc.c }}><Icon size={22} strokeWidth={2} /></span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-base font-bold tracking-tight">{entry?.name ?? p.at}</h3>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${sc.c}26`, color: sc.c }}>{sc.label}</span>
                            {p.ref && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700" title="Grounded in a comparable past project">Reference-grounded</span>}
                          </div>
                          {entry?.purpose && <p className="mt-0.5 text-xs text-foreground/70">{entry.purpose}</p>}
                          <p className="mt-1 text-[11px] font-medium" style={{ color: sc.c }}>{p.ka} · Claude Opus</p>
                        </div>
                      </div>
                    </div>

                    {/* technical body */}
                    <div className="flex flex-1 flex-col p-4">
                      <div className="space-y-1.5">
                        <p className="text-[13px] leading-relaxed"><span className="font-semibold text-foreground/80">Inputs: </span><span className="text-muted-foreground">{p.inputs}</span></p>
                        <p className="text-[13px] leading-relaxed"><span className="font-semibold text-foreground/80">Grounding: </span><span className="text-muted-foreground">{p.grounding}</span></p>
                        <p className="text-[13px] leading-relaxed"><span className="font-semibold text-foreground/80">Rules: </span><span className="text-muted-foreground">{p.rules}</span></p>
                        <p className="text-[13px] leading-relaxed"><span className="font-semibold text-foreground/80">Boundary: </span><span className="text-muted-foreground">{p.boundary}</span></p>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span><span className="font-semibold text-foreground/60">reads ← </span>{p.reads}</span>
                        <span><span className="font-semibold text-foreground/60">feeds → </span>{p.feeds}</span>
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t pt-2.5">
                        <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground/80">lib/agent-prompts/{p.at}.md</code>
                        <button onClick={() => setOpen(p.at)} className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: sc.c }}>Meet the agent <ArrowRight size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={() => setOpen(null)}>
          <div className="relative w-full max-w-2xl rounded-2xl border bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(null)} aria-label="Close" className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground"><X size={16} /></button>
            <AgentDetailCard agentType={open} token={token} />
          </div>
        </div>
      )}

      <div className="mt-8"><Link href={`/technical`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">← Technical notes</Link></div>
    </div>
  );
}
