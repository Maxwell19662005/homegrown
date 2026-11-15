import fs from 'node:fs';
import path from 'node:path';
import { getUser } from '@/lib/auth';
import { UPLOAD_DIR } from '@/lib/uploads';

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts.some((p) => p === '..' || p.includes('/') || p.includes('\\'))) return new Response('Not found', { status: 404 });
  const [scope, ...rest] = parts;
  if (scope === 'private') {
    const user = await getUser();
    const owner = rest[0];
    if (!user || (user.role !== 'admin' && user.id !== owner)) return new Response('Not found', { status: 404 });
  } else if (scope !== 'public') {
    return new Response('Not found', { status: 404 });
  }
  const abs = path.join(UPLOAD_DIR, ...parts);
  if (!abs.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(abs)) return new Response('Not found', { status: 404 });
  const type = TYPES[path.extname(abs).toLowerCase()] ?? 'application/octet-stream';
  return new Response(fs.readFileSync(abs), {
    headers: {
      'Content-Type': type,
      'Cache-Control': scope === 'public' ? 'public, max-age=31536000, immutable' : 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
