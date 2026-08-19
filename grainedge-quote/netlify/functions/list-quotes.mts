import type { Context } from '@netlify/functions';
import { listAllQuotes } from './lib/storage.mts';

export default async (req: Request, context: Context) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  // Simple Auth Check
  const authHeader = req.headers.get('Authorization');
  const secret = process.env.ADMIN_AUTH_SECRET || 'change-me-in-production';
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const statusFilter = url.searchParams.get('status') || '';
  const search = (url.searchParams.get('search') || '').toLowerCase();
  
  const limit = 20;

  try {
    let quotes = await listAllQuotes();

    // Apply filters
    if (statusFilter) {
      quotes = quotes.filter(q => q.status === statusFilter);
    }
    
    if (search) {
      quotes = quotes.filter(q => 
        q.clientName.toLowerCase().includes(search) || 
        q.slug.toLowerCase().includes(search) ||
        (q.company && q.company.toLowerCase().includes(search))
      );
    }

    // Pagination
    const total = quotes.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedQuotes = quotes.slice(start, start + limit);

    // Strip out sensitive line item data to keep payload small for listing
    const sanitizedQuotes = paginatedQuotes.map(q => ({
      slug: q.slug,
      clientName: q.clientName,
      company: q.company,
      total: q.total,
      status: q.status,
      created_at: q.created_at,
      expires_at: q.expires_at,
      pdf_url: q.pdf_url
    }));

    return new Response(JSON.stringify({
      quotes: sanitizedQuotes,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('List Quotes Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
