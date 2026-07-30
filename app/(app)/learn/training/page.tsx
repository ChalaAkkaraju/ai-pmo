/**
 * /learn/training — business-user training: task-oriented "how do I…" guides
 * for operating the app (get oriented, work a project, use the AI, create &
 * maintain). Distinct from Education (what it is) — this is how to drive it.
 * Valid token only.
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { canViewLearnKey } from '@/lib/learn-content';
import { getSessionRole } from '@/lib/auth';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';
interface PageProps { params: Promise<{ token: string }>; }

type Task = { title: string; steps: string[]; tip?: string };
type Stage = { stage: string; intro: string; tasks: Task[] };

const STAGES: Stage[] = [
  {
    stage: 'Get oriented',
    intro: 'Find your way around in two minutes.',
    tasks: [
      { title: 'Read the dashboard', steps: [
        'Open your access link — it carries your role, so the dashboard tailors what you see and which agents you can run.',
        'Scan the hero: total portfolio value, the segment-mix donut, the lifecycle bar, and the CPI / SPI health pulse.',
        'Check the Hot list (the projects needing attention) and the Themes (one card per segment — click to drill into that segment’s projects).',
        'The activity feed shows recent agent runs across the portfolio.',
      ], tip: 'Click any project — from the Hot list, a theme grid, or global search — to open it.' },
      { title: 'Open a project', steps: [
        'Click a project to open its tabbed workspace.',
        'Overview leads with earned value and what needs attention. Move across the tabs: Structure (WBS), Schedule (Gantt), Earned value, Resources, Risks & issues, Changes, Variance, Planning.',
        'The header strip gives the BI at a glance — contract, budget, CPI, SPI, contingency drawn.',
      ], tip: 'Every synced figure shows an “as of” time — the AI synthesis sits on top of the mirrored data.' },
    ],
  },
  {
    stage: 'Work a project',
    intro: 'Read the numbers and the risk picture.',
    tasks: [
      { title: 'Read the earned-value picture', steps: [
        'Open Overview or the Earned value tab.',
        'Read CPI (cost) and SPI (schedule): below 1.0 means over cost / behind schedule.',
        'EAC is the projected final cost; VAC the variance versus budget; the S-curve shows planned (PV), earned (EV) and actual (AC) over time.',
      ], tip: 'The figures are computed in code from WBS × cost × progress — the agent narrates them, it never invents them.' },
      { title: 'Read the risk register', steps: [
        'Open Risks & issues.',
        'The exposure panel shows EMV (inherent → residual), the mitigation burndown, and contingency cover (P50 / P80).',
        'Toggle the heatmap Inherent ↔ Residual to watch risks move down-left as mitigation lands.',
        'In the table, sort by “Soonest to hit”, and expand any risk for its WBS element, proximity, linked issues and response strategy.',
      ] },
    ],
  },
  {
    stage: 'Use the AI',
    intro: 'Ask, and hand work off.',
    tasks: [
      { title: 'Ask the AI assistant', steps: [
        'Click the floating assistant (bottom corner) on any project or the dashboard.',
        'Type a plain-English question — e.g. “Which two risks deserve the most attention through the warranty tail?”',
        'Auto-routing picks the right specialist (shown as Auto → Risk Analyst); override it by choosing an agent yourself.',
        'Use quick mode for a fast answer, or “show full report” for the detailed artefact. Pin a brief or click a follow-up.',
      ], tip: 'Be specific — focused asks get the best output. Each call costs a few cents.' },
      { title: 'Generate a status report', steps: [
        'Invoke the Status Reporter (from the assistant or the project).',
        'Tell it the audience (team / sponsor / client) and the RAG you’ve set.',
        'It returns a one-page report — it substantiates your RAG and never invents numbers or picks the colour for you.',
      ] },
      { title: 'Assign an action to a colleague', steps: [
        'From an agent’s output or the action ribbon, assign a recommended action to the responsible role.',
        'The colleague sees it in their action ribbon and responds — the loop is tracked end to end.',
      ], tip: 'Agents propose hand-off-able actions; you decide who owns them.' },
    ],
  },
  {
    stage: 'Create & maintain',
    intro: 'Bring a new project in, and author its structure.',
    tasks: [
      { title: 'Create a new project', steps: [
        'Use “+ New project” (visible to create-capable roles).',
        'Pick a segment, optionally a similar past project to prefill from, and fill the intake form. Save as a draft to resume later.',
        'On Create, the project gets its code and a setup checklist that walks the planning agents — charter → stakeholders → WBS → schedule → budget → comms.',
      ] },
      { title: 'Author & book a WBS', steps: [
        'On the Structure tab, let the WBS Builder propose a scope-true WBS.',
        'Review and approve it — nothing is committed without you.',
        '“Book to SAP” flips its provenance to system-of-record — the one deliberate upstream write the app makes.',
      ] },
    ],
  },
];

export default async function TrainingPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();
  if (!(await canViewLearnKey('training', resolved))) redirect('/dashboard');

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-4 text-sm text-muted-foreground print:hidden">
        <Link href={`/learn`} className="hover:underline">Learn</Link>
        <span className="mx-2">/</span><span className="text-foreground">Training</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training — how to use AI PMO</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            Short, task‑oriented how‑tos for driving the app day to day — get oriented, work a project, use the AI, and
            create new work. (For <em>what</em> it is and <em>why</em>, see the education pages; this is the <em>how</em>.)
          </p>
        </div>
        <PrintButton />
      </div>

      {STAGES.map((st) => (
        <section key={st.stage} className="mt-7">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{st.stage}</h2>
            <span className="text-xs text-muted-foreground">{st.intro}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {st.tasks.map((t) => (
              <div key={t.title} className="flex h-full flex-col rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-muted-foreground marker:font-semibold marker:text-foreground/60">
                  {t.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                {t.tip && (
                  <p className="mt-3 rounded-md border-l-4 border-sky-400 bg-sky-50/60 px-3 py-2 text-[12px] leading-relaxed text-foreground/80">
                    <span className="font-semibold">Tip — </span>{t.tip}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <Link href={`/agents`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">The 15 agents →</Link>
        <Link href={`/learn`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">← Learn</Link>
      </div>
    </div>
  );
}
