'use client';

/**
 * "How it works" narrative rendered as a full-screen slide deck — a summary
 * landing slide then one section per screen, mirroring the agent + concept
 * decks. Each slide vertically centres its content (and scrolls if taller than
 * the viewport). Same nav: scroll-snap, prev/next, jump dots, keys, wheel.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Sparkles, Database, CalendarClock, ArrowDown, Check, X, Boxes, MessagesSquare,
  FilePlus2, ListChecks, TrendingUp, Link2, Wand2, Target, Brain, Bot, Puzzle,
  Workflow, Scale, ChevronLeft, ChevronRight, type LucideIcon,
} from 'lucide-react';

const LAYER_OUTPUTS = ['earned value', 'risk & change synthesis', 'portfolio patterns', 'status narrative', 'recommendations'];

const STATS = [
  { n: '2', l: 'systems unified — ERP + scheduler' },
  { n: '14', l: 'specialist agents' },
  { n: '1', l: 'deliberate write — the WBS' },
];

const STEPS = [
  { Icon: Link2, cls: 'bg-sky-100 text-sky-700', title: 'Connect', body: 'Point it at your ERP and your scheduler. It reads cost and structure from one, dates and progress from the other.' },
  { Icon: Wand2, cls: 'bg-violet-100 text-violet-700', title: 'Draft & synthesise', body: 'Specialist agents draft the planning artefacts and pull cost, schedule, risk and change into one picture.' },
  { Icon: Target, cls: 'bg-emerald-100 text-emerald-700', title: 'Decide & act', body: 'Earned value, the status narrative and recommended actions — reviewed and corrected by you, then assigned.' },
];

const DOES = [
  'Computes earned value across cost and schedule — CPI, SPI, EAC, variance',
  'Drafts the planning artefacts: charter, stakeholders, WBS, schedule, budget',
  'Authors a scope-true WBS and books it into the ERP at setup — its one deliberate write, with your approval',
  'Synthesises risks, issues and change orders into cross-project patterns',
  'Writes the status narrative and recommends actions to the right role',
  'Keeps a human in the loop — every draft is reviewable, editable and traceable',
];

const IS_NOT = [
  'Not a scheduler — no critical-path engine or resource levelling (that stays in your scheduler, e.g. Microsoft Planner Premium or Primavera P6)',
  'Not an accounting system — cost, commitment, billing and revenue stay in your ERP, e.g. SAP PS or Oracle',
  'Not a replacement for your systems of record — it authors the WBS into the ERP at setup, then only reads from them',
];

const CAPABILITIES = [
  { Icon: Boxes, cls: 'bg-sky-100 text-sky-700', title: 'See the whole portfolio', body: 'Every project in one place — health, risks, variance and cross-cutting patterns at a glance.' },
  { Icon: MessagesSquare, cls: 'bg-violet-100 text-violet-700', title: 'Ask the AI assistant', body: 'Any project or portfolio question, answered by the right specialist agent — full report a click away.' },
  { Icon: FilePlus2, cls: 'bg-amber-100 text-amber-700', title: 'Stand up a new project', body: 'A guided intake form and a step-by-step setup checklist that drafts the charter, WBS, schedule and budget.' },
  { Icon: ListChecks, cls: 'bg-emerald-100 text-emerald-700', title: 'Act on what matters', body: 'Assign tasks to colleagues, track cross-agent actions, and review or correct anything the agents draft.' },
];

const TABLE_STAKES = ['Pull cost and schedule into one view', 'Charts, roll-ups and status tables', 'Filters and drill-downs'];
const DIFFERENTIATOR = ['Drafts the charter, WBS, schedule and budget', 'Writes the status narrative in plain language', 'Spots cross-project risk and change patterns', 'Recommends the next action to the right role', 'Every output reviewed and correctable by a human'];

const AGENTS = ['Charter Drafter', 'Stakeholder Analyst', 'WBS Builder', 'Schedule Reasoner', 'Budget Builder', 'Communications Planner', 'Variance Analyst', 'Risk Analyst', 'Change Order Reviewer', 'Issue Logger', 'Portfolio Risk Reviewer', 'Status Reporter', 'Lessons-Learned Synthesiser', 'Closeout Reporter'];

const SLIDES: Array<{ label: string; accent: string }> = [
  { label: 'Overview', accent: '#d97706' },
  { label: 'The problem', accent: '#d97706' },
  { label: 'Where it fits', accent: '#d97706' },
  { label: 'Two bookends', accent: '#8b5cf6' },
  { label: 'How it works', accent: '#0ea5e9' },
  { label: 'Earned value', accent: '#10b981' },
  { label: 'What it is / isn’t', accent: '#64748b' },
  { label: 'The differentiator', accent: '#8b5cf6' },
  { label: 'The agents', accent: '#8b5cf6' },
  { label: 'What you can do', accent: '#2563eb' },
];

function Hero({ Icon, label, accent, title, tagline }: { Icon: LucideIcon; label: string; accent: string; title: string; tagline?: string }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: `linear-gradient(135deg, ${accent}1f, ${accent}08)`, borderColor: `${accent}33` }}>
      <div className="mb-2.5 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}26`, color: accent }}><Icon size={24} strokeWidth={2} /></span>
        <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: `${accent}1a`, color: accent }}>{label}</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {tagline && <p className="mt-1 text-sm text-foreground/70">{tagline}</p>}
    </div>
  );
}

function Slide({ idx, refCb, children }: { idx: number; refCb: (i: number) => (el: HTMLElement | null) => void; children: ReactNode }) {
  return (
    <section data-idx={idx} ref={refCb(idx)} className="h-full min-h-full w-full min-w-full flex-none snap-start overflow-y-auto px-6 py-8">
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-center">
        <div className="w-full">{children}</div>
      </div>
    </section>
  );
}

export function AboutDeck({ token }: { token: string }) {
  const slideCount = SLIDES.length;
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const activeRef = useRef(0);

  const jumpTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, slideCount - 1));
    slideRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }, [slideCount]);

  const setRef = (i: number) => (el: HTMLElement | null) => { slideRefs.current[i] = el; };

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((obs) => {
      obs.forEach((e) => {
        if (e.isIntersecting) {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (!Number.isNaN(idx)) { setActive(idx); activeRef.current = idx; }
        }
      });
    }, { root, threshold: 0.55 });
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [slideCount]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'ArrowDown') { e.preventDefault(); jumpTo(active + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'ArrowUp') { e.preventDefault(); jumpTo(active - 1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, jumpTo]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const panel = slideRefs.current[activeRef.current];
      if (panel) {
        const canDown = panel.scrollHeight - panel.clientHeight - panel.scrollTop > 1;
        const canUp = panel.scrollTop > 1;
        if ((e.deltaY > 0 && canDown) || (e.deltaY < 0 && canUp)) return;
      }
      root!.scrollLeft += e.deltaY;
      e.preventDefault();
    }
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, []);

  const atStart = active === 0;
  const atEnd = active === slideCount - 1;

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-none items-center justify-between gap-4 border-b bg-background px-6 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/access/${token}`} className="text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">How AI PMO works</span>
        </div>
        <span className="tabular-nums text-xs font-medium text-muted-foreground">{active === 0 ? 'Overview' : `${active} / ${slideCount - 1}`}</span>
      </div>

      <div className="h-0.5 flex-none bg-muted"><div className="h-full bg-foreground transition-all duration-300" style={{ width: `${(active / (slideCount - 1)) * 100}%` }} /></div>

      <div ref={containerRef} className="about-deck-scroll flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
        {/* 0 — Overview */}
        <Slide idx={0} refCb={setRef}>
          <Hero Icon={Sparkles} label="How it works" accent="#d97706" title="How AI PMO works — the full picture" tagline="The complete argument — scroll through one piece at a time" />
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-foreground/80 sm:text-lg">
            The intelligence layer that turns two systems of record into one explained picture: the problem it solves,
            where it sits, how it touches your systems, and what makes it more than a dashboard.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div key={s.l} className="rounded-xl border bg-muted/40 px-4 py-3">
                <div className="text-2xl font-bold text-foreground">{s.n}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What is inside — click to jump</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SLIDES.slice(1).map((s, i) => (
              <button key={s.label} type="button" onClick={() => jumpTo(i + 1)} className="rounded-full px-3 py-1 text-sm font-medium transition hover:brightness-95" style={{ backgroundColor: `${s.accent}1f`, color: s.accent }}>{s.label}</button>
            ))}
          </div>
        </Slide>

        {/* 1 — The problem */}
        <Slide idx={1} refCb={setRef}>
          <Hero Icon={Puzzle} label="The problem" accent="#d97706" title="The synthesis nobody owns" />
          <p className="mt-4 text-base leading-relaxed text-foreground/80 sm:text-lg">
            Your ERP knows the <span className="font-medium text-foreground">money</span>. Your scheduler knows the{' '}
            <span className="font-medium text-foreground">dates</span>. But the work that matters most — pulling them
            together into <em>&ldquo;what is actually going on, and what should we do about it&rdquo;</em> — still
            happens by hand, in spreadsheets and slide decks, every reporting cycle. That synthesis is the PMO&apos;s
            real job. This tool does it.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">By hand today</p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">Re-keyed into spreadsheets and slide decks every cycle — slow, error-prone, and stale the moment it is finished.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">With AI PMO</p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">Synthesised automatically from the live systems, explained in plain language, and reviewed by you before it goes out.</p>
            </div>
          </div>
        </Slide>

        {/* 2 — Where it fits */}
        <Slide idx={2} refCb={setRef}>
          <Hero Icon={Sparkles} label="Where it fits" accent="#d97706" title="An intelligence layer over your systems" tagline="It consumes from your systems of record — it never replaces them" />
          <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 p-5">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" strokeWidth={1.75} />
              <p className="text-sm font-semibold">AI PMO · intelligence &amp; synthesis layer</p>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {LAYER_OUTPUTS.map((o) => <span key={o} className="rounded-full border border-amber-200 bg-card px-2.5 py-1 text-[11px] font-medium text-amber-900">{o}</span>)}
            </div>
          </div>
          <div className="my-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ArrowDown className="h-4 w-4 rotate-180" /> consumes from — never replaces <ArrowDown className="h-4 w-4 rotate-180" /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700"><Database className="h-4 w-4" strokeWidth={1.75} /></span><p className="text-sm font-medium">Any ERP</p></div>
              <p className="mt-2 text-xs text-muted-foreground">Financial system of record — cost · commitment · revenue</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground/80">e.g. SAP PS · Oracle · IFS · and others</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700"><CalendarClock className="h-4 w-4" strokeWidth={1.75} /></span><p className="text-sm font-medium">Any scheduler</p></div>
              <p className="mt-2 text-xs text-muted-foreground">Schedule &amp; resources — dates · critical path · levelling</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground/80">e.g. Microsoft Planner Premium · Primavera P6 · and others</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">Tool-agnostic by design — it works with any ERP and any scheduler.</p>
        </Slide>

        {/* 3 — Two bookends */}
        <Slide idx={3} refCb={setRef}>
          <Hero Icon={Wand2} label="Two bookends" accent="#8b5cf6" title="It writes exactly once" tagline="It touches the systems of record at two moments only" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Wand2 className="h-5 w-5" strokeWidth={1.75} /></span>
              <h3 className="mt-3 text-sm font-semibold">Authors the WBS — upstream</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">ERPs build a WBS from rigid templates. Instead, the AI proposes a scope-true structure; you approve it, and it&apos;s booked into the ERP as the real project — the one deliberate write. The same WBS is published to the scheduler, so every task is born tagged to it.</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><TrendingUp className="h-5 w-5" strokeWidth={1.75} /></span>
              <h3 className="mt-3 text-sm font-semibold">Synthesises the result — downstream</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">From there it only reads — cost from the ERP, progress from the scheduler, joined by the WBS code — to compute earned value and the explained portfolio picture. The systems of record stay untouched.</p>
            </div>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[12px] text-muted-foreground">Write once, at setup, with your approval — then read-only for the life of the project.</p>
        </Slide>

        {/* 4 — How it works */}
        <Slide idx={4} refCb={setRef}>
          <Hero Icon={Workflow} label="How it works" accent="#0ea5e9" title="Connect, synthesise, act" tagline="Three moves, every reporting cycle" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-xl border bg-card p-5">
                <span className="absolute right-4 top-4 text-2xl font-bold text-muted-foreground/15">{i + 1}</span>
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.cls}`}><s.Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">Connect</span>
            <ChevronRight size={14} />
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-800">Draft &amp; synthesise</span>
            <ChevronRight size={14} />
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">Decide &amp; act</span>
            <ChevronRight size={14} />
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">You review &amp; assign</span>
            <ChevronRight size={14} />
            <span className="text-muted-foreground/70">repeat next cycle</span>
          </div>
        </Slide>

        {/* 5 — Earned value */}
        <Slide idx={5} refCb={setRef}>
          <Hero Icon={TrendingUp} label="The flagship" accent="#10b981" title="Earned value — the metric no single system owns" />
          <div className="mt-4 grid grid-cols-1 gap-5 rounded-xl border bg-gradient-to-br from-emerald-50/50 via-card to-card p-6 md:grid-cols-2 md:items-center">
            <p className="text-[14px] leading-relaxed text-foreground/80">
              CPI, SPI, EAC and variance need cost from the ERP, percent-complete from the scheduler and the budget
              structure from the WBS — together. No single system has all three, which is exactly why nobody computes it
              well today. Sitting across both, this tool can.
            </p>
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-0 w-3.5 border-t-2 border-dashed" style={{ borderColor: '#378ADD' }} />planned</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0 w-3.5 border-t-2" style={{ borderColor: '#639922' }} />earned</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0 w-3.5 border-t-2" style={{ borderColor: '#BA7517' }} />actual</span>
              </div>
              <svg viewBox="0 0 220 92" className="w-full" role="img" aria-label="S-curve showing earned value below planned and actual cost above earned.">
                <line x1="50" y1="8" x2="50" y2="84" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
                <text x="52" y="14" fontSize="7" fill="currentColor" fillOpacity="0.45">today</text>
                <polyline points="10,80 50,67 90,46 130,27 170,14 210,10" fill="none" stroke="#378ADD" strokeWidth="1.5" strokeDasharray="4 3" />
                <polyline points="10,80 50,70" fill="none" stroke="#639922" strokeWidth="2" />
                <polyline points="10,80 50,68" fill="none" stroke="#BA7517" strokeWidth="2" />
                <circle cx="50" cy="70" r="2.2" fill="#639922" /><circle cx="50" cy="68" r="2.2" fill="#BA7517" />
                <line x1="10" y1="84" x2="210" y2="84" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
              </svg>
              <div className="mt-3 flex gap-2">
                <span className="flex-1 rounded-md bg-muted/50 px-2 py-1.5 text-center"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">CPI</span><span className="text-sm font-semibold text-red-600">0.88</span></span>
                <span className="flex-1 rounded-md bg-muted/50 px-2 py-1.5 text-center"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">SPI</span><span className="text-sm font-semibold text-red-600">0.81</span></span>
                <span className="flex-1 rounded-md bg-muted/50 px-2 py-1.5 text-center"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">EAC</span><span className="text-sm font-semibold">$1.70M</span></span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[12px] text-muted-foreground">The flagship synthesis: cost × progress × structure, computed in code and narrated by the Variance Analyst.</p>
        </Slide>

        {/* 6 — What it is / isn't */}
        <Slide idx={6} refCb={setRef}>
          <Hero Icon={Scale} label="Boundaries" accent="#64748b" title="What it is — and isn’t" tagline="Clear edges are the point — it complements your systems, it doesn’t replace them" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700">What it does</h3>
              <ul className="mt-3 space-y-2.5">{DOES.map((d) => <li key={d} className="flex gap-2.5 text-[13px]"><Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" strokeWidth={2.25} /><span className="text-foreground/85">{d}</span></li>)}</ul>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-700">What it is not</h3>
              <ul className="mt-3 space-y-2.5">{IS_NOT.map((d) => <li key={d} className="flex gap-2.5 text-[13px]"><X className="mt-0.5 h-4 w-4 flex-none text-rose-400" strokeWidth={2.25} /><span className="text-foreground/85">{d}</span></li>)}</ul>
            </div>
          </div>
        </Slide>

        {/* 7 — Differentiator */}
        <Slide idx={7} refCb={setRef}>
          <Hero Icon={Brain} label="The moat" accent="#8b5cf6" title="What makes it different" tagline="The difference is the AI synthesis itself — not the integration" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Table stakes · any BI tool</p>
              <ul className="mt-3 space-y-2.5">{TABLE_STAKES.map((t) => <li key={t} className="flex gap-2.5 text-[13px] text-muted-foreground"><span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-muted-foreground/40" /><span>{t}</span></li>)}</ul>
            </div>
            <div className="rounded-xl border-2 border-violet-300 bg-violet-50/40 p-5">
              <div className="flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Brain className="h-4 w-4" strokeWidth={1.75} /></span><p className="text-[11px] font-semibold uppercase tracking-wider text-violet-800">The differentiator · AI synthesis</p></div>
              <ul className="mt-3 space-y-2.5">{DIFFERENTIATOR.map((t) => <li key={t} className="flex gap-2.5 text-[13px]"><Check className="mt-0.5 h-4 w-4 flex-none text-violet-600" strokeWidth={2.25} /><span className="text-foreground/80">{t}</span></li>)}</ul>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[13px] text-muted-foreground">The test: if a normal BI dashboard could do it, it is table stakes. The moat is what the AI uniquely adds.</p>
        </Slide>

        {/* 8 — The agents */}
        <Slide idx={8} refCb={setRef}>
          <Hero Icon={Bot} label="The specialists" accent="#8b5cf6" title="One assistant, fourteen specialists" />
          <p className="mt-4 text-base leading-relaxed text-foreground/80 sm:text-lg">
            Ask in plain language and the assistant routes your question to the right method-aware (PMBOK-aligned)
            specialist — each output reviewable and editable. Fourteen narrow experts behave like one assistant.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {AGENTS.map((a) => <span key={a} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: '#8b5cf61f', color: '#7c3aed' }}>{a}</span>)}
          </div>
          <Link href={`/access/${token}/agents`} className="mt-5 inline-flex rounded-full border px-4 py-1.5 text-sm font-medium transition hover:bg-muted hover:border-foreground/20">Meet the 14 agents →</Link>
        </Slide>

        {/* 9 — Capabilities */}
        <Slide idx={9} refCb={setRef}>
          <Hero Icon={Boxes} label="In the app" accent="#2563eb" title="What you can do here" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-xl border bg-card p-5">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.cls}`}><c.Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href={`/access/${token}`} className="inline-flex rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90">Enter dashboard</Link>
            <p className="mt-4 text-xs text-muted-foreground">Portfolio shown is illustrative sample data.</p>
          </div>
        </Slide>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-full max-w-[64rem] -translate-x-1/2 items-center justify-between lg:flex">
        <button type="button" onClick={() => jumpTo(active - 1)} disabled={atStart} aria-label="Previous" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-600 shadow-lg transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-25"><ChevronLeft size={26} strokeWidth={2.5} /></button>
        <button type="button" onClick={() => jumpTo(active + 1)} disabled={atEnd} aria-label="Next" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-600 shadow-lg transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-25"><ChevronRight size={26} strokeWidth={2.5} /></button>
      </div>

      <nav className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/80 px-3 py-2 shadow-sm backdrop-blur" aria-label="Jump to slide">
        {SLIDES.map((s, idx) => {
          const isActive = idx === active;
          return <button key={s.label} type="button" onClick={() => jumpTo(idx)} title={s.label} aria-label={`Go to ${s.label}`} className="rounded-full transition-all hover:scale-125" style={{ width: isActive ? 11 : 8, height: isActive ? 11 : 8, backgroundColor: isActive ? s.accent : 'rgb(203 213 225)' }} />;
        })}
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `.about-deck-scroll { scrollbar-width: thin; overscroll-behavior-x: contain; } .about-deck-scroll::-webkit-scrollbar { height: 8px; }` }} />
    </div>
  );
}
