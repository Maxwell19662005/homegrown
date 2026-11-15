import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getSellerProfile, setStripeAccount } from '@/lib/data';
import { appUrl, createConnectOnboardingLink, demoPayments } from '@/lib/payments';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login?next=/sell/setup`);
  const p = getSellerProfile(user.id);
  if (!p || demoPayments) return NextResponse.redirect(`${appUrl()}/sell/setup`);
  const { account, url } = await createConnectOnboardingLink(p.stripe_account_id, user.email);
  if (account !== p.stripe_account_id) setStripeAccount(user.id, account);
  return NextResponse.redirect(url);
}
