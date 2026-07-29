'use client';

/**
 * Action ribbon — slim bar below the portfolio HERO. Shows three at-a-glance
 * tiles (cross-agent actions, issues, risks) plus a blinking "Open actions"
 * button when the current role has work waiting.
 *
 * The tiles count ACTIVE/live work by default (open actions; open + in-progress
 * issues; active/open risks — all on live projects), with a "Just mine" toggle
 * to switch to the viewing role's own slice. Tiles click through to Analytics.
 * Counts seed server-side; the Actions tile and the button blink update live via
 * Supabase Realtime on action_items (migrations 0009 / 0010).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { ActionQueue } from '@/components/action-queue';
import { RaisedActionsPanel } from '@/components/raised-actions-panel';
import { NewProjectsPopover, type RecentlyAddedProject } from '@/components/recently-added-banner';

interface CountRow {
  id: string;
  assigned_to_role_type: string;
  raised_by_role_type: string | null;
  status: string;
  response_md: string | null;
}

export function ActionRibbon({
  roleType,
  actionsActive,
  issuesActive,
  risksActive,
  actionsMine,
  issuesMine,
  risksMine,
  recentlyAdded = [],
}: {
  roleType: string;
  actionsActive: number;
  issuesActive: number;
  risksActive: number;
  actionsMine: number;
  issuesMine: number;
  risksMine: number;
  recentlyAdded?: RecentlyAddedProject[];
}) {
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(true);
  const [assignedOpen, setAssignedOpen] = useState(0);
  // Live-bumpable copies of the action counts (issues/risks are static per load).
  const [aActive, setAActive] = useState(actionsActive);
  const [aMine, setAMine] = useState(actionsMine);
  const [flash, setFlash] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const newRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newOpen) return;
    function onDown(e: MouseEvent) {
      if (newRef.current && !newRef.current.contains(e.target as Node)) setNewOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNewOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [newOpen]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/actions?scope=mine`, { cache: 'no-store' });
      const items = ((await res.json()).items ?? []) as CountRow[];
      setAssignedOpen(items.filter((a) => a.status !== 'Done').length);
    } catch {
      /* leave as-is */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel('action_ribbon_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items' }, (payload) => {
        const row = (payload.new ?? payload.old) as CountRow | undefined;
        if (payload.eventType === 'INSERT') {
          setAActive((n) => n + 1);
          if (row && (row.assigned_to_role_type === roleType || row.raised_by_role_type === roleType)) {
            setAMine((n) => n + 1);
          }
        }
        const relevant =
          !!row && (row.assigned_to_role_type === roleType || row.raised_by_role_type === roleType);
        if (relevant) {
          refresh();
          setFlash(true);
          setTimeout(() => setFlash(false), 5000);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roleType, refresh]);

  const attention = assignedOpen > 0 || flash;

  const tiles: { label: string; value: number; slug: string }[] = mine
    ? [
        { label: 'Cross-agent actions', value: aMine, slug: 'actions' },
        { label: 'Issues', value: issuesMine, slug: 'issues' },
        { label: 'Risks', value: risksMine, slug: 'risks' },
      ]
    : [
        { label: 'Cross-agent actions', value: aActive, slug: 'actions' },
        { label: 'Issues', value: issuesActive, slug: 'issues' },
        { label: 'Risks', value: risksActive, slug: 'risks' },
      ];

  return (
    <section className="rounded-lg border bg-card px-4 py-3">
      <style>{`
        @keyframes actionBlink {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.55); }
          50%      { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
        }
        .action-blink { animation: actionBlink 1.25s ease-in-out infinite; }
      `}</style>

      <div className="flex flex-wrap items-center gap-3">
        {/* New projects pill — recently added via the intake form (last 14 days) */}
        {recentlyAdded.length > 0 && (
          <div ref={newRef} className="relative flex-none">
            <button
              type="button"
              onClick={() => setNewOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
              title="Projects added in the last 14 days"
              aria-expanded={newOpen}
            >
              <span aria-hidden="true">🆕</span>
              New
              <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {recentlyAdded.length}
              </span>
            </button>
            {newOpen && (
              <NewProjectsPopover projects={recentlyAdded} onClose={() => setNewOpen(false)} />
            )}
          </div>
        )}

        {/* Open actions button (blinks when the role has work waiting) */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex-none rounded-md px-3.5 py-2 text-sm font-medium transition ${
            attention
              ? 'action-blink bg-red-600 text-white hover:bg-red-700'
              : 'border bg-background text-foreground hover:bg-muted'
          }`}
        >
          {attention ? '🔔 ' : ''}Open actions{assignedOpen > 0 ? ` (${assignedOpen})` : ''}
        </button>

        {/* Portfolio total tiles — click through to Analytics */}
        <div className="flex flex-1 flex-wrap gap-3">
          {tiles.map((t) => (
            <Link
              key={t.label}
              href={`/analytics/${t.slug}`}
              className="group flex min-w-[150px] flex-1 items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2 transition hover:border-foreground/30 hover:bg-muted"
            >
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t.label}
              </span>
              <span className="text-2xl font-bold tabular-nums leading-none">
                {t.value.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>

        {/* Just mine / Overall toggle (right; defaults to Just mine) */}
        <div className="flex flex-none items-center rounded-md border p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setMine(true)}
            className={`rounded px-2 py-1 transition ${mine ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            title="Only what's in your lane"
          >
            Just mine
          </button>
          <button
            type="button"
            onClick={() => setMine(false)}
            className={`rounded px-2 py-1 transition ${!mine ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            title="Live work across the whole portfolio (active projects only; excludes closed)"
          >
            Overall
          </button>
        </div>
      </div>

      {open && <ActionsModal roleType={roleType} onClose={() => setOpen(false)} />}
    </section>
  );
}

function ActionsModal({
  roleType,
  onClose,
}: {
  roleType: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Cross-agent actions"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mt-4 w-full max-w-3xl rounded-xl border bg-background shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">Cross-agent actions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Work here — your dashboard stays as it was.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
          <ActionQueue roleType={roleType} />
          <RaisedActionsPanel roleType={roleType} />
          <EmptyHint roleType={roleType} />
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ roleType }: { roleType: string }) {
  const [empty, setEmpty] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [m, r] = await Promise.all([
          fetch(`/api/actions?scope=mine`, { cache: 'no-store' }),
          fetch(`/api/actions?scope=raised`, { cache: 'no-store' }),
        ]);
        const mineItems = (await m.json()).items ?? [];
        const raised = (await r.json()).items ?? [];
        if (alive) setEmpty(mineItems.length === 0 && raised.length === 0);
      } catch {
        if (alive) setEmpty(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [roleType]);

  if (empty !== true) return null;
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      No actions assigned to you, and none of yours are awaiting a response.
    </p>
  );
}
