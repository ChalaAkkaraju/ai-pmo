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
  Workflow, Scale, GitCompare, ChevronLeft, ChevronRight, type LucideIcon,
} from 'lucide-react';

const LAYER_OUTPUTS = ['earned value', 'risk & change synthesis', 'portfolio patterns', 'status narrative', 'recommendations'];

const STATS = [
  { n: '2', h: 'systems unified', s: 'ERP + scheduler, joined on the WBS code' },
  { n: '15', h: 'specialist agents', s: 'PMBOK-aligned, behind one assistant' },
];

const LEAD = {
  overview: "Two systems of record hold the truth about every project — the ERP holds the money, the scheduler holds the time. Neither can tell you what they mean together. AI PMO is the layer that does: it reads both, authors the structure that ties them, and turns the result into a decision-ready picture every reporting cycle — with a human in the loop on every output.",
  where: "AI PMO does not compete with your ERP or your scheduler, and it does not ask you to migrate anything into it. It sits one level up and does the single thing neither can do alone: read both, join them on the WBS code, and explain the combined picture.",
  bookends: "Most tools live at one of two extremes — they only read (and quietly drift out of step with reality), or they write everywhere (and start to fight your system of record). AI PMO does neither. SAP creates the project from the won quote and stays its system of record; AI PMO mirrors it and makes exactly one deliberate write — the WBS, with your approval — then reads for the rest of the project's life.",
  ev: "If the whole thesis needed one proof point, it is earned value. CPI, SPI, EAC and variance each need cost from the ERP, percent-complete from the scheduler and the budget structure from the WBS — together. No single system has all three, which is precisely why almost nobody computes it well. Sitting across both, this layer can — automatically, every cycle.",
  diff: "Pulling cost and schedule into one view is table stakes — every BI and PPM tool gestures at it. The moat here is not the integration; it is what the AI does on top of it.",
  agents: "Behind the single assistant are fourteen narrow, method-aware specialists. Narrow beats general here: each is easier to keep accurate, every answer is traceable to the expert that produced it, and each is grounded in PMBOK practice. You ask in plain language; the right one is routed automatically, and you can always override.",
};

const PAINS = [
  { t: 'Stale on arrival', cls: 'border-rose-200 bg-rose-50/40 text-rose-700', body: 'By the time the pack is built, the numbers have already moved. Decisions get made on last week\u2019s picture.' },
  { t: 'No single truth', cls: 'border-amber-200 bg-amber-50/40 text-amber-700', body: 'Every PM rolls things up their own way. The portfolio view is a patchwork no two people read the same.' },
  { t: 'Costly', cls: 'border-slate-200 bg-slate-50 text-slate-600', body: 'Your most senior people spend the cycle re-keying and reconciling \u2014 not deciding.' },
];

const WHERE_WHY = [
  'Tool-agnostic — works with any ERP and any scheduler',
  'No rip-and-replace — your systems of record stay exactly where they are',
  'Joined by the WBS code — one shared key ties every cost to its schedule',
];

const WHY_AGENTS = [
  { t: 'Accurate', body: 'A narrow brief is far easier to keep correct than one assistant trying to do everything.' },
  { t: 'Traceable', body: 'Every answer is attributed to the specialist that produced it — you always know who said what.' },
  { t: 'Method-aware', body: 'Each is grounded in PMBOK practice and your past projects, not generic advice.' },
];

const EV_UNLOCKS = [
  { t: 'Early warning', body: 'A falling CPI flags an overrun before it lands.' },
  { t: 'Defensible forecasts', body: 'EAC and VAC you can take straight to a sponsor.' },
  { t: 'One honest number', body: 'The same picture for every project and every reviewer.' },
];

const STEPS = [
  { Icon: Link2, cls: 'bg-sky-100 text-sky-700', title: 'Connect', body: 'Point it at your ERP and your scheduler. It pulls cost and structure from one, dates and progress from the other — read-only, on a schedule.' },
  { Icon: Wand2, cls: 'bg-violet-100 text-violet-700', title: 'Draft & synthesise', body: 'Specialist agents draft the planning artefacts and fold cost, schedule, risk and change into one coherent, explained picture.' },
  { Icon: Target, cls: 'bg-emerald-100 text-emerald-700', title: 'Decide & act', body: 'Earned value, a plain-language status narrative and recommended next actions — each reviewed and corrected by you, then assigned to the right colleague.' },
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
  'Not a scheduler — no critical-path engine or resource levelling (that stays in your scheduler, e.g. Primavera P6 or Microsoft Project)',
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

const AGENTS = ['Charter Drafter', 'Stakeholder Analyst', 'WBS Builder', 'Schedule Reasoner', 'Cost Planner', 'Communications Planner', 'Variance Analyst', 'Risk Analyst', 'Change Order Reviewer', 'Issue Logger', 'Portfolio Risk Reviewer', 'Status Reporter', 'Lessons-Learned Synthesiser', 'Closeout Reporter'];

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
  { label: 'vs SAP', accent: '#0ea5e9' },
  { label: 'What you can do', accent: '#2563eb' },
];

function Hero({ Icon, label, accent, title, tagline }: { Icon: LucideIcon; label: string; accent: string; title: string; tagline?: string }) {
  return (
    <div className="rounded-2xl border p-7" style={{ background: `linear-gradient(135deg, ${accent}1f, ${accent}08)`, borderColor: `${accent}33` }}>
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
    <section data-idx={idx} ref={refCb(idx)} className="h-full min-h-full w-full min-w-full flex-none snap-start overflow-y-auto px-6 py-10">
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
          <Link href={`/dashboard`} className="text-muted-foreground hover:text-foreground">← Dashboard</Link>
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
          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">{LEAD.overview}</p>
          <div className="mt-3 rounded-xl border-l-4 border-amber-400 bg-amber-50/50 px-4 py-3">
            <p className="text-[15px] font-medium text-amber-900">The promise: from two systems to one explained picture — without replacing either.</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {STATS.map((st) => (
              <div key={st.h} className="rounded-2xl border bg-gradient-to-br from-amber-50/70 to-card p-6">
                <div className="text-5xl font-extrabold tracking-tight text-amber-700 sm:text-6xl">{st.n}</div>
                <div className="mt-2 text-lg font-bold tracking-tight text-foreground">{st.h}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{st.s}</div>
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
          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">
            Your ERP knows the <span className="font-medium text-foreground">money</span>. Your scheduler knows the{' '}
            <span className="font-medium text-foreground">dates</span>. But the work that matters most — pulling them
            together into <em>&ldquo;what is actually going on, and what should we do about it&rdquo;</em> — still
            happens by hand, in spreadsheets and slide decks, every reporting cycle. That synthesis is the PMO&apos;s
            real job. AI PMO does it.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.t} className={`flex h-full flex-col rounded-xl border p-5 ${p.cls}`}>
                <p className="text-xs font-semibold uppercase tracking-wider">{p.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">The bottleneck is not data — both systems are full of it. It is the <span className="font-semibold">synthesis</span>. That is the job AI PMO takes on.</p>
        </Slide>

        {/* 2 — Where it fits */}
        <Slide idx={2} refCb={setRef}>
          <Hero Icon={Sparkles} label="Where it fits" accent="#d97706" title="An intelligence layer — not another system" tagline="It sits above your systems of record and explains them together" />
          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">{LEAD.where}</p>
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
              <p className="mt-1.5 text-[11px] text-muted-foreground/80">e.g. Primavera P6 · Microsoft Project · and others</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {WHERE_WHY.map((w) => (
              <div key={w} className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-[12px] text-muted-foreground"><Check className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" strokeWidth={2.5} /><span>{w}</span></div>
            ))}
          </div>
        </Slide>

        {/* 3 — Two bookends */}
        <Slide idx={3} refCb={setRef}>
          <Hero Icon={Wand2} label="Two bookends" accent="#8b5cf6" title="It writes exactly once" tagline="It touches the systems of record at two moments only" />
          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">{LEAD.bookends}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-gradient-to-br from-violet-50/70 to-card p-6">
              <div className="text-5xl font-extrabold tracking-tight text-violet-700 sm:text-6xl">1</div>
              <div className="mt-2 text-lg font-bold tracking-tight text-foreground">deliberate write</div>
              <div className="mt-0.5 text-sm text-muted-foreground">the WBS, at setup — with your approval</div>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-violet-50/70 to-card p-6">
              <div className="text-5xl font-extrabold tracking-tight text-violet-700 sm:text-6xl">0</div>
              <div className="mt-2 text-lg font-bold tracking-tight text-foreground">writes after that</div>
              <div className="mt-0.5 text-sm text-muted-foreground">read-only for the life of the project</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex h-full flex-col rounded-xl border bg-card p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Wand2 className="h-5 w-5" strokeWidth={1.75} /></span>
              <h3 className="mt-3 text-sm font-semibold">Authors the WBS — upstream</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">SAP shells the project from the won quote (via CPQ) and owns the header. The detailed WBS, though, comes from rigid ERP templates — so instead the AI authors a scope-true structure, you approve it, and it is booked back into SAP. The same WBS is published to the scheduler, so every task is born tagged to it.</p>
            </div>
            <div className="flex h-full flex-col rounded-xl border bg-card p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><TrendingUp className="h-5 w-5" strokeWidth={1.75} /></span>
              <h3 className="mt-3 text-sm font-semibold">Synthesises the result — downstream</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">From there it only reads — cost from the ERP, progress from the scheduler, joined by the WBS code — to compute earned value and the explained portfolio picture. The systems of record stay untouched.</p>
            </div>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[12px] text-muted-foreground">One deliberate write keeps your ERP the single source of truth — the layer never becomes a shadow system.</p>
        </Slide>

        {/* 4 — How it works */}
        <Slide idx={4} refCb={setRef}>
          <Hero Icon={Workflow} label="How it works" accent="#0ea5e9" title="Connect, synthesise, act" tagline="Three moves, every reporting cycle" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative flex h-full flex-col rounded-xl border bg-card p-5">
                <span className="absolute right-4 top-4 text-2xl font-bold text-muted-foreground/15">{i + 1}</span>
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.cls}`}><s.Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
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
          <p className="mt-3 text-center text-[12px] text-muted-foreground">Nothing happens behind your back — every output is a draft until you accept it.</p>
        </Slide>

        {/* 5 — Earned value */}
        <Slide idx={5} refCb={setRef}>
          <Hero Icon={TrendingUp} label="The flagship" accent="#10b981" title="Earned value — the metric no single system owns" />
          <div className="mt-4 grid grid-cols-1 gap-5 rounded-xl border bg-gradient-to-br from-emerald-50/50 via-card to-card p-6 md:grid-cols-2 md:items-center">
            <p className="text-base leading-relaxed text-foreground/80 text-justify">{LEAD.ev}</p>
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
              <p className="mt-2 text-center text-[11px] text-muted-foreground">Illustrative readout — a project caught slipping early.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {EV_UNLOCKS.map((u) => (
              <div key={u.t} className="flex h-full flex-col rounded-xl border bg-card p-5">
                <p className="text-sm font-semibold text-emerald-800">{u.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] text-muted-foreground">The flagship synthesis: cost × progress × structure, computed in code and narrated by the Variance Analyst.</p>
        </Slide>

        {/* 6 — What it is / isn't */}
        <Slide idx={6} refCb={setRef}>
          <Hero Icon={Scale} label="Boundaries" accent="#64748b" title="What it is — and isn’t" tagline="Clear edges are the point — it complements your systems, it doesn’t replace them" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700">What it does</h3>
              <ul className="mt-3 space-y-2.5">{DOES.map((d) => <li key={d} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" strokeWidth={2.25} /><span className="text-foreground/85">{d}</span></li>)}</ul>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-700">What it is not</h3>
              <ul className="mt-3 space-y-2.5">{IS_NOT.map((d) => <li key={d} className="flex gap-2.5 text-sm"><X className="mt-0.5 h-4 w-4 flex-none text-rose-400" strokeWidth={2.25} /><span className="text-foreground/85">{d}</span></li>)}</ul>
            </div>
          </div>
        </Slide>

        {/* 7 — Differentiator */}
        <Slide idx={7} refCb={setRef}>
          <Hero Icon={Brain} label="The moat" accent="#8b5cf6" title="What makes it different" tagline="The difference is the AI synthesis itself — not the integration" />
          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">{LEAD.diff}</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Table stakes · any BI tool</p>
              <ul className="mt-3 space-y-2.5">{TABLE_STAKES.map((t) => <li key={t} className="flex gap-2.5 text-sm text-muted-foreground"><span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-muted-foreground/40" /><span>{t}</span></li>)}</ul>
            </div>
            <div className="rounded-xl border-2 border-violet-300 bg-violet-50/40 p-5">
              <div className="flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Brain className="h-4 w-4" strokeWidth={1.75} /></span><p className="text-[11px] font-semibold uppercase tracking-wider text-violet-800">The differentiator · AI synthesis</p></div>
              <ul className="mt-3 space-y-2.5">{DIFFERENTIATOR.map((t) => <li key={t} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 flex-none text-violet-600" strokeWidth={2.25} /><span className="text-foreground/80">{t}</span></li>)}</ul>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">The test: if a normal BI dashboard could do it, it is table stakes. The moat is what the AI uniquely adds.</p>
        </Slide>

        {/* 8 — The agents */}
        <Slide idx={8} refCb={setRef}>
          <Hero Icon={Bot} label="The specialists" accent="#8b5cf6" title="One assistant, fourteen specialists" />
          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">{LEAD.agents}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {AGENTS.map((a) => <span key={a} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: '#8b5cf61f', color: '#7c3aed' }}>{a}</span>)}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {WHY_AGENTS.map((w) => (
              <div key={w.t} className="flex h-full flex-col rounded-xl border bg-card p-5">
                <p className="text-sm font-semibold">{w.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
              </div>
            ))}
          </div>
          <Link href={`/agents`} className="mt-5 inline-flex rounded-full border px-4 py-1.5 text-sm font-medium transition hover:bg-muted hover:border-foreground/20">Meet the 15 agents →</Link>
        </Slide>

        {/* 9 — vs SAP */}
        <Slide idx={9} refCb={setRef}>
          <Hero Icon={GitCompare} label="Positioning" accent="#0ea5e9" title="How we compare to SAP's own agents" tagline="SAP is building agents too — here is where AI PMO fits" />
          <p className="mt-4 text-base leading-relaxed text-foreground/80 text-justify">SAP is investing heavily in AI agents — more than 30 already, with hundreds planned. But they run inside SAP&apos;s own systems and automate tasks within them. The one closest to AI PMO is SAP&apos;s Project Setup Agent, which speeds up standing a project up inside S/4HANA. What none of them do is the cross-system synthesis at the heart of AI PMO — joining cost in SAP with a schedule that lives in a separate tool. That makes AI PMO complementary to SAP, not a competitor.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex h-full flex-col rounded-xl border border-sky-200 bg-sky-50/40 p-5">
              <p className="text-sm font-semibold text-sky-800">What SAP ships</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">30+ agents embedded across finance, procurement, supply chain and HR — plus a Project Setup Agent for S/4HANA projects.</p>
            </div>
            <div className="flex h-full flex-col rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
              <p className="text-sm font-semibold text-emerald-800">What is distinct here</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">Earned value, schedule reasoning, risk and status — synthesised across SAP and your separate scheduler, which no in-SAP agent can reach.</p>
            </div>
            <div className="flex h-full flex-col rounded-xl border border-violet-200 bg-violet-50/40 p-5">
              <p className="text-sm font-semibold text-violet-800">Why complementary</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">SAP&apos;s agents assume everything lives in S/4. AI PMO fills the gap when cost is in SAP PS but the schedule is in P6 or MS Project.</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border-l-4 border-slate-300 bg-muted/40 px-4 py-2.5">
            <p className="text-[13px] leading-relaxed text-muted-foreground">A note on humility: SAP ships secure, audited, transactional agents to thousands of enterprises — a far heavier lift than a focused, read-only synthesis layer. This is not a claim to be faster or better than SAP; it is a different, narrower job that sits alongside it.</p>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">Sources: SAP News (Connect 2025, Sapphire 2026), sap.com, SAP Community — as of June 2026. <Link href={`/technical`} className="font-medium text-sky-700 hover:underline">See the detailed agent-by-agent comparison →</Link></p>
        </Slide>

        {/* 10 — Capabilities */}
        <Slide idx={10} refCb={setRef}>
          <Hero Icon={Boxes} label="In the app" accent="#2563eb" title="What you can do here" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="flex h-full flex-col rounded-xl border bg-card p-5">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.cls}`}><c.Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-[15px] text-foreground/80">Everything above, in one place — the portfolio explained, a question away, with the next action ready to assign.</p>
          <div className="mt-5 text-center">
            <Link href={`/dashboard`} className="inline-flex rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90">Enter dashboard</Link>
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
