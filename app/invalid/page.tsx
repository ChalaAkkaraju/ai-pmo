/**
 * Invalid-invitation landing page. Shown when the URL token is missing,
 * malformed, or not found in the roles table.
 */

export default function InvalidPage() {
  return (
    <main className="container mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Invitation not recognised</h1>
      <p className="mt-3 text-base text-muted-foreground">
        The URL you used does not match an invitation we have on file.
        Check the link you were given, or contact the AI PMO owner.
      </p>
    </main>
  );
}
