import type { Context } from '@netlify/functions';
import { getMetadata } from './lib/storage.mts';

export default async (req: Request, context: Context) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const metadata = await getMetadata(slug);

    if (!metadata) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Strip sensitive info before returning to client (like password hash)
    const publicData = {
      slug: metadata.slug,
      status: metadata.status,
      clientName: metadata.clientName,
      company: metadata.company,
      total: metadata.total,
      created_at: metadata.created_at,
      expires_at: metadata.expires_at,
      pdf_url: metadata.pdf_url,
      isProtected: !!metadata.password,
    };

    return new Response(JSON.stringify(publicData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get Quote Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
