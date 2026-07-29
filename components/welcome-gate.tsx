'use client';

/**
 * First-visit gate for the dashboard. On the first dashboard load of a browser
 * session (and unless the viewer has permanently skipped it), redirects to the
 * welcome landing page. Sets the per-session "seen" flag BEFORE redirecting so
 * navigating back to the dashboard never bounces in a loop.
 *
 * Preferences are per-browser (localStorage / sessionStorage), not server-side,
 * because role tokens are shared — a server preference would skip the welcome
 * for everyone using that token.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function WelcomeGate() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (localStorage.getItem('pmo-welcome-skip') === '1') return;
      if (sessionStorage.getItem('pmo-welcome-seen') === '1') return;
      sessionStorage.setItem('pmo-welcome-seen', '1');
      router.replace(`/welcome`);
    } catch {
      /* storage unavailable — just stay on the dashboard */
    }
  }, [router]);
  return null;
}
