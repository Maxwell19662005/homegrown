import { notFound } from 'next/navigation';
import { Alert, SubPage } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { requireUser } from '@/lib/auth';
import { getOrder } from '@/lib/data';
import { report } from '@/app/actions/orders';

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await requireUser(`/orders/${id}/report`);
  const o = getOrder(id);
  if (!o || o.buyer_id !== user.id) notFound();
  return (
    <SubPage back={`/orders/${id}`} title="Report a problem">
      <p className="text-[15px] text-muted">About: {o.qty} × {o.title} from {o.seller_name}</p>
      <Alert error={error} />
      <form action={report} className="flex flex-col gap-4">
        <input type="hidden" name="order_id" value={o.id} />
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2">What happened?</legend>
          <label className="card flex gap-3 p-3.5">
            <input type="radio" name="kind" value="food_safety" required className="mt-1 accent-[#C2410C]" />
            <span className="flex flex-col"><span className="font-semibold">Food safety issue</span><span className="text-sm text-muted">Illness, contamination, foreign object, or missing allergen info. The listing is paused right away while we investigate.</span></span>
          </label>
          <label className="card flex gap-3 p-3.5">
            <input type="radio" name="kind" value="other" className="mt-1 accent-[#1F6F43]" />
            <span className="flex flex-col"><span className="font-semibold">Something else</span><span className="text-sm text-muted">No-show, wrong item, or a problem with the seller.</span></span>
          </label>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="label">Details</span>
          <textarea name="details" rows={5} required minLength={10} className="textarea" placeholder="What happened, and when?" />
        </label>
        <p className="rounded-xl bg-tomato-soft p-3 text-sm text-tomato-ink">If someone is seriously ill, get medical help first. In an emergency call 911.</p>
        <SubmitButton className="btn-primary" pendingText="Sending…">Send report</SubmitButton>
      </form>
    </SubPage>
  );
}
