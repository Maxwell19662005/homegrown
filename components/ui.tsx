import Link from 'next/link';
import { I, Icon } from './Icons';

export function Alert({ error, notice }: { error?: string; notice?: string }) {
  if (error) return <p role="alert" className="rounded-xl border border-tomato/30 bg-tomato-soft px-3.5 py-3 text-sm font-medium text-tomato-ink">{error}</p>;
  if (notice) return <p role="status" className="rounded-xl border border-leaf/30 bg-leaf-soft px-3.5 py-3 text-sm font-medium text-leaf-dark">{notice}</p>;
  return null;
}

export function BackLink({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link href={href} aria-label={label} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white">
      <Icon d={I.back} />
    </Link>
  );
}

/** Simple page with a back button and title, no tab bar. */
export function SubPage({ back, title, children, footer }: { back: string; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pt-4 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <BackLink href={back} />
        <h1 className="font-display text-2xl font-bold">{title}</h1>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
      {footer}
    </main>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    reserved: ['Reserved', 'bg-leaf-soft text-leaf-dark'],
    pending_payment: ['Awaiting payment', 'bg-[#FFF1C9] text-[#7A5C00]'],
    picked_up: ['Picked up', 'bg-[#EEF2EC] text-[#2E3B32]'],
    cancelled: ['Cancelled', 'bg-tomato-soft text-tomato-ink'],
    expired: ['Expired', 'bg-[#EEF2EC] text-[#2E3B32]'],
    active: ['Live', 'bg-leaf-soft text-leaf-dark'],
    closed: ['Closed', 'bg-[#EEF2EC] text-[#2E3B32]'],
    suspended: ['Suspended', 'bg-tomato-soft text-tomato-ink'],
    approved: ['Approved', 'bg-leaf-soft text-leaf-dark'],
    pending: ['In review', 'bg-[#FFF1C9] text-[#7A5C00]'],
    rejected: ['Needs changes', 'bg-tomato-soft text-tomato-ink'],
    setup: ['Setting up', 'bg-[#EEF2EC] text-[#2E3B32]'],
  };
  const [label, cls] = map[status] ?? [status, 'bg-[#EEF2EC]'];
  return <span className={`pill whitespace-nowrap ${cls}`}>{label}</span>;
}
