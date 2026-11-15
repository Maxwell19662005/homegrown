import { TabPage } from '@/components/BottomNav';
import { getFeed } from '@/lib/data';
import { CATEGORIES } from '@/lib/config';
import { money } from '@/lib/format';
import { viewerNeighborhood } from '@/lib/viewer';
import MapView from './MapView';

export const dynamic = 'force-dynamic';

export default async function MapPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const { hood } = await viewerNeighborhood(n);
  const pins = getFeed({ neighborhood: hood.name }).map((l) => ({
    id: l.id,
    title: l.title,
    price: money(l.price_cents),
    lat: l.lat,
    lng: l.lng,
    bg: CATEGORIES[l.category].bg,
    ink: CATEGORIES[l.category].ink,
    category: l.category,
  }));
  return (
    <TabPage>
      <div className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-[28px] font-bold tracking-tight">On the map</h1>
          <span className="text-[13px] text-muted">{pins.length} near {hood.name}</span>
        </div>
        <MapView center={[hood.lat, hood.lng]} pins={pins} />
        <p className="text-[13px] text-muted">Pins show the general area. You get the exact pickup spot once you reserve.</p>
      </div>
    </TabPage>
  );
}
