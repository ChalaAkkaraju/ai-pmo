/**
 * IT project intake — the AOP submission sheet for the IT PMO workspace.
 * Only IT roles (it_portfolio_manager, it_pm) may submit.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { canRoleCreateProjectType } from '@/lib/roles';
import { roleSees } from '@/lib/workspace';
import { ItIntakeForm } from '@/components/it-intake-form';

export const dynamic = 'force-dynamic';

export default async function ItIntakePage() {
  const resolved = await getSessionRole();
  if (!resolved || !roleSees(resolved.role, 'it')) notFound();
  const canCreate = canRoleCreateProjectType(resolved.role.role_type, 'it');

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('projects')
    .select('code, name, fiscal_year')
    .eq('project_type', 'it')
    .in('lifecycle_status', ['active', 'approved', 'on_hold'])
    .order('code');
  const candidates = (data ?? []) as Array<{ code: string; name: string; fiscal_year: number | null }>;

  return (
    <div className="container mx-auto max-w-screen-lg px-8 py-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/portfolio/it" className="hover:underline">IT portfolio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">New IT project</span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">Submit an IT project to the annual plan</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        The submission lands as <em>proposed</em> in its bucket for the fiscal year. It is ranked against the bucket&rsquo;s waterline;
        if approved it receives a discovery allowance, and Stage Gate&nbsp;1 locks scope, budget and the capital / expense split.
      </p>
      {canCreate ? (
        <ItIntakeForm continuationCandidates={candidates} />
      ) : (
        <div className="mt-8 rounded-lg border border-dashed bg-muted/20 p-6 text-sm">Your role can view the IT portfolio but not submit projects.</div>
      )}
    </div>
  );
}
