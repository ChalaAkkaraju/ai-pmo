'use client';

/**
 * "Responses to actions you raised" — the raiser's side of the loop.
 *
 * Shows action_items where raised_by_role_type matches the current role, so the
 * colleague who flagged a mitigation (e.g. the Risk Analyst) can see which
 * actions the owning roles have answered. When a response is saved by the
 * assignee, it arrives here live via Supabase Realtime (UPDATE on action_items)
 * and the row is briefly highlighted. Hidden entirely when the role hasn't
 * raised anything.
 */

import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface ActionItem {
  id: string;
  source_ref: string | null;
  description: string;
  assigned_to_role_type: string;
  raised_by_role_type: string | null;
  status: string;
  urgency: string;
  response_md: string | null;
  responded_by_role_type: string | null;
  responded_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  pm: 'Senior PM',
  procurement: 'Procurement Strategist',
  risk: 'Risk Analyst',
  sponsor: 'VP Sponsor',
  commercial: 'Commercial Manager',
  project_controls: 'Project Controls',
  program_manager: 'Program Manager',
  engineering_manager: 'Engineering Manager',
  construction_manager: 'Construction Manager',
  hse_manager: 'HSE Manager',
};

function roleLabel(rt: string | null): string {
  if (!rt) return 'a colleague';
  return ROLE_LABELS[rt] ?? rt;
}

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'done') return 'bg-emerald-100 text-emerald-800';
  if (s === 'in progress') return 'bg-blue-100 text-blue-900';
  if (s === 'acknowledged') return 'bg-indigo-100 text-indigo-900';
  return 'bg-amber-100 text-amber-800';
}

export function RaisedActionsPanel({ token, roleType }: { token: string; roleType: string }) {
  const [items, setItems] = useState<ActionItem[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/actions?scope=raised&token=${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      setItems((data.items ?? []) as ActionItem[]);
    } catch {
      setItems([]);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: when an action I raised is updated (esp. a response saved),
  // refresh it in place and flash newly-answered rows.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel('action_items_raised_by_role')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'action_items' },
        (payload) => {
          const row = payload.new as ActionItem;
          if (row.raised_by_role_type !== roleType) return;
          setItems((prev) => {
            const list = prev ?? [];
            const existing = list.find((a) => a.id === row.id);
            const newlyAnswered = !!row.response_md && !(existing?.response_md);
            if (newlyAnswered) {
              setFlashIds((f) => new Set(f).add(row.id));
              setExpanded((e) => new Set(e).add(row.id));
              setTimeout(() => {
                setFlashIds((f) => {
                  const next = new Set(f);
                  next.delete(row.id);
                  return next;
                });
              }, 5000);
            }
            return list.map((a) => (a.id === row.id ? row : a));
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'action_items' },
        (payload) => {
          const row = payload.new as ActionItem;
          if (row.raised_by_role_type !== roleType) return;
          setItems((prev) => {
            const list = prev ?? [];
            if (list.some((a) => a.id === row.id)) return list;
            return [row, ...list];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roleType]);

  if (items === null || items.length === 0) return null;

  const answered = items.filter((a) => a.response_md).length;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="mb-8 rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Responses to actions you raised
        </h2>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
          {answered} answered · {items.length} raised
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {items.map((a) => {
          const isOpen = expanded.has(a.id);
          const flash = flashIds.has(a.id);
          const hasResponse = !!a.response_md;
          return (
            <li
              key={a.id}
              className={`rounded-md border bg-background p-3.5 transition ${
                flash ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">{a.description}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>owner: {roleLabel(a.assigned_to_role_type)}</span>
                    {a.source_ref && <span className="font-mono">{a.source_ref}</span>}
                    <span className={`rounded-full px-2 py-0.5 font-medium ${statusClass(a.status)}`}>
                      {a.status}
                    </span>
                    {hasResponse ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                        responded
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                        awaiting response
                      </span>
                    )}
                  </p>
                </div>
                {hasResponse && (
                  <button
                    type="button"
                    onClick={() => toggle(a.id)}
                    className="shrink-0 rounded-md border bg-background px-2.5 py-1 text-[11px] font-medium transition hover:bg-muted"
                  >
                    {isOpen ? 'Hide response' : 'View response'}
                  </button>
                )}
              </div>

              {hasResponse && isOpen && (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                    {roleLabel(a.responded_by_role_type)} responded
                  </p>
                  <article className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.response_md as string}</ReactMarkdown>
                  </article>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
