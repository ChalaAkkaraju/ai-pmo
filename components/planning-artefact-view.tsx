'use client';

/**
 * Renders the markdown output of a planning agent (charter, WBS, schedule,
 * budget, etc.) for a specific project — with rich typography (accented
 * headings, styled tables, callouts) rather than plain prose.
 *
 * If multiple outputs exist for the same agent_type, shows an iteration
 * selector. Falls back gracefully to a "no output yet" empty state.
 *
 * Write-capable roles can REVIEW & EDIT the AI draft: the original (output_md)
 * is preserved, the human correction is saved to edited_md with provenance,
 * and the edited version is shown going forward (with a "Revert to AI draft"
 * option). See PATCH /api/agent-output and migration 0015.
 */

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface ArtefactRow {
  id: string;
  agent_type: string;
  invoked_at: string;
  output_md: string;
  user_prompt: string | null;
  tokens_used: number | null;
  cost_usd: number | null;
  edited_md?: string | null;
  edited_by_role_type?: string | null;
  edited_at?: string | null;
}

interface PlanningArtefactViewProps {
  rows: ArtefactRow[];
  artefactLabel: string;
  /** Optional one-line description shown in the header band. */
  blurb?: string;
  /** Write-capable role → can review & edit the draft. */
  canEdit?: boolean;
}

/** Pull the first H1 (# ...) from the markdown to use as a display title. */
function extractTitle(md: string, fallback: string): string {
  const m = md.match(/^\s*#\s+(.+)$/m);
  return m ? m[1].replace(/\*\*/g, '').trim() : fallback;
}

/** Drop the leading H1 — the header band already shows it, so the body would
 * otherwise repeat the title in large type. Only strips a title at the very top. */
function stripLeadingH1(md: string): string {
  return md.replace(/^\s*#\s+.+(\r?\n)+/, '');
}

/** Rough reading-time + size hint for the header band. */
function readingStats(md: string): { words: number; mins: number } {
  const words = (md.trim().match(/\S+/g) ?? []).length;
  return { words, mins: Math.max(1, Math.round(words / 220)) };
}

const ROLE_LABEL: Record<string, string> = {
  pm: 'Senior PM',
  procurement: 'Procurement',
  risk: 'Risk Analyst',
  commercial: 'Commercial',
  project_controls: 'Project Controls',
  program_manager: 'Program Manager',
  engineering_manager: 'Engineering Manager',
  construction_manager: 'Construction Manager',
  hse_manager: 'HSE Manager',
};

const MD_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-3 mt-2 border-b-2 border-amber-300 pb-1 text-xl font-bold tracking-tight text-slate-900">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-6 border-l-4 border-sky-500 pl-2.5 text-base font-semibold text-slate-900">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1.5 mt-4 text-sm font-semibold uppercase tracking-wider text-slate-600">
      {children}
    </h3>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-amber-100 px-1 py-0.5 text-[12px] font-medium text-amber-900 before:content-none after:content-none">
      {children}
    </code>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 rounded-r border-l-4 border-amber-400 bg-amber-50 px-3 py-2 not-italic text-slate-800">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
      {children}
    </thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b px-3 py-2 font-medium">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-b px-3 py-2 align-top">{children}</td>
  ),
};

type EditMeta = { edited_md: string | null; edited_by_role_type: string | null; edited_at: string | null };

export function PlanningArtefactView({ rows, artefactLabel, blurb, canEdit = false }: PlanningArtefactViewProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  // Local overrides keyed by row id so saves/reverts reflect without a reload.
  const [localEdits, setLocalEdits] = useState<Record<string, EditMeta>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leaving a version while editing cancels the edit.
  useEffect(() => {
    setEditing(false);
    setError(null);
  }, [selectedIdx]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-gradient-to-br from-slate-50 to-white p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
          📄
        </div>
        <p className="text-sm font-medium">No {artefactLabel.toLowerCase()} on file yet.</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          When the responsible agent is invoked for this project, the latest {artefactLabel.toLowerCase()} will appear here.
        </p>
      </div>
    );
  }

  const current = rows[selectedIdx];
  const meta: EditMeta =
    localEdits[current.id] ??
    {
      edited_md: current.edited_md ?? null,
      edited_by_role_type: current.edited_by_role_type ?? null,
      edited_at: current.edited_at ?? null,
    };
  const isEdited = !!meta.edited_md;
  const effective = meta.edited_md ?? current.output_md;

  const title = extractTitle(effective, artefactLabel);
  const bodyMd = stripLeadingH1(effective);
  const stats = readingStats(effective);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-output', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, edited_md: draft }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Could not save the edit.');
      } else {
        setLocalEdits((prev) => ({
          ...prev,
          [current.id]: {
            edited_md: json.edited_md ?? draft,
            edited_by_role_type: json.edited_by_role_type ?? null,
            edited_at: json.edited_at ?? null,
          },
        }));
        setEditing(false);
      }
    } catch {
      setError('Network error — could not save the edit.');
    }
    setSaving(false);
  }

  async function revert() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-output', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, revert: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Could not revert.');
      } else {
        setLocalEdits((prev) => ({
          ...prev,
          [current.id]: { edited_md: null, edited_by_role_type: null, edited_at: null },
        }));
        setEditing(false);
      }
    } catch {
      setError('Network error — could not revert.');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Header band */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-50 via-white to-sky-50/40 p-5">
        <span className="absolute left-0 top-0 h-full w-1.5 bg-sky-500" />
        <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
              {artefactLabel}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
            {blurb && <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{blurb}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{stats.words.toLocaleString()} words · ~{stats.mins} min read</span>
              <span>·</span>
              <span>Updated {new Date(current.invoked_at).toLocaleDateString()}</span>
              {rows.length > 1 && (
                <>
                  <span>·</span>
                  <span>{rows.length} versions</span>
                </>
              )}
              {isEdited && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                  ✎ Edited
                  {meta.edited_by_role_type ? ` by ${ROLE_LABEL[meta.edited_by_role_type] ?? meta.edited_by_role_type}` : ''}
                  {meta.edited_at ? ` · ${new Date(meta.edited_at).toLocaleDateString()}` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {rows.length > 1 && !editing && (
              <select
                aria-label="Iteration"
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                className="rounded-md border bg-background px-2 py-1.5 text-xs"
              >
                {rows.map((r, idx) => (
                  <option key={r.id} value={idx}>
                    {new Date(r.invoked_at).toLocaleDateString()} ({idx === 0 ? 'latest' : `v${rows.length - idx}`})
                  </option>
                ))}
              </select>
            )}
            {canEdit && !editing && (
              <button
                type="button"
                onClick={() => {
                  setDraft(effective);
                  setEditing(true);
                  setError(null);
                }}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                title="Review and correct this draft. The AI original is preserved."
              >
                ✎ Edit
              </button>
            )}
            {canEdit && isEdited && !editing && (
              <button
                type="button"
                onClick={revert}
                disabled={saving}
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                title="Discard the human edits and restore the AI draft."
              >
                ↺ Revert to AI draft
              </button>
            )}
            {!editing && (
              <a
                href={`/report/${current.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90"
                title="Opens a polished, printable report in a new tab"
              >
                ↗ Full report
              </a>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Body — editor or rendered markdown */}
      {editing ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Editing markdown. The AI original is kept — you can revert anytime.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !draft.trim()}
                className="rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save edit'}
              </button>
            </div>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck
            className="h-[60vh] w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-[12px] leading-relaxed outline-none focus:ring-1 focus:ring-foreground/30"
          />
        </div>
      ) : (
        <article className="prose prose-sm max-w-none rounded-xl border bg-card p-6 prose-headings:scroll-mt-20 prose-p:text-[13px] prose-li:text-[13px] dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {bodyMd}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}
