import Link from 'next/link';
import type { ListingView } from '@/lib/data';
import { money } from '@/lib/format';
import { pickupWindow } from '@/lib/format';
import { Tile } from './Tile';

export function distanceText(mi: number) {
  return mi < 0.1 ? 'nearby' : `${mi.toFixed(1)} mi`;
}

export function Badges({ l }: { l: Pick<ListingView, 'seller_type' | 'category'> }) {
  return (
    <>
      {l.seller_type === 'baker' && <span className="pill bg-leaf-soft text-leaf-dark">Verified kitchen</span>}
      {l.seller_type === 'farm' && <span className="pill bg-[#E2ECF5] text-[#1E5A8A]">Local farm</span>}
    </>
  );
}

export function ListingCard({ l }: { l: ListingView }) {
  return (
    <Link href={`/listings/${l.id}`} className="card flex gap-3.5 p-3 transition-colors hover:border-line2">
      <Tile category={l.category} photo={l.photo} className="h-[84px] w-[84px] shrink-0 rounded-xl" alt={l.title} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex justify-between gap-2">
          <span className="text-[15px] font-bold leading-tight">{l.title}</span>
          <span className="text-[15px] font-bold">{money(l.price_cents)}</span>
        </div>
        <span className="text-[13px] text-muted">
          {l.seller_name} · {distanceText(l.distance)}
        </span>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          <span className="pill bg-[#EEF2EC] text-[#2E3B32]">{pickupWindow(l.pickup_start, l.pickup_end)}</span>
          <span className="pill bg-tomato-soft text-tomato-ink">{l.quantity_left} left</span>
          <Badges l={l} />
        </div>
      </div>
    </Link>
  );
}
