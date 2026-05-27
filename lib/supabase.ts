/**
 * Supabase client setup for browser, server components, and route handlers.
 * Pattern follows the official @supabase/ssr guidance for Next.js App Router.
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * Read Supabase URL + anon key from environment.
 * Reading inside a function rather than at module top level so that
 * scripts using dotenv to load .env.local at runtime get a fresh read
 * after dotenv has populated process.env.
 */
function readPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Need NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. ' +
        '(For scripts: ensure dotenv config({ path: \'.env.local\' }) runs ' +
        'before any import of @/lib/supabase.)',
    );
  }
  return { url, anonKey };
}

/**
 * Browser client — used in client components.
 * Reads cookies set by the server-side client for auth context.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = readPublicSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

/**
 * Server-side client for Server Components and Server Actions.
 * Reads/writes cookies for auth context.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = readPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The setAll method was called from a Server Component.
          // This can be ignored if the middleware refreshes user sessions.
        }
      },
    },
  });
}

/**
 * Service-role client — full database access, no RLS.
 * ONLY use in trusted server contexts (route handlers, seed scripts).
 * Never expose the service role key client-side.
 */
export function createSupabaseServiceClient() {
  const { url } = readPublicSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
        '(For scripts: ensure dotenv config({ path: \'.env.local\' }) runs ' +
        'before any import of @/lib/supabase.)',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
