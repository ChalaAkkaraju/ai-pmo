'use client';

/**
 * PMBOK process matrix as a COVERAGE map. Rows = the 10 knowledge areas,
 * columns = the 5 process groups (which read left-to-right as the lifecycle).
 * Every process is colour-coded by WHO OWNS IT, using the SAME colour code and
 * legend as the end-to-end process flow on /architecture: green = AI PMO (split
 * into authoring vs read-only synthesis), blue = SAP PS (ERP), amber = the
 * scheduler, violet = human-in-the-loop. Each process is clickable and opens a
 * popup describing the process and how this model handles it.
 */

import { useEffect, useState } from 'react';

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

type Proc = { p: string; o: Own; d: string };
type Row = { ka: string; cells: Proc[][] };

const MATRIX: Row[] = [
  { ka: 'Integration', cells: [
    [{ p: 'Develop Project Charter', o: 'author', d: 'Authorises the project and records objectives, high-level scope and the sponsor. The Charter Drafter agent drafts it from the booked baseline for PM approval.' }],
    [{ p: 'Develop PM Plan', o: 'author', d: 'Consolidates the subsidiary plans into one integrated baseline. The AI assembles the planning artefacts (WBS, budget, comms) into a coherent plan; the PM owns sign-off.' }],
    [{ p: 'Direct & Manage Work', o: 'human', d: 'Actually executing the work to produce deliverables. Stays with the delivery team — the AI neither performs nor directs the work.' }, { p: 'Manage Knowledge', o: 'author', d: 'Capturing and reusing knowledge. The AI surfaces and drafts reusable knowledge (reference-project grounding, lessons) to ground new work.' }],
    [{ p: 'Monitor & Control Work', o: 'synth', d: 'Tracking overall progress against the plan. The AI synthesises status read-only — earned value, variance and a narrative brief — without changing source data.' }, { p: 'Integrated Change Control', o: 'synth', d: 'Reviewing and dispositioning change requests. The Change Order Reviewer analyses each change and its cost/margin impact read-only; approval stays with governance.' }],
    [{ p: 'Close Project', o: 'author', d: 'Finalising and archiving the project. The Closeout Reporter drafts the final report and archive package.' }],
  ] },
  { ka: 'Scope', cells: [
    [],
    [{ p: 'Plan Scope Mgmt', o: 'author', d: 'How scope will be defined and controlled. Drafted by the AI as part of the plan.' }, { p: 'Collect Requirements', o: 'human', d: 'Eliciting stakeholder requirements. A human activity — the AI does not gather requirements.' }, { p: 'Define Scope', o: 'author', d: 'The detailed scope statement. The AI drafts a scope-true description from the booked baseline.' }, { p: 'Create WBS', o: 'author', d: 'Decomposing scope into the work breakdown structure. The WBS Builder authors a scope-true WBS for approval, then it is booked into SAP PS.' }],
    [],
    [{ p: 'Validate Scope', o: 'human', d: 'Formal customer acceptance of deliverables. Human-led.' }, { p: 'Control Scope', o: 'synth', d: 'Monitoring scope and scope change. The AI synthesises scope and variance read-only.' }],
    [],
  ] },
  { ka: 'Schedule', cells: [
    [],
    [{ p: 'Plan Schedule Mgmt', o: 'author', d: 'How the schedule will be developed and controlled. Drafted by the AI.' }, { p: 'Define Activities', o: 'scheduler', d: 'Breaking work packages into activities. Lives in the scheduler (P6 / MS Project / Dataverse); the AI reads it, it does not author activities.' }, { p: 'Sequence Activities', o: 'scheduler', d: 'Setting dependencies between activities. Owned by the scheduler; the AI consumes the network, it does not build it.' }, { p: 'Estimate Durations', o: 'scheduler', d: 'Estimating activity durations. Owned by the planner in the scheduler.' }, { p: 'Develop Schedule', o: 'scheduler', d: 'Building the working schedule and critical path. This is the scheduler’s job — the AI never produces dated schedules.' }],
    [],
    [{ p: 'Control Schedule', o: 'synth', d: 'Monitoring schedule performance. The Schedule Reasoner analyses critical path, float and the contractual window read-only; SPI comes from the Variance Analyst.' }],
    [],
  ] },
  { ka: 'Cost', cells: [
    [],
    [{ p: 'Plan Cost Mgmt', o: 'author', d: 'How costs will be estimated and controlled. Drafted by the AI.' }, { p: 'Estimate Costs', o: 'author', d: 'Cost estimates across the work packages. The Budget Builder drafts these against the approved WBS.' }, { p: 'Determine Budget', o: 'erp', d: 'Baselining the authorised cost budget. The approved budget is booked into SAP PS, the system of record for cost.' }],
    [],
    [{ p: 'Control Costs (EV)', o: 'synth', d: 'Earned-value cost control. The Variance Analyst computes PV/EV/AC → CPI/EAC/VAC read-only — the flagship synthesis of this layer.' }],
    [],
  ] },
  { ka: 'Quality', cells: [
    [],
    [{ p: 'Plan Quality Mgmt', o: 'human', d: 'Defining quality standards and how they will be met. Domain-engineering and human-led — outside the AI footprint in this model.' }],
    [{ p: 'Manage Quality', o: 'human', d: 'Auditing that quality processes are followed. Human-led.' }],
    [{ p: 'Control Quality', o: 'human', d: 'Inspecting deliverables against quality criteria. Human-led.' }],
    [],
  ] },
  { ka: 'Resource', cells: [
    [],
    [{ p: 'Plan Resource Mgmt', o: 'author', d: 'How team and physical resources will be estimated and managed. Drafted by the AI.' }, { p: 'Estimate Activity Resources', o: 'scheduler', d: 'Resource loading against activities. Lives in the scheduler alongside the dates.' }],
    [{ p: 'Acquire Resources', o: 'human', d: 'Securing the people and physical resources. Human-led.' }, { p: 'Develop Team', o: 'human', d: 'Building team capability and cohesion. Human-led.' }, { p: 'Manage Team', o: 'human', d: 'Leading and coordinating the team day to day. Human-led.' }],
    [{ p: 'Control Resources', o: 'synth', d: 'Monitoring resource demand versus capacity. The AI synthesises the FTE demand and over-allocation view read-only.' }],
    [],
  ] },
  { ka: 'Communications', cells: [
    [],
    [{ p: 'Plan Communications', o: 'author', d: 'The communications plan — who needs what, when, how. The Communications Planner drafts it.' }],
    [{ p: 'Manage Communications', o: 'human', d: 'Actually communicating with stakeholders. Human-led — the AI drafts, people deliver.' }],
    [{ p: 'Monitor Communications', o: 'synth', d: 'Checking communications are landing and adjusting. The AI synthesises status read-only.' }],
    [],
  ] },
  { ka: 'Risk', cells: [
    [],
    [{ p: 'Plan Risk Mgmt', o: 'author', d: 'How risk will be identified, analysed and managed. Drafted by the AI.' }, { p: 'Identify Risks', o: 'author', d: 'Surfacing project risks. The Risk Analyst drafts a structured risk register.' }, { p: 'Qualitative Analysis', o: 'synth', d: 'Prioritising risks by probability and impact. Synthesised read-only.' }, { p: 'Quantitative Analysis', o: 'synth', d: 'Numerically analysing exposure and contingency. Synthesised read-only.' }, { p: 'Plan Risk Responses', o: 'author', d: 'Drafting mitigation and response actions for PM approval.' }],
    [{ p: 'Implement Risk Responses', o: 'human', d: 'Executing the agreed risk responses. Human-led.' }],
    [{ p: 'Monitor Risks', o: 'synth', d: 'Tracking risk status over time. Synthesised read-only; cross-project patterns via the Portfolio Risk Reviewer.' }],
    [],
  ] },
  { ka: 'Procurement', cells: [
    [],
    [{ p: 'Plan Procurement Mgmt', o: 'author', d: 'The procurement approach — make-or-buy, contract types. Drafted by the AI.' }],
    [{ p: 'Conduct Procurements', o: 'human', d: 'Running tenders and awarding contracts. Human-led.' }],
    [{ p: 'Control Procurements', o: 'synth', d: 'Monitoring supplier performance and commitments. Synthesised read-only from the ERP commitments.' }],
    [],
  ] },
  { ka: 'Stakeholder', cells: [
    [{ p: 'Identify Stakeholders', o: 'author', d: 'Building the stakeholder register. The Stakeholder Analyst drafts it.' }],
    [{ p: 'Plan Stakeholder Engagement', o: 'author', d: 'The engagement strategy per stakeholder. Drafted by the AI.' }],
    [{ p: 'Manage Stakeholder Engagement', o: 'human', d: 'Actually engaging stakeholders. Human-led.' }],
    [{ p: 'Monitor Stakeholder Engagement', o: 'synth', d: 'Tracking engagement effectiveness. Synthesised read-only.' }],
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
    </button>
  );
}

export function FrameworkMatrix() {
  const [sel, setSel] = useState<Selected | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const s = sel ? OWN[sel.proc.o] : null;

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
      <p className="text-xs text-muted-foreground">Tip: click any process to see what it is and how this model handles it.</p>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 font-semibold">Knowledge area</th>
              {GROUPS.map((g) => (
                <th key={g} className="px-3 py-2 font-semibold">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
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

      {/* Popup */}
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
              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">PMBOK process · coloured by who owns it in this model — same colour code as the process flow.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
