'use client';

/**
 * Guided project-setup checklist.
 *
 * Shows the six planning artefacts in dependency order and walks the user
 * through producing each one. A step is:
 *   • done      — an agent_outputs row of that type exists for the project
 *   • available — its prerequisites are done and the current role can run it
 *   • locked    — prerequisites not yet done
 *   • blocked   — available, but the current role can't invoke that agent
 *
 * Clicking "Draft with …" dispatches a `pmo:ask-agent` window event that the
 * floating agent widget listens for: it opens, selects the agent, and
 * pre-fills a seeded prompt. The user reviews and hits Send (human in loop).
 * When the agent's output lands, refresh the page to see the step tick over.
 */

import { useState } from 'react';
import type { AgentType } from '@/lib/types';

interface Step {
  key: AgentType;
  n: number;
  label: string;
  desc: string;
  deps: AgentType[];
}

const STEPS: Step[] = [
  { key: 'charter_drafter', n: 1, label: 'Project Charter', desc: 'Purpose, objectives, scope, success criteria, governance.', deps: [] },
  { key: 'stakeholder_analyst', n: 2, label: 'Stakeholder Analysis', desc: 'Stakeholders, influence/interest, engagement approach.', deps: ['charter_drafter'] },
  { key: 'wbs_builder', n: 3, label: 'Work Breakdown Structure', desc: 'Decompose scope into phases and work packages.', deps: ['charter_drafter'] },
  { key: 'schedule_reasoner', n: 4, label: 'Schedule', desc: 'Critical path, milestones, sequencing, float, schedule risks.', deps: ['wbs_builder'] },
  { key: 'budget_builder', n: 5, label: 'Budget / Cost Breakdown', desc: 'Allocate budget across the work; contingency and reserve.', deps: ['wbs_builder', 'schedule_reasoner'] },
  { key: 'communications_planner', n: 6, label: 'Communications Plan', desc: 'Audiences, cadence, channels, escalation, reporting.', deps: ['stakeholder_analyst'] },
];

const LABEL: Record<AgentType, string> = {
  charter_drafter: 'Charter Drafter',
  stakeholder_analyst: 'Stakeholder Analyst',
  wbs_builder: 'WBS Builder',
  schedule_reasoner: 'Schedule Reasoner',
  budget_builder: 'Budget Builder',
  communications_planner: 'Communications Planner',
  issue_logger: 'Issue Logger',
  variance_analyst: 'Variance Analyst',
  change_order_reviewer: 'Change Order Reviewer',
  risk_analyst: 'Risk Analyst',
  lessons_learned_synthesiser: 'Lessons-Learned Synthesiser',
  closeout_reporter: 'Closeout Reporter',
  portfolio_risk_reviewer: 'Portfolio Risk Reviewer',
  status_reporter: 'Status Reporter',
  cost_controller: 'Cost Controller',
};

function seededPrompt(step: AgentType, name: string, code: string): string {
  const head = `for ${name} (${code}). Use the project's intake data sheet and facts as the basis`;
  switch (step) {
    case 'charter_drafter':
      return `Draft the Project Charter ${head}. Cover purpose, objectives, scope (in and out), success criteria, key assumptions, constraints, high-level milestones, and governance.`;
    case 'stakeholder_analyst':
      return `Produce the Stakeholder Analysis ${head}, building on the Charter already drafted. Identify stakeholders, their interests, an influence/interest assessment, and the engagement approach for each.`;
    case 'wbs_builder':
      return `Build the Work Breakdown Structure ${head}, based on the Charter scope. Decompose into phases and work packages with a short description and deliverable for each.`;
    case 'schedule_reasoner':
      return `Produce the schedule narrative ${head}, based on the WBS already drafted. Identify the critical path, key milestones, sequencing logic, float, and the main schedule risks.`;
    case 'budget_builder':
      return `Build the cost breakdown structure ${head}, based on the WBS and schedule already drafted. Allocate the approved budget across engineering, procurement, construction, commissioning, contingency, and management reserve, with cost-loading assumptions.`;
    case 'communications_planner':
      return `Produce the Communications Plan ${head}, building on the Stakeholder Analysis already drafted. Cover audiences, cadence, channels, escalation paths, and reporting formats.`;
    default:
      return `Draft the planning artefact ${head}.`;
  }
}

export function SetupChecklist({
  token: _token,
  projectCode,
  projectName,
  done,
  allowedAgents,
  defaultOpen = false,
}: {
  token: string;
  projectCode: string;
  projectName: string;
  done: string[];
  allowedAgents: AgentType[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const doneSet = new Set(done);
  const doneCount = STEPS.filter((s) => doneSet.has(s.key)).length;
  const allDone = doneCount === STEPS.length;

  function run(step: Step) {
    window.dispatchEvent(
      new CustomEvent('pmo:ask-agent', {
        detail: { agentType: step.key, prompt: seededPrompt(step.key, projectName, projectCode) },
      }),
    );
  }

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`group flex w-full items-center gap-2.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-white px-4 py-3 text-left shadow-sm transition hover:from-indigo-100 hover:via-sky-100 ${open ? 'rounded-b-none border-b-0' : ''}`}
        aria-expanded={open}
      >
        <span className="text-lg leading-none" aria-hidden="true">🧭</span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-indigo-900">Guided setup — build the planning artefacts</h2>
          <p className="text-xs text-indigo-900/60">
            {allDone ? 'All planning artefacts drafted.' : 'Work through the steps in order; each one unlocks the next.'}
          </p>
        </div>
        <span className={`ml-3 rounded-full px-2.5 py-1 text-xs font-medium ${allDone ? 'bg-emerald-100 text-emerald-800' : 'bg-white/70 text-indigo-900'}`}>
          {doneCount}/{STEPS.length} done
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition group-hover:bg-indigo-700">
          {open ? 'Hide steps' : 'Show steps'}
          <span className="transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </span>
      </button>

      {open && (
        <div className="rounded-b-lg border border-t-0 border-indigo-200 bg-card px-3 py-3 sm:px-5">
          <ol className="space-y-2">
            {STEPS.map((step) => {
              const isDone = doneSet.has(step.key);
              const unmetDeps = step.deps.filter((d) => !doneSet.has(d));
              const locked = unmetDeps.length > 0;
              const canRun = allowedAgents.includes(step.key);

              return (
                <li
                  key={step.key}
                  className={`flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    isDone ? 'border-emerald-200 bg-emerald-50/40' : locked ? 'bg-muted/20' : 'bg-background'
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                        isDone ? 'bg-emerald-500 text-white' : locked ? 'bg-muted text-muted-foreground' : 'bg-foreground text-background'
                      }`}
                    >
                      {isDone ? '✓' : step.n}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                      {locked && (
                        <p className="mt-1 text-[11px] text-amber-700">
                          Complete {unmetDeps.map((d) => LABEL[d]).join(' + ')} first.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-none items-center sm:pl-3">
                    {isDone ? (
                      <span className="text-xs font-medium text-emerald-700">✓ Drafted</span>
                    ) : locked ? (
                      <span className="text-xs text-muted-foreground">Locked</span>
                    ) : canRun ? (
                      <button
                        type="button"
                        onClick={() => run(step)}
                        className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90"
                      >
                        Draft with {LABEL[step.key]} →
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Run by a role with the {LABEL[step.key]}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 px-1 text-[11px] text-muted-foreground">
            Each step opens the ✨ assistant pre-filled — review the prompt and hit Send. Steps tick off automatically as each draft lands.
          </p>
        </div>
      )}
    </section>
  );
}
