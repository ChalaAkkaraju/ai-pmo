/**
 * Concepts explainer — the handful of AI ideas behind AI PMO, in plain,
 * business-friendly terms, each anchored to where it actually appears in this
 * app. Education surface; valid token only. (The /learn/concepts page from the
 * education-migration plan, built early in a business-friendly framing.)
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

type Concept = {
  term: string;
  def: string;
  analogy: string;
  inApp: string;
  linkPath?: string;
  linkLabel?: string;
};

const CONCEPTS: Concept[] = [
  {
    term: 'LLM (Large Language Model)',
    def: "Software that has read an enormous amount of text and predicts, a few words at a time, what should come next. That is what people mean when they say 'the AI'.",
    analogy: "An exceptionally well-read assistant — fluent and fast, but it only knows what it has read and what you put in front of it.",
    inApp: "Every one of the 14 agents runs on an LLM (Claude). Same engine, different instructions.",
    linkPath: 'agents', linkLabel: 'See the agents',
  },
  {
    term: 'Prompt & system prompt',
    def: "The instructions you give the model: a standing 'job description' (the system prompt) plus your actual question (the user prompt).",
    analogy: "The job description says 'you are a cautious earned-value analyst who never invents numbers'; the question is 'how is this project tracking?'",
    inApp: "The 14 agents are the same model with 14 different job descriptions — that is most of what makes them specialists.",
  },
  {
    term: 'Agent',
    def: "An LLM pointed at one job, with one scope — not a know-everything chatbot.",
    analogy: "You would hire a quantity surveyor for the cost question and a planner for the schedule, not one generalist for everything.",
    inApp: "Charter Drafter, WBS Builder, Variance Analyst… each does one thing, at one level (project, portfolio or single item).",
    linkPath: 'agents', linkLabel: 'Meet the 14 agents',
  },
  {
    term: 'Context & grounding',
    def: "Giving the model the real project facts before it answers, so it states what is true instead of guessing.",
    analogy: "You would not ask an analyst to report on a project they have never seen — you hand them the file first.",
    inApp: "Before an agent replies, the app assembles the canonical facts — earned value, WBS, risks — into its context.",
  },
  {
    term: 'RAG (retrieval-augmented generation)',
    def: "Fetch the most relevant existing material first, then write the answer using it — rather than answering from memory.",
    analogy: "A researcher who pulls the relevant past files before writing, instead of recalling everything from memory.",
    inApp: "When you create a new project, it retrieves comparable past projects to ground the first draft (reference-project grounding).",
  },
  {
    term: 'Tool use & structured facts',
    def: "Letting the model use numbers that were computed in code, instead of doing the arithmetic in its head.",
    analogy: "A writer quoting the audited accounts, not estimating the figures from memory.",
    inApp: "CPI, SPI, EAC and VAC are calculated in code; the agent is handed the numbers and only narrates them — which is why they can be trusted.",
    linkPath: 'architecture', linkLabel: 'Where the numbers come from',
  },
  {
    term: 'Auto-routing (a classifier)',
    def: "A fast, cheap model that reads your question and decides which specialist should handle it.",
    analogy: "A receptionist who sends you to the right specialist.",
    inApp: "A Haiku classifier picks the agent for your question — and you can always override it.",
  },
  {
    term: 'Model tiers (Opus vs Haiku)',
    def: "Different sizes of model for different jobs — a bigger one for hard judgement, a smaller one for quick triage.",
    analogy: "A senior partner for the tricky call; a quick junior for sorting the post.",
    inApp: "Opus does the deep synthesis; Haiku does the routing and quick tasks — a quality-versus-speed-and-cost trade-off.",
  },
];

const GUARDRAILS = [
  { g: 'Grounding', t: 'It is given the real facts and works from them, not from memory.' },
  { g: 'Compute, don’t guess', t: 'The numbers come from code; the agent only narrates them.' },
  { g: 'Read-only + provenance', t: 'It reports the systems of record and never edits them; every figure traces to its source.' },
];

const FLOW = [
  { t: 'You ask', s: 'a plain question', bg: '#F1F5F9', bd: '#CBD5E1', tx: '#475569' },
  { t: 'Router picks the agent', s: 'fast Haiku triage', bg: '#E6F1FB', bd: '#85B7EB', tx: '#185FA5' },
  { t: 'Facts assembled', s: 'grounding · RAG · numbers', bg: '#EAF3DE', bd: '#97C459', tx: '#3B6D11' },
  { t: 'Agent drafts', s: 'the LLM writes it up', bg: '#EAF3DE', bd: '#97C459', tx: '#3B6D11' },
  { t: 'Grounded answer', s: 'read-only · sourced', bg: '#EAF3DE', bd: '#97C459', tx: '#3B6D11' },
];

export default async function ConceptsPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-xl px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/access/${token}`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <Link href={`/access/${token}/welcome`} className="hover:underline">Welcome</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Concepts</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">The ideas behind AI PMO — in plain terms</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        No AI background needed. These are the handful of ideas the whole app is built on — each one explained simply,
        with a quick analogy and the exact place you have already seen it here.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {CONCEPTS.map((c, i) => (
          <div key={c.term} className="rounded-xl border bg-card p-5">
            <div className="flex items-baseline gap-2.5">
              <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground/70">{i + 1}</span>
              <h2 className="text-base font-semibold tracking-tight">{c.term}</h2>
            </div>
            <p className="mt-2.5 text-[14px] leading-relaxed text-foreground/85">{c.def}</p>
            <p className="mt-2 text-[13px] italic leading-relaxed text-muted-foreground">{c.analogy}</p>
            <div className="mt-3 rounded-lg border-l-2 border-emerald-400 bg-emerald-50/40 px-3 py-2">
              <p className="text-[13px] leading-relaxed text-foreground/85">
                <span className="font-semibold text-emerald-700">In AI PMO → </span>{c.inApp}
              </p>
              {c.linkPath && (
                <Link href={`/access/${token}/${c.linkPath}`} className="mt-1 inline-block text-[12px] font-medium text-emerald-700 hover:underline">{c.linkLabel} →</Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Capstone — hallucination & guardrails */}
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="text-base font-semibold tracking-tight text-emerald-900">9 · Hallucination — and why you can trust this one</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-foreground/85">
          Left unchecked, an LLM would rather give a confident guess than admit it does not know — that wrong-but-fluent
          answer is a &ldquo;hallucination&rdquo;. Three things in this app stop it from happening:
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {GUARDRAILS.map((x) => (
            <div key={x.g} className="rounded-lg border bg-card p-3">
              <p className="text-sm font-semibold text-emerald-800">{x.g}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{x.t}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px] font-medium text-emerald-900">That is why you can trust the numbers it shows you.</p>
      </div>

      {/* Flow diagram */}
      <h2 className="mt-12 text-xl font-bold tracking-tight">How a question flows through AI PMO</h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        The concepts above, in the order they fire when you ask something.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-card p-4">
        <svg viewBox="0 0 940 120" className="mx-auto block min-w-[860px] max-w-[940px]" fontFamily="Inter,Arial,sans-serif" role="img" aria-label="A question flows: you ask, a router picks the agent, facts are assembled, the agent drafts, and you get a grounded answer.">
          <defs>
            <marker id="cflow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#94a3b8" /></marker>
          </defs>
          {FLOW.map((n, i) => {
            const x = 10 + i * 186;
            return (
              <g key={n.t}>
                <rect x={x} y={34} width={168} height={52} rx={8} fill={n.bg} stroke={n.bd} strokeWidth={1.4} />
                <text x={x + 84} y={58} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={n.tx}>{n.t}</text>
                <text x={x + 84} y={74} textAnchor="middle" fontSize={9.5} fill="#64748b">{n.s}</text>
                {i < FLOW.length - 1 && (
                  <line x1={x + 168} y1={60} x2={x + 186} y2={60} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#cflow)" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/access/${token}/agents`} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">The 14 agents →</Link>
        <Link href={`/access/${token}/architecture`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">How it fits — architecture →</Link>
        <Link href={`/access/${token}`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">Back to portfolio</Link>
      </div>
    </div>
  );
}
