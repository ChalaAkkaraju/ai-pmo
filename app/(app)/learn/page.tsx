/**
 * /learn — the education front door. Indexes every explainer in reading order
 * with audience tags. The app is the source of truth for education; this hub
 * is the single entry point over all of it. Valid token only.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';

interface PageProps { params: Promise<{ token: string }>; }

type Audience = 'Exec' | 'PM' | 'Technical';
const AUD: Record<Audience, string> = {
  Exec: 'bg-violet-100 text-violet-700',
  PM: 'bg-emerald-100 text-emerald-700',
  Technical: 'bg-sky-100 text-sky-700',
};

type Item = { href: string; title: string; blurb: string; aud: Audience[]; kind: string };
type Tier = { tier: string; intro: string; items: Item[] };

const TIERS: Tier[] = [
  {
    tier: 'Start here',
    intro: 'What AI PMO is and the case for it.',
    items: [
      { href: 'welcome', title: 'Welcome', blurb: 'The problem it solves, where it fits versus any ERP or scheduler, and how it works at a glance.', aud: ['Exec', 'PM'], kind: 'Overview' },
      { href: 'about', title: 'How it works — the pitch', blurb: 'The full narrative as a deck: the two bookends, earned value, what it is and isn’t, and how it compares to SAP’s own agents.', aud: ['Exec'], kind: 'Deck' },
    ],
  },
  {
    tier: 'How it works',
    intro: 'The moving parts, in plain terms.',
    items: [
      { href: 'architecture', title: 'Architecture', blurb: 'The end-to-end swim lane and process flow, and where the dates live across SAP, the scheduler and AI PMO.', aud: ['PM', 'Technical'], kind: 'Diagram' },
      { href: 'framework', title: 'PMBOK coverage', blurb: 'The coverage matrix — which agent owns which knowledge area, and where humans and the engines stay in charge.', aud: ['PM'], kind: 'Matrix' },
      { href: 'agents', title: 'The 15 agents', blurb: 'Every specialist, one per screen, with what it does, what it doesn’t, and a sample prompt.', aud: ['PM'], kind: 'Deck' },
      { href: 'concepts', title: 'AI concepts', blurb: 'LLM, agent, RAG, grounding and the guardrails — in plain, non-technical language.', aud: ['Exec', 'PM'], kind: 'Deck' },
    ],
  },
  {
    tier: 'Train — how to use it',
    intro: 'Driving the app, task by task.',
    items: [
      { href: 'learn/training', title: 'Training', blurb: 'Short how-tos for operating the app — read the dashboard, the EV and risk views, ask the assistant, assign actions, and create a project.', aud: ['PM'], kind: 'How-to' },
    ],
  },
  {
    tier: 'Going deeper — technical',
    intro: 'The build, the data, and the integration.',
    items: [
      { href: 'technical/data-model', title: 'Data model', blurb: 'The two-layer canonical model, table by table, with provenance and the CPQ → SAP → AI PMO booking flow.', aud: ['Technical'], kind: 'Reference' },
      { href: 'learn/integration', title: 'Integration & sync', blurb: 'How SAP PS and the scheduler feed the canonical model — the WBS-code join, channels, and the sync contract.', aud: ['Technical'], kind: 'Reference' },
      { href: 'learn/roadmap', title: 'Build roadmap', blurb: 'The phased path from canonical model to a live integration layer, with exit criteria per phase.', aud: ['Technical', 'PM'], kind: 'Roadmap' },
      { href: 'technical', title: 'Technical notes hub', blurb: 'Agent profiles, AI PMO vs SAP’s agents, and AI concepts at depth (tokens, RAG internals, MCP, MoE).', aud: ['Technical'], kind: 'Hub' },
    ],
  },
];

export default async function LearnHubPage() {
  const token = 'session';
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/dashboard`} className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Learn AI PMO</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            Everything that explains AI PMO, in one place and in reading order. The running app is the source of truth for
            this material — start at the top and go as deep as you like. Tags show who each page is pitched at.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">Audience:</span>
        {(['Exec', 'PM', 'Technical'] as Audience[]).map((a) => (
          <span key={a} className={`rounded-full px-2 py-0.5 font-medium ${AUD[a]}`}>{a}</span>
        ))}
      </div>

      {TIERS.map((t) => (
        <section key={t.tier} className="mt-7">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{t.tier}</h2>
            <span className="text-xs text-muted-foreground">{t.intro}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {t.items.map((it) => (
              <Link key={it.href} href={`/${it.href}`} className="group rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold group-hover:underline">{it.title}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{it.kind}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{it.blurb}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {it.aud.map((a) => <span key={a} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${AUD[a]}`}>{a}</span>)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
