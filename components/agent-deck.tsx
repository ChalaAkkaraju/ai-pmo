'use client';

/**
 * Agent catalog rendered as a full-screen slide deck — one agent per screen,
 * presentation-style typography, scroll-snap navigation.
 *
 * Visual layers per slide:
 *   - Scope-colored gradient hero band with a per-agent icon, scope badge, name
 *   - Plain-English explanation (the main reading content)
 *   - Project-lifecycle stepper highlighting where the agent operates
 *   - Does well / Doesn't do cards with check / cross icons
 *   - "Try asking" example + "Based on" methodology footer
 *
 * Layout is compacted + top-aligned so each agent fits one screen without
 * internal scrolling. Navigation: scroll-snap, Up/Down (PageUp/PageDown) keys,
 * side dots, top arrows.
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

export function AgentDeck({ token, total, entries }: AgentDeckProps) {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);

  const jumpTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, total - 1));
      slideRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth' });
    },
    [total],
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
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { root, threshold: 0.55 },
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [total]);

  // Keyboard navigation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        jumpTo(active + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        jumpTo(active - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, jumpTo]);

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top strip — breadcrumb + label + navigator */}
      <div className="flex flex-none items-center justify-between gap-4 border-b bg-background px-6 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/access/${token}`} className="text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">Agent catalog</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-xs font-medium text-muted-foreground">
            {active + 1} / {total}
          </span>
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              onClick={() => jumpTo(active - 1)}
              disabled={active === 0}
              className="rounded border px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-muted disabled:opacity-30"
              aria-label="Previous agent"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => jumpTo(active + 1)}
              disabled={active === total - 1}
              className="rounded border px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-muted disabled:opacity-30"
              aria-label="Next agent"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      {/* Thin progress bar */}
      <div className="h-0.5 flex-none bg-muted">
        <div
          className="h-full bg-foreground transition-all duration-300"
          style={{ width: `${((active + 1) / total) * 100}%` }}
        />
      </div>

      {/* Deck — scroll-snap container */}
      <div
        ref={containerRef}
        className="agent-deck-scroll flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth"
      >
        {entries.map((entry, idx) => {
          const s = scopeStyle(entry.scope);
          const Icon = AGENT_ICON[entry.agent_type] ?? FileText;
          const phase = AGENT_PHASE[entry.agent_type];
          return (
            <section
              key={entry.agent_type}
              data-idx={idx}
              ref={(el) => {
                slideRefs.current[idx] = el;
              }}
              className="flex h-full min-h-full w-full snap-start items-start justify-center px-6 py-6"
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

      {/* Side dot navigation */}
      <nav
        className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-2 md:flex"
        aria-label="Agent navigation"
      >
        {entries.map((entry, idx) => {
          const s = scopeStyle(entry.scope);
          const isActive = idx === active;
          return (
            <button
              key={entry.agent_type}
              type="button"
              onClick={() => jumpTo(idx)}
              title={entry.name}
              aria-label={`Go to ${entry.name}`}
              className="group flex items-center justify-end gap-2"
            >
              <span className="pointer-events-none whitespace-nowrap rounded bg-foreground/90 px-2 py-0.5 text-[10px] font-medium text-background opacity-0 transition group-hover:opacity-100">
                {entry.name}
              </span>
              <span
                className="block rounded-full transition-all"
                style={{
                  width: isActive ? 12 : 8,
                  height: isActive ? 12 : 8,
                  backgroundColor: isActive ? s.accent : 'rgb(203 213 225)',
                }}
              />
            </button>
          );
        })}
      </nav>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .agent-deck-scroll > * { scroll-snap-align: start; }
            .agent-deck-scroll { scrollbar-width: thin; }
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
