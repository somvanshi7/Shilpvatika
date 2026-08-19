// Shilpvatika Quote — Storage Abstraction (Netlify Blobs / S3)
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'shilpvatika-quotes';

function getQuoteStore() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

// ---- Metadata ----

export async function putMetadata(slug, metadata) {
  const store = getQuoteStore();
  await store.setJSON(`${slug}/metadata`, metadata);
}

export async function getMetadata(slug) {
  const store = getQuoteStore();
  try {
    return await store.get(`${slug}/metadata`, { type: 'json' });
  } catch {
    return null;
  }
}

export async function slugExists(slug) {
  const meta = await getMetadata(slug);
  return meta !== null;
}

// ---- HTML ----

export async function putQuoteHtml(slug, html) {
  const store = getQuoteStore();
  await store.set(`${slug}/quote.html`, html);
}

export async function getQuoteHtml(slug) {
  const store = getQuoteStore();
  try {
    return await store.get(`${slug}/quote.html`, { type: 'text' });
  } catch {
    return null;
  }
}

// ---- PDF ----

export async function putQuotePdf(slug, pdfBuffer) {
  const store = getQuoteStore();
  await store.set(`${slug}/quote.pdf`, pdfBuffer);
}

export async function getQuotePdf(slug) {
  const store = getQuoteStore();
  try {
    return await store.get(`${slug}/quote.pdf`, { type: 'arrayBuffer' });
  } catch {
    return null;
  }
}

// ---- Listing ----

export async function listAllQuotes() {
  const store = getQuoteStore();
  const { blobs } = await store.list();

  // Filter to only metadata keys and fetch each
  const metadataKeys = blobs
    .map((b) => b.key)
    .filter((k) => k.endsWith('/metadata'));

  const quotes = [];
  for (const key of metadataKeys) {
    try {
      const meta = await store.get(key, { type: 'json' });
      if (meta) quotes.push(meta);
    } catch {
      // skip corrupt entries
    }
  }

  // Sort by created_at descending
  quotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return quotes;
}
