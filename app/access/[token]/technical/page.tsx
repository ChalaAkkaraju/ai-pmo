/**
 * Technical notes — hub. A front door to the deeper, technical-audience
 * material. Reference sections (scrollable, scannable, searchable) plus the
 * planned conceptual readout. Mixed-format by design: lookup content stays
 * scrollable; narrative deep-dives become readouts. Valid token only.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

type Section = { title: string; blurb: string; href: string | null; tag: string; accent: string };
const SECTIONS: Section[] = [
  {
    title: 'Architecture & data model',
    blurb: 'The two-layer canonical model (consume vs build), provenance tagging, and the CPQ → SAP → AI PMO booking flow — table by table.',
    href: 'data-model', tag: 'Reference', accent: '#0ea5e9',
  },
  {
    title: 'The 14 agent profiles',
    blurb: 'Inputs, grounding sources, methodology rules and boundary for every specialist — each summarising its prompt as source of truth.',
    href: 'agent-profiles', tag: 'Reference', accent: '#10b981',
  },
  {
    title: 'AI PMO vs SAP’s agents',
    blurb: 'Agent-by-agent comparison, the distinctive-vs-SAP-only split, and the architectural reason there is so little overlap.',
    href: 'comparison', tag: 'Reference', accent: '#8b5cf6',
  },
  {
    title: 'AI concepts at depth',
    blurb: 'Tokens & context windows, context engineering, fine-tuning vs prompting+RAG, reasoning models, MCP, mixture-of-experts.',
    href: 'concepts-at-depth', tag: 'Readout', accent: '#d97706',
  },
];

export default async function TechnicalHubPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/access/${token}`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <Link href={`/access/${token}/welcome`} className="hover:underline">Welcome</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Technical notes</span>
      </nav>

      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">For a technical audience</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Technical notes</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        The deeper material behind AI PMO — how it&apos;s built, what each agent does under the hood, and how it compares.
        Reference sections are scrollable so you can scan and search them; conceptual deep-dives come as readouts. The
        companion to the business-friendly <Link href={`/access/${token}/concepts`} className="font-medium text-foreground hover:underline">Concepts deck</Link>.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const inner = (
            <>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.accent }} />
                <h2 className="text-base font-semibold tracking-tight">{s.title}</h2>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.blurb}</p>
              <span className="mt-3 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider" style={{ backgroundColor: `${s.accent}1a`, color: s.accent }}>{s.tag}</span>
            </>
          );
          return s.href ? (
            <Link key={s.title} href={`/access/${token}/technical/${s.href}`} className="rounded-xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
              {inner}
            </Link>
          ) : (
            <div key={s.title} className="rounded-xl border border-dashed bg-muted/20 p-5">{inner}</div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/access/${token}/agents`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">The 14 agents →</Link>
        <Link href={`/access/${token}`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">Back to portfolio</Link>
      </div>
    </div>
  );
}
