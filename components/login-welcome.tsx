'use client';

/**
 * Signed-out landing: the welcome screen exactly as signed-in users see it —
 * pitch and the five workspace cards — with sign-in as a pop-up. Choosing a
 * card opens the sign-in card for that workspace; after signing in the server
 * action takes the person straight there (switching the demo account into the
 * workspace's lead role). "Sign in" at the top opens it without a workspace.
 */

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { signIn } from '@/app/login/actions';
import { WorkspaceLauncher, type LaunchCard } from './workspace-launcher';
import { PITCH, WORKSPACES, WORKSPACE_HEX, type WorkspaceKey } from '@/lib/welcome-content';

const CHIP = ['bg-violet-50 text-violet-800 ring-violet-200', 'bg-indigo-50 text-indigo-800 ring-indigo-200', 'bg-emerald-50 text-emerald-800 ring-emerald-200'];

export function LoginWelcome({ error, next, ws, fontClass }: { error?: string; next?: string; ws?: string; fontClass: string }) {
  const initialWs = WORKSPACES.find((w) => w.key === ws)?.key ?? null;
  const [open, setOpen] = useState<boolean>(Boolean(error));
  const [workspace, setWorkspace] = useState<WorkspaceKey | null>(initialWs);
  const [submitting, setSubmitting] = useState(false);
  const user = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => user.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, submitting]);

  // Back button from a workspace restores this page from cache: close the pop-up.
  useEffect(() => {
    const reset = () => setSubmitting(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const cards: LaunchCard[] = WORKSPACES.map((w) => ({ ...w, roleId: null }));
  const chosen = workspace ? WORKSPACES.find((w) => w.key === workspace) ?? null : null;
  const tone = chosen ? WORKSPACE_HEX[chosen.key].hex : '#6d28d9';

  return (
    <main className={`${fontClass} relative min-h-screen overflow-hidden`}>
      {/* top bar: just a sign-in button */}
      <div className="absolute right-6 top-5 z-10">
        <button type="button" onClick={() => { setWorkspace(null); setOpen(true); }}
          className="rounded-lg border bg-white/80 px-4 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-white">
          Sign in
        </button>
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-8 py-12 text-center">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-12 -z-10 h-80 w-[42rem] max-w-[90vw] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.20), rgba(16,185,129,0.12), transparent)' }} />

        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground shadow-lg shadow-violet-600/20" style={{ color: '#FBBF24' }}>
          <Sparkles className="h-8 w-8" strokeWidth={1.75} />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{PITCH.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-[1.15] tracking-tight sm:text-[2.6rem]">
          Adds{' '}
          <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">Intelligence</span>
          {' '}to your PMO
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-[17px] leading-relaxed text-muted-foreground">
          {PITCH.lead} <span className="font-semibold text-foreground">{PITCH.turn}</span> {PITCH.close}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {PITCH.outcomes.map((t, i) => (
            <span key={t} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 ${CHIP[i % CHIP.length]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />{t}
            </span>
          ))}
        </div>

        <WorkspaceLauncher cards={cards} canSwitch={false} onSelect={(c) => { setWorkspace(c.key); setOpen(true); }} />

        <p className="mt-8 text-xs text-muted-foreground">Portfolio shown inside is illustrative sample data · access is by invitation.</p>
      </div>

      {/* ---- Sign-in pop-up ---------------------------------------------------- */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="signin-title" className="relative w-full max-w-sm overflow-hidden rounded-2xl border bg-white p-7 text-left shadow-2xl">
            <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: tone }} />
            <button type="button" aria-label="Close" onClick={() => !submitting && setOpen(false)} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>

            <h2 id="signin-title" className="text-xl font-bold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {chosen ? <>to open <span className="font-semibold" style={{ color: tone }}>{chosen.title}</span></> : 'Use the Login ID and password provided by your AI PMO owner.'}
            </p>

            {error ? <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <form action={signIn} onSubmit={() => { setSubmitting(true); try { sessionStorage.setItem('pmo-welcome-seen', '1'); } catch { /* ignore */ } }} className="mt-5 space-y-4">
              {/* Empty when no destination was requested — the server then sends each role to its own home. */}
              <input type="hidden" name="next" value={chosen ? '' : (next ?? '')} />
              <input type="hidden" name="workspace" value={chosen?.key ?? ''} />

              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-sm font-medium text-foreground">Login ID</label>
                <input ref={user} id="username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
              </div>
              <button type="submit" disabled={submitting} className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-70">
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-5 text-xs text-muted-foreground">No account? Access is by invitation — contact the AI PMO owner.</p>
          </div>
        </div>
      )}
    </main>
  );
}
