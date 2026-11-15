import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR } from './db';

export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const DOC_TYPES: Record<string, string> = { ...IMAGE_TYPES, 'application/pdf': '.pdf' };

export class UploadError extends Error {}

/**
 * Saves an uploaded file. Public files (listing photos) can be viewed by anyone;
 * private files (seller documents, kitchen photos) only by their owner and admins.
 * Returns the stored path, e.g. "public/abc.jpg" or "private/usr_123/abc.pdf".
 */
export async function saveUpload(file: File, opts: { visibility: 'public' } | { visibility: 'private'; ownerId: string; allowPdf?: boolean }): Promise<string> {
  if (!file || file.size === 0) throw new UploadError('Please choose a file.');
  if (file.size > MAX_BYTES) throw new UploadError('Files must be under 8 MB.');
  const types = opts.visibility === 'private' && opts.allowPdf ? DOC_TYPES : IMAGE_TYPES;
  const ext = types[file.type];
  if (!ext) throw new UploadError(opts.visibility === 'private' && opts.allowPdf ? 'Upload a JPG, PNG, WebP or PDF.' : 'Upload a JPG, PNG or WebP photo.');
  const name = crypto.randomBytes(12).toString('base64url') + ext;
  const rel = opts.visibility === 'public' ? path.posix.join('public', name) : path.posix.join('private', opts.ownerId, name);
  const abs = path.join(UPLOAD_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, Buffer.from(await file.arrayBuffer()));
  return rel;
}

export function fileUrl(rel: string | null | undefined): string | null {
  return rel ? '/api/files/' + rel : null;
}
