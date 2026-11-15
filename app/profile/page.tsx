import Link from 'next/link';
import { TabPage } from '@/components/BottomNav';
import { Alert, StatusPill } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { NeighborhoodSelect } from '@/components/NeighborhoodSelect';
import { requireUser } from '@/lib/auth';
import { getSellerProfile } from '@/lib/data';
import { logout, updateProfile } from '../actions/auth';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser('/profile');
  const seller = getSellerProfile(user.id);
  return (
    <TabPage>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-leaf-soft text-xl font-bold text-leaf">{user.name.charAt(0).toUpperCase()}</span>
          <div className="flex flex-col">
            <span className="text-lg font-bold">{user.name}</span>
            <span className="text-sm text-muted">{user.email}</span>
          </div>
        </div>
        <Alert error={sp.error} notice={sp.notice} />
        {seller ? (
          <Link href="/sell" className="card flex items-center justify-between gap-3 p-4">
            <span className="flex flex-col"><span className="font-bold">Your shop: {seller.display_name}</span><span className="text-sm text-muted">Listings, orders and payouts</span></span>
            <StatusPill status={seller.status} />
          </Link>
        ) : (
          <Link href="/sell" className="flex flex-col gap-2 rounded-[20px] bg-leaf p-5 text-white">
            <span className="font-display text-[22px] font-bold leading-tight">Got a garden, a farm, or a kitchen?</span>
            <span className="text-sm leading-snug text-leaf-soft">Sell your extra tomatoes, seedlings or sourdough to neighbors. Free to join.</span>
            <span className="mt-1.5 self-start rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-leaf-dark">Start selling →</span>
          </Link>
        )}
        {user.role === 'admin' && <Link href="/admin" className="btn-dark">Admin dashboard</Link>}
        <form action={updateProfile} className="card flex flex-col gap-4 p-4">
          <h2 className="font-bold">Your details</h2>
          <label className="flex flex-col gap-1.5"><span className="label">First name</span><input name="name" defaultValue={user.name} required className="input" /></label>
          <label className="flex flex-col gap-1.5"><span className="label">Neighborhood</span><NeighborhoodSelect defaultValue={user.neighborhood} /></label>
          <SubmitButton className="btn-outline">Save</SubmitButton>
        </form>
        <div className="flex justify-center gap-4 text-sm text-muted">
          <Link href="/legal/safety" className="underline">Food safety</Link>
          <Link href="/legal/terms" className="underline">Terms</Link>
          <Link href="/legal/privacy" className="underline">Privacy</Link>
        </div>
        <form action={logout}><button className="btn-outline w-full">Log out</button></form>
      </div>
    </TabPage>
  );
}
