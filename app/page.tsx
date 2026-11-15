import Link from 'next/link';
import { TabPage } from '@/components/BottomNav';
import { ListingCard } from '@/components/ListingCard';
import { I, Icon } from '@/components/Icons';
import { CATEGORIES } from '@/lib/config';
import { getFeed } from '@/lib/data';
import { NEIGHBORHOODS } from '@/lib/neighborhoods';
import { viewerNeighborhood } from '@/lib/viewer';
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect';

export const dynamic = 'force-dynamic';

type SP = { cat?: string; q?: string; n?: string };

export default async function Discover({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { hood } = await viewerNeighborhood(sp.n);
  const cat = sp.cat && sp.cat in CATEGORIES ? sp.cat : 'all';
  const q = (sp.q ?? '').slice(0, 80);
  const list = getFeed({ neighborhood: hood.name, category: cat, q });
  const href = (c: string) => {
    const p = new URLSearchParams();
    if (c !== 'all') p.set('cat', c);
    if (q) p.set('q', q);
    if (sp.n) p.set('n', sp.n);
    const s = p.toString();
    return s ? `/?${s}` : '/';
  };
  const chips = [['all', 'All'], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])];

  return (
    <TabPage>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <form method="get" className="flex min-w-0 flex-col gap-0.5">
            <label htmlFor="n" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Pickup near</label>
            {cat !== 'all' && <input type="hidden" name="cat" value={cat} />}
            <AutoSubmitSelect id="n" name="n" defaultValue={hood.name} className="-ml-1 max-w-full cursor-pointer truncate rounded-md bg-transparent py-0.5 pr-1 text-base font-bold outline-none focus:ring-2 focus:ring-leaf/30">
              {NEIGHBORHOODS.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}, {n.borough}
                </option>
              ))}
            </AutoSubmitSelect>
            <noscript><button className="text-sm underline">Go</button></noscript>
          </form>
          <span className="shrink-0 pl-3 font-display text-xl font-bold text-leaf">homegrown</span>
        </div>
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-tight">Fresh near you</h1>
        <form method="get" role="search">
          {cat !== 'all' && <input type="hidden" name="cat" value={cat} />}
          {sp.n && <input type="hidden" name="n" value={sp.n} />}
          <label className="flex h-12 items-center gap-2.5 rounded-[14px] border border-line bg-white px-3.5 focus-within:border-leaf">
            <Icon d={I.search} size={18} className="text-muted" />
            <input name="q" defaultValue={q} aria-label="Search" placeholder="Tomatoes, sourdough, seedlings…" className="flex-1 bg-transparent text-[15px] outline-none" />
          </label>
        </form>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {chips.map(([k, label]) => (
            <Link key={k} href={href(k)} className={k === cat ? 'chip-on' : 'chip-off'}>
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">Ready for pickup</h2>
          <span className="text-[13px] text-muted">{list.length} {list.length === 1 ? 'listing' : 'listings'}</span>
        </div>
        {list.length ? (
          <div className="flex flex-col gap-2.5">
            {list.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-start gap-2 border-dashed p-5">
            <span className="font-bold">Nothing here right now</span>
            <span className="text-sm text-muted">
              {q || cat !== 'all' ? 'Try a different search or category.' : `No one near ${hood.name} has posted yet today. Check back later — or be the first.`}
            </span>
            <Link href="/sell" className="btn-primary mt-1">Start selling</Link>
          </div>
        )}
      </div>
    </TabPage>
  );
}
