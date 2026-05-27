'use client';

/**
 * Floating agent widget — Magic-Apron-style persistent chat button.
 *
 * Sits in the bottom-right corner of every /access/* page. Click to expand a
 * compact chat panel. Defaults to auto-routing (Phase 2.5) so the user just
 * types and the system picks the right specialist; power users can override
 * via the agent dropdown above the textarea.
 *
 * Context-aware: when the URL is /access/<token>/projects/<code>/..., the
 * widget passes that project_code so the agent runs against that project's
 * data. On the dashboard (no project in URL), invocations are portfolio-level.
 *
 * After a response comes back, the card footer shows an "Open as report" link
 * that opens /access/{token}/report/{output_id} in a new tab — a polished,
 * printable status report (with Download PDF).
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentType } from '@/lib/types';

type AgentTypeOrAuto = AgentType | 'auto';

/** Walk React children and extract the leading plain-text content for callout detection. */
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

interface FloatingAgentWidgetProps {
  token: string;
  roleDisplayName: string;
  allowedAgents: AgentType[];
  canWrite: boolean;
}

interface RoutingMeta {
  auto: boolean;
  fallback: boolean;
  router_raw?: string;
  router_tokens_used?: number | null;
  router_cost_usd?: number | null;
  router_duration_ms?: number;
}

interface Invocation {
  prompt: string;
  project_code: string | null;
  agent_type_requested: AgentTypeOrAuto;
  response_md?: string;
  /** Set after response — used to link to /access/{token}/report/{output_id}. */
  output_id?: string;
  agent_type_resolved?: AgentType;
  routing?: RoutingMeta;
  tokens_used?: number | null;
  cost_usd?: number | null;
  duration_ms?: number;
  error?: string;
}

/**
 * Pick a role-aware example prompt to show as the textarea placeholder.
 * Project-context prompts are project-scoped; dashboard prompts vary by role.
 */
function defaultPlaceholderFor(roleDisplayName: string, projectCode: string | null): string {
  if (projectCode) {
    return 'e.g. "Identify the two risks that deserve the most management attention through the warranty tail."';
  }
  const name = roleDisplayName.toLowerCase();
  if (name.includes('sponsor')) {
    return 'e.g. "Give me a 1-page executive briefing on portfolio health — what needs my attention?"';
  }
  if (name.includes('procurement')) {
    return 'e.g. "Across the active portfolio, which vendor categories appear in the most realised risks?"';
  }
  if (name.includes('risk')) {
    return 'e.g. "Identify cross-cutting risks that appear in three or more projects, with recommended portfolio mitigation."';
  }
  return 'e.g. "Which three projects need attention this week, and why? Cite the variance reports."';
}

const AGENT_LABELS: Record<AgentType, string> = {
  charter_drafter: 'Charter Drafter',
  stakeholder_analyst: 'Stakeholder Analyst',
  wbs_builder: 'WBS Builder',
  schedule_reasoner: 'Schedule Reasoner',
  budget_builder: 'Budget Builder',
  communications_planner: 'Communications Planner',
  issue_logger: 'Issue Logger',
  variance_analyst: 'Variance Analyst',
  change_order_reviewer: 'Change Order Reviewer',
  risk_analyst: 'Risk Analyst',
  lessons_learned_synthesiser: 'Lessons-Learned Synthesiser',
  closeout_reporter: 'Closeout Reporter',
  portfolio_risk_reviewer: 'Portfolio Risk Reviewer',
};

export function FloatingAgentWidget({
  token,
  roleDisplayName,
  allowedAgents,
  canWrite,
}: FloatingAgentWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<Invocation[]>([]);
  const [isInvoking, setIsInvoking] = useState(false);
  const [agentType, setAgentType] = useState<AgentTypeOrAuto>('auto');
  const pathname = usePathname();

  if (allowedAgents.length === 0) return null;

  const projectMatch = pathname?.match(/\/access\/[^/]+\/projects\/([^/?]+)/);
  const projectCode = projectMatch?.[1] ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isInvoking || !canWrite) return;

    const invocation: Invocation = {
      prompt: prompt.trim(),
      project_code: projectCode,
      agent_type_requested: agentType,
    };
    // Replace the previous response with the new one. Older invocations stay
    // in the dashboard's Recent Agent Activity feed; this panel shows only the
    // current question + answer.
    setHistory([invocation]);
    setPrompt('');
    setIsInvoking(true);

    const start = Date.now();
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          agent_type: agentType,
          project_code: projectCode ?? undefined,
          user_prompt: invocation.prompt,
          concise: true,
        }),
      });
      const data = await res.json();
      const duration_ms = Date.now() - start;

      if (!res.ok) {
        setHistory((prev) =>
          prev.map((h, idx) =>
            idx === 0 ? { ...h, error: data.error ?? `HTTP ${res.status}`, duration_ms } : h,
          ),
        );
      } else {
        setHistory((prev) =>
          prev.map((h, idx) =>
            idx === 0
              ? {
                  ...h,
                  response_md: data.output_md,
                  output_id: data.agent_output_id,
                  agent_type_resolved: data.agent_type,
                  routing: data.routing,
                  tokens_used: data.tokens_used,
                  cost_usd: data.cost_usd,
                  duration_ms,
                }
              : h,
          ),
        );
      }
    } catch (err) {
      setHistory((prev) =>
        prev.map((h, idx) =>
          idx === 0 ? { ...h, error: (err as Error).message, duration_ms: Date.now() - start } : h,
        ),
      );
    } finally {
      setIsInvoking(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="no-print fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:opacity-90"
        style={{ backgroundColor: 'rgb(15 23 42)' }}
        aria-label="Ask AI Assistant"
      >
        <span className="text-lg leading-none">✨</span>
        <span>Ask AI Assistant</span>
      </button>
    );
  }

  const contextLabel = projectCode ?? 'Portfolio';
  const dropdownOptions: AgentTypeOrAuto[] = ['auto', ...allowedAgents];

  return (
    <div
      className="no-print fixed bottom-6 right-6 z-50 flex max-h-[calc(100vh-3rem)] w-[400px] flex-col overflow-hidden rounded-lg border shadow-2xl"
      style={{ backgroundColor: 'white' }}
      role="dialog"
      aria-label="Agent chat"
    >
      <header
        className="flex items-start justify-between gap-2 px-4 py-3"
        style={{ backgroundColor: 'rgb(15 23 42)' }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-base leading-none"
            style={{ backgroundColor: 'rgb(30 41 59)', color: '#FBBF24' }}
          >
            ✨
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Ask AI Assistant</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-300">
              {roleDisplayName} · context: {contextLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-lg leading-none text-slate-400 transition hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ backgroundColor: 'white' }}>
        {history.map((h, idx) => (
          <InvocationCard key={idx} invocation={h} isLatest={idx === 0} token={token} />
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t p-3"
        style={{ backgroundColor: 'rgb(248 250 252)' }}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <label htmlFor="floating-agent-select" className="flex-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Pick agent
          </label>
          <select
            id="floating-agent-select"
            value={agentType}
            onChange={(e) => setAgentType(e.target.value as AgentTypeOrAuto)}
            disabled={isInvoking || !canWrite}
            className="flex-1 rounded-md border px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-foreground/30"
            style={{ backgroundColor: 'white' }}
          >
            {dropdownOptions.map((a) => (
              <option key={a} value={a}>
                {a === 'auto' ? 'Auto' : AGENT_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={canWrite ? defaultPlaceholderFor(roleDisplayName, projectCode) : 'Read-only role — agent invocation is disabled'}
          disabled={isInvoking || !canWrite}
          rows={9}
          className="w-full resize-none rounded-md border px-2.5 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/30"
          style={{ backgroundColor: 'white' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            {canWrite
              ? agentType === 'auto'
                ? 'Auto · Cmd/Ctrl+Enter to send'
                : `${AGENT_LABELS[agentType as AgentType]} · Cmd/Ctrl+Enter to send`
              : 'Your role is read-only'}
          </p>
          <button
            type="submit"
            disabled={isInvoking || !prompt.trim() || !canWrite}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'rgb(15 23 42)' }}
          >
            {isInvoking ? 'Calling…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

function InvocationCard({
  invocation,
  isLatest,
  token,
}: {
  invocation: Invocation;
  isLatest: boolean;
  token: string;
}) {
  const isInProgress = isLatest && !invocation.response_md && !invocation.error;
  const requested = invocation.agent_type_requested;
  const resolved = invocation.agent_type_resolved;
  const routed = invocation.routing?.auto === true;

  let headerLabel: string;
  if (requested === 'auto' && resolved) {
    headerLabel = `Auto → ${AGENT_LABELS[resolved] ?? resolved}`;
  } else if (requested === 'auto') {
    headerLabel = 'Auto (Router)';
  } else {
    headerLabel = AGENT_LABELS[requested as AgentType] ?? requested;
  }

  return (
    <div className="mb-4 rounded-md border" style={{ backgroundColor: 'white' }}>
      <div className="border-b px-3 py-2" style={{ backgroundColor: 'rgb(248 250 252)' }}>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {headerLabel}
          {invocation.routing?.fallback && (
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-amber-800">
              fallback
            </span>
          )}
          {invocation.project_code && (
            <span className="ml-1.5 font-mono normal-case tracking-normal text-muted-foreground/80">
              · {invocation.project_code}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-foreground/90">{invocation.prompt}</p>
      </div>
      <div className="px-3 py-2.5">
        {isInProgress && (
          <p className="text-[11px] text-muted-foreground">
            <span className="inline-block animate-pulse">●</span>{' '}
            {requested === 'auto' ? 'Router choosing, then specialist thinking…' : `${AGENT_LABELS[requested as AgentType] ?? requested} thinking…`}
          </p>
        )}
        {invocation.error && (
          <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-900">
            <p className="font-medium">Failed</p>
            <p className="mt-0.5 text-red-700">{invocation.error}</p>
          </div>
        )}
        {invocation.response_md && (
          <>
            <article className="prose prose-xs max-w-none [&_*]:!my-1.5 [&_h1]:!text-sm [&_h2]:!text-sm [&_h3]:!text-xs [&_p]:!text-[12px] [&_li]:!text-[12px] [&_code]:!text-[11px]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="border-b-2 border-amber-300 pb-1 text-sm font-bold text-slate-900">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-3 border-l-4 border-sky-500 pl-2 text-sm font-semibold text-slate-900">
                      {children}
                    </h2>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-slate-900">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px] font-medium text-amber-900 before:content-none after:content-none">
                      {children}
                    </code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-1.5 rounded-r border-l-4 border-amber-400 bg-amber-50 px-2 py-1 not-italic text-slate-800">
                      {children}
                    </blockquote>
                  ),
                  p: ({ children }) => {
                    const text = extractLeadingText(children).toLowerCase().trim();
                    if (text.startsWith('caveat:') || text.startsWith('note:') || text.startsWith('warning:')) {
                      return (
                        <p className="my-1.5 rounded-md border-l-4 border-amber-400 bg-amber-50 px-2.5 py-1.5 text-[12px] not-italic text-amber-900">
                          {children}
                        </p>
                      );
                    }
                    if (text.startsWith('recommendation:') || text.startsWith('recommend:') || text.startsWith('recommended action')) {
                      return (
                        <p className="my-1.5 rounded-md border-l-4 border-sky-400 bg-sky-50 px-2.5 py-1.5 text-[12px] text-sky-900">
                          {children}
                        </p>
                      );
                    }
                    if (text.startsWith('action:') || text.startsWith('next step:') || text.startsWith('next steps:')) {
                      return (
                        <p className="my-1.5 rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-2.5 py-1.5 text-[12px] text-emerald-900">
                          {children}
                        </p>
                      );
                    }
                    return <p>{children}</p>;
                  },
                }}
              >
                {invocation.response_md}
              </ReactMarkdown>
            </article>
            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-1.5 text-[10px] text-muted-foreground">
              <span>
                {typeof invocation.duration_ms === 'number' &&
                  `${(invocation.duration_ms / 1000).toFixed(1)}s`}
              </span>
              {invocation.output_id && (
                <a
                  href={`/access/${token}/report/${invocation.output_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-900 transition hover:bg-slate-100"
                  title="Opens a polished, printable report in a new tab"
                >
                  ↗ Show full report
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
