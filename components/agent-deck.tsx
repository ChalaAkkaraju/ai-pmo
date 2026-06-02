'use client';

/**
 * Agent catalog rendered as a full-screen slide deck — a summary landing
 * panel followed by one agent per screen, presentation-style typography,
 * horizontal scroll-snap navigation.
 *
 * Slide 0 is an overview/landing panel (what the system is, a stat strip, the
 * 13 specialists mapped across the project lifecycle, and a scope legend) so a
 * colleague is oriented before stepping into per-agent detail.
 *
 * Visual layers per agent slide:
 *   - Scope-colored gradient hero band with a per-agent icon, scope badge, name
 *   - Plain-English explanation (the main reading content)
 *   - Project-lifecycle stepper highlighting where the agent operates
 *   - Does well / Doesn't do cards with check / cross icons
 *   - "Try asking" example + "Based on" methodology footer
 *
 * Navigation: the deck scrolls HORIZONTALLY (snap-x). Big Prev/Next chevrons in
 * the left & right margins match that motion, plus a jump-dot row at the bottom,
 * Left/Right (and Up/Down) keys, and a wheel handler that translates vertical
 * mouse-wheel input into horizontal movement (so mouse users can still scroll).
 *
 * Server wrapper (app/access/[token]/agents/page.tsx) validates the token and
 * passes all catalog entries. This is an education surface — every role sees
 * all 13 agents; invocation permissions still apply in the widget / API.
 */

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Users,
  ListTree,
  Calendar,
  DollarSign,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  GitPullRequest,
  ShieldAlert,
  Lightbulb,
  FileCheck,
  LayoutGrid,
  Check,
  X,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import type { AgentCatalogEntry, AgentScope } from '@/lib/agent-catalog';
import type { AgentType } from '@/lib/types';

interface AgentDeckProps {
  token: string;
  total: number;
  entries: AgentCatalogEntry[];
}

function scopeStyle(scope: AgentScope): { label: string; chip: string; accent: string } {
  switch (scope) {
    case 'project':
      return { label: 'Project-level', chip: 'bg-emerald-100 text-emerald-800', accent: '#10b981' };
    case 'portfolio':
      return { label: 'Portfolio-level', chip: 'bg-violet-100 text-violet-800', accent: '#8b5cf6' };
    case 'single-item':
      return { label: 'Single-item', chip: 'bg-sky-100 text-sky-800', accent: '#0ea5e9' };
  }
}

/** Distinct icon per agent for visual identity. */
const AGENT_ICON: Record<AgentType, LucideIcon> = {
  charter_drafter: FileText,
  stakeholder_analyst: Users,
  wbs_builder: ListTree,
  schedule_reasoner: Calendar,
  budget_builder: DollarSign,
  communications_planner: MessageSquare,
  issue_logger: ClipboardList,
  variance_analyst: TrendingUp,
  change_order_reviewer: GitPullRequest,
  risk_analyst: ShieldAlert,
  lessons_learned_synthesiser: Lightbulb,
  closeout_reporter: FileCheck,
  portfolio_risk_reviewer: LayoutGrid,
};

/** Project lifecycle phases (PMBOK process groups). */
const PHASES = ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closeout'] as const;
type Phase = (typeof PHASES)[number];

/**
 * Where each agent primarily operates in the project lifecycle.
 * Portfolio Risk Reviewer is cross-cutting — marked 'portfolio' (all phases lit).
 */
const AGENT_PHASE: Record<AgentType, Phase | 'portfolio'> = {
  charter_drafter: 'Initiation',
  stakeholder_analyst: 'Initiation',
  wbs_builder: 'Planning',
  schedule_reasoner: 'Planning',
  budget_builder: 'Planning',
  communications_planner: 'Planning',
  issue_logger: 'Execution',
  variance_analyst: 'Monitoring',
  change_order_reviewer: 'Monitoring',
  risk_analyst: 'Monitoring',
  lessons_learned_synthesiser: 'Closeout',
  closeout_reporter: 'Closeout',
  portfolio_risk_reviewer: 'portfolio',
};

/** Ordered lifecycle groups for the landing-slide map. */
const PHASE_ORDER: Array<{ key: Phase | 'portfolio'; label: string }> = [
  { key: 'Initiation', label: 'Initiation' },
  { key: 'Planning', label: 'Planning' },
  { key: 'Execution', label: 'Execution' },
  { key: 'Monitoring', label: 'Monitoring' },
  { key: 'Closeout', label: 'Closeout' },
  { key: 'portfolio', label: 'Portfolio-wide' },
];

export function AgentDeck({ token, total, entries }: AgentDeckProps) {
  // Slide 0 = overview, slide 1 = how-it-works, agents occupy slides 2..total+1.
  const HOWTO_IDX = 1;
  const slideCount = total + 2;
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const activeRef = useRef(0);

  const jumpTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, slideCount - 1));
      slideRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    },
    [slideCount],
  );

  // Track which slide is in view.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (obsEntries) => {
        obsEntries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) {
              setActive(idx);
              activeRef.current = idx;
            }
          }
        });
      },
      { root, threshold: 0.55 },
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [slideCount]);

  // Keyboard navigation — Right/Down advance, Left/Up go back.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'ArrowDown') {
        e.preventDefault();
        jumpTo(active + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'ArrowUp') {
        e.preventDefault();
        jumpTo(active - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, jumpTo]);

  // Mouse-wheel support: translate vertical wheel into horizontal scroll, but
  // let a panel scroll vertically first if its own content overflows.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // horizontal intent → native
      const panel = slideRefs.current[activeRef.current];
      if (panel) {
        const canScrollDown = panel.scrollHeight - panel.clientHeight - panel.scrollTop > 1;
        const canScrollUp = panel.scrollTop > 1;
        if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) return;
      }
      root!.scrollLeft += e.deltaY;
      e.preventDefault();
    }
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, []);

  const atStart = active === 0;
  const atEnd = active === slideCount - 1;

  // Lifecycle groups for the landing slide (skip empty groups defensively).
  const groups = PHASE_ORDER.map((g) => ({
    ...g,
    items: entries.filter((e) => AGENT_PHASE[e.agent_type] === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top strip — breadcrumb + label + counter */}
      <div className="flex flex-none items-center justify-between gap-4 border-b bg-background px-6 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/access/${token}`} className="text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">Agent catalog</span>
        </div>
        <span className="tabular-nums text-xs font-medium text-muted-foreground">
          {active === 0 ? 'Overview' : active === HOWTO_IDX ? 'How it works' : `${active - 1} / ${total}`}
        </span>
      </div>

      {/* Thin progress bar */}
      <div className="h-0.5 flex-none bg-muted">
        <div
          className="h-full bg-foreground transition-all duration-300"
          style={{ width: `${(active / (total + 1)) * 100}%` }}
        />
      </div>

      {/* Deck — horizontal scroll-snap container */}
      <div
        ref={containerRef}
        className="agent-deck-scroll flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
      >
        {/* Slide 0 — landing / overview panel (sized to fit one screen) */}
        <section
          key="__intro"
          data-idx={0}
          ref={(el) => {
            slideRefs.current[0] = el;
          }}
          className="flex h-full min-h-full w-full min-w-full flex-none snap-start items-start justify-center overflow-y-auto px-6 py-6"
        >
          <div className="mx-auto w-full max-w-4xl">
            {/* Hero band */}
            <div
              className="rounded-2xl border p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(100,116,139,0.16), rgba(100,116,139,0.05))',
                borderColor: 'rgba(100,116,139,0.25)',
              }}
            >
              <div className="mb-2 flex items-center gap-2.5">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-slate-900/10 text-slate-700">
                  <Sparkles size={22} strokeWidth={2} />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  AI PMO · Agent catalog
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Thirteen specialists, one assistant
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/80 sm:text-base">
                Ask in plain English. The assistant routes you to the right specialist, which returns a
                draft grounded in PMBOK standards — with every assumption flagged for your review. It
                supports your judgment rather than replacing it.
              </p>
            </div>

            {/* Stat strip */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { n: String(total), l: 'specialist agents' },
                { n: String(PHASES.length), l: 'lifecycle phases' },
                { n: 'PMBOK', l: 'grounded methodology' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border bg-muted/40 px-4 py-2.5">
                  <div className="text-xl font-bold text-foreground">{s.n}</div>
                  <div className="text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Lifecycle map — label + chips on one row each to stay compact */}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              The specialists, across the project lifecycle
            </p>
            <div className="mt-2 space-y-1.5">
              {groups.map((g) => (
                <div
                  key={g.label}
                  className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
                >
                  <div className="flex w-24 flex-none items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                    {g.key === 'portfolio' ? (
                      <Layers size={13} className="flex-none text-muted-foreground" />
                    ) : (
                      <span className="inline-block h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" aria-hidden />
                    )}
                    {g.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((entry) => {
                      const s = scopeStyle(entry.scope);
                      return (
                        <span
                          key={entry.agent_type}
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `${s.accent}1f`, color: s.accent }}
                        >
                          {entry.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Scope legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Scope</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                Project-level
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#0ea5e9' }} />
                Single-item
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                Portfolio-level
              </span>
            </div>
          </div>
        </section>

        {/* Slide 1 — how to work with the assistant */}
        <section
          key="__howto"
          data-idx={1}
          ref={(el) => {
            slideRefs.current[1] = el;
          }}
          className="flex h-full min-h-full w-full min-w-full flex-none snap-start items-start justify-center overflow-y-auto px-6 py-6"
        >
          <div className="mx-auto w-full max-w-4xl">
            {/* Hero band */}
            <div
              className="rounded-2xl border p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(14,165,233,0.05))',
                borderColor: 'rgba(14,165,233,0.25)',
              }}
            >
              <div className="mb-2 flex items-center gap-2.5">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sky-500/15 text-sky-600">
                  <Sparkles size={22} strokeWidth={2} />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  How it works
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Working with the assistant
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/80 sm:text-base">
                Four things to know: how to ask, how a quick answer becomes a full report, how the
                assistant hands work to your colleagues, and when to let it choose the specialist for you.
              </p>
            </div>

            {/* Four workflow cards */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* 1. Ask from anywhere */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <MessageCircle size={17} strokeWidth={2.5} />
                  </span>
                  <h2 className="text-sm font-semibold">Ask from any page</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                  Click the floating <span className="font-medium">✨ Ask AI Assistant</span> button (bottom-right of every page)
                  and type in plain English. On a project page it answers about that project; on the dashboard it answers
                  portfolio-wide.
                </p>
              </div>

              {/* 2. Auto vs specific */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <Sparkles size={17} strokeWidth={2.5} />
                  </span>
                  <h2 className="text-sm font-semibold">Auto-routing (or pick a specialist)</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                  Leave it on <span className="font-medium">Auto</span> and a quick classifier picks the right specialist for
                  your question — you&apos;ll see which one ran (&ldquo;Auto → Risk Analyst&rdquo;). Prefer a specific agent?
                  Choose it from the dropdown to override.
                </p>
              </div>

              {/* 3. Pop out + full report */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <FileCheck size={17} strokeWidth={2.5} />
                  </span>
                  <h2 className="text-sm font-semibold">Pin a brief · open the full report</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                  Use <span className="font-medium">↗ Pop out</span> to pin a quick answer as a floating panel while you keep
                  asking. Use <span className="font-medium">↗ Show full report</span> to expand it into a polished, printable
                  document (with PDF download) in a new tab.
                </p>
              </div>

              {/* 4. Assign actions */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <GitPullRequest size={17} strokeWidth={2.5} />
                  </span>
                  <h2 className="text-sm font-semibold">Assign actions to other roles</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                  When an agent (e.g. the Risk Analyst) recommends work that another role should own, you&apos;ll see
                  <span className="font-medium"> Assign</span> buttons under its answer. Assign one and it lands in that
                  role&apos;s queue; they can change its status and <span className="font-medium">Draft my response</span> back —
                  a shared work item, no agent calling another blindly.
                </p>
              </div>
            </div>

            {/* Flow strip */}
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">Ask ✨</span>
              <ChevronRight size={14} />
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-800">Auto-routed answer</span>
              <ChevronRight size={14} />
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Pin / full report</span>
              <ChevronRight size={14} />
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">Assign to a colleague</span>
              <ChevronRight size={14} />
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">They respond</span>
            </div>
          </div>
        </section>

        {/* Agent slides */}
        {entries.map((entry, idx) => {
          const s = scopeStyle(entry.scope);
          const Icon = AGENT_ICON[entry.agent_type] ?? FileText;
          const phase = AGENT_PHASE[entry.agent_type];
          const slideIdx = idx + 2;
          return (
            <section
              key={entry.agent_type}
              data-idx={slideIdx}
              ref={(el) => {
                slideRefs.current[slideIdx] = el;
              }}
              className="flex h-full min-h-full w-full min-w-full flex-none snap-start items-start justify-center overflow-y-auto px-6 py-6"
            >
              <div className="mx-auto w-full max-w-4xl">
                {/* Hero band — scope-tinted gradient with icon + badge + name */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    background: `linear-gradient(135deg, ${s.accent}1f, ${s.accent}08)`,
                    borderColor: `${s.accent}33`,
                  }}
                >
                  <div className="mb-2.5 flex items-center gap-3">
                    <span
                      className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${s.accent}26`, color: s.accent }}
                    >
                      <Icon size={24} strokeWidth={2} />
                    </span>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${s.chip}`}>
                      {s.label}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {entry.name}
                  </h1>
                </div>

                {/* Plain-English explanation — the main reading content */}
                <p className="mt-4 text-base leading-relaxed text-foreground/80 sm:text-lg">
                  {entry.plain}
                </p>

                {/* Lifecycle position */}
                <LifecycleStepper phase={phase} />

                {/* Does / Doesn't — two columns with check / cross icons */}
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                      Does well
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {entry.does.map((d, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-foreground/85">
                          <Check size={17} strokeWidth={2.5} className="mt-0.5 flex-none text-emerald-500" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">
                      Doesn&apos;t do
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {entry.doesNot.map((d, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-foreground/85">
                          <X size={17} strokeWidth={2.5} className="mt-0.5 flex-none text-rose-400" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Try asking — sky callout with icon */}
                <div className="mt-4 rounded-xl border-l-4 border-sky-400 bg-sky-50/60 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sky-700">
                    <MessageCircle size={16} strokeWidth={2.5} />
                    Try asking
                  </p>
                  <p className="mt-1.5 text-base italic leading-relaxed text-foreground/85">
                    &ldquo;{entry.samplePrompt}&rdquo;
                  </p>
                </div>

                {/* Methodology footer */}
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-foreground/60">Based on: </span>
                  {entry.methodology}
                </p>
              </div>
            </section>
          );
        })}
      </div>

      {/* Big Prev / Next buttons hugging the content card (desktop).
          The band is centered and sized just wider than the slide content
          (max-w-4xl) so the arrows sit right beside it, not at the screen edge.
          pointer-events-none on the band lets scrolling work in the gaps. */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-full max-w-[64rem] -translate-x-1/2 items-center justify-between lg:flex">
        <button
          type="button"
          onClick={() => jumpTo(active - 1)}
          disabled={atStart}
          aria-label="Previous"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-600 shadow-lg transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => jumpTo(active + 1)}
          disabled={atEnd}
          aria-label="Next"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-600 shadow-lg transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronRight size={26} strokeWidth={2.5} />
        </button>
      </div>

      {/* Jump-dot row, bottom-center — a home dot for the overview, then one per agent */}
      <nav
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/80 px-3 py-2 shadow-sm backdrop-blur"
        aria-label="Jump to slide"
      >
        <button
          type="button"
          onClick={() => jumpTo(0)}
          title="Overview"
          aria-label="Go to overview"
          className="rounded-full transition-all hover:scale-125"
          style={{
            width: active === 0 ? 11 : 8,
            height: active === 0 ? 11 : 8,
            backgroundColor: active === 0 ? '#475569' : 'rgb(203 213 225)',
          }}
        />
        <span className="mx-0.5 h-3 w-px bg-border" aria-hidden />
        {entries.map((entry, idx) => {
          const s = scopeStyle(entry.scope);
          const isActive = idx + 2 === active;
          return (
            <button
              key={entry.agent_type}
              type="button"
              onClick={() => jumpTo(idx + 2)}
              title={entry.name}
              aria-label={`Go to ${entry.name}`}
              className="rounded-full transition-all hover:scale-125"
              style={{
                width: isActive ? 11 : 8,
                height: isActive ? 11 : 8,
                backgroundColor: isActive ? s.accent : 'rgb(203 213 225)',
              }}
            />
          );
        })}
      </nav>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .agent-deck-scroll { scrollbar-width: thin; overscroll-behavior-x: contain; }
            .agent-deck-scroll::-webkit-scrollbar { height: 8px; }
          `,
        }}
      />
    </div>
  );
}

/**
 * Horizontal lifecycle stepper. A single-phase agent lights one pill; the
 * portfolio agent spans the whole lifecycle, so every pill is lit. Highlight
 * is a consistent emerald green for every agent.
 */
function LifecycleStepper({ phase }: { phase: Phase | 'portfolio' }) {
  const isPortfolio = phase === 'portfolio';
  const activeIdx = isPortfolio ? -1 : PHASES.indexOf(phase);
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Where in the project lifecycle
      </p>
      <div className="mt-2 flex items-center">
        {PHASES.map((p, i) => {
          const isActive = isPortfolio || i === activeIdx;
          return (
            <Fragment key={p}>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {p}
              </span>
              {i < PHASES.length - 1 && (
                <span className="mx-1 h-px w-4 flex-none bg-border sm:w-6" aria-hidden />
              )}
            </Fragment>
          );
        })}
      </div>
      {isPortfolio && (
        <p className="mt-2 text-xs text-muted-foreground">
          Spans every phase — operates across the whole portfolio.
        </p>
      )}
    </div>
  );
}
