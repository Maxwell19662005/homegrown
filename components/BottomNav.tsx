'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { I, Icon } from './Icons';

const TABS = [
  { href: '/', label: 'Discover', icon: I.sprout },
  { href: '/map', label: 'Map', icon: I.map },
  { href: '/orders', label: 'Orders', icon: I.bag },
  { href: '/profile', label: 'Profile', icon: I.user },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-4 px-1 pt-1.5 pb-2">
        {TABS.map((t) => {
          const on = t.href === '/' ? path === '/' : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? 'page' : undefined} className={`flex h-[54px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? 'text-leaf' : 'text-muted'}`}>
              <Icon d={t.icon} size={22} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Page shell with the bottom tab bar. */
export function TabPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md px-5 pt-5 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
