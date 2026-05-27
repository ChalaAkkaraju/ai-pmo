'use client';

/**
 * Polished, printable status-report view.
 *
 * Two-tier:
 *   - "Summary" — everything before the first H2 of the agent output.
 *   - "Full detail" — from the first H2 onward, collapsible (open by default).
 *   - If the markdown has no H2, everything renders as the Summary block
 *     (quick-mode briefings) and no toggle is shown.
 *
 * Print-to-PDF:
 *   "Download PDF" calls window.print(). Print CSS hides chrome/buttons and
 *   force-expands the full detail. Modern browsers let the user pick
 *   "Save as PDF" in the print dialog.
 *
 * The page is its own URL (/access/[token]/report/[outputId]) and is meant to
 * be opened in a new tab from the dashboard / floating widget / planning tabs.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReportOutput {
  id: string;
  agent_type: string;
  agent_label: string;
  invoked_at: string;
  user_prompt: string | null;
  output_md: string;
}

interface ReportProject {
  code: string;
  name: string;
  segment: string;
  client: string;
  status: string;
}

interface ReportColleague {
  name: string;
  role_type: string;
}

interface ReportViewProps {
  token: string;
  output: ReportOutput;
  project: ReportProject | null;
  colleague: ReportColleague | null;
  viewerRole: string;
}

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

/**
 * Split markdown at the first H2 heading (## on its own line).
 *
 *   - If found: { summary: text before, detail: text from "## ..." onward }
 *   - If not found: { summary: full text, detail: null }
 *
 * The first H1 (single `#`) is treated as the title and stripped from both
 * sides so we don't render it twice (we show it in the report header instead).
 */
function splitSummaryAndDetail(md: string): { title: string | null; summary: string; detail: string | null } {
  const lines = md.split('\n');
  let title: string | null = null;
  let startIdx = 0;

  // Find the first H1, capture it as title, advance past it
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^# (.+)$/);
    if (m) {
      title = m[1].trim();
      startIdx = i + 1;
      break;
    }
    // Stop scanning for H1 once we hit any other content
    if (lines[i].trim() !== '') break;
  }

  // Skip leading blank lines after title
  while (startIdx < lines.length && lines[startIdx].trim() === '') startIdx++;

  // Find first H2 after startIdx
  let h2Idx = -1;
  for (let i = startIdx; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      h2Idx = i;
      break;
    }
  }

  if (h2Idx === -1) {
    return {
      title,
      summary: lines.slice(startIdx).join('\n').trim(),
      detail: null,
    };
  }

  return {
    title,
    summary: lines.slice(startIdx, h2Idx).join('\n').trim(),
    detail: lines.slice(h2Idx).join('\n').trim(),
  };
}

/** Custom ReactMarkdown components — matches the dashboard's rich color treatment. */
const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mt-6 border-b-2 border-amber-300 pb-1 text-xl font-bold text-slate-900">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-6 border-l-4 border-sky-500 pl-3 text-lg font-semibold text-slate-900">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-4 text-base font-semibold text-slate-800">{children}</h3>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-amber-100 px-1.5 py-0.5 text-sm font-medium text-amber-900 before:content-none after:content-none">
      {children}
    </code>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 rounded-r border-l-4 border-amber-400 bg-amber-50 px-3 py-2 not-italic text-slate-800">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse border border-slate-300 text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-slate-300 bg-slate-100 px-3 py-1.5 text-left font-semibold text-slate-900">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-slate-300 px-3 py-1.5 text-slate-800">{children}</td>
  ),
  p: ({ children }: { children?: React.ReactNode }) => {
    const text = extractLeadingText(children).toLowerCase().trim();
    if (text.startsWith('caveat:') || text.startsWith('note:') || text.startsWith('warning:')) {
      return (
        <p className="my-3 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 not-italic text-amber-900">
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
        <p className="my-3 rounded-md border-l-4 border-sky-400 bg-sky-50 px-3 py-2 text-sky-900">
          {children}
        </p>
      );
    }
    if (text.startsWith('action:') || text.startsWith('next step:') || text.startsWith('next steps:')) {
      return (
        <p className="my-3 rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-emerald-900">
          {children}
        </p>
      );
    }
    return <p>{children}</p>;
  },
};

const SEGMENT_COLORS: Record<string, string> = {
  renewables: 'bg-emerald-100 text-emerald-900',
  water: 'bg-sky-100 text-sky-900',
  industrial: 'bg-amber-100 text-amber-900',
  power: 'bg-violet-100 text-violet-900',
};

export function ReportView({ token, output, project, colleague, viewerRole }: ReportViewProps) {
  const [detailOpen, setDetailOpen] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Full-mode regeneration. The DB stores the QUICK BRIEF (concise:true output);
  // the polished report view should show the LONG-FORM version. On mount we
  // fire /api/agent with concise:false, cache in sessionStorage to avoid
  // re-billing within a session, and swap the markdown when it arrives.
  const [fullMarkdown, setFullMarkdown] = useState<string | null>(null);
  const [fullState, setFullState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [fullError, setFullError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `report-full-md:${output.id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setFullMarkdown(cached);
        setFullState('ready');
        return;
      }
    } catch {
      // sessionStorage may be unavailable (e.g., privacy mode) — silently skip cache
    }

    let cancelled = false;
    setFullState('loading');
    fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        agent_type: output.agent_type,
        project_code: project?.code,
        user_prompt: output.user_prompt ?? '',
        concise: false,
        skip_log: true, // no duplicate activity-feed entry
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.output_md) {
          setFullMarkdown(data.output_md);
          setFullState('ready');
          try {
            sessionStorage.setItem(cacheKey, data.output_md);
          } catch {
            // ignore cache write errors
          }
        } else {
          setFullError(data.error ?? `HTTP ${res.status}`);
          setFullState('error');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setFullError((err as Error).message);
        setFullState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [output.id, output.agent_type, output.user_prompt, project, token]);

  // Choose source markdown: full version once it arrives, otherwise the brief
  // (so users see content immediately instead of a blank skeleton).
  const sourceMarkdown = fullMarkdown ?? output.output_md;
  const { title, summary, detail } = splitSummaryAndDetail(sourceMarkdown);
  const reportTitle = title ?? deriveTitle(output.agent_label, project);

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

  /**
   * Build a friendly filename: AI-PMO-<Agent>-<ProjectCode>-<YYYY-MM-DD>.pdf
   * Falls back to AI-PMO-Report-<date>.pdf if pieces are missing.
   */
  function buildFilename(): string {
    const datePart = invokedDate.toISOString().slice(0, 10);
    const agentSlug = output.agent_label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const projectSlug = project ? project.code : 'Portfolio';
    return `AI-PMO-${agentSlug}-${projectSlug}-${datePart}.pdf`;
  }

  /**
   * Generate a real PDF using html2pdf.js (dynamic import — client-only,
   * touches window). Browser triggers the file save based on its own
   * downloads setting; if the user has "Ask where to save each file"
   * enabled in browser settings, they get a native folder picker.
   */
  async function handleDownloadPdf() {
    if (!sheetRef.current || generatingPdf) return;
    // Expand the detail section so the whole report is included.
    setDetailOpen(true);
    setGeneratingPdf(true);

    try {
      // Wait one paint so React flushes the open-state DOM change.
      await new Promise((r) => setTimeout(r, 80));

      // Dynamic import — html2pdf.js touches window so it can't be in the bundle for SSR.
      const html2pdf = (await import('html2pdf.js')).default;

      await html2pdf()
        .from(sheetRef.current)
        .set({
          margin: [10, 10, 10, 10],
          filename: buildFilename(),
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            // Avoid capturing fixed/absolute elements outside the sheet
            windowWidth: sheetRef.current.scrollWidth,
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true,
          },
          // 'avoid-all' tries to keep block-level elements together; 'css' honors
          // our page-break-* hints; 'legacy' adds a class-based escape hatch.
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            avoid: ['h1', 'h2', 'h3', 'blockquote', '.report-footer'],
          },
        })
        .save();
    } catch (err) {
      // Fallback to print dialog if html2pdf fails for any reason.
      console.error('PDF generation failed, falling back to print:', err);
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="report-root min-h-screen bg-slate-100 print:bg-white">
      {/* Action bar — visible on screen, hidden in print. Sized to draw the eye. */}
      <div className="no-print sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-col">
            <Link
              href={`/access/${token}`}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              ← Back to dashboard
            </Link>
            <p className="mt-0.5 text-[10px] text-slate-400">
              The PDF saves to wherever your browser is set to put downloads.{' '}
              <span className="font-medium">
                To pick a folder each time, enable “Ask where to save each file” in your browser&apos;s download settings.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generatingPdf || fullState === 'loading'}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
              style={{ color: 'white' }}
              title={
                fullState === 'loading'
                  ? 'Wait — the full report is still generating'
                  : 'Generates a real PDF file and triggers a download'
              }
            >
              {generatingPdf ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Generating PDF…</span>
                </>
              ) : fullState === 'loading' ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Preparing report…</span>
                </>
              ) : (
                <>
                  <span style={{ color: '#FBBF24' }}>↓</span>
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Full-mode loading banner — visible only on screen while we regenerate */}
      {fullState === 'loading' && (
        <div className="no-print mx-auto mt-4 max-w-4xl px-6">
          <div className="flex items-center gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
            <span>
              Generating the full long-form report. This usually takes 25–40 seconds. The
              quick brief is shown below in the meantime.
            </span>
          </div>
        </div>
      )}
      {fullState === 'error' && (
        <div className="no-print mx-auto mt-4 max-w-4xl px-6">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            <span className="font-medium">Couldn&apos;t generate the long-form report</span> —
            showing the quick brief instead. ({fullError})
          </div>
        </div>
      )}

      {/* Report sheet — ref'd by html2pdf when generating the PDF */}
      <main className="mx-auto max-w-4xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
        <article
          ref={sheetRef}
          className="report-sheet rounded-lg border bg-white p-10 shadow-sm print:border-0 print:p-0 print:shadow-none"
        >
          {/* Letterhead */}
          <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-md bg-slate-900 text-xl leading-none"
                style={{ color: '#FBBF24' }}
              >
                ✨
              </span>
              <div>
                <p className="text-base font-bold tracking-tight text-slate-900">AI PMO</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Project Management Office
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Status report
              </p>
              <p className="mt-0.5 text-xs text-slate-700">{dateLong}</p>
              <p className="text-[11px] text-slate-500">Generated {timeShort}</p>
            </div>
          </header>

          {/* Title block */}
          <div className="mt-6">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">
              {reportTitle}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              {project && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-semibold text-slate-900">
                      {project.code}
                    </span>
                    <span>·</span>
                    <span>{project.name}</span>
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      SEGMENT_COLORS[project.segment] ?? 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {project.segment}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>{project.client}</span>
                </>
              )}
              {!project && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-800">
                    Portfolio-level
                  </span>
                  <span>Cross-project analysis</span>
                </span>
              )}
            </div>
          </div>

          {/* Meta strip */}
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-md bg-slate-50 px-4 py-3 text-xs sm:grid-cols-4">
            <Meta label="Prepared by" value={output.agent_label} />
            <Meta
              label="Requested by"
              value={colleague ? colleague.name : '— autonomous —'}
            />
            <Meta label="For" value={viewerRole} />
            <Meta label="Methodology" value="PMBOK 7" />
          </div>

          {/* Prompt context */}
          {output.user_prompt && (
            <div className="mt-5 rounded-md border-l-4 border-slate-300 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Request
              </p>
              <p className="mt-1 text-sm italic text-slate-700">&ldquo;{output.user_prompt}&rdquo;</p>
            </div>
          )}

          {/* Body — three rendering modes:
              1. Summary + Detail (split): summary has content AND detail exists
              2. Summary only: short briefing, no H2 headings present
              3. Detail only: agent jumped straight from H1 to H2 (no preamble)
              The flat-render mode (3) avoids showing an empty Summary block. */}
          {summary && detail && (
            <>
              <section className="mt-7">
                <div className="mb-2 flex items-baseline justify-between border-b border-slate-200 pb-1">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Summary
                  </h2>
                  <span className="text-[10px] text-slate-400 print:hidden">always visible</span>
                </div>
                <article className="prose prose-sm max-w-none text-slate-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {summary}
                  </ReactMarkdown>
                </article>
              </section>

              <section className="mt-8">
                <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Full detail
                  </h2>
                  <button
                    type="button"
                    onClick={() => setDetailOpen((v) => !v)}
                    className="no-print rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50"
                    aria-expanded={detailOpen}
                  >
                    {detailOpen ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                <div className={detailOpen ? 'block' : 'hidden print:block'}>
                  <article className="prose prose-sm max-w-none text-slate-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {detail}
                    </ReactMarkdown>
                  </article>
                </div>
                {!detailOpen && (
                  <button
                    type="button"
                    onClick={() => setDetailOpen(true)}
                    className="no-print mt-3 w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-100"
                  >
                    Show full detail ({detail.split('\n').filter((l) => l.trim()).length} lines)
                  </button>
                )}
              </section>
            </>
          )}

          {summary && !detail && (
            <section className="mt-7">
              <article className="prose prose-sm max-w-none text-slate-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {summary}
                </ReactMarkdown>
              </article>
            </section>
          )}

          {!summary && detail && (
            <section className="mt-7">
              <article className="prose prose-sm max-w-none text-slate-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {detail}
                </ReactMarkdown>
              </article>
            </section>
          )}

          {/* Footer */}
          <footer className="report-footer mt-10 border-t border-slate-200 pt-4 text-[10px] text-slate-500">
            <p>
              Generated by AI PMO · Methodology: PMBOK 7 · Cross-cutting risk taxonomy ·
              Specialist: {output.agent_label}
            </p>
            <p className="mt-1">
              This is an AI-assisted briefing. Decisions of material consequence should be
              cross-checked against project records.
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
              .report-sheet {
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

/** Fallback title if the agent didn't supply an H1. */
function deriveTitle(agentLabel: string, project: ReportProject | null): string {
  if (project) return `${agentLabel} — ${project.name}`;
  return `${agentLabel} — Portfolio briefing`;
}
