'use client';

/** Opens the floating assistant pre-filled with an agent and prompt — the user reviews and sends. */
export function AskAgentButton({ agentType, prompt, label, className }: { agentType: string; prompt: string; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('pmo:ask-agent', { detail: { agentType, prompt } }))}
      className={className ?? 'rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700'}
    >
      {label}
    </button>
  );
}
