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
 * After a response comes back, the card footer shows:
 *   - "↗ Pop out" — clones the brief into a FLOATING IN-PAGE PANEL beside the
 *     agent widget. Static snapshot — doesn't change when new questions are
 *     asked. Multiple can be open at once (cascaded). Each has its own
 *     follow-up buttons that pre-fill the AGENT WIDGET's prompt input below.
 *   - "↗ Show full report" — opens the polished long-form report with PDF
 *     download (/access/{token}/report/{id}) in a new browser tab.
 *
 * If the response contains "Action:", "Next step(s):", or "Recommendation:"
 * callouts, the card also shows one-click "▶ Have agent follow up" buttons
 * that pre-fill the prompt input with a follow-up question seeded by that
 * action's text. The colleague can edit and hit Send.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentType } from '@/lib/types';
import { parseProposedActions, stripActionsBlock } from '@/lib/action-parser';
import { AssignActionsPanel } from '@/components/assign-actions-panel';
import { parseProposedEntry, stripEntryBlock } from '@/lib/entry-parser';
import { EntryDraftPanel } from '@/components/entry-draft-panel';

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

/**
 * Scan markdown for actionable callout lines (Action:, Next step:, Recommendation:).
 * Returns the action text (with the keyword stripped) for each match. Used to
 * render one-click "▶ Have agent follow up" buttons under each response.
 *
 * Filters out matches that are too short to be meaningful or absurdly long
 * (likely false positives from a paragraph that just happens to start with
 * a keyword).
 */
function extractActions(md: string | undefined): string[] {
  if (!md) return [];
  const actions: string[] = [];
  const lines = md.split('\n');
  for (const rawLine of lines) {
    const stripped = rawLine
      .replace(/^\s*[*\-]\s+/, '')          // strip leading bullet
      .replace(/^\s*\d+\.\s+/, '')          // strip leading numbered list marker
      .replace(/^\s*\*\*([^*]+)\*\*\s*/, '$1 ') // unwrap leading **bold**
      .trim();
    const m = stripped.match(/^(action|next step|next steps|recommendation|recommended action|recommend):\s*(.+)/i);
    if (!m) continue;
    const actionText = m[2].trim().replace(/\*\*/g, '');
    if (actionText.length <= 5 || actionText.length >= 500) continue;
    // Skip clarification-style "actions". When the agent says something like
    // "Next step: please clarify whether you mean X or Y", the line technically
    // matches the keyword but the content is a question FROM the agent TO the
    // user, not an action FOR the user. Wrapping it as "Acting on this: …"
    // would produce a nonsensical follow-up prompt, so we filter these out.
    const lower = actionText.toLowerCase();
    // Two flavours of "this isn't a real action":
    //   1. Contains a question mark or clarify-style phrasing
    //   2. References multiple lettered options ("(a), (b), or (c)") which is
    //      almost always the agent listing interpretations back at the user.
    const lettered = (lower.match(/\([a-z]\)/g) ?? []).length;
    const isClarification =
      actionText.includes('?') ||
      lettered >= 2 ||
      lower.includes('please clarify') ||
      lower.includes('could you clarify') ||
      lower.includes('can you clarify') ||
      lower.includes('please specify') ||
      lower.includes('could you specify') ||
      lower.includes('are you asking') ||
      lower.includes('do you mean') ||
      lower.includes('which of the following') ||
      lower.includes('tell me') ||
      lower.includes('let me know') ||
      lower.startsWith('clarify');
    if (isClarification) continue;
    actions.push(actionText);
  }
  // De-duplicate (the agent sometimes restates the same action verbatim).
  return Array.from(new Set(actions));
}

/**
 * Detect lettered clarification options in agent responses.
 *
 * The agent often replies with "Which one — (a), (b), or (c)?" plus a bulleted
 * list of options. Without help the user has to type their answer manually.
 * This helper finds the lettered options so the widget can render them as
 * one-click "Quick reply" buttons that pre-fill the prompt with the choice.
 *
 * Only fires when the response actually asks the user to pick (looks for
 * "which one", "pick one", "tell me which", etc.) — avoids false positives
 * on responses that incidentally contain (a) (b) (c) labels.
 */
function extractChoices(md: string | undefined): Array<{ letter: string; text: string }> {
  if (!md) return [];
  const lower = md.toLowerCase();
  const hasPickPrompt =
    lower.includes('which one') ||
    lower.includes('pick one') ||
    lower.includes('tell me which') ||
    lower.includes('tell me whether') ||
    lower.includes('which of these') ||
    lower.includes('which of the following') ||
    lower.includes('which interpretation') ||
    lower.includes('which would you') ||
    lower.includes('which did you') ||
    lower.includes('did you mean') ||
    lower.includes('if you mean') ||
    lower.includes('you could mean') ||
    lower.includes("i can't tell") ||
    lower.includes('i cannot tell') ||
    lower.includes('is ambiguous') ||
    lower.includes('the question is ambiguous') ||
    lower.includes('please clarify');
  if (!hasPickPrompt) return [];

  const choices: Array<{ letter: string; text: string }> = [];
  const seen = new Set<string>();

  function add(letter: string, rawText: string) {
    const l = letter.toLowerCase();
    if (seen.has(l)) return;
    let text = rawText.replace(/\*\*/g, '').trim();
    // Take the first phrase — strip at em-dash, en-dash, or colon followed by space.
    const splitIdx = text.search(/\s+[—–]\s+|:\s+/);
    if (splitIdx > 0) text = text.slice(0, splitIdx).trim();
    // Strip trailing connectives so inline lists read clean.
    text = text.replace(/[,;]?\s*(or|and)\s*$/i, '').trim();
    text = text.replace(/[,;]\s*$/, '').trim();
    if (text.length < 4 || text.length > 250) return;
    choices.push({ letter: l, text });
    seen.add(l);
  }

  // --- Pass 1: bullet-style options, one per line ---
  // Common format: "- **(a) Headline?** Rationale text…"
  // When the headline is bold-wrapped, capture JUST the headline so the
  // pre-filled prompt stays short and clean. Fall back to the rest-of-line
  // capture when there's no bold wrapper.
  const lines = md.split('\n');
  for (const rawLine of lines) {
    const stripped = rawLine
      .replace(/^\s*[*\-]\s+/, '')
      .replace(/^\s*\d+\.\s+/, '')
      .trim();
    // Try bold-wrapped headline first: **(a) the headline question?**
    let m = stripped.match(/^\*\*\(([a-zA-Z])\)\s+(.+?)\*\*/);
    if (m) {
      add(m[1], m[2]);
      continue;
    }
    // Fallback: any line that starts with (a) or **(a)** followed by text.
    m = stripped.match(/^\*?\*?\(([a-zA-Z])\)\*?\*?\s+(.+?)$/);
    if (m) add(m[1], m[2]);
  }

  // --- Pass 2: inline options inside a single paragraph ---
  // Agent often writes "... could mean (a) X, (b) Y, (c) Z, or (d) something else."
  // Split on parenthesised single letters. The captured letter becomes a marker;
  // text after it (up to the next marker or sentence end) is that choice.
  const parts = md.split(/\(([a-zA-Z])\)/);
  // parts[0] is text before any marker; then [letter, text, letter, text, ...].
  // Need at least 2 markers (= at least 5 parts) to count as a real list.
  if (parts.length >= 5) {
    for (let i = 1; i < parts.length; i += 2) {
      const letter = parts[i];
      let text = parts[i + 1] ?? '';
      // Clip at the FIRST sentence end inside this chunk so we don't bleed into
      // the next paragraph's content.
      const sentenceEnd = text.search(/\.\s+[A-Z]|\.\s*\n|\n\n/);
      if (sentenceEnd >= 0) text = text.slice(0, sentenceEnd);
      add(letter, text);
    }
  }

  return choices;
}

/**
 * When the widget is showing Quick Reply buttons under a response, the
 * lettered bullets and the trailing "Which one — (a), (b), or (c)?" sentence
 * in the rendered markdown are redundant — the buttons already convey them.
 * This helper strips them from the markdown body so the user sees a clean
 * "the question is ambiguous" sentence above the buttons, nothing more.
 *
 * Only called when extractChoices(md) returned at least one choice — so the
 * agent's intent really was a clarification question.
 */
function stripQuickReplyContent(md: string): string {
  if (!md) return md;
  let out = md;
  // Remove lines that are a bulleted (or plain) lettered option:
  //   - **(a) Headline?** Reason text…
  //   * (a) Plain text…
  //   (a) Plain text…
  out = out.replace(/^\s*[*\-]?\s*\*?\*?\(([a-zA-Z])\)\*?\*?\s+.*$/gm, '');
  // Remove a trailing "Which one — (a), (b), or (c)?" line / sentence.
  out = out.replace(/(^|\n)\s*which\s+one\b[^\n.!?]*\?/gi, '');
  // Remove an analogous trailing "pick which you mean" / "pick one" sentence.
  out = out.replace(/(^|\n)\s*(pick which you mean|pick one)[^\n.!?]*[.!?]?/gi, '');
  // Collapse 3+ blank lines that the deletions just introduced down to a single blank.
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

/**
 * Hide "Action:" / "Next step:" / "Recommendation:" callout lines from the
 * rendered markdown when the green "Have agent follow up" button row is
 * already shown beneath the response. Without this, every actionable line
 * appears twice — once as a green-tinted callout in the body, again as a
 * clickable button. Strip the bodies so the buttons are the sole surface for
 * acting on those recommendations.
 *
 * Only called when extractActions(md) returned at least one action.
 */
function stripActionCallouts(md: string): string {
  if (!md) return md;
  let out = md;
  // Strip lines that begin (after optional bullet + bold) with the
  // recommendation keywords. Both bare and bold-wrapped forms.
  out = out.replace(
    /^\s*[*\-]?\s*\*?\*?(action|next step|next steps|recommendation|recommend|recommended action):\*?\*?\s+.*$/gim,
    '',
  );
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

interface FloatingAgentWidgetProps {
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
  budget_builder: 'Cost Planner',
  communications_planner: 'Communications Planner',
  issue_logger: 'Issue Logger',
  variance_analyst: 'Variance Analyst',
  change_order_reviewer: 'Change Order Reviewer',
  risk_analyst: 'Risk Analyst',
  lessons_learned_synthesiser: 'Lessons-Learned Synthesiser',
  closeout_reporter: 'Closeout Reporter',
  portfolio_risk_reviewer: 'Portfolio Risk Reviewer',
  status_reporter: 'Status Reporter',
  cost_controller: 'Cost Controller',
};

/** Starter prompts shown when the chat is empty — role-aware. Creation/assign
 * options surface the write actions that aren't otherwise discoverable now that
 * everything runs through the agent. Clicking one pre-fills the input to edit. */
function SuggestedPrompts({ allowedAgents, canWrite, projectCode, onPick }: { allowedAgents: AgentType[]; canWrite: boolean; projectCode: string | null; onPick: (p: string) => void }) {
  const has = (a: AgentType) => allowedAgents.includes(a);
  const create: Array<{ label: string; prompt: string }> = [];
  if (projectCode && canWrite) {
    if (has('risk_analyst')) create.push({ label: '\uFF0B Raise a risk', prompt: 'Log a risk: [describe the risk \u2014 cause \u2192 event \u2192 consequence]' });
    if (has('issue_logger')) create.push({ label: '\uFF0B Log an issue', prompt: 'Log an issue: [describe the issue and its effect]' });
    if (has('change_order_reviewer')) create.push({ label: '\uFF0B Change / trend entry', prompt: 'Add a change/trend entry: [describe the scope change]' });
  }
  if (canWrite) create.push({ label: '\uFF0B Assign a task', prompt: 'Assign a task to [User / role]: [what to do] \u2014 [low/medium/high] urgency' });

  // Ask prompts are role-aware too: built from the agents this role can use,
  // so each role sees analysis starters that match what it is allowed to do.
  const ASK_BY_AGENT: Array<[AgentType, string]> = [
    ['variance_analyst', 'Is this project on cost and schedule? Summarise the latest variance and flag concerns.'],
    ['risk_analyst', 'What are the top risks to watch on this project, and why?'],
    ['cost_controller', 'Give me the cost and commitment position \u2014 cost-to-date, open commitment, and net unbilled.'],
    ['change_order_reviewer', 'Review the open change orders \u2014 which threaten margin, and what approval routing?'],
    ['issue_logger', 'Summarise the open issues; flag the overdue high-severity ones.'],
    ['schedule_reasoner', 'What\u2019s the critical path, and which deliverables carry the most schedule risk?'],
    ['status_reporter', 'Write this week\u2019s status report for the sponsor.'],
    ['budget_builder', 'Lay out the cost breakdown across engineering, procurement, construction, and commissioning.'],
    ['stakeholder_analyst', 'Build the stakeholder register and the engagement approach.'],
    ['wbs_builder', 'Build the work breakdown structure to Level 1\u20133.'],
    ['charter_drafter', 'Draft the project charter from the intake data.'],
    ['communications_planner', 'Build the communications plan for this project.'],
    ['lessons_learned_synthesiser', 'What are the top firm-level lessons from this project?'],
    ['closeout_reporter', 'Draft the closeout executive summary.'],
  ];
  let ask: string[];
  if (projectCode) {
    const roleAsks = ASK_BY_AGENT.filter(([a]) => has(a)).map(([, prm]) => prm);
    ask = ['Summarise this project\u2019s health \u2014 cost, schedule, and what needs my attention.', ...roleAsks].slice(0, 4);
  } else {
    ask = ['Which projects need attention this week, and why? Cite the variance reports.'];
    if (has('portfolio_risk_reviewer')) ask.push('Where is cross-cutting risk emerging across the portfolio?');
    if (has('cost_controller') || has('variance_analyst')) ask.push('Which projects are trending over cost or behind schedule?');
  }

  return (
    <div className="px-1 py-1.5">
      {create.length > 0 && (
        <>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Create / update / assign</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {create.map((c) => (
              <button key={c.label} type="button" onClick={() => onPick(c.prompt)} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800 transition hover:border-sky-400 hover:bg-sky-100">{c.label}</button>
            ))}
          </div>
        </>
      )}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ask agent</p>
      <div className="flex flex-col gap-1.5">
        {ask.map((a) => (
          <button key={a} type="button" onClick={() => onPick(a)} className="text-left rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[12px] text-sky-900 transition hover:border-sky-400 hover:bg-sky-100">{a}</button>
        ))}
      </div>
      <p className="mt-2 px-0.5 text-[10px] text-muted-foreground">Pick one to pre-fill, edit, then Send.</p>
    </div>
  );
}

export function FloatingAgentWidget({
  roleDisplayName,
  allowedAgents,
  canWrite,
}: FloatingAgentWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<Invocation[]>([]);
  const [isInvoking, setIsInvoking] = useState(false);
  const [agentType, setAgentType] = useState<AgentTypeOrAuto>(() =>
    canWrite ? 'auto' : allowedAgents[0] ?? 'auto',
  );
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const pathname = usePathname();
  const router = useRouter();

  // Listen for in-page triggers (e.g. the guided setup checklist) asking us to
  // open pre-filled with a specific agent + seeded prompt. Human stays in the
  // loop: we open + select + prefill, but the user reviews and hits Send.
  useEffect(() => {
    function onAsk(e: Event) {
      const detail = (e as CustomEvent).detail as { agentType?: string; prompt?: string } | undefined;
      if (!detail) return;
      if (detail.agentType && (detail.agentType === 'auto' || allowedAgents.includes(detail.agentType as AgentType))) {
        setAgentType(detail.agentType as AgentTypeOrAuto);
      }
      if (typeof detail.prompt === 'string') setPrompt(detail.prompt);
      setIsOpen(true);
    }
    window.addEventListener('pmo:ask-agent', onAsk as EventListener);
    return () => window.removeEventListener('pmo:ask-agent', onAsk as EventListener);
  }, [allowedAgents]);

  // Popped-out briefs: each entry is a snapshot of a previous response shown
  // in its own floating panel on the page. Newest pop-outs stack on top.
  // Cap at 5 so the screen doesn't get overwhelmed.
  const [poppedOutBriefs, setPoppedOutBriefs] = useState<Invocation[]>([]);
  const MAX_POPPED_OUT = 5;
  // Track entries already added (keyed by agent output id) so a popped-out copy
  // of the same brief shows "Added" instead of offering the form a second time.
  const [submittedEntries, setSubmittedEntries] = useState<Record<string, string>>({});
  function markEntrySubmitted(outputId: string | undefined, code: string) {
    if (outputId) setSubmittedEntries((prev) => ({ ...prev, [outputId]: code }));
  }

  function handlePopOut(inv: Invocation) {
    setPoppedOutBriefs((prev) => {
      // Don't pop out the same output_id twice — focus the existing one instead.
      if (inv.output_id && prev.some((p) => p.output_id === inv.output_id)) {
        return prev;
      }
      const next = [...prev, inv];
      if (next.length > MAX_POPPED_OUT) next.shift();
      return next;
    });
    // Reset the agent widget chat to its default empty state — the response
    // now lives in the popped-out panel, so the chat panel is free for the
    // next question. The user's typed-but-not-sent prompt is preserved.
    setHistory([]);
  }

  function handleClosePopOut(idx: number) {
    setPoppedOutBriefs((prev) => prev.filter((_, i) => i !== idx));
  }

  /**
   * Applied when a "Have agent follow up" button is clicked anywhere
   * (in the chat history or in a popped-out panel). Fills the prompt input
   * and ensures the widget is open so the user can see + edit + send.
   */
  function applyFollowUp(text: string) {
    setPrompt(text);
    setIsOpen(true);
  }

  if (allowedAgents.length === 0) return null;

  const projectMatch = pathname?.match(/\/access\/[^/]+\/projects\/([^/?]+)/);
  const projectCode = projectMatch?.[1] ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isInvoking) return;

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
          agent_type: agentType,
          project_code: projectCode ?? undefined,
          user_prompt: invocation.prompt,
          concise: true,
          session_id: sessionId,
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
        // Soft-refresh the page's server components so project tabs, counts,
        // and the setup checklist pick up the new agent_outputs row — without a
        // full reload (client state like pinned briefs is preserved).
        router.refresh();
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

  const contextLabel = projectCode ?? 'Portfolio';
  const dropdownOptions: AgentTypeOrAuto[] = canWrite ? ['auto', ...allowedAgents] : [...allowedAgents];

  // Popped-out brief panels render alongside the widget — they persist
  // whether the widget is collapsed or expanded.
  const poppedOutPanels = poppedOutBriefs.map((inv, i) => (
    <PoppedOutBriefPanel
      key={inv.output_id ?? `pop-${i}`}
      invocation={inv}
      index={i}
      onClose={() => handleClosePopOut(i)}
      onUseAsPrompt={applyFollowUp}
      submittedCode={inv.output_id ? submittedEntries[inv.output_id] : undefined}
      onEntrySubmitted={markEntrySubmitted}
    />
  ));

  if (!isOpen) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="no-print fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg transition hover:opacity-90"
          aria-label="Ask AI Assistant"
        >
          <span className="text-lg leading-none">✨</span>
          <span>Ask AI Assistant</span>
        </button>
        {poppedOutPanels}
      </>
    );
  }

  return (
    <>
    <div
      className="no-print fixed bottom-6 right-6 z-50 flex max-h-[calc(100vh-3rem)] w-[400px] flex-col overflow-hidden rounded-lg border shadow-2xl"
      style={{ backgroundColor: 'white' }}
      role="dialog"
      aria-label="Agent chat"
    >
      <header
        className="flex items-start justify-between gap-2 bg-foreground px-4 py-3"
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
        {history.length === 0 && !isInvoking && (
          <SuggestedPrompts allowedAgents={allowedAgents} canWrite={canWrite} projectCode={projectCode} onPick={(p) => setPrompt(p)} />
        )}
        {history.map((h, idx) => (
          <InvocationCard key={idx} invocation={h} isLatest={idx === 0} onUseAsPrompt={applyFollowUp} onPopOut={handlePopOut} submittedCode={h.output_id ? submittedEntries[h.output_id] : undefined} onEntrySubmitted={markEntrySubmitted} />
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
            disabled={isInvoking}
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
          placeholder={defaultPlaceholderFor(roleDisplayName, projectCode)}
          disabled={isInvoking}
          rows={9}
          className="w-full resize-none rounded-md border px-2.5 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/30"
          style={{ backgroundColor: 'white' }}
          onKeyDown={(e) => {
            // Enter (without Shift) sends. Shift+Enter still inserts a newline.
            // Cmd/Ctrl+Enter also sends, so muscle memory from before still works.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-muted-foreground transition hover:bg-slate-100 hover:text-foreground"
                title="Clear the chat — start fresh. Your typed-but-not-sent prompt stays."
                aria-label="Clear chat"
              >
                <span aria-hidden="true">↺</span>
                <span>Clear chat</span>
              </button>
            )}
            <p>
              {agentType === 'auto'
                ? 'Auto · Enter to send, Shift+Enter for new line'
                : `${AGENT_LABELS[agentType as AgentType]} · Enter to send, Shift+Enter for new line`}
              {!canWrite ? ' · read-only (analytical agents)' : ''}
            </p>
          </div>
          <button
            type="submit"
            disabled={isInvoking || !prompt.trim()}
            className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90 disabled:opacity-40"
          >
            {isInvoking ? 'Calling…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
    {poppedOutPanels}
    </>
  );
}

function InvocationCard({
  invocation,
  isLatest,
  onUseAsPrompt,
  onPopOut,
  submittedCode,
  onEntrySubmitted,
}: {
  invocation: Invocation;
  isLatest: boolean;
  /** Pre-fill the parent prompt input with a follow-up message. */
  onUseAsPrompt: (text: string) => void;
  /** Snapshot this invocation into a floating side panel. */
  onPopOut: (inv: Invocation) => void;
  submittedCode?: string;
  onEntrySubmitted: (outputId: string | undefined, code: string) => void;
}) {
  const actions = extractActions(invocation.response_md);
  const choices = extractChoices(invocation.response_md);
  const proposedActions = parseProposedActions(invocation.response_md ?? '');
  const proposedEntry = parseProposedEntry(invocation.response_md);
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
                {(() => { let b = stripEntryBlock(stripActionsBlock(invocation.response_md ?? '')); if (choices.length > 0) b = stripQuickReplyContent(b); if (actions.length > 0) b = stripActionCallouts(b); return b; })()}
              </ReactMarkdown>
            </article>
            {proposedActions.length > 0 && (
              <AssignActionsPanel
                actions={proposedActions}
                projectCode={invocation.project_code}
                agentOutputId={invocation.output_id}
                agentType={resolved ?? (requested === 'auto' ? undefined : (requested as AgentType))}
                promptText={invocation.prompt}
              />
            )}
            {proposedEntry && (
              <EntryDraftPanel entry={proposedEntry} projectCode={invocation.project_code} alreadySubmittedCode={submittedCode} onSubmitted={(c) => onEntrySubmitted(invocation.output_id, c)} />
            )}
            <div className="mt-2 flex items-center justify-end gap-2 border-t pt-1.5 text-[10px] text-muted-foreground">
              {invocation.output_id && choices.length === 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onPopOut(invocation)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50"
                    title="Pop this brief into a floating panel beside the widget so you can keep it visible while asking follow-ups"
                  >
                    ↗ Pop out
                  </button>
                  <a
                    href={`/report/${invocation.output_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-900 transition hover:bg-slate-100"
                    title="Opens a polished, printable long-form report (with PDF download) in a new tab"
                  >
                    ↗ Show full report
                  </a>
                </div>
              )}
            </div>
            {choices.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-sky-700">
                  Quick reply
                </p>
                <div className="flex flex-col gap-1">
                  {choices.map((choice) => (
                    <button
                      key={choice.letter}
                      type="button"
                      onClick={() => onUseAsPrompt(choice.text)}
                      className="text-left rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[12px] text-sky-900 transition hover:border-sky-400 hover:bg-sky-100"
                      title="Pre-fills the prompt with this option — review and Send"
                    >
                      <span className="line-clamp-2">{choice.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {actions.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                  Have agent follow up
                </p>
                <div className="flex flex-col gap-1">
                  {actions.map((action, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onUseAsPrompt(action)}
                      className="group text-left rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-100"
                      title="Pre-fills the prompt below with a follow-up question on this action"
                    >
                      <span className="line-clamp-2">{action}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


/**
 * Static snapshot of a previous response, mounted in its own floating panel
 * beside the agent widget. The agent widget is the ONLY active input on the
 * page — these panels are read-only by design.
 *
 * What you CAN do here:
 *   - Read the brief
 *   - Click "▶ Have agent follow up" to send the action back to the agent
 *     widget (pre-fills its prompt + opens it if collapsed)
 *   - Click "↗ Full report" to open the long-form report in a new tab
 *   - Close the panel with the × in the header
 *
 * Stacking: each new pop-out cascades down-and-right from the previous one
 * (top-left origin). Up to MAX_POPPED_OUT can be open simultaneously.
 */
const RZ_HANDLES: Array<{ mode: string; style: React.CSSProperties }> = [
  { mode: 'n',  style: { top: 0, left: 12, right: 12, height: 7, cursor: 'ns-resize' } },
  { mode: 's',  style: { bottom: 0, left: 12, right: 12, height: 7, cursor: 'ns-resize' } },
  { mode: 'e',  style: { right: 0, top: 12, bottom: 12, width: 7, cursor: 'ew-resize' } },
  { mode: 'w',  style: { left: 0, top: 12, bottom: 12, width: 7, cursor: 'ew-resize' } },
  { mode: 'ne', style: { top: 0, right: 0, width: 14, height: 14, cursor: 'nesw-resize' } },
  { mode: 'nw', style: { top: 0, left: 0, width: 14, height: 14, cursor: 'nwse-resize' } },
  { mode: 'se', style: { bottom: 0, right: 0, width: 14, height: 14, cursor: 'nwse-resize' } },
  { mode: 'sw', style: { bottom: 0, left: 0, width: 14, height: 14, cursor: 'nesw-resize' } },
];

function PoppedOutBriefPanel({
  invocation,
  index,
  onClose,
  onUseAsPrompt,
  submittedCode,
  onEntrySubmitted,
}: {
  invocation: Invocation;
  index: number;
  onClose: () => void;
  onUseAsPrompt: (text: string) => void;
  submittedCode?: string;
  onEntrySubmitted: (outputId: string | undefined, code: string) => void;
}) {
  const actions = extractActions(invocation.response_md);
  const choices = extractChoices(invocation.response_md);
  const proposedEntry = parseProposedEntry(invocation.response_md);

  const requested = invocation.agent_type_requested;
  const resolved = invocation.agent_type_resolved;
  let headerLabel: string;
  if (requested === 'auto' && resolved) {
    headerLabel = `Auto → ${AGENT_LABELS[resolved] ?? resolved}`;
  } else if (requested === 'auto') {
    headerLabel = 'Auto (Router)';
  } else {
    headerLabel = AGENT_LABELS[requested as AgentType] ?? requested;
  }

  // Initial cascade position: each panel starts offset 28px from the previous.
  // After mount the user can drag the panel anywhere by its header.
  const [position, setPosition] = useState({
    top: 24 + index * 28,
    left: 24 + index * 28,
  });
  // Track in-flight drag without re-rendering. nulled when not dragging.
  const dragStateRef = useRef<{
    pointerStartX: number;
    pointerStartY: number;
    panelStartTop: number;
    panelStartLeft: number;
  } | null>(null);
  const [size, setSize] = useState({ width: 380, height: 480 });
  const resizeRef = useRef<{ mode: string; px: number; py: number; w: number; h: number; top: number; left: number } | null>(null);

  // Drag handlers attached to the document (so the user can drag the panel
  // by sweeping the cursor outside the header without losing the drag).
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const rz = resizeRef.current;
      if (rz) {
        const dx = e.clientX - rz.px, dy = e.clientY - rz.py;
        const minW = 300, minH = 180, maxW = window.innerWidth * 0.95, maxH = window.innerHeight * 0.9;
        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
        let w = rz.w, h = rz.h, top = rz.top, left = rz.left;
        if (rz.mode.includes('e')) w = clamp(rz.w + dx, minW, maxW);
        if (rz.mode.includes('s')) h = clamp(rz.h + dy, minH, maxH);
        if (rz.mode.includes('w')) { const nw = clamp(rz.w - dx, minW, maxW); left = rz.left + (rz.w - nw); w = nw; }
        if (rz.mode.includes('n')) { const nh = clamp(rz.h - dy, minH, maxH); top = rz.top + (rz.h - nh); h = nh; }
        setSize({ width: w, height: h });
        setPosition({ top, left });
        return;
      }
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.pointerStartX;
      const dy = e.clientY - drag.pointerStartY;
      const newTop = Math.max(0, Math.min(window.innerHeight - 48, drag.panelStartTop + dy));
      const newLeft = Math.max(0, Math.min(window.innerWidth - 80, drag.panelStartLeft + dx));
      setPosition({ top: newTop, left: newLeft });
    }
    function onUp() {
      dragStateRef.current = null;
      resizeRef.current = null;
      document.body.style.userSelect = '';
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  function startDrag(e: React.MouseEvent) {
    dragStateRef.current = {
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      panelStartTop: position.top,
      panelStartLeft: position.left,
    };
    // Stop text-selection while dragging so the user doesn't accidentally
    // highlight the panel contents instead of moving it.
    document.body.style.userSelect = 'none';
  }

  function startResize(e: React.MouseEvent, mode: string) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { mode, px: e.clientX, py: e.clientY, w: size.width, h: size.height, top: position.top, left: position.left };
    document.body.style.userSelect = 'none';
  }

  return (
    <div
      className="no-print fixed z-40 flex flex-col rounded-lg border shadow-2xl"
      style={{
        backgroundColor: 'white',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: size.width,
        height: size.height,
        minWidth: 300,
        maxWidth: '95vw',
        minHeight: 180,
        maxHeight: '90vh',
        overflow: 'hidden',
      }}
      role="complementary"
      aria-label={`Popped-out brief: ${invocation.prompt.slice(0, 60)}`}
    >
      {RZ_HANDLES.map((rh) => (
        <div key={rh.mode} onMouseDown={(e) => startResize(e, rh.mode)} style={{ position: 'absolute', zIndex: 50, ...rh.style }} />
      ))}
      <header
        className="flex items-start justify-between gap-2 px-4 py-2.5"
        style={{ backgroundColor: 'rgb(30 41 59)' }}
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          style={{ cursor: 'move' }}
          onMouseDown={startDrag}
          title="Drag to move"
        >
          <span
            className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md bg-foreground text-sm leading-none"
            style={{ color: '#FBBF24' }}
          >
            📌
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-200">
              Pinned brief
            </p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {headerLabel}
              {invocation.project_code && ` · ${invocation.project_code}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-base leading-none text-slate-400 transition hover:text-white"
          aria-label="Close popped-out brief"
          title="Close this pinned brief"
        >
          ×
        </button>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        style={{ backgroundColor: 'white' }}
      >
        <div className="rounded-md border bg-slate-50 px-3 py-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Question
          </p>
          <p className="mt-0.5 text-[11px] italic text-foreground/90">
            {invocation.prompt}
          </p>
        </div>

        {invocation.response_md && (
          <article className="prose prose-xs mt-2.5 max-w-none [&_*]:!my-1.5 [&_h1]:!text-sm [&_h2]:!text-sm [&_h3]:!text-xs [&_p]:!text-[12px] [&_li]:!text-[12px] [&_code]:!text-[11px]">
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
              {(() => { let b = stripEntryBlock(stripActionsBlock(invocation.response_md ?? '')); if (choices.length > 0) b = stripQuickReplyContent(b); if (actions.length > 0) b = stripActionCallouts(b); return b; })()}
            </ReactMarkdown>
          </article>
        )}
        {proposedEntry && (
          <EntryDraftPanel entry={proposedEntry} projectCode={invocation.project_code} alreadySubmittedCode={submittedCode} onSubmitted={(c) => onEntrySubmitted(invocation.output_id, c)} />
        )}
      </div>

      <footer className="border-t bg-slate-50 px-3 py-2">
        {invocation.output_id && choices.length === 0 && (
          <div className="mb-1.5 flex items-center justify-end">
            <a
              href={`/report/${invocation.output_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-900 transition hover:bg-slate-100"
              title="Opens the polished, printable long-form report with PDF download"
            >
              ↗ Full report
            </a>
          </div>
        )}
        {choices.length > 0 && (
          <div className="border-t pt-1.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-sky-700">
              Quick reply
            </p>
            <div className="flex flex-col gap-1 pb-1.5">
              {choices.map((choice) => (
                <button
                  key={choice.letter}
                  type="button"
                  onClick={() => onUseAsPrompt(choice.text)}
                  className="text-left rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[12px] text-sky-900 transition hover:border-sky-400 hover:bg-sky-100"
                  title="Pre-fills the agent widget prompt with this option — review and Send"
                >
                  <span className="line-clamp-2">{choice.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {actions.length > 0 && (
          <div className="border-t pt-1.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
              Have agent follow up
            </p>
            <div className="flex flex-col gap-1">
              {actions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onUseAsPrompt(action)}
                  className="text-left rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-100"
                  title="Pre-fills the agent widget's prompt with a follow-up question on this action"
                >
                  <span className="line-clamp-2">{action}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
