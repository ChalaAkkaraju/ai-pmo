/**
 * GET /api/integration/template?type=wbs|cost|tasks|resources — download a
 * CSV import template for the requested canonical entity.
 */
import { NextRequest, NextResponse } from 'next/server';
import { TEMPLATE_META, type TemplateType } from '@/lib/integration/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const typeParam = (new URL(request.url).searchParams.get('type') ?? 'wbs') as TemplateType;
  const meta = TEMPLATE_META[typeParam] ?? TEMPLATE_META.wbs;
  return new NextResponse(meta.build(), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${meta.filename}"`,
    },
  });
}
