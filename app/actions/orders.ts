'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { addReview, attachCheckoutSession, cancelOrder, createOrder, fileListingReport, fileReport, getOrder, getSellerProfile, markCheckoutExpired } from '@/lib/data';
import { createCheckoutSession, demoPayments } from '@/lib/payments';
import { guard, str } from '@/lib/actions-util';
import { db } from '@/lib/db';

export async function reserve(form: FormData) {
  const listingId = str(form, 'listing_id');
  const back = `/listings/${listingId}`;
  const user = await requireUser(back);
  const qty = Number(form.get('qty'));
  const order = await guard(back, () => createOrder(user.id, listingId, qty, demoPayments));
  if (demoPayments) redirect(`/orders/${order.id}?new=1`);

  let url: string;
  try {
    const listing = db().prepare('SELECT title, price_cents FROM listings WHERE id = ?').get(listingId) as { title: string; price_cents: number };
    const seller = getSellerProfile(order.seller_id);
    const session = await createCheckoutSession({
      orderId: order.id,
      title: listing.title,
      qty: order.qty,
      unitCents: listing.price_cents,
      feeCents: order.fee_cents,
      commissionCents: order.commission_cents,
      sellerAccount: seller?.stripe_account_id ?? null,
      buyerEmail: user.email,
    });
    attachCheckoutSession(order.id, session.id);
    url = session.url;
  } catch (e) {
    console.error('Checkout failed', e);
    markCheckoutExpired(order.id);
    redirect(`${back}?error=${encodeURIComponent('Payment couldn’t be started. Please try again.')}`);
  }
  redirect(url);
}

export async function buyerCancel(form: FormData) {
  const id = str(form, 'order_id');
  const user = await requireUser(`/orders/${id}`);
  const o = getOrder(id);
  if (!o || o.buyer_id !== user.id) redirect('/orders');
  await guard(`/orders/${id}`, () => cancelOrder(id, 'buyer', 'Cancelled by buyer'));
  revalidatePath('/orders');
  redirect(`/orders/${id}?notice=${encodeURIComponent(o.demo_payment ? 'Order cancelled.' : 'Order cancelled. Your refund is on its way.')}`);
}

export async function review(form: FormData) {
  const id = str(form, 'order_id');
  const user = await requireUser(`/orders/${id}`);
  await guard(`/orders/${id}`, () => addReview(id, user.id, Number(form.get('rating')), str(form, 'comment', 1000)));
  redirect(`/orders/${id}?notice=${encodeURIComponent('Thanks for your review!')}`);
}

export async function report(form: FormData) {
  const id = str(form, 'order_id');
  const user = await requireUser(`/orders/${id}`);
  const kind = form.get('kind') === 'food_safety' ? 'food_safety' : 'other';
  await guard(`/orders/${id}/report`, () => fileReport({ orderId: id, reporterId: user.id, kind, details: str(form, 'details', 3000) }));
  redirect(`/orders/${id}?notice=${encodeURIComponent('Thank you. Our team will contact you within 1 hour.' )}`);
}

export async function reportListing(form: FormData) {
  const id = str(form, 'listing_id');
  const user = await requireUser(`/listings/${id}/report`);
  const kind = form.get('kind') === 'food_safety' ? 'food_safety' : 'other';
  await guard(`/listings/${id}/report`, () => fileListingReport({ listingId: id, reporterId: user.id, kind, details: str(form, 'details', 3000) }));
  redirect(`/?notice=${encodeURIComponent('Thanks for the report. Our team will look into it.')}`);
}
