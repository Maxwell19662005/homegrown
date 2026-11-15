import { notFound } from 'next/navigation';
import { Alert, SubPage } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { requireUser } from '@/lib/auth';
import { getListing } from '@/lib/data';
import { SUPPORT_EMAIL } from '@/lib/config';
import { reportListing } from '@/app/actions/orders';

export default async function ReportListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await requireUser(`/listings/${id}/report`);
  const l = getListing(id, user.neighborhood);
  if (!l) notFound();
  return (
    <SubPage back={`/listings/${id}`} title="Report this listing">
      <p className="text-[15px] text-muted">{l.title} from {l.seller_name}</p>
      <Alert error={error} />
      <form action={reportListing} className="flex flex-col gap-4">
        <input type="hidden" name="listing_id" value={l.id} />
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2">What’s wrong?</legend>
          <label className="card flex gap-3 p-3.5">
            <input type="radio" name="kind" value="food_safety" required className="mt-1 accent-[#C2410C]" />
            <span className="flex flex-col"><span className="font-semibold">Food safety concern</span><span className="text-sm text-muted">Unsafe or not allowed (e.g. needs refrigeration, missing allergens). The listing is paused while we check.</span></span>
          </label>
          <label className="card flex gap-3 p-3.5">
            <input type="radio" name="kind" value="other" className="mt-1 accent-[#1F6F43]" />
            <span className="flex flex-col"><span className="font-semibold">Something else</span><span className="text-sm text-muted">Misleading, resold store-bought goods, spam, or offensive.</span></span>
          </label>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="label">Details</span>
          <textarea name="details" rows={5} required minLength={10} className="textarea" placeholder="What did you notice?" />
        </label>
        <SubmitButton className="btn-primary" pendingText="Sending…">Send report</SubmitButton>
        {SUPPORT_EMAIL && <p className="text-center text-sm text-muted">Or email us at <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>}
      </form>
    </SubPage>
  );
}
