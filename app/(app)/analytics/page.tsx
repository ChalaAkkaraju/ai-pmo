import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** /analytics → first sub-page. The three registers each have their own page. */
export default async function AnalyticsIndex() {
  const token = 'session';
  redirect(`/analytics/actions`);
}
