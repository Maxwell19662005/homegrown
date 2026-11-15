import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, newId } from './db';

export type User = {
  id: string;
  email: string;
  name: string;
  neighborhood: string;
  role: 'user' | 'admin';
};

const COOKIE = 'hg_session';
const DAYS = 30;

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.neighborhood, u.role FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as User | undefined;
  return row ?? null;
}

export async function requireUser(next = '/'): Promise<User> {
  const u = await getUser();
  if (!u) redirect('/login?next=' + encodeURIComponent(next));
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser('/admin');
  if (u.role !== 'admin') redirect('/');
  return u;
}

export async function startSession(userId: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + DAYS * 86400000);
  db().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires.toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && (process.env.APP_URL ?? '').startsWith('https'),
    path: '/',
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  jar.delete(COOKIE);
}

export async function createUser(email: string, password: string, name: string, neighborhood: string): Promise<string> {
  const id = newId('usr');
  const hash = await bcrypt.hash(password, 10);
  const admin = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  db()
    .prepare('INSERT INTO users (id, email, password_hash, name, neighborhood, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, email.toLowerCase(), hash, name, neighborhood, admin ? 'admin' : 'user');
  return id;
}

export async function checkPassword(email: string, password: string): Promise<string | null> {
  const row = db().prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email.toLowerCase()) as
    | { id: string; password_hash: string }
    | undefined;
  if (!row) return null;
  return (await bcrypt.compare(password, row.password_hash)) ? row.id : null;
}
