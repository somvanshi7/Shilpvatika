import type { Context } from '@netlify/functions';
import { getMetadata, getQuoteHtml } from './lib/storage.mts';

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);

  // Slug comes as a query param from the netlify.toml redirect:
  //   /q/:slug → /.netlify/functions/serve-quote?slug=:slug
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response('Not Found — missing slug', { status: 404 });
  }

  try {
    const metadata = await getMetadata(slug);

    if (!metadata) {
      return new Response(buildErrorPage('Quote Not Found', `No quotation found with ID "${slug}". Please check the link and try again.`), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(metadata.expires_at);
    if (now > expiresAt) {
      return new Response(buildErrorPage('Quote Expired', `This quotation (${slug}) expired on ${expiresAt.toLocaleDateString()}. Please contact Shilpvatika for a revised quotation.`), {
        status: 410,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Fetch HTML
    const html = await getQuoteHtml(slug);

    if (!html) {
      return new Response(buildErrorPage('Quote Unavailable', 'The quotation document is still being generated. Please try again in a few seconds.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Inject OG Tags for Link Previews (WhatsApp, Slack, etc.)
    const totalFormatted = typeof metadata.total === 'number'
      ? new Intl.NumberFormat('en-IN').format(Math.round(metadata.total))
      : '—';

    const ogTags = `
      <meta property="og:title" content="Shilpvatika Quotation: ${metadata.clientName}">
      <meta property="og:description" content="Total: ₹${totalFormatted} | Valid until: ${expiresAt.toLocaleDateString()}">
      <meta property="og:type" content="website">
      <meta name="twitter:card" content="summary">
    `;

    const finalHtml = html.replace('</head>', `${ogTags}\n</head>`);

    return new Response(finalHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Serve Quote Error:', error);
    return new Response(buildErrorPage('Server Error', 'An unexpected error occurred. Please try again later.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
};

function buildErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Shilpvatika</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #faf8f5; color: #1a1410; }
    .card { background: #fff; padding: 48px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); text-align: center; max-width: 440px; border: 1px solid #e6dfd6; }
    h1 { color: #7a4e2d; margin: 0 0 12px; font-size: 1.6rem; }
    p { color: #4a3f36; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
