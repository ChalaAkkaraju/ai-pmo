/**
 * Agent catalog page — educational view of every specialist agent.
 *
 * Lists all 13 agents as cards. Agents the colleague's role can invoke are
 * shown in full colour; agents not in their permission list are shown muted
 * with a "Not in your role" note (so they understand the full system but
 * know what THEY can use).
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { AGENT_CATALOG, type AgentCatalogEntry, type AgentScope } from '@/lib/agent-catalog';
import type { AgentType } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

function scopeBadge(scope: AgentScope): { label: string; className: string } {
  switch (scope) {
    case 'project':
      return { label: 'Project-level', className: 'bg-emerald-100 text-emerald-800' };
    case 'portfolio':
      return { label: 'Portfolio-level', className: 'bg-violet-100 text-violet-800' };
    case 'single-item':
      return { label: 'Single-item', className: 'bg-sky-100 text-sky-800' };
  }
}

export default async function AgentCatalogPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const allowed = new Set<AgentType>(resolved.definition.allowed_agents);
  const allowedCount = allowed.size;

  return (
    <div className="container mx-auto max-w-screen-xl px-8 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/access/${token}`} className="hover:underline">Dashboard</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Agents</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Agents available to you</h1>
        <p className="mt-2 max-w-3xl text-base text-muted-foreground">
          As <strong className="text-foreground">{resolved.definition.display_name}</strong>, you can
          invoke <strong className="text-foreground">{allowedCount} of {AGENT_CATALOG.length}</strong> specialists.
          Each agent is anchored to a methodology and tuned to one job — picking the right one
          is what produces good output. The floating <span className="font-semibold">✨ Ask AI Assistant</span> button
          can also auto-route for you.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGENT_CATALOG.map((entry) => (
          <AgentCard key={entry.agent_type} entry={entry} allowed={allowed.has(entry.agent_type)} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ entry, allowed }: { entry: AgentCatalogEntry; allowed: boolean }) {
  const scope = scopeBadge(entry.scope);
  return (
    <article
      className={`flex flex-col rounded-lg border bg-card p-5 transition ${
        allowed ? 'shadow-sm' : 'opacity-60'
      }`}
    >
      <header className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">{entry.name}</h2>
          {!allowed && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">
              Not in your role
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{entry.purpose}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${scope.className}`}>
            {scope.label}
          </span>
        </div>
      </header>

      <div className="space-y-3 text-xs">
        <section>
          <p className="font-semibold uppercase tracking-wider text-emerald-700">Does well</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-foreground/80">
            {entry.does.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>

        <section>
          <p className="font-semibold uppercase tracking-wider text-rose-700">Doesn&apos;t do</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-foreground/80">
            {entry.doesNot.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>

        <section>
          <p className="font-semibold uppercase tracking-wider text-sky-700">Try asking</p>
          <p className="mt-1 rounded-md border-l-2 border-sky-300 bg-sky-50/50 px-3 py-2 italic text-foreground/80">
            &ldquo;{entry.samplePrompt}&rdquo;
          </p>
        </section>
      </div>

      <footer className="mt-auto pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        {entry.methodology}
      </footer>
    </article>
  );
}
