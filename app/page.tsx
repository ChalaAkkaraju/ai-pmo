/**
 * Public landing page. Most colleagues arrive via /access/[token]
 * which is the actual entry point. This page is just a friendly
 * "you're in the right place; check your invitation URL" landing.
 */

export default function RootPage() {
  return (
    <main className="container mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">AI PMO</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Methodology-aware AI assistance for program management.
      </p>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold">Access</h2>
        <p className="text-base text-muted-foreground">
          Access is by personalised invitation URL. If you have a link, open
          it directly. If you do not, contact the AI PMO owner.
        </p>
      </section>
    </main>
  );
}
