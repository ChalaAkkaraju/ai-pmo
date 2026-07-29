/**
 * About / how-it-works page — the full positioning narrative, rendered as a
 * full-screen slide deck (summary, then one section per screen) mirroring the
 * agent and concept decks. Reachable from welcome and the header Learn menu.
 */

import { notFound } from 'next/navigation';
import { getSessionRole } from '@/lib/auth';
import { AboutDeck } from '@/components/about-deck';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();

  return <AboutDeck />;
}
