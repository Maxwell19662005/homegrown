import 'server-only';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = key ? new Stripe(key) : null;
export const demoPayments = !stripe;

export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export async function createCheckoutSession(args: {
  orderId: string;
  title: string;
  qty: number;
  unitCents: number;
  feeCents: number;
  commissionCents: number;
  sellerAccount: string | null;
  buyerEmail: string;
}): Promise<{ id: string; url: string }> {
  if (!stripe) throw new Error('Stripe is not configured');
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: args.buyerEmail,
    client_reference_id: args.orderId,
    metadata: { order_id: args.orderId },
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    line_items: [
      { quantity: args.qty, price_data: { currency: 'usd', unit_amount: args.unitCents, product_data: { name: args.title } } },
      { quantity: 1, price_data: { currency: 'usd', unit_amount: args.feeCents, product_data: { name: 'Service fee' } } },
    ],
    payment_intent_data: args.sellerAccount
      ? { application_fee_amount: args.feeCents + args.commissionCents, transfer_data: { destination: args.sellerAccount }, metadata: { order_id: args.orderId } }
      : { metadata: { order_id: args.orderId } },
    success_url: `${appUrl()}/orders/${args.orderId}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/orders/${args.orderId}?cancelled=1`,
  });
  return { id: session.id, url: session.url! };
}

export async function refundPayment(paymentIntent: string, hasTransfer: boolean) {
  if (!stripe) return;
  await stripe.refunds.create({
    payment_intent: paymentIntent,
    ...(hasTransfer ? { reverse_transfer: true, refund_application_fee: true } : {}),
  });
}

export async function createConnectOnboardingLink(existingAccount: string | null, email: string): Promise<{ account: string; url: string }> {
  if (!stripe) throw new Error('Stripe is not configured');
  const account =
    existingAccount ??
    (
      await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: 'individual',
      })
    ).id;
  const link = await stripe.accountLinks.create({
    account,
    type: 'account_onboarding',
    refresh_url: `${appUrl()}/api/stripe/connect`,
    return_url: `${appUrl()}/api/stripe/connect/return`,
  });
  return { account, url: link.url };
}

export async function accountReady(account: string): Promise<boolean> {
  if (!stripe) return false;
  const a = await stripe.accounts.retrieve(account);
  // Destination charges only need the transfers capability; payouts can finish verifying later.
  return a.capabilities?.transfers === 'active';
}
