import type { Config, Context } from '@netlify/functions';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { getMetadata, getQuoteHtml, putQuotePdf, putMetadata } from './lib/storage.mts';
import { sendClientEmail, sendSalesNotification } from './lib/email.mts';
import { QUOTE_STATUSES } from '../../src/lib/constants.js';

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let slug = '';
  try {
    const data = await req.json();
    slug = data.slug;
    
    if (!slug) throw new Error('Missing slug');

    console.log(`[PDF] Starting generation for ${slug}`);

    // 1. Fetch metadata and HTML
    const metadata = await getMetadata(slug);
    if (!metadata) throw new Error(`Metadata not found for ${slug}`);
    
    const html = await getQuoteHtml(slug);
    if (!html) throw new Error(`HTML not found for ${slug}`);

    // 2. Launch Puppeteer
    const executablePath = process.env.IS_LOCAL
      ? null // Let puppeteer find local chrome if testing locally without Netlify CLI
      : await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    // 3. Render PDF
    const page = await browser.newPage();
    
    // Pass the HTML string directly to the page (no need to navigate to a URL)
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate A4 PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }, // Handled in HTML CSS
    });

    await browser.close();
    console.log(`[PDF] Rendered successfully for ${slug}`);

    // 4. Store PDF in Blobs
    await putQuotePdf(slug, pdfBuffer);

    // 5. Update Metadata status
    metadata.status = QUOTE_STATUSES.READY;
    metadata.pdf_url = `/api/download-pdf?slug=${slug}`;
    metadata.generated_at = new Date().toISOString();
    await putMetadata(slug, metadata);

    // 6. Send Emails
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8888';
    const quoteUrl = `${baseUrl}/q/${slug}`;
    const validityDate = new Date(metadata.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    await Promise.all([
      sendClientEmail({
        to: metadata.email,
        clientName: metadata.clientName,
        slug,
        validityDate,
        quoteUrl,
        pdfBase64: Buffer.from(pdfBuffer).toString('base64'),
      }).catch(e => console.error('[EMAIL] Failed to send client email:', e)),
      
      sendSalesNotification({
        slug,
        clientName: metadata.clientName,
        company: metadata.company,
        email: metadata.email,
        phone: metadata.phone,
        projectType: metadata.projectType,
        total: metadata.total,
      }).catch(e => console.error('[EMAIL] Failed to send sales email:', e))
    ]);

    console.log(`[PDF] Workflow complete for ${slug}`);

  } catch (error) {
    console.error(`[PDF ERROR] ${slug}:`, error);
    
    // Attempt to update status to error
    if (slug) {
      try {
        const metadata = await getMetadata(slug);
        if (metadata) {
          metadata.status = QUOTE_STATUSES.ERROR;
          metadata.error_details = error.message;
          await putMetadata(slug, metadata);
        }
      } catch (e) {
        console.error('Failed to update error status:', e);
      }
    }
  }
};

// Netlify Background Function Configuration
export const config: Config = {
  background: true,
};
