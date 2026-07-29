/**
 * Layout for all pages under /access/[token]/.
 * Validates the token (redirect to /invalid if not found), renders the
 * persistent header, and mounts the floating agent widget so colleagues can
 * invoke an agent from any page without going through the Invoke Agent tab.
 */

import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { Header } from '@/components/header';
import { getSessionRole } from '@/lib/auth';
import { FloatingAgentWidgetGate } from '@/components/floating-agent-widget-gate';

interface AccessLayoutProps {
  children: React.ReactNode;
}

export default async function AccessLayout({ children }: AccessLayoutProps) {
  const token = 'session';
  const resolved = await resolveRoleFromToken(token);
  const session = await getSessionRole();

  if (!resolved) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header token={token} resolved={resolved} signedIn={!!session} />
      <main className="flex-1">{children}</main>
      <FloatingAgentWidgetGate
        token={token}
        roleDisplayName={resolved.definition.display_name}
        allowedAgents={resolved.definition.allowed_agents}
        canWrite={resolved.definition.can_write}
      />
    </div>
  );
}
