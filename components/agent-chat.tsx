'use client';

/**
 * Agent chat panel — the headline interactive piece of the demo.
 *
 * Lets the colleague pick an agent (filtered to those their role can invoke),
 * type a prompt, and submit. The request goes to /api/agent which calls
 * Opus 4.7 via OpenRouter. The markdown response is rendered below.
 *
 * Phase 2.5 — Auto-Router: the agent dropdown's first option is
 * "Auto (Router)". When selected, the server uses a cheap Haiku classifier
 * to pick the most appropriate specialist. The invocation card shows the
 * routing decision ("Router → Risk Analyst") so the chain stays visible.
 *
 * Each invocation also writes to the agent_outputs table.
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentType } from '@/lib/types';

type AgentTypeOrAuto = AgentType | 'auto';

interface AgentChatProps {
  token: string;
  projectCode: string;
  allowedAgents: AgentType[];
}

interface RoutingMeta {
  auto: boolean;
  fallback: boolean;
  router_raw?: string;
  router_tokens_used?: number | null;
  router_cost_usd?: number | null;
  router_duration_ms?: number;
}

interface AgentInvocation {
  prompt: string;
  /** What the user picked ('auto' or a specific agent). */
  agent_type_requested: AgentTypeOrAuto;
  /** The agent that actually ran (resolved by the router for 'auto'). */
  agent_type_resolved?: AgentType;
  routing?: RoutingMeta;
  response_md?: string;
  tokens_used?: number | null;
  cost_usd?: number | null;
  duration_ms?: number;
  error?: string;
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

function labelFor(agent: AgentTypeOrAuto): string {
  return agent === 'auto' ? 'Auto (Router)' : AGENT_LABELS[agent] ?? agent;
}

const AUTO_PLACEHOLDER =
  "Describe what you'd like the agent to do — in plain English. The router picks the best specialist (e.g. 'review the risk register and tell me which three risks deserve management attention through the warranty tail').";

const PLACEHOLDER_PROMPTS: Partial<Record<AgentType, string>> = {
  risk_analyst:
    'Review the current risk register and identify which two risks deserve the most management attention through the remaining warranty tail. Three sentences each.',
  variance_analyst:
    'Summarise the variance position at the most recent reporting week and flag any threshold concerns.',
  change_order_reviewer:
    'Review the four-frame analysis on CO-001 and assess whether the margin protection was sufficient.',
  closeout_reporter:
    'Draft an executive summary for the client closeout report based on the current project state.',
  lessons_learned_synthesiser:
    'Identify the top three firm-level lessons from this project, with adoption pathway recommendations.',
  issue_logger:
    'Summarise the current issue log and highlight any H-severity items still outstanding.',
  portfolio_risk_reviewer:
    'Review portfolio-level pattern emergence based on this project relative to the broader portfolio.',
};

function placeholderFor(agent: AgentTypeOrAuto): string {
  if (agent === 'auto') return AUTO_PLACEHOLDER;
  return PLACEHOLDER_PROMPTS[agent] ?? 'What would you like the agent to do?';
}

export function AgentChat({ token, projectCode, allowedAgents }: AgentChatProps) {
  // Default to Auto so business-user colleagues don't have to learn the
  // agent taxonomy. Power users can still pick a specific agent to override.
  const [agentType, setAgentType] = useState<AgentTypeOrAuto>('auto');
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<AgentInvocation[]>([]);
  const [isInvoking, setIsInvoking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isInvoking) return;

    const invocation: AgentInvocation = {
      prompt: prompt.trim(),
      agent_type_requested: agentType,
    };
    setHistory((prev) => [invocation, ...prev]);
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
          project_code: projectCode,
          user_prompt: invocation.prompt,
        }),
      });

      const data = await res.json();
      const duration_ms = Date.now() - start;

      if (!res.ok) {
        setHistory((prev) =>
          prev.map((h, idx) =>
            idx === 0
              ? {
                  ...h,
                  error: data.error ?? `HTTP ${res.status}`,
                  duration_ms,
                }
              : h,
          ),
        );
      } else {
        setHistory((prev) =>
          prev.map((h, idx) =>
            idx === 0
              ? {
                  ...h,
                  response_md: data.output_md,
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
          idx === 0
            ? {
                ...h,
                error: (err as Error).message,
                duration_ms: Date.now() - start,
              }
            : h,
        ),
      );
    } finally {
      setIsInvoking(false);
    }
  }

  if (allowedAgents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role doesn&apos;t have access to any agents on this project.
      </p>
    );
  }

  // Dropdown option list: Auto first, then all role-allowed specialists.
  const dropdownOptions: AgentTypeOrAuto[] = ['auto', ...allowedAgents];

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-5">
        <div className="space-y-1.5">
          <label htmlFor="agent-select" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Agent
          </label>
          <select
            id="agent-select"
            value={agentType}
            onChange={(e) => setAgentType(e.target.value as AgentTypeOrAuto)}
            disabled={isInvoking}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {dropdownOptions.map((a) => (
              <option key={a} value={a}>
                {labelFor(a)}
                {a === 'auto' ? ' — let the router pick' : ''}
              </option>
            ))}
          </select>
          {agentType === 'auto' && (
            <p className="text-[11px] text-muted-foreground">
              The router uses a small Haiku call (~$0.001) to pick the best specialist for your prompt.
              You&apos;ll see which agent ran in the response.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="prompt-input" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your prompt
          </label>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholderFor(agentType)}
            disabled={isInvoking}
            rows={4}
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Calls Opus 4.7 via OpenRouter · typically 10-60 seconds · ~$0.10-0.40 per invocation
          </p>
          <button
            type="submit"
            disabled={isInvoking || !prompt.trim()}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
          >
            {isInvoking ? 'Calling agent…' : 'Send'}
          </button>
        </div>
      </form>

      {/* History */}
      <div className="space-y-6">
        {history.map((h, idx) => (
          <InvocationCard key={idx} invocation={h} index={idx} isLatest={idx === 0} />
        ))}
      </div>
    </div>
  );
}

function InvocationCard({
  invocation,
  isLatest,
}: {
  invocation: AgentInvocation;
  index: number;
  isLatest: boolean;
}) {
  const isInProgress = isLatest && !invocation.response_md && !invocation.error;
  const requested = invocation.agent_type_requested;
  const resolved = invocation.agent_type_resolved;
  const routed = invocation.routing?.auto === true;

  // Header label: if Auto routed and we have a resolved agent, show
  // "Auto → Risk Analyst". If just resolved (Auto pre-response), show
  // "Auto (Router)". Otherwise show the requested agent's label.
  let headerLabel: string;
  if (requested === 'auto' && resolved) {
    headerLabel = `Auto → ${AGENT_LABELS[resolved] ?? resolved}`;
  } else if (requested === 'auto') {
    headerLabel = 'Auto (Router)';
  } else {
    headerLabel = AGENT_LABELS[requested as AgentType] ?? requested;
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* User prompt */}
      <div className="border-b p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {headerLabel} — prompt
          {invocation.routing?.fallback && (
            <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-amber-800">
              router fell back to default
            </span>
          )}
        </p>
        <p className="mt-1 text-sm">{invocation.prompt}</p>
      </div>

      {/* Response */}
      <div className="p-4">
        {isInProgress && (
          <p className="text-sm text-muted-foreground">
            <span className="inline-block animate-pulse">●</span>{' '}
            {requested === 'auto' ? 'Router choosing specialist, then specialist thinking…' : 'Agent is thinking…'}
          </p>
        )}
        {invocation.error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-medium">Invocation failed</p>
            <p className="mt-1 text-red-700">{invocation.error}</p>
          </div>
        )}
        {invocation.response_md && (
          <>
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {invocation.response_md}
              </ReactMarkdown>
            </article>
            <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              {typeof invocation.duration_ms === 'number' &&
                `${(invocation.duration_ms / 1000).toFixed(1)}s`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
