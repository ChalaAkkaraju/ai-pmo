'use server';

/**
 * Auth server actions for the email/password sign-in flow.
 * signInWithPassword / signOut set and clear the Supabase session cookies via
 * the SSR server client, so no client-side token handling is needed.
 */

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';

function backToLogin(message: string, next: string): never {
  const qs = new URLSearchParams({ error: message, next });
  redirect(`/login?${qs.toString()}`);
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '') || '/access/home';

  if (!email || !password) {
    backToLogin('Enter your email and password.', next);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Don't leak whether the email exists — one generic message.
    backToLogin('Invalid email or password.', next);
  }

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
