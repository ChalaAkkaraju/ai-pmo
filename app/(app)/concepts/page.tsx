/**
 * AI-concepts page — educational view of the ideas behind AI PMO, rendered as
 * a full-screen slide deck (summary, then one concept per screen), mirroring
 * the agent deck. Education surface; valid token only.
 */

import { notFound, redirect } from 'next/navigation';
import { canViewLearnKey } from '@/lib/learn-content';
import { getSessionRole } from '@/lib/auth';
import { ConceptDeck } from '@/components/concept-deck';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ConceptsPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();
  if (!(await canViewLearnKey('concepts', resolved))) redirect('/dashboard');

  return <ConceptDeck />;
}
