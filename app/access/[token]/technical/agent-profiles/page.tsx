/**
 * Technical · 14 agent technical profiles. Reference page, grouped by project
 * lifecycle phase. Each profile summarises the agent's prompt
 * (lib/agent-prompts/<agent>.md, authoritative) and links to the rich agent
 * card. Valid token only.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { AgentProfilesRich } from '@/components/agent-profiles-rich';

export const dynamic = 'force-dynamic';

interface PageProps { params: Promise<{ token: string }>; }

export default async function AgentProfilesPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/access/${token}`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <Link href={`/access/${token}/technical`} className="hover:underline">Technical notes</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Agent profiles</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">Agent technical profiles</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        The 14 agents along the project lifecycle — for each: its PMBOK basis, what it reads and feeds, the inputs,
        where the app grounds it, the methodology rules, and what it refuses to do. Each profile{' '}
        <span className="font-medium text-foreground">summarises the agent&apos;s prompt</span>{' '}
        (<code className="rounded bg-muted px-1 py-0.5 text-[12px]">lib/agent-prompts/&lt;agent&gt;.md</code>, the authoritative
        source); open <span className="font-medium text-foreground">Meet the agent</span> for the full card.
      </p>

      <AgentProfilesRich token={token} />
    </div>
  );
}
