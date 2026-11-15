import Link from 'next/link';
import { Alert, StatusPill, BackLink } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { requireAdmin } from '@/lib/auth';
import { allSellers, getRequirements, openReports, pendingSellers } from '@/lib/data';
import { REQUIREMENTS, SELLER_TYPES } from '@/lib/config';
import { shortDate } from '@/lib/format';
import { decideReport, decideSeller } from '../actions/admin';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const pending = pendingSellers();
  const reports = openReports();
  const sellers = allSellers();

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-5 pt-4 pb-16">
      <div className="flex items-center gap-3"><BackLink href="/profile" /><h1 className="font-display text-2xl font-bold">Admin</h1></div>
      <Alert error={sp.error} notice={sp.notice} />

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Open reports ({reports.length})</h2>
        {reports.length === 0 && <p className="text-sm text-muted">No open reports.</p>}
        {reports.map((r) => (
          <div key={r.id} className={`card flex flex-col gap-2 p-4 ${r.kind === 'food_safety' ? 'border-2 border-tomato' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{r.kind === 'food_safety' ? 'Food safety' : 'Other'} · {r.listing_title}</span>
              <span className="text-xs text-muted">{shortDate(r.created_at)}</span>
            </div>
            <span className="text-sm text-muted">Seller: {r.seller_name} ({r.upheld_count} upheld before) · Reporter: {r.reporter_email} · Listing: <StatusPill status={r.listing_status} /></span>
            <p className="whitespace-pre-line rounded-lg bg-ground p-3 text-sm">{r.details}</p>
            <p className="text-xs text-muted">Protocol: contact the buyer within 1 hour, the seller within 2 hours, decide within 48 hours. Notify NYC DOHMH for serious illness or repeat reports.</p>
            <div className="flex gap-2">
              <form action={decideReport}><input type="hidden" name="report_id" value={r.id} /><input type="hidden" name="decision" value="upheld" /><SubmitButton className="btn-danger min-h-10 text-sm">Uphold (keep paused)</SubmitButton></form>
              <form action={decideReport}><input type="hidden" name="report_id" value={r.id} /><input type="hidden" name="decision" value="dismissed" /><SubmitButton className="btn-outline min-h-10 text-sm">Dismiss &amp; restore</SubmitButton></form>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Kitchens to review ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted">Nothing waiting.</p>}
        {pending.map((p) => {
          const st = getRequirements(p.user_id);
          return (
            <div key={p.user_id} className="card flex flex-col gap-3 p-4">
              <div className="flex justify-between gap-2"><span className="font-bold">{p.display_name}</span><span className="text-sm text-muted">{SELLER_TYPES[p.type].title}</span></div>
              <span className="text-sm text-muted">{p.email} · {p.phone} · {p.neighborhood} · {p.pickup_address}</span>
              <ul className="flex flex-col gap-2">
                {REQUIREMENTS[p.type].map((r) => {
                  const s = st[r.key];
                  const files: string[] = s ? JSON.parse(s.files) : [];
                  return (
                    <li key={r.key} className="flex flex-col gap-1 rounded-lg bg-ground p-2.5 text-sm">
                      <span className="font-semibold">{s?.done ? '✓' : '✗'} {r.title}</span>
                      {s?.value && <span className="text-muted">{s.value}</span>}
                      {files.length > 0 && (
                        <span className="flex flex-wrap gap-2">
                          {files.map((f, i) => <a key={f} href={`/api/files/${f}`} target="_blank" className="font-semibold text-leaf underline">Open file {i + 1}</a>)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted">Check the registration against NY Agriculture &amp; Markets, and every photo against the Kitchen Standards Checklist (sink with hot water, fridge under 40°F, no pets, pests or mold, food away from chemicals).</p>
              <form action={decideSeller} className="flex flex-col gap-2">
                <input type="hidden" name="user_id" value={p.user_id} />
                <input name="note" placeholder="Note to seller (required to reject)" className="input" />
                <div className="flex gap-2">
                  <button name="decision" value="approved" className="btn-primary min-h-10 text-sm">Approve</button>
                  <button name="decision" value="rejected" className="btn-danger min-h-10 text-sm">Request changes</button>
                </div>
              </form>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">All sellers ({sellers.length})</h2>
        <div className="card divide-y divide-[#EEF2EC]">
          {sellers.map((s) => (
            <div key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="flex flex-col"><span className="font-semibold">{s.display_name}</span><span className="text-muted">{SELLER_TYPES[s.type].title} · {s.neighborhood} · {s.listing_count} listings · {s.email}</span></span>
              <span className="flex items-center gap-2">
                <StatusPill status={s.status} />
                {s.status === 'approved' && (
                  <form action={decideSeller} className="flex gap-1">
                    <input type="hidden" name="user_id" value={s.user_id} />
                    <input type="hidden" name="note" value="Paused by admin" />
                    <button name="decision" value="suspended" className="text-xs font-semibold text-tomato underline">Suspend</button>
                  </form>
                )}
                {s.status === 'suspended' && (
                  <form action={decideSeller}><input type="hidden" name="user_id" value={s.user_id} /><button name="decision" value="approved" className="text-xs font-semibold text-leaf underline">Reinstate</button></form>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
      <Link href="/" className="text-center text-sm text-muted underline">Back to the app</Link>
    </main>
  );
}
