/**
 * R&D programme intake — the submission sheet for the R&D PMO workspace.
 * Only R&D roles (portfolio manager, programme lead, business sponsor) may submit.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { canRoleCreateProjectType } from '@/lib/roles';
import { roleSees } from '@/lib/workspace';
import { RndIntakeForm } from '@/components/rnd-intake-form';

export const dynamic = 'force-dynamic';

export default async function RndIntakePage() {
  const resolved = await getSessionRole();
  if (!resolved || !roleSees(resolved.role, 'rnd')) notFound();
  const canCreate = canRoleCreateProjectType(resolved.role.role_type, 'rnd');

  return (
    <div className="container mx-auto max-w-screen-lg px-8 py-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/portfolio/rnd" className="hover:underline">R&amp;D portfolio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">New R&amp;D programme</span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">Open an R&amp;D programme</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        The submission lands as <em>proposed</em> at stage&nbsp;0. No money is committed by it: the first gate decides whether it gets a
        scoping allowance, and the commit gate is where feasibility must be demonstrated, the development budget released, and the
        capitalisation basis agreed with Finance.
      </p>
      {canCreate ? (
        <RndIntakeForm />
      ) : (
        <div className="mt-8 rounded-lg border border-dashed bg-muted/20 p-6 text-sm">Your role can view the R&amp;D portfolio but not open programmes.</div>
      )}
    </div>
  );
}
