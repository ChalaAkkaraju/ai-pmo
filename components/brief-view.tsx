'use client';

/**
 * Polished, printable BRIEF viewer.
 *
 * Opens when a colleague clicks "↗ Pop out brief" on a widget response card.
 * Renders ONLY the quick brief (output_md, ~250 words) — no long-form regen,
 * no two-tier split. Loads instantly so the brief can be parked in its own
 * tab/window while the colleague continues asking follow-up questions in the
 * widget on the dashboard tab.
 *
 * Styling mirrors the polished report viewer (same letterhead, meta strip,
 * callouts) but tighter — this is a brief, not a long-form deliverable.
 *
 * URL: /access/[token]/brief/[outputId]
 */

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface BriefOutput {
  id: string;
  agent_type: string;
  agent_label: string;
  invoked_at: string;
  user_prompt: string | null;
  output_md: string;
}

interface BriefProject {
  code: string;
  name: string;
  segment: string;
  client: string;
  status: string;
}

interface BriefColleague {
  name: string;
  role_type: string;
}

interface BriefViewProps {
  token: string;
  output: BriefOutput;
  project: BriefProject | null;
  colleague: BriefColleague | null;
  viewerRole: string;
}

const SEGMENT_COLORS: Record<string, string> = {
  renewables: 'bg-emerald-100 text-emerald-900',
  water: 'bg-sky-100 text-sky-900',
  industrial: 'bg-amber-100 text-amber-900',
  power: 'bg-violet-100 text-violet-900',
};

/** Walk React children and extract leading plain text — used for callout detection. */
function extractLeadingText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractLeadingText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    const c = children as { props?: { children?: React.ReactNode } };
    return extractLeadingText(c.props?.children);
  }
  return '';
}

const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mt-5 border-b-2 border-amber-300 pb-1 text-base font-bold text-slate-900">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-5 border-l-4 border-sky-500 pl-2.5 text-base font-semibold text-slate-900">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-3 text-sm font-semibold text-slate-800">{children}</h3>
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
    <blockquote className="my-2.5 rounded-r border-l-4 border-amber-400 bg-amber-50 px-3 py-1.5 not-italic text-slate-800">
      {children}
    </blockquote>
  ),
  p: ({ children }: { children?: React.ReactNode }) => {
    const text = extractLeadingText(children).toLowerCase().trim();
    if (text.startsWith('caveat:') || text.startsWith('note:') || text.startsWith('warning:')) {
      return (
        <p className="my-2.5 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 not-italic text-amber-900">
          {children}
        </p>
      );
    }
    if (
      text.startsWith('recommendation:') ||
      text.startsWith('recommend:') ||
      text.startsWith('recommended action')
    ) {
      return (
        <p className="my-2.5 rounded-md border-l-4 border-sky-400 bg-sky-50 px-3 py-2 text-sky-900">
          {children}
        </p>
      );
    }
    if (text.startsWith('action:') || text.startsWith('next step:') || text.startsWith('next steps:')) {
      return (
        <p className="my-2.5 rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-emerald-900">
          {children}
        </p>
      );
    }
    return <p>{children}</p>;
  },
};

/** Strip the leading H1 and any blank lines before the body content. */
function stripLeadingH1(md: string): { title: string | null; body: string } {
  const lines = md.split('\n');
  let title: string | null = null;
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^# (.+)$/);
    if (m) {
      title = m[1].trim();
      startIdx = i + 1;
      break;
    }
    if (lines[i].trim() !== '') break;
  }
  while (startIdx < lines.length && lines[startIdx].trim() === '') startIdx++;
  return { title, body: lines.slice(startIdx).join('\n').trim() };
}

function deriveTitle(agentLabel: string, project: BriefProject | null): string {
  if (project) return `${agentLabel} — ${project.name}`;
  return `${agentLabel} — Portfolio brief`;
}

export function BriefView({ token, output, project, colleague, viewerRole }: BriefViewProps) {
  const { title, body } = stripLeadingH1(output.output_md);
  const briefTitle = title ?? deriveTitle(output.agent_label, project);

  const invokedDate = new Date(output.invoked_at);
  const dateLong = invokedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeShort = invokedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="brief-root min-h-screen bg-slate-100 print:bg-white">
      {/* Action bar — screen only */}
      <div className="no-print sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href={`/dashboard`}
            className="text-xs text-muted-foreground transition hover:text-foreground"
          >
            ← Back to dashboard
          </Link>
          <Link
            href={`/report/${output.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            title="Open the long-form polished report (with PDF download) in a new tab"
          >
            <span style={{ color: '#FBBF24' }}>📄</span>
            <span>Open full report</span>
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-6 print:max-w-none print:px-0 print:py-0">
        <article className="brief-sheet rounded-lg border bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
          {/* Letterhead */}
          <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-md bg-slate-900 text-lg leading-none"
                style={{ color: '#FBBF24' }}
              >
                ✨
              </span>
              <div>
                <p className="text-sm font-bold tracking-tight text-slate-900">AI PMO</p>
                <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Project Management Office
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Quick brief
              </p>
              <p className="mt-0.5 text-xs text-slate-700">{dateLong}</p>
              <p className="text-[10px] text-slate-500">Generated {timeShort}</p>
            </div>
          </header>

          {/* Title block */}
          <div className="mt-5">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900">
              {briefTitle}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
              {project && (
                <>
                  <span className="font-mono text-[11px] font-semibold text-slate-900">
                    {project.code}
                  </span>
                  <span>·</span>
                  <span>{project.name}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      SEGMENT_COLORS[project.segment] ?? 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {project.segment}
                  </span>
                </>
              )}
              {!project && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-800">
                  Portfolio-level
                </span>
              )}
            </div>
          </div>

          {/* Meta strip */}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-slate-50 px-3 py-2 text-xs sm:grid-cols-4">
            <Meta label="Specialist" value={output.agent_label} />
            <Meta label="Requested by" value={colleague ? colleague.name : '— autonomous —'} />
            <Meta label="For" value={viewerRole} />
            <Meta label="Methodology" value="PMBOK 7" />
          </div>

          {/* Question prompt */}
          {output.user_prompt && (
            <div className="mt-4 rounded-md border-l-4 border-slate-300 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Question
              </p>
              <p className="mt-0.5 text-sm italic text-slate-700">
                &ldquo;{output.user_prompt}&rdquo;
              </p>
            </div>
          )}

          {/* Body */}
          <section className="mt-5">
            <article className="prose prose-sm max-w-none text-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {body}
              </ReactMarkdown>
            </article>
          </section>

          {/* Footer */}
          <footer className="brief-footer mt-8 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
            <p>
              Quick brief by AI PMO · {output.agent_label} · For deeper analysis,
              click <span className="font-medium">Open full report</span> above.
            </p>
          </footer>
        </article>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              body { background: white !important; }
              .brief-sheet {
                box-shadow: none !important;
                border: 0 !important;
                padding: 0 !important;
              }
              @page {
                size: A4;
                margin: 18mm 16mm;
              }
              h1, h2, h3 { page-break-after: avoid; }
              p, li, blockquote { page-break-inside: avoid; }
            }
          `,
        }}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
