import { redirect } from 'next/navigation';
import { Alert, StatusPill, SubPage } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { NeighborhoodSelect } from '@/components/NeighborhoodSelect';
import { I, Icon } from '@/components/Icons';
import { requireUser } from '@/lib/auth';
import { getRequirements, getSellerProfile, isRequirementDone, RequirementState } from '@/lib/data';
import { Requirement, REQUIREMENTS, SELLER_TYPES } from '@/lib/config';
import { demoPayments } from '@/lib/payments';
import { completeRequirement, saveDetails } from '@/app/actions/seller';

export const dynamic = 'force-dynamic';

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser('/sell/setup');
  const p = getSellerProfile(user.id);
  if (!p) redirect('/sell');
  const reqs = REQUIREMENTS[p.type];
  const state = getRequirements(user.id);
  const doneCount = reqs.filter((r) => isRequirementDone(r.key, state[r.key])).length + (p.pickup_address ? 1 : 0);
  const total = reqs.length + 1;
  const locked = p.status === 'pending' || p.status === 'suspended';
  const isBaker = p.type === 'baker';

  return (
    <SubPage back="/sell" title={isBaker ? 'Verify your kitchen' : 'Shop setup'}>
      <div className="flex items-center justify-between rounded-[14px] bg-leaf-soft px-3.5 py-3">
        <span className="text-sm font-bold text-leaf-dark">{doneCount} of {total} done</span>
        <StatusPill status={p.status} />
      </div>
      <Alert error={sp.error} notice={sp.notice} />
      {p.status === 'rejected' && p.review_note && <Alert error={`Reviewer note: ${p.review_note}`} />}
      {isBaker && (
        <p className="text-sm leading-relaxed text-muted">
          NY lets you sell certain shelf-stable baked goods from a registered home kitchen. A reviewer checks everything within 48 hours. Once approved, your listings show a <b className="text-ink">Verified kitchen</b> badge.
        </p>
      )}
      {locked && <Alert notice={p.status === 'pending' ? 'Submitted! We’re reviewing your kitchen now.' : undefined} error={p.status === 'suspended' ? 'Your shop is paused.' : undefined} />}

      <form action={saveDetails} className="card flex flex-col gap-3.5 p-4">
        <h2 className="flex items-center gap-2 font-bold"><Done on={!!p.pickup_address} /> Shop details</h2>
        <label className="flex flex-col gap-1.5"><span className="label">Shop name</span><input name="display_name" defaultValue={p.display_name} maxLength={60} className="input" /></label>
        <label className="flex flex-col gap-1.5"><span className="label">Short bio (optional)</span><input name="bio" defaultValue={p.bio} maxLength={300} placeholder="e.g. Growing heirloom tomatoes in Ridgewood since 2015" className="input" /></label>
        <label className="flex flex-col gap-1.5"><span className="label">Neighborhood</span><NeighborhoodSelect defaultValue={p.neighborhood} /></label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Pickup address</span>
          <input name="pickup_address" defaultValue={p.pickup_address} maxLength={200} required placeholder="Street address, apt or gate notes" className="input" />
          <span className="text-xs text-muted">Only shown to buyers after they reserve. Buyers see just your neighborhood before that.</span>
        </label>
        <SubmitButton className="btn-outline">Save details</SubmitButton>
      </form>

      {reqs.map((r) => (
        <RequirementCard key={r.key} r={r} s={state[r.key]} locked={locked} />
      ))}

      {!locked && (
        <p className="text-center text-[13px] text-muted">
          {SELLER_TYPES[p.type].needsReview ? 'When everything is done, your kitchen goes to review automatically.' : 'When everything is done, you can start posting right away.'}
        </p>
      )}
    </SubPage>
  );
}

function Done({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-leaf bg-leaf text-white' : 'border-line2 bg-white text-transparent'}`}>
      <Icon d={I.check} size={14} stroke={3} />
    </span>
  );
}

function RequirementCard({ r, s, locked }: { r: Requirement; s?: RequirementState; locked: boolean }) {
  const done = isRequirementDone(r.key, s);
  const files: string[] = s ? JSON.parse(s.files) : [];
  return (
    <form id={r.key} action={completeRequirement} className="card flex scroll-mt-4 flex-col gap-3 p-4">
      <input type="hidden" name="key" value={r.key} />
      <div className="flex gap-3">
        <Done on={done} />
        <div className="flex flex-col gap-0.5">
          <span className="font-bold">{r.title}</span>
          <span className="text-[13px] leading-snug text-muted">{r.detail}</span>
        </div>
      </div>
      {done && files.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-9">
          {files.map((f, i) => (
            <a key={f} href={`/api/files/${f}`} target="_blank" className="pill bg-[#EEF2EC] text-[#2E3B32] underline">File {i + 1}</a>
          ))}
        </div>
      )}
      {done && s?.value && r.kind !== 'payout' && <span className="pl-9 text-sm text-[#2E3B32]">{s.value}</span>}
      {!locked && <RequirementInput r={r} done={done} value={s?.value} />}
    </form>
  );
}

function RequirementInput({ r, done, value }: { r: Requirement; done: boolean; value?: string }) {
  switch (r.kind) {
    case 'phone':
      return (
        <div className="flex gap-2 pl-9">
          <input name="value" type="tel" autoComplete="tel" defaultValue={value} required placeholder="(718) 555-0123" aria-label="Phone number" className="input flex-1" />
          <SubmitButton className="btn-outline">{done ? 'Update' : 'Save'}</SubmitButton>
        </div>
      );
    case 'check':
      return done ? null : (
        <div className="flex items-center justify-between gap-2 pl-9">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="value" value="yes" required className="h-5 w-5 accent-[#1F6F43]" /> I confirm</label>
          <SubmitButton className="btn-outline">Save</SubmitButton>
        </div>
      );
    case 'text':
      return (
        <div className="flex flex-col gap-2 pl-9">
          <textarea name="value" rows={2} defaultValue={value} required className="textarea" aria-label={r.title} />
          <SubmitButton className="btn-outline self-start">{done ? 'Update' : 'Save'}</SubmitButton>
        </div>
      );
    case 'signature':
      return done ? null : (
        <div className="flex flex-col gap-2 pl-9 text-sm">
          <ul className="list-disc space-y-0.5 pl-4 text-[13px] text-muted">
            <li>No pets in the kitchen while I prepare food</li>
            <li>No one with a contagious illness handles food</li>
            <li>Separate cutting boards for different food types</li>
            <li>Ingredients stored at safe temperatures, away from chemicals</li>
            <li>No pests, and surfaces sanitized before and after</li>
          </ul>
          <label className="flex items-start gap-2"><input type="checkbox" name="agree" value="yes" required className="mt-0.5 h-5 w-5 accent-[#1F6F43]" /> I agree to follow these rules and re-certify every year.</label>
          <input name="value" required placeholder="Type your full name to sign" aria-label="Full name signature" className="input" />
          <SubmitButton className="btn-outline self-start">Sign</SubmitButton>
        </div>
      );
    case 'upload':
      return (
        <div className="flex flex-col gap-2 pl-9">
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required aria-label={r.title} className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-leaf-soft file:px-3 file:py-2 file:font-semibold file:text-leaf-dark" />
          <SubmitButton className="btn-outline self-start" pendingText="Uploading…">{done ? 'Replace' : 'Upload'}</SubmitButton>
        </div>
      );
    case 'photos':
      return (
        <div className="flex flex-col gap-2 pl-9">
          <input type="file" name="files" multiple accept="image/jpeg,image/png,image/webp" required aria-label={r.title} className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-leaf-soft file:px-3 file:py-2 file:font-semibold file:text-leaf-dark" />
          <span className="text-xs text-muted">Select all {r.photos} photos at once. Include a thermometer in the fridge photo.</span>
          <SubmitButton className="btn-outline self-start" pendingText="Uploading…">{done ? 'Replace photos' : 'Upload photos'}</SubmitButton>
        </div>
      );
    case 'payout':
      return done ? null : (
        <div className="flex flex-col gap-2 pl-9">
          <SubmitButton className="btn-outline self-start">{demoPayments ? 'Mark as set up (demo mode)' : 'Connect your bank with Stripe'}</SubmitButton>
          {demoPayments && <span className="text-xs text-muted">Payments are in demo mode. Real payouts use Stripe once it’s connected.</span>}
        </div>
      );
  }
}
