'use client';

/**
 * CTA + skip control for the welcome landing page. "Enter dashboard" marks the
 * welcome as seen for this session; the checkbox optionally sets a permanent
 * per-browser skip so it never auto-shows again.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function WelcomeActions({ token }: { token: string }) {
  const router = useRouter();
  const [skip, setSkip] = useState(false);

  function enter() {
    try {
      sessionStorage.setItem('pmo-welcome-seen', '1');
      if (skip) localStorage.setItem('pmo-welcome-skip', '1');
    } catch {
      /* ignore storage errors */
    }
    router.push(`/access/${token}`);
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={enter}
        className="rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
      >
        Enter dashboard
      </button>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
        Don&apos;t show this welcome next time
      </label>
    </div>
  );
}
