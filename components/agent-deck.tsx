'use client';

/**
 * Agent catalog rendered as a full-screen slide deck — one agent per screen,
 * big presentation-style typography, scroll-snap navigation.
 *
 * - Vertical scroll snaps to each agent "slide" (CSS scroll-snap).
 * - An IntersectionObserver tracks the active slide for the progress counter
 *   and the side dot-navigation.
 * - Up/Down (and PageUp/PageDown) arrow keys jump between slides.
 * - Clicking a side dot jumps to that agent.
 *
 * Server wrapper (app/access/[token]/agents/page.tsx) validates the token and
 * passes all catalog entries. This is an education surface — every role sees
 * all 13 agents; invocation permissions still apply in the widget / API.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AgentCatalogEntry, AgentScope } from '@/lib/agent-catalog';

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
      {/* Top strip — breadcrumb + role + progress */}
      <div className="flex flex-none items-center justify-between gap-4 border-b bg-background px-6 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/access/${token}`} className="text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{total}</strong> specialist agents
          </span>
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
          return (
            <section
              key={entry.agent_type}
              data-idx={idx}
              ref={(el) => {
                slideRefs.current[idx] = el;
              }}
              className="flex h-full min-h-full w-full snap-start items-center justify-center px-6 py-8"
            >
              <div className="mx-auto w-full max-w-4xl">
                {/* Scope + availability row */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${s.chip}`}>{s.label}</span>
                  <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                    {idx + 1} of {total}
                  </span>
                </div>

                {/* Name — big */}
                <h1
                  className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
                  style={{ borderLeft: `6px solid ${s.accent}`, paddingLeft: '1rem' }}
                >
                  {entry.name}
                </h1>

                {/* Plain-English explanation — the main reading content for a business user */}
                <p className="mt-5 text-lg leading-relaxed text-foreground/80">
                  {entry.plain}
                </p>

                {/* Does / Doesn't — two columns, larger text */}
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                      Does well
                    </p>
                    <ul className="mt-3 space-y-2">
                      {entry.does.map((d, i) => (
                        <li key={i} className="flex gap-2 text-base text-foreground/85">
                          <span className="select-none text-emerald-500">▸</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5">
                    <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">
                      Doesn&apos;t do
                    </p>
                    <ul className="mt-3 space-y-2">
                      {entry.doesNot.map((d, i) => (
                        <li key={i} className="flex gap-2 text-base text-foreground/85">
                          <span className="select-none text-rose-400">▸</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Try asking — big sky callout */}
                <div className="mt-6 rounded-xl border-l-4 border-sky-400 bg-sky-50/60 px-5 py-4">
                  <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Try asking</p>
                  <p className="mt-2 text-lg italic leading-relaxed text-foreground/85">
                    &ldquo;{entry.samplePrompt}&rdquo;
                  </p>
                </div>

                {/* Methodology footer — readable sentence, not all-caps */}
                <p className="mt-5 text-sm text-muted-foreground">
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
    </div>
  );
}
