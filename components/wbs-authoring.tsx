'use client';

/**
 * AI-authored WBS → book-to-ERP controls (the upstream authoring bookend).
 *
 * For an app-native project with no booked WBS yet:
 *   - no proposal  → "Author WBS with AI" (calls /api/wbs/author)
 *   - a proposal   → review bar with "Book to SAP PS" (/api/wbs/book) + re-author
 *
 * The proposed tree itself is rendered by <WbsCanonicalTree mode="proposed"/>;
 * this component is just the action bar + state. After booking, the page
 * reloads and the WBS renders as a normal, read-only SAP-sourced structure.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function WbsAuthoring({
  token,
  projectCode,
  proposed,
}: {
  token: string;
  projectCode: string;
  proposed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'author' | 'book'>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, kind: 'author' | 'book') {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, projectCode }),
      });
      const json = await res.json();
      if (!res.ok) setError(json?.error ?? 'Something went wrong.');
      else router.refresh();
    } catch {
      setError('Network error — please try again.');
    }
    setBusy(null);
  }

  if (!proposed) {
    return (
      <section className="rounded-lg border border-dashed border-violet-300 bg-gradient-to-br from-violet-50/60 to-white p-6">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none" aria-hidden="true">✨</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">No WBS yet — author one with AI</p>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              This project isn&apos;t in SAP yet. Instead of cloning a fixed template, let the assistant
              propose a deliverable-based WBS from the project scope. You review and edit it, then book it
              into SAP PS — where it becomes the system of record.
            </p>
            <button
              type="button"
              onClick={() => call('/api/wbs/author', 'author')}
              disabled={busy !== null}
              className="mt-3 rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'author' ? 'Authoring…' : 'Author WBS with AI'}
            </button>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50/70 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">📝</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Proposed WBS — not yet booked</p>
            <p className="text-xs text-amber-800/80">
              AI-authored draft. Review below, then book it into SAP PS to make it the system of record.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => call('/api/wbs/author', 'author')}
            disabled={busy !== null}
            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-amber-100 disabled:opacity-50"
          >
            {busy === 'author' ? 'Re-authoring…' : '↻ Re-author'}
          </button>
          <button
            type="button"
            onClick={() => call('/api/wbs/book', 'book')}
            disabled={busy !== null}
            className="rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            title="Simulates BAPI_PROJECTDEF_CREATE / WBS-element create in SAP PS"
          >
            {busy === 'book' ? 'Booking…' : '↗ Book to SAP PS'}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
