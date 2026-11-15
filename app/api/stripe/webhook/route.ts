import type Stripe from 'stripe';
import { stripe } from '@/lib/payments';
import { getOrder, markCheckoutExpired, markOrderPaid } from '@/lib/data';
import { refundPayment } from '@/lib/payments';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response('Stripe not configured', { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object as Stripe.Checkout.Session;
    const orderId = s.metadata?.order_id;
    if (orderId && s.payment_status === 'paid') {
      const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null;
      markOrderPaid(orderId, pi);
      const o = getOrder(orderId);
      // Paid too late and the item sold out in the meantime: refund automatically.
      if (o?.status === 'cancelled' && pi) {
        const seller = db().prepare('SELECT stripe_account_id FROM seller_profiles WHERE user_id = ?').get(o.seller_id) as { stripe_account_id: string | null };
        await refundPayment(pi, !!seller?.stripe_account_id);
      }
    }
  } else if (event.type === 'checkout.session.expired') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.metadata?.order_id) markCheckoutExpired(s.metadata.order_id);
  }
  return Response.json({ received: true });
}
