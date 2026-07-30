/**
 * Agent catalog page — educational view of every specialist agent, rendered
 * as a full-screen slide deck (one agent per screen, scroll-snap navigation).
 *
 * This is an education surface: it shows ALL 13 agents to every role so a
 * colleague understands the full system, regardless of which agents their
 * role can actually invoke. Invocation permissions still apply in the floating
 * widget and the /api/agent route — they're just not surfaced here.
 */

import { notFound, redirect } from 'next/navigation';
import { canViewLearnKey } from '@/lib/learn-content';
import { getSessionRole } from '@/lib/auth';
import { AGENT_CATALOG } from '@/lib/agent-catalog';
import { AgentDeck } from '@/components/agent-deck';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AgentCatalogPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();
  if (!(await canViewLearnKey('agents', resolved))) redirect('/dashboard');

  return <AgentDeck total={AGENT_CATALOG.length} entries={AGENT_CATALOG} />;
}
