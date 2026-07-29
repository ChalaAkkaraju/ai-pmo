/**
 * POST /api/integration/test — test a source connection (no ingestion).
 * Body: { token, source?: 'SAP_PS' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionRole } from '@/lib/auth';
import { SapPsMockAdapter } from '@/lib/integration/adapters/sap-ps-mock';
import { MsProjectMockAdapter } from '@/lib/integration/adapters/msproject-mock';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  source: z.enum(['SAP_PS', 'MS_PROJECT', 'P6']).optional().default('SAP_PS'),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await getSessionRole();
  if (!resolved) return NextResponse.json({ ok: false, message: 'Invalid token' }, { status: 401 });
  if (body.source === 'P6') {
    return NextResponse.json({ ok: false, message: 'P6 connector not implemented yet.' }, { status: 200 });
  }
  const status = body.source === 'MS_PROJECT'
    ? await new MsProjectMockAdapter().testConnection()
    : await new SapPsMockAdapter().testConnection();
  return NextResponse.json(status, { status: 200 });
}
