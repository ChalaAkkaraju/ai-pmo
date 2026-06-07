/**
 * Technical → AI concepts at depth. The deeper, technical-audience readout
 * (tokens, context engineering, embeddings/RAG internals, fine-tuning vs RAG,
 * reasoning models, mixture-of-experts, MCP) as a full-screen deck. Valid token only.
 */
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { TechnicalDeck } from '@/components/technical-deck';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ConceptsAtDepthPage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();
  return <TechnicalDeck token={token} />;
}
