/**
 * Server-side PDF generation for status reports.
 *
 * Why this route exists: the old client-side path used `html2pdf.js` which
 * rasterizes the DOM to a JPEG before embedding it in the PDF. The output
 * looked fine but the text was pixels — not selectable, not searchable,
 * not copyable. That's a portfolio-quality liability.
 *
 * What this does instead: launches a headless Chromium via Puppeteer,
 * navigates to the same `/access/<token>/report/<outputId>` page the user
 * sees, waits for the in-page full-mode regeneration to finish, then uses
 * Chrome's native Print-to-PDF to capture the page as a real PDF with
 * proper text layers. Same visual result; real selectable text.
 *
 * GET /api/report-pdf/[outputId]?token=<token>&filename=<friendly-name.pdf>
 *
 * Auth model: the URL-token (already the project's auth scheme) is required
 * as a query param. The route validates it before launching Puppeteer.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Browser } from 'puppeteer-core';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';

// Force Node runtime — Puppeteer requires Node APIs and the Chromium binary.
export const runtime = 'nodejs';

// Allow up to 150 seconds for the full-mode regeneration + PDF capture.
// (Full-mode reports take ~25-40s in prod, but dev mode also has to compile
// the page on first hit which can add another 10-20s. PDF capture itself
// is ~3-5s.)
export const maxDuration = 150;

// Don't cache — every PDF download should regenerate fresh.
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ outputId: string }>;
}

/**
 * Launch a headless browser. On Vercel/serverless the full puppeteer's bundled
 * Chromium (~300MB) blows the function-size limit and isn't present, so we use
 * the slim @sparticuz/chromium + puppeteer-core. Locally we keep full puppeteer
 * so dev and local demos work with zero extra setup (behaviour unchanged).
 * puppeteer is loaded via a non-literal specifier so the Vercel bundler never
 * traces it (it's a devDependency in production).
 */
async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteerCore = (await import('puppeteer-core')).default;
    return puppeteerCore.launch({
      args: [...chromium.args, '--disable-dev-shm-usage'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const localPkg = 'puppeteer';
  const puppeteer = (await import(localPkg)).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return browser as Browser;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { outputId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const filenameParam = url.searchParams.get('filename');
  const filename = sanitizeFilename(filenameParam) ?? `AI-PMO-Report-${outputId}.pdf`;

  if (!token) {
    return NextResponse.json({ error: 'Missing token query parameter' }, { status: 400 });
  }

  // 1. Validate the token — exact same check the report page does.
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2. Confirm the requested report actually exists. We do this before
  //    launching Puppeteer so a bad outputId returns a fast 404 instead
  //    of spending 3-5 seconds on Chromium just to discover nothing's there.
  const supabase = createSupabaseServiceClient();
  const { data: outputRow, error: lookupError } = await supabase
    .from('agent_outputs')
    .select('id')
    .eq('id', outputId)
    .maybeSingle();

  if (lookupError || !outputRow) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // 3. Build the in-app URL Puppeteer will navigate to. The token doubles
  //    as the auth so we can hit the same page the user would see.
  const baseUrl = `${url.protocol}//${url.host}`;
  const reportUrl = `${baseUrl}/access/${token}/report/${outputId}`;

  // 4. Launch Puppeteer, render the page, capture as PDF.
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();

    const page = await browser.newPage();

    // 1280x1024 @ 2x device pixel ratio renders the page crisply, like a
    // retina display. The PDF will scale appropriately via @page CSS rules.
    await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 2 });

    // Surface any browser-side errors in the server log so we can debug
    // (Puppeteer's headless Chrome console is otherwise invisible).
    page.on('console', (msg: { type(): string; text(): string }) => {
      const type = msg.type() as string;
      if (type === 'error' || type === 'warning') {
        console.log(`[report-pdf:browser:${type}]`, msg.text());
      }
    });
    page.on('pageerror', (err: unknown) => {
      console.log('[report-pdf:browser:pageerror]', (err as Error).message);
    });

    console.log(`[report-pdf] navigating to ${reportUrl}`);

    // Navigate. We don't use 'networkidle0' because the full-mode regen
    // POST may itself take 25-40s — networkidle waits for *quiet*, not
    // *complete*, and we need a more precise signal. Use 'domcontentloaded'
    // for the navigation, then wait on our explicit sentinel.
    await page.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });

    // Wait for the report's React state machine to flip to ready.
    // report-view.tsx sets data-report-ready="true" on the root div once
    // the full-mode regeneration completes (or errors out — both count
    // as "we have something to capture").
    //
    // Soft-fail: if the regen takes longer than 120s (rare, but can happen
    // in dev mode when Next has to compile the page from scratch), we
    // capture whatever's on screen rather than failing the whole request.
    // Worst case the user gets the brief instead of the long-form, but
    // they still get a real searchable PDF.
    try {
      await page.waitForSelector('[data-report-ready="true"]', { timeout: 120000 });
      console.log('[report-pdf] sentinel reached — full-mode ready');
    } catch (waitErr) {
      console.warn(
        '[report-pdf] sentinel timeout, capturing with current screen state:',
        (waitErr as Error).message,
      );
    }

    // Print media triggers the @media print CSS in report-view.tsx, which
    // hides the action bar and any other no-print chrome.
    await page.emulateMediaType('print');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // honor background colors (letterhead box, callouts)
      margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
      preferCSSPageSize: false,
    });

    await browser.close();
    browser = null;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    console.error('[report-pdf] PDF generation failed:', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'PDF generation failed' },
      { status: 500 },
    );
  }
}

/**
 * Strip anything dangerous from a user-supplied filename. The download
 * dialog ultimately controls where the file goes, but a clean name avoids
 * weird display in the dialog and protects the Content-Disposition header.
 */
function sanitizeFilename(input: string | null): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!cleaned) return null;
  return cleaned.endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}
