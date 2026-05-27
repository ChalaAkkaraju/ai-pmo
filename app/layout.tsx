import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AI PMO',
  description:
    'Methodology-aware AI assistance for program management — portfolio dashboard plus specialist agents that produce charters, schedules, budgets, risk registers, and closeout reports on demand.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body
        className="min-h-screen bg-background font-sans antialiased text-[15px] leading-relaxed"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
