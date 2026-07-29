'use client';

/**
 * Route gate for the floating agent widget.
 *
 * The widget is mounted in the shared /access/[token]/ layout so it appears on
 * every page. The Agents catalog (/agents) is a full-screen teaching deck with
 * its own bottom-center navigation — the floating ✨ button would overlap that
 * nav and is contextually odd (the deck explains the widget). So we hide it on
 * the agents route only.
 */

import { usePathname } from 'next/navigation';
import { FloatingAgentWidget } from '@/components/floating-agent-widget';
import type { AgentType } from '@/lib/types';

export function FloatingAgentWidgetGate(props: {
  roleDisplayName: string;
  allowedAgents: AgentType[];
  canWrite: boolean;
}) {
  const pathname = usePathname() ?? '';
  // Hide on the agents catalog deck and the welcome screen (both are full-screen).
  if (/\/access\/[^/]+\/(agents|welcome)$/.test(pathname)) return null;
  return <FloatingAgentWidget {...props} />;
}
