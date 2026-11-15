import { redirect } from 'next/navigation';
import { Alert, SubPage } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getSellerProfile } from '@/lib/data';
import { ALLERGENS, CATEGORIES, SELLER_TYPES } from '@/lib/config';
import { todayNY } from '@/lib/format';
import { ListingForm } from './ListingForm';

export const dynamic = 'force-dynamic';

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser('/sell/listings/new');
  const p = getSellerProfile(user.id);
  if (!p || p.status !== 'approved') redirect('/sell');
  const cats = SELLER_TYPES[p.type].categories.map((c) => ({ id: c, label: CATEGORIES[c].label }));
  const hourNY = Number(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })) % 24;
  const startH = Math.min(hourNY + 1, 20);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <SubPage back="/sell" title="Post what’s ready">
      <Alert error={error} />
      <ListingForm
        categories={cats}
        allergens={ALLERGENS}
        hasAddress={!!p.pickup_address}
        defaults={{ date: hourNY >= 20 ? todayNY(1) : todayNY(), start: `${pad(hourNY >= 20 ? 10 : startH)}:00`, end: `${pad(hourNY >= 20 ? 13 : Math.min(startH + 3, 23))}:00`, today: todayNY(), max: todayNY(14) }}
      />
    </SubPage>
  );
}
