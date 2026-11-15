'use client';
import { useActionState, useState } from 'react';
import { newListing, type ListingFormState } from '@/app/actions/seller';
import { Alert } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { I, Icon } from '@/components/Icons';

type Props = {
  categories: { id: string; label: string }[];
  allergens: string[];
  hasAddress: boolean;
  defaults: { date: string; start: string; end: string; today: string; max: string };
};

export function ListingForm(props: Props) {
  const [state, action] = useActionState<ListingFormState, FormData>(newListing, { n: 0 });
  // Re-mount the fields after a failed submit so they start from what the seller typed.
  return <Fields key={state.n} {...props} state={state} action={action} />;
}

function Fields({ categories, allergens, hasAddress, defaults, state, action }: Props & { state: ListingFormState; action: (f: FormData) => void }) {
  const v = (k: string) => (typeof state.values?.[k] === 'string' ? (state.values[k] as string) : undefined);
  const picked = (state.values?.allergens as string[] | undefined) ?? [];
  const [category, setCategory] = useState(v('category') || categories[0].id);
  const [spot, setSpot] = useState(v('pickup_spot') || (hasAddress ? 'home' : 'public'));
  const [preview, setPreview] = useState<string | null>(null);
  const [noneChecked, setNone] = useState(v('no_allergens') === 'yes');

  return (
    <form action={action} className="flex flex-col gap-5">
      <Alert error={state.error} />
      <label className="relative flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[18px] border-2 border-dashed border-line2 bg-white text-[#2E3B32]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <Icon d={I.camera} size={28} stroke={1.8} />
            <span className="text-sm font-semibold">Add a photo</span>
            <span className="text-xs text-muted">{state.error ? 'Re-add your photo if you chose one' : 'Show the real thing (optional)'}</span>
          </>
        )}
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>

      {categories.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2">Category</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className={category === c.id ? 'chip-on cursor-pointer' : 'chip-off cursor-pointer'}>
                <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="sr-only" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {categories.length === 1 && <input type="hidden" name="category" value={category} />}

      <label className="flex flex-col gap-1.5">
        <span className="label">What is it?</span>
        <input name="title" defaultValue={v('title')} required maxLength={80} placeholder={category === 'baked' ? 'e.g. Sourdough country loaf' : category === 'plants' ? 'e.g. Basil seedlings' : category === 'farm' ? 'e.g. Weekly veggie box' : 'e.g. Cherry tomatoes'} className="input" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label">Description</span>
        <textarea name="description" defaultValue={v('description')} rows={3} maxLength={1000} placeholder="Variety, how it was grown or made, anything buyers should know" className="textarea" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="label">Price ($)</span>
          <input name="price" defaultValue={v('price')} type="number" inputMode="decimal" min="0.5" max="500" step="0.25" required placeholder="5.00" className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Per</span>
          <input name="unit" defaultValue={v('unit')} maxLength={40} placeholder="pint, loaf, each…" className="input" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="label">How many do you have?</span>
        <input name="quantity" type="number" inputMode="numeric" min="1" max="500" defaultValue={v('quantity') || 6} required className="input" />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">Pickup window</legend>
        <input name="date" type="date" min={defaults.today} max={defaults.max} defaultValue={v('date') || defaults.date} required aria-label="Pickup date" className="input" />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">From</span><input name="start" type="time" step={900} defaultValue={v('start') || defaults.start} required className="input" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Until</span><input name="end" type="time" step={900} defaultValue={v('end') || defaults.end} required className="input" /></label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">Where buyers pick up</legend>
        {[
          { id: 'home', label: 'At my pickup address', sub: hasAddress ? 'Buyers see only your neighborhood until they reserve' : 'Add your address in shop settings first', disabled: !hasAddress },
          { id: 'public', label: 'A public spot', sub: 'Meet at a café, park entrance or market', disabled: false },
        ].map((o) => (
          <label key={o.id} className={`card flex items-center gap-3 border-2 p-3.5 ${spot === o.id ? 'border-leaf' : ''} ${o.disabled ? 'opacity-50' : 'cursor-pointer'}`}>
            <input type="radio" name="pickup_spot" value={o.id} checked={spot === o.id} disabled={o.disabled} onChange={() => setSpot(o.id)} className="h-5 w-5 accent-[#1F6F43]" />
            <span className="flex flex-col"><span className="font-semibold">{o.label}</span><span className="text-[13px] text-muted">{o.sub}</span></span>
          </label>
        ))}
        <input name="pickup_details" defaultValue={v('pickup_details')} maxLength={200} required={spot === 'public'} placeholder={spot === 'public' ? 'e.g. Front steps of the public library' : 'Notes for buyers, e.g. “Ring the side gate” (optional)'} aria-label="Pickup details" className="input" />
      </fieldset>

      {category === 'baked' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-1">Contains (required)</legend>
          <span className="text-[13px] text-muted">Select every major allergen in this item. Listings can’t go live without this.</span>
          <div className="flex flex-wrap gap-2">
            {allergens.map((a) => (
              <label key={a} className="chip-off cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
                <input type="checkbox" name="allergens" value={a} defaultChecked={picked.includes(a)} disabled={noneChecked} className="sr-only" />
                {a}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="no_allergens" value="yes" checked={noneChecked} onChange={(e) => setNone(e.target.checked)} className="h-5 w-5 accent-[#1F6F43]" />
            This item contains none of these
          </label>
          <span className="text-xs text-muted">Every package must carry a label with the product name, ingredients, weight, your address and “Made in a home kitchen”.</span>
        </fieldset>
      )}

      <SubmitButton className="btn-primary text-base" pendingText="Posting…">Post listing</SubmitButton>
    </form>
  );
}
