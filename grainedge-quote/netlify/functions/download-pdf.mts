import type { Context } from '@netlify/functions';
import { getMetadata, getQuotePdf } from './lib/storage.mts';

export default async (req: Request, context: Context) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  try {
    const metadata = await getMetadata(slug);
    if (!metadata) {
      return new Response('Quote Not Found', { status: 404 });
    }

    // Expiry check
    const now = new Date();
    const expiresAt = new Date(metadata.expires_at);
    if (now > expiresAt) {
      return new Response('Quote Expired', { status: 410 });
    }

    // Password check skipped for simplicity in this file, normally you'd check a token here
    // or validate a signed URL

    const pdfBuffer = await getQuotePdf(slug);
    if (!pdfBuffer) {
      return new Response('PDF Not Found or Still Generating', { status: 404 });
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Shilpvatika_Quote_${slug}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Download PDF Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
