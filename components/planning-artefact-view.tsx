'use client';

/**
 * Renders the markdown output of a planning agent (charter, WBS, schedule,
 * budget, etc.) for a specific project — with rich typography (accented
 * headings, styled tables, callouts) rather than plain prose.
 *
 * If multiple outputs exist for the same agent_type, shows an iteration
 * selector. Falls back gracefully to a "no output yet" empty state.
 */

import { useState } from 'react';
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
}

interface PlanningArtefactViewProps {
  rows: ArtefactRow[];
  artefactLabel: string;
  token: string;
  /** Optional one-line description shown in the header band. */
  blurb?: string;
}

/** Pull the first H1 (# ...) from the markdown to use as a display title. */
function extractTitle(md: string, fallback: string): string {
  const m = md.match(/^\s*#\s+(.+)$/m);
  return m ? m[1].replace(/\*\*/g, '').trim() : fallback;
}

/** Rough reading-time + size hint for the header band. */
function readingStats(md: string): { words: number; mins: number } {
  const words = (md.trim().match(/\S+/g) ?? []).length;
  return { words, mins: Math.max(1, Math.round(words / 220)) };
}

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

export function PlanningArtefactView({ rows, artefactLabel, token, blurb }: PlanningArtefactViewProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

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
  const title = extractTitle(current.output_md, artefactLabel);
  const stats = readingStats(current.output_md);

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
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {rows.length > 1 && (
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
            <a
              href={`/access/${token}/report/${current.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90"
              title="Opens a polished, printable report in a new tab"
            >
              ↗ Full report
            </a>
          </div>
        </div>
      </div>

      {/* Body */}
      <article className="prose prose-sm max-w-none rounded-xl border bg-card p-6 prose-headings:scroll-mt-20 prose-p:text-[13px] prose-li:text-[13px] dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {current.output_md}
        </ReactMarkdown>
      </article>
    </div>
  );
}
