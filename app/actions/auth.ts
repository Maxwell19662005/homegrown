'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkPassword, createUser, endSession, requireUser, startSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { NEIGHBORHOODS } from '@/lib/neighborhoods';
import { safeNext, str, withParam } from '@/lib/actions-util';

export async function signup(form: FormData) {
  const next = safeNext(str(form, 'next'));
  const back = '/signup?next=' + encodeURIComponent(next);
  const name = str(form, 'name', 60);
  const email = str(form, 'email', 200).toLowerCase();
  const password = String(form.get('password') ?? '');
  const neighborhood = str(form, 'neighborhood');
  if (!name) redirect(withParam(back, 'error', 'Please enter your name.'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(withParam(back, 'error', 'Please enter a valid email.'));
  if (password.length < 8) redirect(withParam(back, 'error', 'Passwords need at least 8 characters.'));
  if (!NEIGHBORHOODS.some((n) => n.name === neighborhood)) redirect(withParam(back, 'error', 'Choose your neighborhood.'));
  if (db().prepare('SELECT 1 FROM users WHERE email = ?').get(email)) redirect(withParam(back, 'error', 'An account with that email already exists. Try logging in.'));
  const id = await createUser(email, password, name, neighborhood);
  await startSession(id);
  redirect(next);
}

export async function login(form: FormData) {
  const next = safeNext(str(form, 'next'));
  const id = await checkPassword(str(form, 'email', 200), String(form.get('password') ?? ''));
  if (!id) redirect(withParam('/login?next=' + encodeURIComponent(next), 'error', 'That email and password don’t match.'));
  await startSession(id);
  redirect(next);
}

export async function logout() {
  await endSession();
  redirect('/');
}

export async function updateProfile(form: FormData) {
  const u = await requireUser('/profile');
  const name = str(form, 'name', 60);
  const neighborhood = str(form, 'neighborhood');
  if (!name || !NEIGHBORHOODS.some((n) => n.name === neighborhood)) redirect('/profile?error=' + encodeURIComponent('Please fill in your name and neighborhood.'));
  db().prepare('UPDATE users SET name = ?, neighborhood = ? WHERE id = ?').run(name, neighborhood, u.id);
  revalidatePath('/', 'layout');
  redirect('/profile?notice=' + encodeURIComponent('Saved.'));
}
