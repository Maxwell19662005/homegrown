import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
      <h1 className="h1">Not found</h1>
      <p className="text-muted">That page doesn’t exist, or the listing was removed.</p>
      <Link href="/" className="btn-primary">Back to what’s fresh</Link>
    </main>
  );
}
