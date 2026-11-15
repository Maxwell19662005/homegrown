import Link from 'next/link';
import { TabPage } from '@/components/BottomNav';
import { Alert, StatusPill } from '@/components/ui';
import { Tile } from '@/components/Tile';
import { SubmitButton } from '@/components/SubmitButton';
import { NeighborhoodSelect } from '@/components/NeighborhoodSelect';
import { CATEGORY_PATHS, I, Icon } from '@/components/Icons';
import { requireUser } from '@/lib/auth';
import { getSellerProfile, sellerListings, sellerOrders, sellerStats } from '@/lib/data';
import { CATEGORIES, SELLER_COMMISSION, SELLER_TYPES, SellerType } from '@/lib/config';
import { money, money2, pickupWindow } from '@/lib/format';
import { changeListing, confirmPickup, sellerCancel, startSelling } from '../actions/seller';

export const dynamic = 'force-dynamic';

const TYPE_ICON: Record<SellerType, keyof typeof CATEGORY_PATHS> = { grower: 'produce', baker: 'baked', farm: 'farm', plants: 'plants' };

export default async function SellPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser('/sell');
  const p = getSellerProfile(user.id);

  if (!p) {
    return (
      <TabPage>
        <form action={startSelling} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="h1">What do you want to sell?</h1>
            <p className="text-[15px] text-muted">Free to join. We take {SELLER_COMMISSION * 100}% only when something sells.</p>
          </div>
          <Alert error={sp.error} />
          <fieldset className="flex flex-col gap-2.5">
            <legend className="sr-only">Seller type</legend>
            {(Object.keys(SELLER_TYPES) as SellerType[]).map((t, i) => {
              const c = CATEGORIES[TYPE_ICON[t]];
              return (
                <label key={t} className="card flex cursor-pointer items-center gap-3.5 border-2 p-3.5 has-[:checked]:border-leaf">
                  <input type="radio" name="type" value={t} defaultChecked={i === 0} className="sr-only" />
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px]" style={{ background: c.bg, color: c.ink }}><Icon d={CATEGORY_PATHS[TYPE_ICON[t]]} size={28} stroke={1.7} /></span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-bold">{SELLER_TYPES[t].title}</span>
                    <span className="text-[13px] leading-snug text-muted">{SELLER_TYPES[t].sub}</span>
                    <span className="text-xs font-semibold text-leaf-dark">{SELLER_TYPES[t].setup}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <p className="text-[13px] text-muted">Cooked meals aren’t available in NYC yet while we work through the permit rules.</p>
          <label className="flex flex-col gap-1.5"><span className="label">Shop name</span><input name="display_name" required maxLength={60} placeholder="e.g. Rosa’s Backyard" className="input" /></label>
          <label className="flex flex-col gap-1.5"><span className="label">Neighborhood</span><NeighborhoodSelect defaultValue={user.neighborhood} /></label>
          <SubmitButton pendingText="Setting up…">Continue</SubmitButton>
        </form>
      </TabPage>
    );
  }

  if (p.status !== 'approved') {
    const msg: Record<string, [string, string]> = {
      setup: ['Finish setting up', 'A few quick steps and you can start posting.'],
      rejected: ['A few changes needed', p.review_note || 'Our reviewer needs a couple of updates before you can go live.'],
      pending: ['Your kitchen is in review', 'We usually review within 48 hours. We’ll email you when you’re approved.'],
      suspended: ['Your shop is paused', p.review_note || 'Contact support to talk about next steps.'],
    };
    const [title, sub] = msg[p.status];
    return (
      <TabPage>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between"><span className="eyebrow">{p.display_name}</span><StatusPill status={p.status} /></div>
          <h1 className="h1">{title}</h1>
          <Alert error={sp.error} notice={sp.notice} />
          <p className="text-[15px] text-muted">{sub}</p>
          {p.status !== 'suspended' && <Link href="/sell/setup" className="btn-primary">{p.status === 'pending' ? 'View your submission' : 'Continue setup'}</Link>}
        </div>
      </TabPage>
    );
  }

  const listings = sellerListings(user.id);
  const orders = sellerOrders(user.id);
  const toFulfill = orders.filter((o) => o.status === 'reserved');
  const stats = sellerStats(user.id);
  const now = new Date().toISOString();

  return (
    <TabPage>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col"><span className="eyebrow">Your shop</span><h1 className="font-display text-[26px] font-bold">{p.display_name}</h1></div>
          <Link href="/sell/setup" className="btn-outline min-h-10 px-3 text-sm">Settings</Link>
        </div>
        <Alert error={sp.error} notice={sp.notice} />
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Upcoming" value={String(stats.upcoming)} />
          <Stat label="Completed" value={String(stats.completed)} />
          <Stat label="Earned" value={money(stats.earned_cents)} />
        </div>
        <Link href="/sell/listings/new" className="btn-primary text-base"><Icon d="M12 5v14M5 12h14" /> Post what’s ready</Link>

        <section className="flex flex-col gap-2.5">
          <h2 className="eyebrow">Pickups to hand over ({toFulfill.length})</h2>
          {toFulfill.length === 0 && <p className="card border-dashed p-4 text-sm text-muted">No reservations waiting. We’ll show them here as they come in.</p>}
          {toFulfill.map((o) => (
            <div key={o.id} className="card flex flex-col gap-3 p-4">
              <div className="flex justify-between gap-2"><span className="font-bold">{o.qty} × {o.title}</span><span className="font-semibold">{money2(o.item_cents - o.commission_cents)}</span></div>
              <span className="text-sm text-muted">For {o.buyer_name} · {pickupWindow(o.pickup_start, o.pickup_end)}</span>
              <form action={confirmPickup} className="flex gap-2">
                <input type="hidden" name="order_id" value={o.id} />
                <input name="code" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required placeholder="Buyer’s 4-digit code" aria-label="Pickup code" className="input flex-1" />
                <SubmitButton className="btn-primary">Confirm</SubmitButton>
              </form>
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-tomato">Can’t make it? Cancel this order</summary>
                <form action={sellerCancel} className="mt-2 flex gap-2">
                  <input type="hidden" name="order_id" value={o.id} />
                  <input name="reason" placeholder="Reason (shown to buyer)" className="input flex-1" />
                  <SubmitButton className="btn-danger">Cancel</SubmitButton>
                </form>
              </details>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="eyebrow">Your listings</h2>
          {listings.length === 0 && <p className="card border-dashed p-4 text-sm text-muted">You haven’t posted anything yet.</p>}
          {listings.map((l) => {
            const past = l.pickup_end < now;
            const status = past && l.status === 'active' ? 'closed' : l.status;
            return (
              <div key={l.id} className="card flex gap-3 p-3">
                <Tile category={l.category} photo={l.photo} className="h-16 w-16 shrink-0 rounded-xl" iconSize={28} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex justify-between gap-2"><Link href={`/listings/${l.id}`} className="font-bold leading-tight hover:underline">{l.title}</Link><StatusPill status={status} /></div>
                  <span className="text-[13px] text-muted">{money(l.price_cents)} · {l.quantity - l.quantity_left} of {l.quantity} reserved · {pickupWindow(l.pickup_start, l.pickup_end)}</span>
                  {!past && l.status !== 'suspended' && (
                    <form action={changeListing}>
                      <input type="hidden" name="listing_id" value={l.id} />
                      <input type="hidden" name="status" value={l.status === 'active' ? 'closed' : 'active'} />
                      <button className="text-[13px] font-semibold text-leaf underline">{l.status === 'active' ? 'Close listing' : 'Reopen listing'}</button>
                    </form>
                  )}
                  {l.status === 'suspended' && <span className="text-[13px] text-tomato">Paused while we review a report.</span>}
                </div>
              </div>
            );
          })}
        </section>
        <p className="flex items-center gap-2 text-[13px] text-muted"><Icon d={I.shield} size={16} /> You keep {100 - SELLER_COMMISSION * 100}% of every sale. Payouts go to your bank automatically.</p>
      </div>
    </TabPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-col gap-0.5 p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}
