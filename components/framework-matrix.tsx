'use client';

/**
 * PMBOK process matrix as a COVERAGE map. Rows = the 10 knowledge areas,
 * columns = the 5 process groups (which read left-to-right as the lifecycle).
 * Every process is colour-coded by WHO OWNS IT, using the SAME colour code and
 * legend as the end-to-end process flow on /architecture. Each process is
 * clickable and opens a popup describing it; AI-owned processes link on to the
 * agent that does the work (the shared rich agent card).
 */

import { useEffect, useState } from 'react';
import { AGENT_CATALOG } from '@/lib/agent-catalog';
import type { AgentType } from '@/lib/types';
import { AgentDetailCard } from '@/components/agent-detail-card';

type Own = 'author' | 'synth' | 'erp' | 'scheduler' | 'human';

// Palette matches the swim-lane / process-flow legend exactly.
const OWN: Record<Own, { label: string; bg: string; bd: string; tx: string; dot: string }> = {
  author:    { label: 'AI PMO — authors',                 bg: '#EAF3DE', bd: '#97C459', tx: '#3B6D11', dot: '#3B6D11' },
  synth:     { label: 'AI PMO — synthesises (read-only)', bg: '#F4F9EC', bd: '#BFD89A', tx: '#5C8A1E', dot: '#97C459' },
  erp:       { label: 'SAP PS — ERP',                     bg: '#E6F1FB', bd: '#85B7EB', tx: '#185FA5', dot: '#85B7EB' },
  scheduler: { label: 'Scheduler',                        bg: '#FAEEDA', bd: '#FAC775', tx: '#854F0B', dot: '#E0A23C' },
  human:     { label: 'Human-in-the-loop',                bg: '#EEEDFE', bd: '#AFA9EC', tx: '#534AB7', dot: '#AFA9EC' },
};

const GROUPS = ['Initiating', 'Planning', 'Executing', 'Monitoring & Controlling', 'Closing'];

type Proc = { p: string; o: Own; d: string; ag?: AgentType };
type Row = { ka: string; cells: Proc[][] };

const MATRIX: Row[] = [
  { ka: 'Integration', cells: [
    [{ p: 'Develop Project Charter', o: 'author', ag: 'charter_drafter', d: "The charter formally authorises the project and gives the PM authority to apply resources — it records the objectives, high-level scope, success criteria and the sponsor. The Charter Drafter agent drafts it from the booked commercial baseline (the as-sold scope and value), so the first artefact exists in minutes rather than from a blank page. The PM reviews, edits and approves; the AI never finalises it unilaterally." }],
    [{ p: 'Develop PM Plan', o: 'author', d: "The integrated project management plan consolidates the subsidiary plans — scope, schedule approach, cost, communications, risk — into one coherent baseline that guides execution. Here the AI assembles the individual artefacts it has drafted (WBS, budget, comms plan) into that integrated view, keeping them consistent with each other and with the booked baseline. It is an assembly step rather than the work of a single dedicated agent, and the PM owns sign-off." }],
    [{ p: 'Direct & Manage Work', o: 'human', d: "This is the actual execution of the work to produce the project's deliverables — the engineering, procurement and construction. It sits firmly with the delivery team and the line organisation; the AI neither performs the work nor directs the people doing it. The layer only observes the results once they appear in the ERP and the scheduler." }, { p: 'Manage Knowledge', o: 'author', ag: 'lessons_learned_synthesiser', d: "Using existing knowledge and creating new knowledge so this project — and the next one — benefit from what has been learned. The AI supports this by surfacing and drafting reusable knowledge: it grounds new projects in comparable past ones (reference-project grounding), and the Lessons-Learned Synthesiser captures what worked and what to change. People still decide what to carry forward." }],
    [{ p: 'Monitor & Control Work', o: 'synth', ag: 'status_reporter', d: "Tracking, reviewing and reporting overall progress against the plan so the team and sponsor share a true picture. This is squarely where the layer earns its keep: it synthesises status read-only — earned value, variance, risks and a narrative — and the Status Reporter assembles a one-page RAG brief tailored to the audience. It reads the systems of record; it never edits the underlying cost or schedule data." }, { p: 'Integrated Change Control', o: 'synth', ag: 'change_order_reviewer', d: "Reviewing all change requests, assessing their impact and approving or rejecting them so the baselines stay controlled. The Change Order Reviewer analyses each change order and its knock-on effect on cost, margin and the schedule window, read-only, and flags what needs attention. The approval decision itself stays with the project's governance — the AI informs it, it does not make it." }],
    [{ p: 'Close Project', o: 'author', ag: 'closeout_reporter', d: "Finalising all activities, handing over deliverables and formally closing the project or phase, including the archive. The Closeout Reporter drafts the final report — outcomes against the baseline, realised margin, lessons — and assembles the archive package. The PM confirms acceptance and signs off the closure." }],
  ] },
  { ka: 'Scope', cells: [
    [],
    [{ p: 'Plan Scope Mgmt', o: 'author', d: "Defining how scope will be defined, validated and controlled across the project — the approach, not the scope itself. The AI drafts this as part of the planning pass, consistent with the charter and the booked baseline. It is a planning artefact rather than the output of a dedicated specialist agent." }, { p: 'Collect Requirements', o: 'human', d: "Eliciting, documenting and managing stakeholder needs — the raw input that scope is built from. This is a human, conversation-heavy activity; the AI does not interview stakeholders or invent requirements. What stakeholders agree becomes the input the AI then structures." }, { p: 'Define Scope', o: 'author', d: "Developing the detailed scope statement — what is and is not included — from the requirements and the as-sold baseline. The AI drafts a scope-true description so the WBS that follows is anchored to the real contractual scope. The PM refines and confirms the boundary." }, { p: 'Create WBS', o: 'author', ag: 'wbs_builder', d: "Decomposing the scope into a hierarchy of deliverable-oriented work packages — the WBS that everything else (cost, schedule, progress) is joined on. The WBS Builder authors a scope-true WBS for PM approval, then it is booked into SAP PS as the system of record; this is the one place the layer writes upstream rather than only reading. Every downstream task and cost actual is tagged to this structure by WBS code." }],
    [],
    [{ p: 'Validate Scope', o: 'human', d: "Formal acceptance of completed deliverables by the customer or sponsor. This is a sign-off conversation between people; the AI plays no part in granting acceptance. It can, however, surface the evidence — progress, variance — that supports the conversation." }, { p: 'Control Scope', o: 'synth', d: "Monitoring the status of scope and managing changes to the scope baseline so scope creep is caught early. The AI synthesises scope and variance read-only, showing where delivered work is drifting from the baseline. There is no dedicated scope-control agent — it is part of the general monitoring synthesis." }],
    [],
  ] },
  { ka: 'Schedule', cells: [
    [],
    [{ p: 'Plan Schedule Mgmt', o: 'author', d: "Establishing how the schedule will be developed, managed and controlled — the policies, not the dates. The AI drafts this approach during planning. The schedule itself is built elsewhere, by the planner in the scheduling tool." }, { p: 'Define Activities', o: 'scheduler', d: "Breaking the work packages down into the specific activities needed to produce them. This lives in the scheduling tool (Primavera P6 / Microsoft Project) where the planner works; the AI reads the resulting activities but never authors them. The WBS code is what ties each activity back to the structure the AI did author." }, { p: 'Sequence Activities', o: 'scheduler', d: "Identifying and documenting the dependencies between activities to form the schedule network. This is the planner's craft in the scheduler; the AI consumes the network for critical-path reasoning but does not build or re-sequence it. Keeping it here is a deliberate boundary — the layer reasons about the schedule, it does not replace scheduling software." }, { p: 'Estimate Durations', o: 'scheduler', d: "Estimating how long each activity will take given the resources assigned. Owned by the planner in the scheduler, drawing on discipline knowledge and norms. The AI reads the durations as part of the forecast; it does not set them." }, { p: 'Develop Schedule', o: 'scheduler', d: "Analysing the activities, durations and dependencies to produce the working schedule and the critical path. This is the heart of the scheduler's job and stays entirely there — the AI never produces a dated schedule. It reads the published schedule to reason about float, the critical path and whether the forecast still fits the contractual window." }],
    [],
    [{ p: 'Control Schedule', o: 'synth', ag: 'schedule_reasoner', d: "Monitoring schedule status and managing changes to the schedule baseline. The Schedule Reasoner analyses the critical path, float and whether the live forecast finish still falls inside the contractual window — all read-only. The schedule performance index (SPI) comes from the Variance Analyst's earned-value pass; the reasoner adds the critical-path and window narrative on top." }],
    [],
  ] },
  { ka: 'Cost', cells: [
    [],
    [{ p: 'Plan Cost Mgmt', o: 'author', d: "Defining how costs will be estimated, budgeted and controlled. The AI drafts this approach during planning, consistent with the WBS and the as-sold margin. A planning artefact, not a dedicated agent's output." }, { p: 'Estimate Costs', o: 'author', ag: 'budget_builder', d: "Developing an estimate of the cost of each work package. The Budget Builder drafts these estimates across the approved WBS, grounded where possible in comparable past projects. The PM adjusts, and the figures feed the budget that is booked to SAP." }, { p: 'Determine Budget', o: 'erp', d: "Aggregating the cost estimates into an authorised, time-phased cost baseline. In this model the approved budget is booked into SAP PS, the system of record for cost — so the baseline lives in the ERP, not the layer. From then on the layer reads actuals against it." }],
    [],
    [{ p: 'Control Costs (EV)', o: 'synth', ag: 'variance_analyst', d: "Monitoring cost performance and managing changes to the cost baseline — classic earned-value management. The Variance Analyst computes PV, EV and AC and derives CPI, EAC and VAC, entirely read-only against the SAP actuals joined to the WBS. This is the flagship synthesis of the whole layer: turning raw cost and progress into a defensible performance picture." }],
    [],
  ] },
  { ka: 'Quality', cells: [
    [],
    [{ p: 'Plan Quality Mgmt', o: 'human', d: "Identifying the quality requirements and standards for the project and its deliverables, and how compliance will be demonstrated. This is discipline-engineering and assurance work led by quality and technical specialists — it sits outside the layer's footprint in this model. The layer does not define or assess technical quality." }],
    [{ p: 'Manage Quality', o: 'human', d: "Translating the quality plan into executable activities and auditing that the right processes are being followed. A human assurance activity; the AI is not involved in quality auditing here." }],
    [{ p: 'Control Quality', o: 'human', d: "Inspecting and testing deliverables to verify they meet the quality criteria. Hands-on, domain-specific and human-led — the AI plays no part in technical inspection." }],
    [],
  ] },
  { ka: 'Resource', cells: [
    [],
    [{ p: 'Plan Resource Mgmt', o: 'author', d: "Defining how team and physical resources will be estimated, acquired, managed and released. The AI drafts this approach during planning. The actual loading lives in the scheduler and the staffing decisions stay with people." }, { p: 'Estimate Activity Resources', o: 'scheduler', d: "Estimating the team and physical resources each activity needs. Resource loading is done against the activities in the scheduler, alongside the dates; the AI reads the resulting demand profile but does not set the loadings." }],
    [{ p: 'Acquire Resources', o: 'human', d: "Securing the people, equipment and materials the project needs. A management and commercial activity — negotiating for staff, raising orders — that stays with people. The AI can show where demand exceeds capacity to inform it." }, { p: 'Develop Team', o: 'human', d: "Improving the competencies and cohesion of the team. Inherently human — coaching, training, team-building — and entirely outside the AI's remit." }, { p: 'Manage Team', o: 'human', d: "Tracking team performance, giving feedback and resolving issues to optimise delivery. People-leadership work; the AI does not manage or appraise people." }],
    [{ p: 'Control Resources', o: 'synth', d: "Ensuring resources are available as planned and monitoring demand against capacity. The AI synthesises the FTE demand-versus-capacity picture read-only, surfacing over-allocations across disciplines. There is no dedicated resource agent — it is part of the general monitoring synthesis." }],
    [],
  ] },
  { ka: 'Communications', cells: [
    [],
    [{ p: 'Plan Communications', o: 'author', ag: 'communications_planner', d: "Developing the approach for project communications — who needs what information, in what form and how often. The Communications Planner drafts the plan from the stakeholder register and the project's shape. People then run the actual communication." }],
    [{ p: 'Manage Communications', o: 'human', d: "Creating, distributing and storing the project's communications as planned. The act of communicating — meetings, briefings, conversations — stays with people; the AI drafts material but does not deliver it or hold the relationships." }],
    [{ p: 'Monitor Communications', o: 'synth', d: "Ensuring the communication needs of the project and its stakeholders are being met, and adjusting if not. The AI synthesises status read-only to show whether the right information is flowing. No dedicated agent — part of the monitoring synthesis." }],
    [],
  ] },
  { ka: 'Risk', cells: [
    [],
    [{ p: 'Plan Risk Mgmt', o: 'author', d: "Defining how risk management will be conducted — appetite, categories, scoring scales and cadence. The AI drafts this approach during planning so the risk register that follows is consistent. A planning artefact rather than a dedicated agent's output." }, { p: 'Identify Risks', o: 'author', ag: 'risk_analyst', d: "Determining which risks may affect the project and documenting their characteristics. The Risk Analyst drafts a structured risk register from the project's shape and comparable past projects, giving the team a strong starting set to challenge and extend. People own which risks are real." }, { p: 'Qualitative Analysis', o: 'synth', ag: 'risk_analyst', d: "Prioritising risks for further attention by assessing probability and impact. The Risk Analyst synthesises this scoring read-only, ordering the register so attention goes to what matters. Judgement on the scores stays with the team." }, { p: 'Quantitative Analysis', o: 'synth', ag: 'risk_analyst', d: "Numerically analysing the combined effect of risks on objectives — exposure and contingency adequacy. The Risk Analyst synthesises this read-only against the cost and contingency data. It informs, but does not set, the contingency decision." }, { p: 'Plan Risk Responses', o: 'author', ag: 'risk_analyst', d: "Developing options and actions to reduce threats and enhance opportunities. The Risk Analyst drafts candidate mitigation and response actions for each significant risk, for the PM to approve and assign. The AI proposes; people commit." }],
    [{ p: 'Implement Risk Responses', o: 'human', d: "Carrying out the agreed risk response plans. Execution sits with the owners the PM assigns; the AI tracks status but does not perform the responses." }],
    [{ p: 'Monitor Risks', o: 'synth', ag: 'risk_analyst', d: "Tracking identified risks, watching for new ones and evaluating how well responses are working over time. The Risk Analyst synthesises risk status read-only each cycle, and cross-project patterns are surfaced separately by the Portfolio Risk Reviewer. The register stays under human ownership." }],
    [],
  ] },
  { ka: 'Procurement', cells: [
    [],
    [{ p: 'Plan Procurement Mgmt', o: 'author', d: "Deciding what to make versus buy and documenting the procurement approach and contract types. The AI drafts this approach during planning. The actual sourcing and contracting stay with the commercial team." }],
    [{ p: 'Conduct Procurements', o: 'human', d: "Obtaining seller responses, selecting sellers and awarding contracts. A commercial and legal activity led by people; the AI plays no part in tendering or award." }],
    [{ p: 'Control Procurements', o: 'synth', d: "Managing procurement relationships, monitoring contract performance and managing changes. The AI synthesises read-only from the ERP's commitments and POs to show supplier exposure. No dedicated agent — part of the monitoring synthesis." }],
    [],
  ] },
  { ka: 'Stakeholder', cells: [
    [{ p: 'Identify Stakeholders', o: 'author', ag: 'stakeholder_analyst', d: "Identifying the people, groups and organisations that could affect or be affected by the project, and capturing their interest and influence. The Stakeholder Analyst drafts the stakeholder register from the project's context for the PM to refine. People confirm who really matters." }],
    [{ p: 'Plan Stakeholder Engagement', o: 'author', ag: 'stakeholder_analyst', d: "Developing approaches to engage stakeholders based on their needs, interests and potential impact. The Stakeholder Analyst drafts the engagement strategy per stakeholder. The relationships themselves are owned and run by people." }],
    [{ p: 'Manage Stakeholder Engagement', o: 'human', d: "Communicating and working with stakeholders to meet their needs, address issues and foster engagement. This is relationship work — firmly human; the AI prepares material but does not engage stakeholders." }],
    [{ p: 'Monitor Stakeholder Engagement', o: 'synth', d: "Monitoring stakeholder relationships and tailoring engagement strategies as things change. The AI synthesises read-only signals on whether engagement is working. No dedicated agent — part of the monitoring synthesis." }],
    [],
  ] },
];

type Selected = { proc: Proc; ka: string; group: string };

function Chip({ proc, onClick }: { proc: Proc; onClick: () => void }) {
  const s = OWN[proc.o];
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:brightness-95 hover:shadow-sm"
      style={{ backgroundColor: s.bg, borderColor: s.bd, color: s.tx }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />
      {proc.p}
      {proc.ag && <span className="ml-0.5 text-[10px] leading-none opacity-60" aria-hidden>⚙</span>}
    </button>
  );
}

export function FrameworkMatrix({ token }: { token: string }) {
  const [sel, setSel] = useState<Selected | null>(null);
  const [agent, setAgent] = useState<AgentType | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (agent) setAgent(null);
      else setSel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agent]);

  const s = sel ? OWN[sel.proc.o] : null;
  const agentName = sel?.proc.ag ? AGENT_CATALOG.find((a) => a.agent_type === sel.proc.ag)?.name : null;

  return (
    <div className="space-y-4">
      {/* Legend — same colour code as the process flow */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {(Object.keys(OWN) as Own[]).map((o) => (
          <span key={o} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: OWN[o].bd }} />
            {OWN[o].label}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Tip: click any process to see what it is and how this model handles it. Green processes marked ⚙ are handled by a dedicated agent — click through to meet it.</p>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="border-b bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 font-semibold">Knowledge area</th>
              {GROUPS.map((g) => (
                <th key={g} className="px-3 py-2 font-semibold">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y [&>tr:nth-child(even)]:bg-muted/50">
            {MATRIX.map((row) => (
              <tr key={row.ka} className="align-top">
                <th className="sticky left-0 z-10 bg-card px-3 py-3 text-sm font-semibold">{row.ka}</th>
                {row.cells.map((cell, i) => (
                  <td key={i} className="px-2.5 py-3">
                    {cell.length === 0 ? (
                      <span className="text-muted-foreground/30">—</span>
                    ) : (
                      <div className="flex flex-col flex-wrap gap-1">
                        {cell.map((proc) => (
                          <Chip key={proc.p} proc={proc} onClick={() => setSel({ proc, ka: row.ka, group: GROUPS[i] })} />
                        ))}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Process popup */}
      {sel && s && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={() => setSel(null)}>
          <div className="relative my-8 w-full max-w-lg rounded-2xl border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setSel(null)} aria-label="Close" className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">✕</button>
            <div className="p-5">
              <div className="rounded-xl border p-4" style={{ backgroundColor: s.bg, borderColor: s.bd }}>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#ffffffcc', color: s.tx }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.dot }} />
                  {s.label}
                </span>
                <h2 className="mt-2 text-xl font-bold tracking-tight" style={{ color: s.tx }}>{sel.proc.p}</h2>
                <p className="mt-0.5 text-xs" style={{ color: s.tx }}>{sel.ka} · {sel.group}</p>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-foreground/85">{sel.proc.d}</p>
              {sel.proc.ag && agentName && (
                <button
                  type="button"
                  onClick={() => setAgent(sel.proc.ag!)}
                  className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                  style={{ borderColor: s.bd, color: s.tx }}
                >
                  Meet the {agentName} →
                </button>
              )}
              {!sel.proc.ag && (sel.proc.o === 'author' || sel.proc.o === 'synth') && (
                <p className="mt-4 rounded-md border border-dashed px-3 py-2 text-[13px] text-muted-foreground" style={{ borderColor: s.bd }}>
                  No single dedicated agent — the AI produces this as part of the planning assembly / general read-only synthesis.
                </p>
              )}
              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">PMBOK process · coloured by who owns it in this model — same colour code as the process flow.</p>
            </div>
          </div>
        </div>
      )}

      {/* Agent popup (second level) — shared rich card */}
      {agent && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={() => setAgent(null)}>
          <div className="relative my-4 w-full max-w-3xl rounded-2xl border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setAgent(null)} aria-label="Close" className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">✕</button>
            <div className="max-h-[88vh] overflow-y-auto p-5">
              <AgentDetailCard agentType={agent} token={token} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
