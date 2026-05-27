/**
 * Browser-only Supabase client.
 *
 * Kept in its own file (separate from lib/supabase.ts which also re-exports
 * the server client that depends on `next/headers`). Client components must
 * import from this file, not from lib/supabase — otherwise the bundler will
 * try to include `next/headers` in the client bundle and fail.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Need NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    );
  }
  return createBrowserClient(url, anonKey);
}
