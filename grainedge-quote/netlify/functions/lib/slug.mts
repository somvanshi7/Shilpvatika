// Shilpvatika Quote — Slug Generator
import { randomBytes } from 'crypto';

/**
 * Generates a quote slug in format: GRD-YYYYMMDD-XXXXXX
 * Uses crypto.randomBytes for unguessable alphanumeric suffix.
 */
export function generateSlug() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const datePart = `${y}${m}${d}`;
  const randPart = randomBytes(4)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toLowerCase();
  return `GRD-${datePart}-${randPart}`;
}

/**
 * Generates a slug and checks for collisions against existing keys in storage.
 * Retries up to 5 times if collision detected.
 */
export async function generateUniqueSlug(existsCheck) {
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug();
    const exists = await existsCheck(slug);
    if (!exists) return slug;
  }
  throw new Error('Failed to generate unique slug after 5 attempts');
}
