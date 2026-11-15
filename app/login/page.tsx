import Link from 'next/link';
import { login } from '../actions/auth';
import { Alert } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next ?? '/';
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Link href="/" className="font-display text-xl font-bold text-leaf">borough grown</Link>
      <h1 className="h1">Welcome back</h1>
      <Alert error={sp.error} />
      <form action={login} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5">
          <span className="label">Email</span>
          <input name="email" type="email" autoComplete="email" required className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className="input" />
        </label>
        <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
      </form>
      <p className="text-center text-sm text-muted">
        New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-leaf underline">Create an account</Link>
      </p>
    </main>
  );
}
