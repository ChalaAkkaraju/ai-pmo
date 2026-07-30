/**
 * About / how-it-works page — the full positioning narrative, rendered as a
 * full-screen slide deck (summary, then one section per screen) mirroring the
 * agent and concept decks. Reachable from welcome and the header Learn menu.
 */

import { notFound, redirect } from 'next/navigation';
import { canViewLearnKey } from '@/lib/learn-content';
import { getSessionRole } from '@/lib/auth';
import { AboutDeck } from '@/components/about-deck';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();
  if (!(await canViewLearnKey('about', resolved))) redirect('/dashboard');

  return <AboutDeck />;
}
