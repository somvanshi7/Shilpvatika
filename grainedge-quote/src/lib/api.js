// Shilpvatika Quote — API Client

const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function createQuote(formData) {
  return request('/create-quote', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

export async function getQuote(slug) {
  return request(`/get-quote?slug=${encodeURIComponent(slug)}`);
}

export async function listQuotes({ page = 1, status = '', search = '' } = {}, authToken) {
  const params = new URLSearchParams({ page, status, search });
  return request(`/list-quotes?${params}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
}

export async function updateQuote(slug, updates, authToken) {
  return request('/update-quote', {
    method: 'PATCH',
    body: JSON.stringify({ slug, ...updates }),
    headers: { Authorization: `Bearer ${authToken}` },
  });
}

export function getQuotePreviewUrl(slug) {
  return `/q/${slug}`;
}

export function getPdfDownloadUrl(slug) {
  return `/api/download-pdf?slug=${encodeURIComponent(slug)}`;
}

export function getWhatsAppShareUrl(slug, validityDate) {
  const baseUrl = window.location.origin;
  const quoteUrl = `${baseUrl}/q/${slug}`;
  const message =
    `Hi 👋 Here is your quotation from Shilpvatika - ${quoteUrl}\n` +
    `Quote ID: ${slug}\n` +
    `Valid until: ${validityDate}\n` +
    `Contact us at +91 98765 43210 to accept or discuss.`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
