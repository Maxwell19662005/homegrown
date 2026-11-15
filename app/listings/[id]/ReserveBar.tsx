'use client';
import { useState } from 'react';
import Link from 'next/link';
import { reserve } from '@/app/actions/orders';
import { SubmitButton } from '@/components/SubmitButton';

const FEE = 75;

export function ReserveBar({ listingId, priceCents, max, loggedIn, demo }: { listingId: string; priceCents: number; max: number; loggedIn: boolean; demo: boolean }) {
  const [qty, setQty] = useState(1);
  const total = ((priceCents * qty + FEE) / 100).toFixed(2);
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <form action={reserve} className="mx-auto flex max-w-md flex-col gap-2">
        <input type="hidden" name="listing_id" value={listingId} />
        <input type="hidden" name="qty" value={qty} />
        <div className="flex items-center gap-3">
          <div className="flex h-[52px] items-center rounded-[14px] border border-line">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity" className="h-full w-11 text-xl">−</button>
            <span className="min-w-6 text-center font-bold" aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty(Math.min(max, qty + 1))} aria-label="Increase quantity" className="h-full w-11 text-xl">+</button>
          </div>
          {loggedIn ? (
            <SubmitButton className="btn-primary h-[52px] flex-1 text-base" pendingText="Reserving…">Reserve · ${total}</SubmitButton>
          ) : (
            <Link href={`/login?next=/listings/${listingId}`} className="btn-primary h-[52px] flex-1 text-base">Log in to reserve</Link>
          )}
        </div>
        <span className="text-center text-xs text-muted">Includes $0.75 service fee{demo ? ' · Demo mode: no card is charged' : ''}</span>
      </form>
    </div>
  );
}
