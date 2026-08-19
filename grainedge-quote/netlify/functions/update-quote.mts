import type { Context } from '@netlify/functions';
import { getMetadata, putMetadata } from './lib/storage.mts';

export default async (req: Request, context: Context) => {
  if (req.method !== 'PATCH') return new Response('Method Not Allowed', { status: 405 });

  // Simple Auth Check
  const authHeader = req.headers.get('Authorization');
  const secret = process.env.ADMIN_AUTH_SECRET || 'change-me-in-production';
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await req.json();
    const { slug, status, expires_at } = data;

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const metadata = await getMetadata(slug);
    if (!metadata) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let updated = false;

    if (status && status !== metadata.status) {
      metadata.status = status;
      updated = true;
    }

    if (expires_at) {
      metadata.expires_at = new Date(expires_at).toISOString();
      updated = true;
    }

    if (updated) {
      await putMetadata(slug, metadata);
    }

    return new Response(JSON.stringify({ success: true, updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Update Quote Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
