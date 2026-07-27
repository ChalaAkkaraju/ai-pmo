/**
 * Auth proxy for the AI PMO app (Next.js 16 `proxy.ts`, Node runtime).
 *
 * Two jobs:
 *   1. Refresh the Supabase Auth session on every request (the @supabase/ssr
 *      pattern) so session cookies stay valid for Server Components and route
 *      handlers.
 *   2. Gate protected routes: an unauthenticated request to anything that isn't
 *      public is redirected to /login?next=<path>.
 *
 * Identity now comes from the session, so EVERY app route requires sign-in,
 * including the legacy /access/<token> dashboards (the token in the URL is
 * ignored — lib/role-context resolves the role from the session). Only the
 * landing page, /invalid, and /login are public.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Paths reachable without a session. Everything else requires sign-in. */
function isPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/invalid') return true;
  if (pathname.startsWith('/login')) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Response we can attach refreshed auth cookies to.
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env is missing we can't refresh the session; fall through so the app can
  // surface its own clear config error rather than 500-ing in the proxy.
  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // IMPORTANT: getUser() both validates the token and triggers the cookie
    // refresh via setAll above. Do not remove.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isPublicPath(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(redirectUrl);
    }

    // Force a first-login password change before anything else. The flag lives
    // in the auth user's app_metadata so we can gate here without a DB read.
    if (
      user &&
      user.app_metadata?.must_change_password === true &&
      pathname !== '/change-password' &&
      !pathname.startsWith('/login')
    ) {
      const pwUrl = request.nextUrl.clone();
      pwUrl.pathname = '/change-password';
      pwUrl.search = '';
      return NextResponse.redirect(pwUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except:
     * - api            (route handlers do their own auth)
     * - _next/static   (static assets)
     * - _next/image    (image optimizer)
     * - favicon.ico
     * - public assets with a file extension (svg/png/jpg/…)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
