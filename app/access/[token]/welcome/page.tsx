/**
 * Welcome / landing page. Shown on the first dashboard visit of a session
 * (via WelcomeGate) and reachable anytime at /access/[token]/welcome.
 *
 * Carries the positioning: the problem it addresses, where it sits relative to
 * any ERP and any scheduler, how it works, what it does, and what it is not.
 */

import { notFound } from 'next/navigation';
import {
  Sparkles,
  Database,
  CalendarClock,
  ArrowDown,
  Check,
  X,
  Boxes,
  MessagesSquare,
  FilePlus2,
  ListChecks,
  TrendingUp,
  Link2,
  Wand2,
  Target,
  Brain,
  ClipboardList,
  Gauge,
  ShieldAlert,
  Bot,
  UserCheck,
  Plug,
} from 'lucide-react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { resolveRoleFromToken } from '@/lib/role-context';
import { WelcomeActions } from '@/components/welcome-actions';

export const dynamic = 'force-dynamic';

const display = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

const HERO_CHIPS = [
  { label: 'Earned value built in', cls: 'bg-emerald-100 text-emerald-800', Icon: TrendingUp },
  { label: '13 specialist agents', cls: 'bg-violet-100 text-violet-800', Icon: Bot },
  { label: 'Human-in-the-loop', cls: 'bg-amber-100 text-amber-800', Icon: UserCheck },
  { label: 'Tool-agnostic', cls: 'bg-sky-100 text-sky-800', Icon: Plug },
];
const LAYER_OUTPUTS = ['earned value', 'risk & change synthesis', 'portfolio patterns', 'status narrative', 'recommendations'];

const STEPS = [
  { Icon: Link2, cls: 'bg-sky-100 text-sky-700', title: 'Connect', body: 'Point it at your ERP and your scheduler. It reads cost and structure from one, dates and progress from the other.' },
  { Icon: Wand2, cls: 'bg-violet-100 text-violet-700', title: 'Draft & synthesise', body: 'Specialist agents draft the planning artefacts and pull cost, schedule, risk and change into one picture.' },
  { Icon: Target, cls: 'bg-emerald-100 text-emerald-700', title: 'Decide & act', body: 'Earned value, the status narrative and recommended actions — reviewed and corrected by you, then assigned.' },
];

const DOES = [
  'Computes earned value across cost and schedule — CPI, SPI, EAC, variance',
  'Drafts the planning artefacts: charter, stakeholders, WBS, schedule, budget',
  'Synthesises risks, issues and change orders into cross-project patterns',
  'Writes the status narrative and recommends actions to the right role',
  'Keeps a human in the loop — every draft is reviewable, editable and traceable',
];

const IS_NOT = [
  'Not a scheduler — no critical-path engine or resource levelling (that stays in your scheduler, e.g. Microsoft Planner Premium or Primavera P6)',
  'Not an accounting system — cost, commitment, billing and revenue stay in your ERP, e.g. SAP PS or Oracle',
  'Not a data-entry replacement — it consumes those systems of record, it does not replace them',
];

const CAPABILITIES = [
  { Icon: Boxes, cls: 'bg-sky-100 text-sky-700', title: 'See the whole portfolio', body: 'Every project in one place — health, risks, variance and cross-cutting patterns at a glance.' },
  { Icon: MessagesSquare, cls: 'bg-violet-100 text-violet-700', title: 'Ask the AI assistant', body: 'Any project or portfolio question, answered by the right specialist agent — full report a click away.' },
  { Icon: FilePlus2, cls: 'bg-amber-100 text-amber-700', title: 'Stand up a new project', body: 'A guided intake form and a step-by-step setup checklist that drafts the charter, WBS, schedule and budget.' },
  { Icon: ListChecks, cls: 'bg-emerald-100 text-emerald-700', title: 'Act on what matters', body: 'Assign tasks to colleagues, track cross-agent actions, and review or correct anything the agents draft.' },
];

const AGENT_GROUPS = [
  { Icon: ClipboardList, cls: 'bg-sky-100 text-sky-700', title: 'Planning', agents: ['Charter Drafter', 'Stakeholder Analyst', 'WBS Builder', 'Schedule Reasoner', 'Budget Builder', 'Communications Planner'] },
  { Icon: Gauge, cls: 'bg-amber-100 text-amber-700', title: 'Controls & commercial', agents: ['Variance Analyst', 'Change Order Reviewer', 'Issue Logger'] },
  { Icon: ShieldAlert, cls: 'bg-rose-100 text-rose-700', title: 'Risk & closeout', agents: ['Risk Analyst', 'Portfolio Risk Reviewer', 'Lessons-Learned Synthesiser', 'Closeout Reporter'] },
];

export default async function WelcomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className={`${display.className} container mx-auto max-w-4xl px-8 py-14`}>
      {/* Hero */}
      <div className="text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground" style={{ color: '#FBBF24' }}>
          <Sparkles className="h-8 w-8" strokeWidth={1.75} />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI PMO · intelligence layer</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">The intelligence layer your project office is missing</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          It sits above your ERP and your scheduler and does the part neither can — turning cost, schedule, risk and
          change into one explained portfolio picture, with the analysis already done.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {HERO_CHIPS.map((c) => (
            <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.cls}`}>
              <c.Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* The problem */}
      <div className="mt-12 overflow-hidden rounded-xl border bg-gradient-to-br from-amber-50/60 via-card to-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">The problem</p>
        <p className="mt-2 text-[15px] leading-relaxed">
          Your ERP knows the <span className="font-medium text-foreground">money</span>. Your scheduler knows the{' '}
          <span className="font-medium text-foreground">dates</span>. But the work that matters most — pulling them
          together into <em>&ldquo;what is actually going on, and what should we do about it&rdquo;</em> — still happens
          by hand, in spreadsheets and slide decks, every reporting cycle. That synthesis is the PMO&apos;s real job.
          This tool does it.
        </p>
      </div>

      {/* Where it fits */}
      <p className="mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Where it fits</p>
      <div className="mx-auto mt-4 max-w-2xl">
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-5">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" strokeWidth={1.75} />
            <p className="text-sm font-semibold">AI PMO · intelligence &amp; synthesis layer</p>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {LAYER_OUTPUTS.map((o) => (
              <span key={o} className="rounded-full border border-amber-200 bg-card px-2.5 py-1 text-[11px] font-medium text-amber-900">{o}</span>
            ))}
          </div>
        </div>
        <div className="my-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ArrowDown className="h-4 w-4 rotate-180" /> consumes from — never replaces <ArrowDown className="h-4 w-4 rotate-180" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700"><Database className="h-4 w-4" strokeWidth={1.75} /></span>
              <p className="text-sm font-medium">Any ERP</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Financial system of record — cost · commitment · revenue</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/80">e.g.{' '}<a href="https://www.sap.com/products/erp/s4hana.html" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-foreground">SAP PS</a>{' · '}<a href="https://www.oracle.com/erp/" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-foreground">Oracle</a>{' · '}<a href="https://www.ifs.com/" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-foreground">IFS</a>{' · and others'}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700"><CalendarClock className="h-4 w-4" strokeWidth={1.75} /></span>
              <p className="text-sm font-medium">Any scheduler</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Schedule &amp; resources — dates · critical path · levelling</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/80">e.g.{' '}<a href="https://www.microsoft.com/en-us/microsoft-365/planner" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-foreground">Microsoft Planner Premium</a>{' · '}<a href="https://www.oracle.com/construction-engineering/primavera-p6/" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-foreground">Primavera P6</a>{' · and others'}</p>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Tool-agnostic by design — it works with any ERP and any scheduler, including but not limited to the products named here.
        </p>
      </div>

      {/* How it works */}
      <p className="mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">How it works</p>
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

      {/* EV flagship — with mini S-curve */}
      <div className="mt-6 grid grid-cols-1 gap-5 rounded-xl border bg-gradient-to-br from-emerald-50/50 via-card to-card p-6 md:grid-cols-2 md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><TrendingUp className="h-5 w-5" strokeWidth={1.75} /></span>
            <p className="text-sm font-semibold">Earned value is the flagship</p>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            CPI, SPI, EAC and variance need cost from the ERP, percent-complete from the scheduler and the budget
            structure from the WBS — together. No single system has all three, which is exactly why nobody computes it
            well today. Sitting across both, this tool can.
          </p>
        </div>
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
            <circle cx="50" cy="70" r="2.2" fill="#639922" />
            <circle cx="50" cy="68" r="2.2" fill="#BA7517" />
            <line x1="10" y1="84" x2="210" y2="84" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
          </svg>
          <div className="mt-3 flex gap-2">
            <span className="flex-1 rounded-md bg-muted/50 px-2 py-1.5 text-center"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">CPI</span><span className="text-sm font-semibold text-red-600">0.88</span></span>
            <span className="flex-1 rounded-md bg-muted/50 px-2 py-1.5 text-center"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">SPI</span><span className="text-sm font-semibold text-red-600">0.81</span></span>
            <span className="flex-1 rounded-md bg-muted/50 px-2 py-1.5 text-center"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">EAC</span><span className="text-sm font-semibold">$1.70M</span></span>
          </div>
        </div>
      </div>

      {/* What it does / is not */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">What it does</h2>
          <ul className="mt-3 space-y-2.5">
            {DOES.map((d) => (
              <li key={d} className="flex gap-2.5 text-[13px]">
                <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" strokeWidth={2.25} />
                <span className="text-muted-foreground">{d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">What it is not</h2>
          <ul className="mt-3 space-y-2.5">
            {IS_NOT.map((d) => (
              <li key={d} className="flex gap-2.5 text-[13px]">
                <X className="mt-0.5 h-4 w-4 flex-none text-muted-foreground/60" strokeWidth={2.25} />
                <span className="text-muted-foreground">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* What makes it different */}
      <p className="mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">What makes it different</p>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
        &ldquo;An integration dashboard over two systems&rdquo; is a crowded claim — PPM and BI tools all gesture at it.
        The difference here is the AI synthesis itself.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-muted/20 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Table stakes · any BI tool</p>
          <ul className="mt-3 space-y-2.5">
            {['Pull cost and schedule into one view', 'Charts, roll-ups and status tables', 'Filters and drill-downs'].map((t) => (
              <li key={t} className="flex gap-2.5 text-[13px] text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-muted-foreground/40" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border-2 border-violet-300 bg-violet-50/40 p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Brain className="h-4 w-4" strokeWidth={1.75} /></span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-800">The differentiator · AI synthesis</p>
          </div>
          <ul className="mt-3 space-y-2.5">
            {['Drafts the charter, WBS, schedule and budget', 'Writes the status narrative in plain language', 'Spots cross-project risk and change patterns', 'Recommends the next action to the right role', 'Every output reviewed and correctable by a human'].map((t) => (
              <li key={t} className="flex gap-2.5 text-[13px]">
                <Check className="mt-0.5 h-4 w-4 flex-none text-violet-600" strokeWidth={2.25} />
                <span className="text-foreground/80">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-2xl text-center text-[13px] text-muted-foreground">
        The test we hold every feature to: if a normal BI dashboard could do it, it is table stakes. The moat is what the AI uniquely adds.
      </p>

      {/* Specialist agents */}
      <p className="mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">One assistant, thirteen specialists</p>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
        Ask in plain language and the assistant routes your question to the right specialist agent — each one
        method-aware (PMBOK-aligned), each output reviewable and editable.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {AGENT_GROUPS.map((g) => (
          <div key={g.title} className="rounded-xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${g.cls}`}><g.Icon className="h-4 w-4" strokeWidth={1.75} /></span>
              <p className="text-sm font-semibold">{g.title}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {g.agents.map((a) => (
                <span key={a} className="rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">{a}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Capabilities */}
      <p className="mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">What you can do here</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CAPABILITIES.map((c) => (
          <div key={c.title} className="rounded-xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.cls}`}><c.Icon className="h-5 w-5" strokeWidth={1.75} /></span>
            <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <p className="mt-12 text-center text-lg font-semibold">Ready to look around?</p>
      <WelcomeActions token={token} />

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Portfolio shown is illustrative sample data. You can return to this page anytime at <span className="font-mono">/welcome</span>.
      </p>
    </div>
  );
}
