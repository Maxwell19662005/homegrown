import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getSellerProfile, refreshSellerStatus, saveRequirement } from '@/lib/data';
import { accountReady, appUrl } from '@/lib/payments';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login?next=/sell/setup`);
  const p = getSellerProfile(user.id);
  if (p?.stripe_account_id && (await accountReady(p.stripe_account_id))) {
    saveRequirement(user.id, 'payout', { done: true, value: 'stripe' });
    refreshSellerStatus(user.id);
    return NextResponse.redirect(`${appUrl()}/sell/setup?notice=${encodeURIComponent('Payouts connected.')}`);
  }
  return NextResponse.redirect(`${appUrl()}/sell/setup?error=${encodeURIComponent('Stripe still needs a few details. Tap “Connect your bank” to finish.')}`);
}
