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
import { roleSees } from '@/lib/workspace';
import { loadMyInbox } from '@/lib/governance';
import { createSupabaseServiceClient } from '@/lib/supabase';
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
  const inboxCount = roleSees(resolved.role, 'it') ? (await loadMyInbox(createSupabaseServiceClient(), resolved.role)).records.length : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header resolved={resolved} signedIn={!!resolved} learnItems={learnItems} inboxCount={inboxCount} />
      <main className="flex-1 pb-24">{children}</main>
      <FloatingAgentWidgetGate
        roleDisplayName={resolved.definition.display_name}
        allowedAgents={resolved.definition.allowed_agents}
        canWrite={resolved.definition.can_write}
      />
    </div>
  );
}
