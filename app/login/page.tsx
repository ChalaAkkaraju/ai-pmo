/**
 * Sign-in page, presented as the welcome screen: the pitch and the five
 * workspace cards, with sign-in as a pop-up when a card (or "Sign in") is
 * chosen. Invite-only: there is no sign-up link — accounts are created by an
 * admin. Users sign in with their USERNAME; the server action resolves it to
 * the account's email behind the scenes, then opens the chosen workspace (or
 * redirects by role).
 */
import { Plus_Jakarta_Sans } from 'next/font/google';
import { LoginWelcome } from '@/components/login-welcome';

export const metadata = { title: 'Sign in · AI PMO' };

const display = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; ws?: string }>;
}) {
  const { error, next, ws } = await searchParams;
  return <LoginWelcome error={error} next={next} ws={ws} fontClass={display.className} />;
}
