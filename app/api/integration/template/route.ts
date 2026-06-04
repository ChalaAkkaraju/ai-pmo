/**
 * GET /api/integration/template?source=SAP_PS — download the WBS CSV template.
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildWbsTemplate } from '@/lib/integration/csv';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const csv = buildWbsTemplate();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wbs-import-template.csv"',
    },
  });
}
