import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Alert, BackLink, StatusPill } from '@/components/ui';
import { I, Icon } from '@/components/Icons';
import { SubmitButton } from '@/components/SubmitButton';
import { requireUser } from '@/lib/auth';
import { canBuyerCancel, getOrder, markOrderPaid } from '@/lib/data';
import { money2, pickupWindow } from '@/lib/format';
import { stripe } from '@/lib/payments';
import { CANCEL_CUTOFF_HOURS } from '@/lib/config';
import { buyerCancel, review } from '@/app/actions/orders';
import { StarInput } from './StarInput';

export const dynamic = 'force-dynamic';

type SP = { new?: string; paid?: string; session_id?: string; cancelled?: string; error?: string; notice?: string };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/orders/${id}`);
  let o = getOrder(id);
  if (!o || o.buyer_id !== user.id) notFound();

  // Returning from Stripe Checkout: confirm the payment directly instead of waiting for the webhook.
  if (sp.paid && sp.session_id && stripe && o.status !== 'reserved' && o.stripe_session_id === sp.session_id) {
    const s = await stripe.checkout.sessions.retrieve(sp.session_id);
    if (s.payment_status === 'paid') {
      markOrderPaid(o.id, typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null);
      redirect(`/orders/${id}?new=1`);
    }
    o = getOrder(id)!;
  }

  const fresh = !!sp.new && o.status === 'reserved';
  const showAddress = o.status === 'reserved' || o.status === 'picked_up';
  const where = o.pickup_spot === 'public' ? o.pickup_details : [o.pickup_address, o.pickup_details].filter(Boolean).join(' — ');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-4 pb-12">
      <div className="flex items-center justify-between">
        <BackLink href="/orders" />
        <StatusPill status={o.status} />
      </div>
      <Alert error={sp.error} notice={sp.notice} />
      {sp.cancelled && o.status === 'pending_payment' && <Alert error="Payment wasn’t completed. Your items are held for a few minutes — reserve again from the listing to retry." />}
      {fresh ? (
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-leaf text-white"><Icon d={I.check} size={36} stroke={2.4} /></div>
          <h1 className="font-display text-[30px] font-bold">You’re all set</h1>
          <span className="text-[15px] text-muted">{o.qty} × {o.title} from {o.seller_name}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] font-bold leading-tight">{o.qty} × {o.title}</h1>
          <span className="text-[15px] text-muted">from {o.seller_name}</span>
        </div>
      )}

      {o.status === 'reserved' && (
        <div className="card flex flex-col gap-3.5 rounded-[20px] p-5">
          <div className="flex flex-col items-center gap-1 border-b border-dashed border-line2 pb-3.5">
            <span className="eyebrow">Pickup code</span>
            <span className="font-display text-[44px] font-bold tracking-[0.12em] text-leaf">{o.pickup_code}</span>
            <span className="text-[13px] text-muted">Show this to the seller</span>
          </div>
          <Info label="When" value={pickupWindow(o.pickup_start, o.pickup_end)} />
          <Info label="Where" value={where || `${o.listing_neighborhood} — the seller will message you the spot`} />
          {o.seller_phone && <Info label="Seller’s phone" value={o.seller_phone} />}
        </div>
      )}
      {o.status === 'reserved' && showAddress && where && (
        <a className="btn-outline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where + ', New York, NY')}`}>
          Get directions
        </a>
      )}

      <div className="card flex flex-col gap-2 p-4 text-[15px]">
        <div className="flex justify-between"><span>Items</span><span>{money2(o.item_cents)}</span></div>
        <div className="flex justify-between text-muted"><span>Service fee</span><span>{money2(o.fee_cents)}</span></div>
        <div className="my-1 h-px bg-[#EEF2EC]" />
        <div className="flex justify-between font-bold"><span>Total</span><span>{money2(o.total_cents)}</span></div>
        {o.demo_payment === 1 && <span className="text-xs text-muted">Demo mode — no card was charged.</span>}
      </div>

      {o.status === 'cancelled' && <p className="text-sm text-muted">This order was cancelled{o.demo_payment ? '.' : ' and refunded to your card.'}</p>}

      {o.status === 'picked_up' && (
        <form action={review} className="card flex flex-col gap-3 p-4">
          <input type="hidden" name="order_id" value={o.id} />
          <span className="font-bold">{o.rating ? 'Your review' : `How was it?`}</span>
          <StarInput initial={o.rating ?? 0} />
          <textarea name="comment" rows={3} placeholder="Tell neighbors what you thought (optional)" className="textarea" />
          <SubmitButton className="btn-primary">{o.rating ? 'Update review' : 'Post review'}</SubmitButton>
        </form>
      )}

      {o.status === 'reserved' &&
        (canBuyerCancel(o) ? (
          <form action={buyerCancel}>
            <input type="hidden" name="order_id" value={o.id} />
            <SubmitButton className="btn-danger w-full" pendingText="Cancelling…">Cancel order</SubmitButton>
          </form>
        ) : (
          <p className="text-center text-[13px] text-muted">Within {CANCEL_CUTOFF_HOURS} hours of pickup, orders can’t be cancelled in the app. Contact the seller if plans change.</p>
        ))}

      {(o.status === 'reserved' || o.status === 'picked_up') && (
        <Link href={`/orders/${o.id}/report`} className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-tomato underline">
          <Icon d={I.flag} size={16} /> Report a problem or food safety issue
        </Link>
      )}
      {fresh && <Link href="/orders" className="btn-dark">Done</Link>}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-sm text-[#2E3B32]">{value}</span>
    </div>
  );
}
