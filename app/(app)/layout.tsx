/**
 * Layout for all pages under /access/[token]/.
 * Validates the token (redirect to /invalid if not found), renders the
 * persistent header, and mounts the floating agent widget so colleagues can
 * invoke an agent from any page without going through the Invoke Agent tab.
 */

import { notFound } from 'next/navigation';
import { Header } from '@/components/header';
import { getSessionRole } from '@/lib/auth';
import { getVisibleLearnItems } from '@/lib/learn-content';
import { FloatingAgentWidgetGate } from '@/components/floating-agent-widget-gate';

interface AccessLayoutProps {
  children: React.ReactNode;
}

export default async function AccessLayout({ children }: AccessLayoutProps) {
  const resolved = await getSessionRole();
  if (!resolved) {
    notFound();
  }
  const learnItems = await getVisibleLearnItems(resolved);

  return (
    <div className="min-h-screen flex flex-col">
      <Header resolved={resolved} signedIn={!!resolved} learnItems={learnItems} />
      <main className="flex-1">{children}</main>
      <FloatingAgentWidgetGate
        roleDisplayName={resolved.definition.display_name}
        allowedAgents={resolved.definition.allowed_agents}
        canWrite={resolved.definition.can_write}
      />
    </div>
  );
}
