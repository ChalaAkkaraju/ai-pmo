/**
 * Root entry point.
 *
 * Signed-in colleagues are sent straight to their dashboard; everyone else to
 * /login. Identity comes from the session, so the dashboard runs under a
 * neutral /dashboard path (the token segment is ignored — see
 * lib/role-context). Clean top-level URLs are a later, cosmetic pass.
 */

import { redirect } from 'next/navigation';
import { getSessionRole } from '@/lib/auth';

export default async function RootPage() {
  const resolved = await getSessionRole();
  redirect(resolved ? '/dashboard' : '/login');
}
