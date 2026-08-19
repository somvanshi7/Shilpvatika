import type { Context } from '@netlify/functions';
import { generateUniqueSlug } from './lib/slug.mts';
import { slugExists, putMetadata, putQuoteHtml } from './lib/storage.mts';
import { buildQuoteHtml } from './lib/quote-template.mts';
import { GST_RATE, DEFAULT_VALIDITY_DAYS, QUOTE_STATUSES } from '../../src/lib/constants.js';

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const data = await req.json();

    // 1. Basic validation
    if (!data.clientName || !data.email || !data.lineItems || data.lineItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Generate unique slug
    const slug = await generateUniqueSlug(slugExists);

    // 3. Calculate totals
    let subtotal = 0;
    const items = data.lineItems.map((item) => {
      const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
      subtotal += amount;
      return { ...item, amount };
    });

    const gstAmount = subtotal * GST_RATE;
    const total = subtotal + gstAmount;

    // 4. Set dates
    const now = new Date();
    const expiryDays = data.expiryDays ? parseInt(data.expiryDays, 10) : DEFAULT_VALIDITY_DAYS;
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    // 5. Build metadata object
    const metadata = {
      slug,
      clientName: data.clientName,
      company: data.company || '',
      email: data.email,
      phone: data.phone || '',
      projectType: data.projectType || 'Custom',
      scopeSummary: data.scopeSummary || '',
      lineItems: items,
      subtotal,
      gstAmount,
      total,
      gstRate: GST_RATE,
      status: QUOTE_STATUSES.PROCESSING,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      password: data.password || null, // Hash in real prod if needed
    };

    // 6. Generate HTML
    const html = buildQuoteHtml(metadata);

    // 7. Store Metadata and HTML in Blobs
    await putMetadata(slug, metadata);
    await putQuoteHtml(slug, html);

    // 8. Trigger background function for PDF generation
    // We fetch the background function endpoint internally
    const baseUrl = process.env.APP_BASE_URL || new URL(req.url).origin;
    fetch(`${baseUrl}/.netlify/functions/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch((err) => console.error('Failed to trigger background fn:', err));

    // 9. Return immediately
    return new Response(JSON.stringify({ slug, status: QUOTE_STATUSES.PROCESSING }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create Quote Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
