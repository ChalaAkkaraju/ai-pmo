'use client';

/**
 * CTA + skip control for the welcome landing page. "Enter dashboard" marks the
 * welcome as seen for this session; the checkbox optionally sets a permanent
 * per-browser skip so it never auto-shows again.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Compass } from 'lucide-react';

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
    router.push(`/dashboard`);
  }

  return (
    <div className="mt-7 flex flex-col items-center gap-3">
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <button
          type="button"
          onClick={enter}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 px-6 py-3 text-sm font-medium text-white shadow-sm shadow-violet-500/20 transition hover:from-violet-400 hover:to-indigo-400"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} /> Enter dashboard
        </button>
        <Link
          href={`/about`}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-6 py-3 text-sm font-medium text-violet-700 transition hover:bg-violet-100 hover:border-violet-300"
        >
          <Compass className="h-4 w-4 transition-transform group-hover:rotate-12" strokeWidth={2} /> Take the tour
        </Link>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
        Don&apos;t show this welcome next time
      </label>
    </div>
  );
}
