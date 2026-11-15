'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import {
  cancelOrder,
  createListing,
  createSellerProfile,
  getOrder,
  getRequirements,
  getSellerProfile,
  markPickedUp,
  refreshSellerStatus,
  saveRequirement,
  setListingStatus,
  updateSellerDetails,
  UserError,
} from '@/lib/data';
import { ALLERGENS, ALLOW_EGG_LISTINGS, Category, CHOCOLATE_TERMS, HONEY_ADDITIVE_TERMS, PROHIBITED_BAKED_TERMS, REQUIREMENTS, SELLER_TYPES, SellerType } from '@/lib/config';
import { findNeighborhood, fuzzyPoint, NEIGHBORHOODS } from '@/lib/neighborhoods';
import { saveUpload } from '@/lib/uploads';
import { guard, str } from '@/lib/actions-util';
import { demoPayments } from '@/lib/payments';
import { nyLocalToIso } from '@/lib/format';

export async function startSelling(form: FormData) {
  const user = await requireUser('/sell');
  const type = str(form, 'type') as SellerType;
  const name = str(form, 'display_name', 60);
  const hood = str(form, 'neighborhood');
  if (!(type in SELLER_TYPES)) redirect('/sell?error=' + encodeURIComponent('Choose what you want to sell.'));
  if (!name) redirect('/sell?error=' + encodeURIComponent('Give your shop a name.'));
  if (!NEIGHBORHOODS.some((n) => n.name === hood)) redirect('/sell?error=' + encodeURIComponent('Choose your neighborhood.'));
  createSellerProfile(user.id, type, name, hood);
  redirect('/sell/setup');
}

export async function saveDetails(form: FormData) {
  const user = await requireUser('/sell/setup');
  const p = getSellerProfile(user.id);
  if (!p) redirect('/sell');
  const hood = str(form, 'neighborhood');
  updateSellerDetails(user.id, {
    display_name: str(form, 'display_name', 60) || p.display_name,
    bio: str(form, 'bio', 300),
    neighborhood: NEIGHBORHOODS.some((n) => n.name === hood) ? hood : p.neighborhood,
    pickup_address: str(form, 'pickup_address', 200),
  });
  refreshSellerStatus(user.id);
  redirect('/sell/setup?notice=' + encodeURIComponent('Details saved.'));
}

export async function completeRequirement(form: FormData) {
  const user = await requireUser('/sell/setup');
  const p = getSellerProfile(user.id);
  if (!p) redirect('/sell');
  const key = str(form, 'key');
  const req = REQUIREMENTS[p.type].find((r) => r.key === key);
  if (!req) redirect('/sell/setup');
  const back = '/sell/setup#' + key;
  await guard('/sell/setup', async () => {
    switch (req.kind) {
      case 'phone': {
        const phone = str(form, 'value', 30);
        if (phone.replace(/\D/g, '').length < 10) throw new UserError('Enter a 10-digit phone number.');
        saveRequirement(user.id, key, { done: true, value: phone });
        break;
      }
      case 'check':
        saveRequirement(user.id, key, { done: form.get('value') === 'yes' });
        break;
      case 'text': {
        const v = str(form, 'value', 300);
        if (v.length < 3) throw new UserError('Please fill this in.');
        saveRequirement(user.id, key, { done: true, value: v });
        break;
      }
      case 'signature': {
        const v = str(form, 'value', 100);
        if (form.get('agree') !== 'yes' || v.length < 2) throw new UserError('Check the box and type your full name to sign.');
        saveRequirement(user.id, key, { done: true, value: `${v} — signed ${new Date().toISOString()}` });
        break;
      }
      case 'upload': {
        const path = await saveUpload(form.get('file') as File, { visibility: 'private', ownerId: user.id, allowPdf: true });
        saveRequirement(user.id, key, { done: true, files: [path] });
        break;
      }
      case 'photos': {
        const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
        const need = req.photos ?? 1;
        if (files.length < need) throw new UserError(`Please add all ${need} photos.`);
        const paths: string[] = [];
        for (const f of files.slice(0, need)) paths.push(await saveUpload(f, { visibility: 'private', ownerId: user.id }));
        saveRequirement(user.id, key, { done: true, files: paths });
        break;
      }
      case 'payout':
        if (!demoPayments) redirect('/api/stripe/connect');
        saveRequirement(user.id, key, { done: true, value: 'demo' });
        break;
    }
  });
  refreshSellerStatus(user.id);
  redirect(back);
}

export type ListingFormState = { error?: string; values?: Record<string, string | string[]>; n: number };

export async function newListing(prev: ListingFormState, form: FormData): Promise<ListingFormState> {
  const user = await requireUser('/sell/listings/new');
  const values: Record<string, string | string[]> = {};
  for (const k of ['category', 'title', 'description', 'unit', 'price', 'quantity', 'date', 'start', 'end', 'pickup_spot', 'pickup_details', 'no_allergens']) values[k] = String(form.get(k) ?? '');
  values.allergens = form.getAll('allergens').map(String);
  class Invalid extends Error {}
  const p = getSellerProfile(user.id);
  if (!p || p.status !== 'approved') redirect('/sell');
  const allowed = SELLER_TYPES[p.type].categories;
  const category = str(form, 'category') as Category;
  const title = str(form, 'title', 80);
  const description = str(form, 'description', 1000);
  const unit = str(form, 'unit', 40);
  const price = Math.round(parseFloat(str(form, 'price')) * 100);
  const quantity = parseInt(str(form, 'quantity'), 10);
  const date = str(form, 'date');
  const start = str(form, 'start');
  const end = str(form, 'end');
  const spot = form.get('pickup_spot') === 'public' ? 'public' : 'home';
  const details = str(form, 'pickup_details', 200);
  const allergenList = form.getAll('allergens').map(String).filter((a) => ALLERGENS.includes(a));
  const noAllergens = form.get('no_allergens') === 'yes';

  const fail = (m: string): never => {
    throw new Invalid(m);
  };
  try {
  if (!allowed.includes(category)) fail('Choose a category.');
  if (title.length < 3) fail('Give your listing a title.');
  if (!(price >= 50 && price <= 50000)) fail('Price must be between $0.50 and $500.');
  if (!(quantity >= 1 && quantity <= 500)) fail('Quantity must be between 1 and 500.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) fail('Set a pickup date and times.');
  const pickupStart = nyLocalToIso(date, start);
  const pickupEnd = nyLocalToIso(date, end);
  if (pickupEnd <= pickupStart) fail('Pickup must end after it starts.');
  if (new Date(pickupEnd).getTime() < Date.now() + 30 * 60000) fail('The pickup window has to end at least 30 minutes from now.');
  if (new Date(pickupStart).getTime() > Date.now() + 14 * 86400000) fail('Pickup must be within the next 2 weeks.');
  if (spot === 'public' && details.length < 5) fail('Describe the public pickup spot.');
  if (spot === 'home' && !p.pickup_address) fail('Add your pickup address in your shop settings first.');
  let allergens = '';
  if (category === 'baked') {
    if (!noAllergens && allergenList.length === 0) fail('Select the allergens in this item, or confirm it has none.');
    allergens = noAllergens ? 'none' : allergenList.join(', ');
    const text = `${title} ${description}`.toLowerCase();
    const choc = CHOCOLATE_TERMS.find((t) => text.includes(t));
    if (choc) fail(`New York’s home-kitchen rules don’t allow chocolate items (“${choc}”). Contact us if you think this is a mistake.`);
    const hit = PROHIBITED_BAKED_TERMS.find((t) => text.includes(t));
    if (hit) fail(`Items with “${hit}” usually need refrigeration, which NY doesn’t allow for home kitchens. Contact us if you think this is a mistake.`);
  }

  if (category === 'eggs') {
    const text = `${title} ${description}`.toLowerCase();
    if (!ALLOW_EGG_LISTINGS && /\beggs?\b/.test(text)) fail('Egg sales are paused while we confirm New York’s rules for small flocks. Honey is fine to list.');
    const add = HONEY_ADDITIVE_TERMS.find((t) => text.includes(t));
    if (add) fail(`Only pure honey from your own hives can be sold without a NY food-processing license (“${add}” suggests added ingredients).`);
  }

  const photoFile = form.get('photo');
  let photo: string | null = null;
  if (photoFile instanceof File && photoFile.size > 0) {
    try {
      photo = await saveUpload(photoFile, { visibility: 'public' });
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Photo upload failed.');
    }
  }
  const pt = fuzzyPoint(findNeighborhood(p.neighborhood));
  createListing(user.id, {
    category, title, description, unit, price_cents: price, quantity,
    pickup_start: pickupStart, pickup_end: pickupEnd, pickup_spot: spot, pickup_details: details,
    allergens, photo, neighborhood: p.neighborhood, lat: pt.lat, lng: pt.lng,
  });
  } catch (e) {
    if (e instanceof Invalid) return { error: e.message, values, n: prev.n + 1 };
    throw e;
  }
  revalidatePath('/');
  redirect('/sell?notice=' + encodeURIComponent('Your listing is live! Neighbors nearby can see it now.'));
}

export async function changeListing(form: FormData) {
  const user = await requireUser('/sell');
  const status = form.get('status') === 'active' ? 'active' : 'closed';
  setListingStatus(str(form, 'listing_id'), user.id, status);
  revalidatePath('/');
  redirect('/sell');
}

export async function confirmPickup(form: FormData) {
  const user = await requireUser('/sell');
  const id = str(form, 'order_id');
  await guard('/sell', () => markPickedUp(id, user.id, str(form, 'code', 10)));
  redirect('/sell?notice=' + encodeURIComponent('Pickup confirmed. Nice work!'));
}

export async function sellerCancel(form: FormData) {
  const user = await requireUser('/sell');
  const id = str(form, 'order_id');
  const o = getOrder(id);
  if (!o || o.seller_id !== user.id) redirect('/sell');
  await guard('/sell', () => cancelOrder(id, 'seller', str(form, 'reason', 200) || 'Cancelled by seller'));
  redirect('/sell?notice=' + encodeURIComponent('Order cancelled. The buyer has been refunded.'));
}

