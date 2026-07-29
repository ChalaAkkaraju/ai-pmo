/**
 * About / how-it-works page — the full positioning narrative, rendered as a
 * full-screen slide deck (summary, then one section per screen) mirroring the
 * agent and concept decks. Reachable from welcome and the header Learn menu.
 */

import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { AboutDeck } from '@/components/about-deck';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const token = 'session';
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return <AboutDeck token={token} />;
}
