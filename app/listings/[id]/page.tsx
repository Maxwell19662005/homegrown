import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Tile } from '@/components/Tile';
import { I, Icon } from '@/components/Icons';
import { Alert } from '@/components/ui';
import { Badges, distanceText } from '@/components/ListingCard';
import { CATEGORIES } from '@/lib/config';
import { getListing, getSellerProfile, isListingAvailable, sellerCanBePaid } from '@/lib/data';
import { money, pickupWindow } from '@/lib/format';
import { demoPayments } from '@/lib/payments';
import { viewerNeighborhood } from '@/lib/viewer';
import { ReserveBar } from './ReserveBar';

export const dynamic = 'force-dynamic';

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { user, hood } = await viewerNeighborhood();
  const l = getListing(id, hood.name);
  if (!l) notFound();
  const seller = getSellerProfile(l.seller_id);
  const available = isListingAvailable(l, seller?.status) && sellerCanBePaid(l.seller_id);
  const isOwn = user?.id === l.seller_id;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-32">
      <div className="relative">
        <Tile category={l.category} photo={l.photo} className="h-[280px] w-full" iconSize={110} alt={l.title} />
        <Link href="/" aria-label="Back" className="absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
          <Icon d={I.back} />
        </Link>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <Alert error={error} />
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">{CATEGORIES[l.category].label}</span>
          <h1 className="font-display text-[28px] font-bold leading-tight">{l.title}</h1>
          <span className="text-[17px] font-bold">
            {money(l.price_cents)} {l.unit && <span className="text-sm font-medium text-muted">{l.unit}</span>}
          </span>
        </div>
        <div className="card flex items-center gap-3 p-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold" style={{ background: CATEGORIES[l.category].bg, color: CATEGORIES[l.category].ink }}>
            {l.seller_initial}
          </span>
          <div className="flex flex-1 flex-col">
            <span className="text-[15px] font-bold">{l.seller_name}</span>
            <span className="text-[13px] text-muted">{l.review_count ? `★ ${Number(l.rating).toFixed(1)} · ${l.review_count} review${l.review_count === 1 ? '' : 's'}` : 'New seller'}</span>
          </div>
          <div className="flex flex-col items-end gap-1"><Badges l={l} /></div>
        </div>
        {seller?.bio && <p className="text-sm italic text-muted">“{seller.bio}”</p>}
        {l.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#2E3B32]">{l.description}</p>}
        <div className="card flex flex-col divide-y divide-[#EEF2EC]">
          <Row icon={I.clock} title="Pickup window" sub={pickupWindow(l.pickup_start, l.pickup_end)} />
          <Row icon={I.pin} title={`${l.neighborhood} · ${distanceText(l.distance)}`} sub={l.pickup_spot === 'public' ? `Public pickup spot — exact location after you reserve` : 'Exact address shared after you reserve'} />
          <Row icon={I.box} title={`${l.quantity_left} available`} sub="Reserve now, pay in the app" />
        </div>
        {l.category === 'baked' && (
          <div className="flex flex-col gap-1 rounded-2xl border border-[#F3D3A6] bg-[#FFF4E5] p-3.5">
            <span className="text-sm font-bold text-[#7A4E0E]">{l.allergens === 'none' ? 'No major allergens declared' : `Contains: ${l.allergens}`}</span>
            <span className="text-[13px] leading-snug text-[#5C4310]">Made in a home kitchen registered with NY Agriculture &amp; Markets. Not inspected by the NYC Health Department.</span>
          </div>
        )}
      </div>
      {isOwn ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white p-4"><div className="mx-auto max-w-md"><Link href="/sell" className="btn-outline w-full">This is your listing — manage it</Link></div></div>
      ) : available ? (
        <ReserveBar listingId={l.id} priceCents={l.price_cents} max={l.quantity_left} loggedIn={!!user} demo={demoPayments} />
      ) : (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white p-4"><div className="mx-auto max-w-md text-center font-semibold text-muted">No longer available</div></div>
      )}
    </main>
  );
}

function Row({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex gap-3 p-3.5">
      <Icon d={icon} className="mt-0.5 shrink-0 text-leaf" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm text-muted">{sub}</span>
      </div>
    </div>
  );
}
