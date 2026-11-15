import 'server-only';
import { redirect } from 'next/navigation';
import { UserError } from './data';
import { UploadError } from './uploads';

export function withParam(path: string, key: string, value: string) {
  return path + (path.includes('?') ? '&' : '?') + key + '=' + encodeURIComponent(value);
}

/** Runs an action; known user-facing errors redirect back with ?error=… */
export async function guard<T>(backTo: string, fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UserError || e instanceof UploadError) redirect(withParam(backTo, 'error', e.message));
    throw e;
  }
}

export function str(form: FormData, key: string, max = 500): string {
  return String(form.get(key) ?? '').trim().slice(0, max);
}

export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
