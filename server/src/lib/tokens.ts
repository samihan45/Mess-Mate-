import { randomBytes } from 'node:crypto';

export const randomToken = (bytes = 18) => randomBytes(bytes).toString('base64url');

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${base || 'mess'}-${randomBytes(3).toString('hex')}`;
}
