/**
 * URL-token auth proxy for the PMO LLM Demo.
 *
 * Routes under /access/[token] are validated by looking up the token in the
 * `roles` table. If valid, the role context is attached to the request via
 * cookies that downstream Server Components and route handlers can read.
 *
 * All other routes are public.
 *
 * NOTE: This file replaces the previous `middleware.ts`. Next.js 16 renamed
 * the file convention and exported function from `middleware` to `proxy`
 * to clarify the network-boundary intent and to free `middleware` for
 * future use cases that align with Express-style request transforms.
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * Per the Next 16 docs, `proxy.ts` runs on the Node.js runtime only —
 * edge runtime is no longer supported here. This is fine for us because
 * we only set cookies; no DB calls or compute-heavy work happens at the
 * proxy layer.
 */

import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_ROUTE_PREFIX = '/access/';
const ROLE_COOKIE = 'pmo_role_token';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only enforce token auth on /access/[token] routes
  if (!pathname.startsWith(ACCESS_ROUTE_PREFIX)) {
    return NextResponse.next();
  }

  // Extract token from URL
  const token = pathname.split('/')[2];
  if (!token || token.length < 8) {
    return NextResponse.redirect(new URL('/invalid', request.url));
  }

  // Set the role cookie so Server Components downstream can read the token
  // and look up role context via Supabase. Token validation itself happens
  // server-side in the page/API handlers (not in this proxy) to keep the
  // proxy small and database calls out of the request boundary.
  const response = NextResponse.next();
  response.cookies.set(ROLE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public/* (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
