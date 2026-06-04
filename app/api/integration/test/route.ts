/**
 * POST /api/integration/test — test a source connection (no ingestion).
 * Body: { token, source?: 'SAP_PS' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveRoleFromToken } from '@/lib/role-context';
import { SapPsMockAdapter } from '@/lib/integration/adapters/sap-ps-mock';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(8),
  source: z.enum(['SAP_PS', 'DATAVERSE', 'P6']).optional().default('SAP_PS'),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await resolveRoleFromToken(body.token);
  if (!resolved) return NextResponse.json({ ok: false, message: 'Invalid token' }, { status: 401 });
  if (body.source !== 'SAP_PS') {
    return NextResponse.json({ ok: false, message: `${body.source} connector not implemented yet.` }, { status: 200 });
  }

  const status = await new SapPsMockAdapter().testConnection();
  return NextResponse.json(status, { status: 200 });
}
