import Link from 'next/link';
import { signup } from '../actions/auth';
import { Alert } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { NeighborhoodSelect } from '@/components/NeighborhoodSelect';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next ?? '/';
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Link href="/" className="font-display text-xl font-bold text-leaf">homegrown</Link>
      <div className="flex flex-col gap-2">
        <h1 className="h1">Join your neighbors</h1>
        <p className="text-[15px] text-muted">Buy fresh food grown and made nearby. Free to join.</p>
      </div>
      <Alert error={sp.error} />
      <form action={signup} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5">
          <span className="label">First name</span>
          <input name="name" autoComplete="given-name" required className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Email</span>
          <input name="email" type="email" autoComplete="email" required className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Password</span>
          <input name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
          <span className="text-xs text-muted">At least 8 characters</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Neighborhood</span>
          <NeighborhoodSelect />
        </label>
        <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      </form>
      <p className="text-center text-xs leading-relaxed text-muted">
        By joining you agree to the <Link href="/legal/terms" className="underline">Terms</Link> and <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
      </p>
      <p className="text-center text-sm text-muted">
        Have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-leaf underline">Log in</Link>
      </p>
    </main>
  );
}
