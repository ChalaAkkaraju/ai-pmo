/**
 * Capital project request — the submission sheet for the capital workspace.
 * Only the Capital Portfolio Manager, a capital PM or the plant manager may submit.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { canRoleCreateProjectType } from '@/lib/roles';
import { roleSees } from '@/lib/workspace';
import { CapitalIntakeForm } from '@/components/capital-intake-form';

export const dynamic = 'force-dynamic';

export default async function CapitalIntakePage() {
  const resolved = await getSessionRole();
  if (!resolved || !roleSees(resolved.role, 'capital')) notFound();
  const canCreate = canRoleCreateProjectType(resolved.role.role_type, 'capital');
  return (
    <div className="container mx-auto max-w-screen-lg px-8 py-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/portfolio/capital" className="hover:underline">Capital portfolio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">New capital request</span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">Raise a capital request</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        The request lands as <em>proposed</em> at FEL1 Appraise. Nothing is appropriated by it: small study budgets are released at the FEL1 and FEL2 gates,
        and the AFE — the full appropriation — is sanctioned at the end of FEL3 by the body its size requires.
      </p>
      {canCreate ? <CapitalIntakeForm /> : <div className="mt-8 rounded-lg border border-dashed bg-muted/20 p-6 text-sm">Your role can view the capital portfolio but not raise requests.</div>}
    </div>
  );
}
