import Link from 'next/link';
import { TabPage } from '@/components/BottomNav';
import { Tile } from '@/components/Tile';
import { StatusPill } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { buyerOrders, OrderView } from '@/lib/data';
import { money2, pickupWindow, shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const user = await requireUser('/orders');
  const orders = buyerOrders(user.id);
  const upcoming = orders.filter((o) => o.status === 'reserved' || o.status === 'pending_payment');
  const past = orders.filter((o) => !upcoming.includes(o));
  return (
    <TabPage>
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-[28px] font-bold">Your orders</h1>
        {upcoming.length > 0 ? (
          <Section title="Upcoming">{upcoming.map((o) => <OrderRow key={o.id} o={o} />)}</Section>
        ) : (
          <div className="card flex flex-col items-start gap-2 border-dashed p-5">
            <span className="font-bold">Nothing reserved yet</span>
            <span className="text-sm text-muted">Find something fresh nearby and reserve it before it sells out.</span>
            <Link href="/" className="btn-primary mt-1">Browse what’s fresh</Link>
          </div>
        )}
        {past.length > 0 && <Section title="Past">{past.map((o) => <OrderRow key={o.id} o={o} />)}</Section>}
      </div>
    </TabPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}

function OrderRow({ o }: { o: OrderView }) {
  const highlight = o.status === 'reserved';
  return (
    <Link href={`/orders/${o.id}`} className={`card flex gap-3 p-3 ${highlight ? 'border-2 border-leaf' : ''}`}>
      <Tile category={o.category} photo={o.photo} className="h-16 w-16 shrink-0 rounded-xl" iconSize={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex justify-between gap-2">
          <span className="text-[15px] font-bold leading-tight">{o.qty} × {o.title}</span>
          <StatusPill status={o.status} />
        </div>
        <span className="text-[13px] text-muted">{o.seller_name} · {o.status === 'picked_up' && o.picked_up_at ? `Picked up ${shortDate(o.picked_up_at)}` : pickupWindow(o.pickup_start, o.pickup_end)}</span>
        <span className="text-[13px] text-muted">{money2(o.total_cents)}{o.status === 'picked_up' && !o.rating ? ' · Leave a review' : ''}</span>
      </div>
    </Link>
  );
}
