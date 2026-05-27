/**
 * Agent catalog page — educational view of every specialist agent, rendered
 * as a full-screen slide deck (one agent per screen, scroll-snap navigation).
 *
 * This server component resolves the role from the token, merges an `allowed`
 * flag into each catalog entry (so the deck can show which agents THIS role
 * can invoke vs. the full system), and hands off to the <AgentDeck> client
 * component for the interactive presentation.
 */

import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { AGENT_CATALOG } from '@/lib/agent-catalog';
import { AgentDeck } from '@/components/agent-deck';
import type { AgentType } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AgentCatalogPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const allowed = new Set<AgentType>(resolved.definition.allowed_agents);

  // Sort so the agents this role CAN invoke come first, preserving catalog
  // order within each group. Makes the deck open on relevant agents.
  const entries = [...AGENT_CATALOG]
    .map((entry) => ({ ...entry, allowed: allowed.has(entry.agent_type) }))
    .sort((a, b) => Number(b.allowed) - Number(a.allowed));

  return (
    <AgentDeck
      token={token}
      allowedCount={allowed.size}
      total={AGENT_CATALOG.length}
      entries={entries}
    />
  );
}
