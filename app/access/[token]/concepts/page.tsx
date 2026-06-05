/**
 * Concepts explainer — the AI ideas behind AI PMO, in plain, business-friendly
 * terms, each as a rich card (mirroring the agent cards): a tinted hero with an
 * icon + category chip + term + tagline, a plain explanation, a what-it-means /
 * what-it's-not split, an analogy, the concrete in-app example, and why it
 * matters. Closes with a hallucination/guardrails capstone and a flow diagram.
 * Education surface; valid token only.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Brain, MessageSquare, Bot, BookOpen, Search, Calculator, Route, Layers,
  ShieldCheck, Check, X, Lightbulb, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { resolveRoleFromToken } from '@/lib/role-context';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

type Concept = {
  term: string;
  tagline: string;
  cat: string;
  accent: string;
  Icon: LucideIcon;
  plain: string;
  means: string[];
  notThis: string[];
  analogy: string;
  inApp: string;
  why: string;
  linkPath?: string;
  linkLabel?: string;
};

const CONCEPTS: Concept[] = [
  {
    term: 'LLM — Large Language Model',
    tagline: 'The engine every agent runs on',
    cat: 'The engine', accent: '#6366f1', Icon: Brain,
    plain: "A large language model is software trained on an enormous amount of written material. Given some text, it predicts the most likely next words — and by doing that over and over, it produces fluent, relevant writing. It is genuinely strong with language and patterns, but it has no live access to your data and no memory of your project unless you give it both. Everything clever this app does sits on top of that one capability.",
    means: ['Turns messy facts into clear, readable writing', 'Works from what it was trained on plus what you give it now', 'Fast and tireless at drafting and summarising'],
    notThis: ['Not a database or a search engine', "Not a calculator — it predicts words, it doesn't compute", "Not 'thinking' — it is very sophisticated autocomplete"],
    analogy: "An exceptionally well-read assistant who can draft anything you ask — but only knows what they have read and what is on the desk in front of them.",
    inApp: "Every one of the 14 agents is this same model (Claude), pointed at a different job.",
    why: "Once you see it is a language engine, the rest — grounding, structured facts, guardrails — is about making it trustworthy.",
    linkPath: 'agents', linkLabel: 'See the agents',
  },
  {
    term: 'Prompt & system prompt',
    tagline: 'How one model becomes a specialist',
    cat: 'Instruction', accent: '#0ea5e9', Icon: MessageSquare,
    plain: "A prompt is simply the text you give the model. There are two layers: the system prompt — standing instructions that set the model's role, rules and tone — and the user prompt, your actual question. The system prompt is where the real design happens: it says who the model is, what it must never do, and how to shape its answer. Change the system prompt and you change the behaviour without changing the model.",
    means: ['The system prompt sets the role and the rules', 'The user prompt is the day-to-day question', 'Most of what separates a useful agent from a generic chatbot lives here'],
    notThis: ['Not code — it is written instructions in plain language', 'Not one-off — the system prompt shapes every answer', 'Not magic — a vague prompt gives a vague answer'],
    analogy: "A job description plus today's task. The description says how to behave; the task is what to do right now.",
    inApp: "The 14 agents are the same model with 14 carefully written job descriptions.",
    why: "It is why new specialists are cheap to create — you write a brief, not new software.",
  },
  {
    term: 'Agent',
    tagline: 'A specialist, not a know-everything chatbot',
    cat: 'Architecture', accent: '#10b981', Icon: Bot,
    plain: "An agent is an LLM given one job, one scope, and the right context to do it. Instead of one general assistant trying to answer everything, you build many narrow ones — each with a focused brief, the data it needs, and clear boundaries. Narrow agents are easier to trust, test and explain than a single sprawling one, and you always know which specialist produced an answer.",
    means: ['Owns one job and one scope (project, portfolio or single item)', 'Easier to keep accurate because the brief is narrow', 'You can see exactly which specialist answered'],
    notThis: ['Not a separate AI — same model, different brief', 'Not autonomous — it answers when asked and stays read-only', 'Not a replacement for the PM — it drafts, you decide'],
    analogy: "Hiring a quantity surveyor for cost and a planner for schedule, rather than asking one generalist to cover everything.",
    inApp: "Charter Drafter, WBS Builder, Variance Analyst… 14 specialists, each with one job.",
    why: "The whole product is really just well-scoped agents sitting over trustworthy data.",
    linkPath: 'agents', linkLabel: 'Meet the 14 agents',
  },
  {
    term: 'Context & grounding',
    tagline: 'Giving it the file before it answers',
    cat: 'Trust & grounding', accent: '#14b8a6', Icon: BookOpen,
    plain: "Because the model has no live knowledge of your project, you put the relevant facts directly into the prompt before it answers. That bundle of facts is the 'context'; doing it deliberately is 'grounding'. A grounded answer is built from your real figures; an ungrounded one is the model's best guess. Almost all of the trustworthiness of this app comes from grounding every answer in the canonical data.",
    means: ["The agent is handed the project's real figures before it replies", 'Answers state what is true, not what is merely plausible', 'If a fact is missing, the agent is told to say so rather than guess'],
    notThis: ["Not the model 'knowing' your project — it is fed the facts each time", 'Not unlimited — only the relevant facts go in', 'Not a substitute for clean source data'],
    analogy: "You would never ask an analyst to report on a project they have never seen — you hand them the file first. Grounding is handing over the file.",
    inApp: "Before any agent replies, the app assembles the canonical facts — earned value, WBS, risks, margin — into its context.",
    why: "It is the single biggest reason the numbers can be trusted.",
  },
  {
    term: 'RAG — retrieval-augmented generation',
    tagline: 'Fetch the right material, then write',
    cat: 'Trust & grounding', accent: '#8b5cf6', Icon: Search,
    plain: "Retrieval-augmented generation is grounding done automatically. Instead of you pasting in the facts, the system first searches a body of knowledge for the pieces most relevant to your question, then hands those to the model to write the answer. It is how an AI stays accurate across far more information than would ever fit into a single prompt.",
    means: ['Finds the most relevant material first, then generates', 'Keeps answers anchored to real source material', 'Scales grounding to large bodies of knowledge'],
    notThis: ['Not the model memorising everything — it looks things up', 'Not an open web search — it retrieves from a chosen, trusted set', 'Not perfect — answers are only as good as what is retrieved'],
    analogy: "A researcher who pulls the relevant past files before writing, rather than answering from memory.",
    inApp: "When you create a project, it retrieves comparable past projects and grounds the first draft in them (reference-project grounding).",
    why: "It is how the app reuses everything you have done before without you copying anything across.",
  },
  {
    term: 'Tool use & structured facts',
    tagline: 'Quote the audited number, don’t estimate it',
    cat: 'Trust & grounding', accent: '#d97706', Icon: Calculator,
    plain: "LLMs are unreliable at arithmetic — they predict plausible-looking numbers. So anything that must be exact is computed in ordinary code, and the model is given the finished figures to describe. More broadly this is 'tool use': the model leans on reliable tools — a calculator, a database, a function — instead of pretending to be one. The model does what it is good at (explaining) and leaves the maths to the maths.",
    means: ['Exact figures are computed in code, not by the model', 'The agent narrates the numbers, it never derives them', 'Removes the main way an AI gets facts wrong'],
    notThis: ['Not the model doing earned-value maths in its head', 'Not approximate — the figures are deterministic', 'Not hidden — every figure traces to its calculation'],
    analogy: "A writer quoting the audited accounts, rather than estimating the totals from memory.",
    inApp: "CPI, SPI, EAC and VAC are computed in code; the Variance Analyst is handed them and only explains them.",
    why: "It is why you can take the performance figures into a steering committee.",
    linkPath: 'architecture', linkLabel: 'Where the numbers come from',
  },
  {
    term: 'Auto-routing',
    tagline: 'Sending your question to the right desk',
    cat: 'Orchestration', accent: '#f43f5e', Icon: Route,
    plain: "With many specialists, something has to decide which one should answer. A small, fast model reads your question, classifies it — risk, cost, schedule — and routes it to the matching agent. Triage is an easier job than the answer itself, so this can be quick and cheap. You stay in control: the routing is shown, and you can override it.",
    means: ['A quick classifier picks the best-fit specialist', 'You see which agent ran (Auto → Risk Analyst)', 'You can always choose the agent yourself'],
    notThis: ['Not the big model — a small, cheap one does the triage', 'Not a black box — the choice is shown to you', 'Not locked in — override it anytime'],
    analogy: "A receptionist who listens to what you need and sends you to the right specialist.",
    inApp: "A Haiku classifier picks the agent for each question, with a manual override in the assistant.",
    why: "It lets you ask in plain English without knowing which of the 14 to call.",
    linkPath: 'agents', linkLabel: 'See the agents',
  },
  {
    term: 'Model tiers — Opus vs Haiku',
    tagline: 'The right-sized brain for each job',
    cat: 'Orchestration', accent: '#2563eb', Icon: Layers,
    plain: "Not every task needs the most powerful — and most expensive — model. Bigger models are better at hard reasoning and nuanced writing; smaller ones are faster and cheaper and perfectly good for routine work. A well-built system mixes them, using the heavyweight only where its judgement earns its cost and a lightweight model everywhere else.",
    means: ['Heavyweight model for deep synthesis and judgement', 'Lightweight model for triage and quick tasks', 'Matches cost and speed to the value of the task'],
    notThis: ["Not 'bigger is always better' — it is fit-for-purpose", 'Not a quality compromise where it matters', 'Not fixed — the mix can change per task'],
    analogy: "A senior partner for the tricky call; a quick junior for sorting the post.",
    inApp: "Opus does the deep synthesis (variance, risk, narratives); Haiku does routing and quick tasks.",
    why: "It keeps the app fast and affordable without dumbing down the answers that matter.",
  },
];

const GUARDRAILS = [
  { g: 'Grounding', t: 'It is given the real facts and works from them, not from memory — so it has the truth in front of it.' },
  { g: 'Compute, don’t guess', t: 'Every exact number comes from code; the agent only narrates it, removing the main source of wrong facts.' },
  { g: 'Read-only + provenance', t: 'It reports the systems of record and never edits them, and every figure traces back to its source.' },
];

const FLOW = [
  { t: 'You ask', s: 'a plain question', bg: '#F1F5F9', bd: '#CBD5E1', tx: '#475569' },
  { t: 'Router picks the agent', s: 'fast Haiku triage', bg: '#E6F1FB', bd: '#85B7EB', tx: '#185FA5' },
  { t: 'Facts assembled', s: 'grounding · RAG · numbers', bg: '#EAF3DE', bd: '#97C459', tx: '#3B6D11' },
  { t: 'Agent drafts', s: 'the LLM writes it up', bg: '#EAF3DE', bd: '#97C459', tx: '#3B6D11' },
  { t: 'Grounded answer', s: 'read-only · sourced', bg: '#EAF3DE', bd: '#97C459', tx: '#3B6D11' },
];

function ConceptCard({ c, token }: { c: Concept; token: string }) {
  const Icon = c.Icon;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {/* Hero */}
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${c.accent}1f, ${c.accent}08)` }}>
        <div className="mb-2.5 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: `${c.accent}26`, color: c.accent }}>
            <Icon size={24} strokeWidth={2} />
          </span>
          <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}>{c.cat}</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{c.term}</h2>
        <p className="mt-0.5 text-sm text-foreground/70">{c.tagline}</p>
      </div>

      <div className="p-5">
        <p className="text-[15px] leading-relaxed text-foreground/85">{c.plain}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">What it means</p>
            <ul className="mt-2 space-y-1.5">
              {c.means.map((m, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-foreground/85"><Check size={15} strokeWidth={2.5} className="mt-0.5 flex-none text-emerald-500" /><span>{m}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">What it&apos;s not</p>
            <ul className="mt-2 space-y-1.5">
              {c.notThis.map((m, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-foreground/85"><X size={15} strokeWidth={2.5} className="mt-0.5 flex-none text-rose-400" /><span>{m}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border-l-4 border-sky-400 bg-sky-50/60 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-700"><Lightbulb size={15} strokeWidth={2.5} />Think of it like</p>
          <p className="mt-1 text-[15px] italic leading-relaxed text-foreground/85">{c.analogy}</p>
        </div>

        <div className="mt-3 rounded-xl border-l-4 px-4 py-3" style={{ borderColor: c.accent, backgroundColor: `${c.accent}0d` }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: c.accent }}>In AI PMO</p>
          <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">{c.inApp}</p>
          {c.linkPath && (
            <Link href={`/access/${token}/${c.linkPath}`} className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium hover:underline" style={{ color: c.accent }}>{c.linkLabel} <ArrowRight size={13} /></Link>
          )}
        </div>

        <p className="mt-4 text-[13px] text-muted-foreground"><span className="font-semibold uppercase tracking-wider text-foreground/60">Why it matters: </span>{c.why}</p>
      </div>
    </div>
  );
}

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
        with what it means and what it is not, a quick analogy, and the exact place you have already seen it here.
      </p>

      <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
        {CONCEPTS.map((c) => (
          <ConceptCard key={c.term} c={c} token={token} />
        ))}
      </div>

      {/* Capstone — hallucination & guardrails */}
      <div className="mx-auto mt-5 max-w-5xl overflow-hidden rounded-2xl border bg-card">
        <div className="p-5" style={{ background: 'linear-gradient(135deg, #10b9811f, #10b98108)' }}>
          <div className="mb-2.5 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: '#10b98126', color: '#10b981' }}>
              <ShieldCheck size={24} strokeWidth={2} />
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: '#10b9811a', color: '#10b981' }}>The payoff</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Hallucination — and why you can trust this one</h2>
          <p className="mt-0.5 text-sm text-foreground/70">What can go wrong, and the three things that stop it</p>
        </div>
        <div className="p-5">
          <p className="text-[15px] leading-relaxed text-foreground/85">
            Left unchecked, an LLM will sometimes produce a confident, fluent answer that is simply wrong — a
            &ldquo;hallucination&rdquo;. It is not lying; it is predicting plausible words past the edge of what it
            actually knows. You cannot switch this off, so a trustworthy system is built to make it rare and catchable.
            Three design choices do exactly that here.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {GUARDRAILS.map((x) => (
              <div key={x.g} className="rounded-xl border bg-background p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><Check size={15} strokeWidth={3} className="text-emerald-500" />{x.g}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{x.t}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[15px] font-medium text-emerald-900">That is why you can trust the numbers it shows you.</p>
        </div>
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
