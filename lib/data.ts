import 'server-only';
import crypto from 'node:crypto';
import { db, newId, nowIso } from './db';
import {
  AUTO_SUSPEND_AFTER_UPHELD_REPORTS,
  BUYER_SERVICE_FEE_CENTS,
  CANCEL_CUTOFF_HOURS,
  Category,
  PAYMENT_HOLD_MINUTES,
  REQUIREMENTS,
  SELLER_COMMISSION,
  SELLER_TYPES,
  SellerType,
} from './config';
import { findNeighborhood, milesBetween } from './neighborhoods';
import { refundPayment } from './payments';

// ---------- Types ----------

export type Listing = {
  id: string;
  seller_id: string;
  category: Category;
  title: string;
  description: string;
  unit: string;
  price_cents: number;
  quantity: number;
  quantity_left: number;
  pickup_start: string;
  pickup_end: string;
  pickup_spot: 'home' | 'public';
  pickup_details: string;
  allergens: string;
  photo: string | null;
  status: 'active' | 'closed' | 'suspended';
  neighborhood: string;
  lat: number;
  lng: number;
  created_at: string;
};

export type ListingView = Listing & {
  seller_name: string;
  seller_type: SellerType;
  seller_initial: string;
  rating: number | null;
  review_count: number;
  distance: number;
};

export type SellerProfile = {
  user_id: string;
  type: SellerType;
  display_name: string;
  bio: string;
  neighborhood: string;
  pickup_address: string;
  phone: string;
  status: 'setup' | 'pending' | 'approved' | 'rejected' | 'suspended';
  review_note: string;
  stripe_account_id: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  qty: number;
  item_cents: number;
  fee_cents: number;
  commission_cents: number;
  total_cents: number;
  status: 'pending_payment' | 'reserved' | 'picked_up' | 'cancelled' | 'expired';
  cancel_reason: string;
  pickup_code: string;
  stripe_session_id: string | null;
  payment_intent: string | null;
  demo_payment: number;
  created_at: string;
  picked_up_at: string | null;
};

export type OrderView = Order & {
  title: string;
  category: Category;
  photo: string | null;
  pickup_start: string;
  pickup_end: string;
  pickup_spot: 'home' | 'public';
  pickup_details: string;
  listing_neighborhood: string;
  seller_name: string;
  seller_phone: string;
  pickup_address: string;
  buyer_name: string;
  rating: number | null;
};

export class UserError extends Error {}

// ---------- Housekeeping ----------

/** Releases stock held by reservations that were never paid for. */
export function releaseExpiredHolds() {
  const cutoff = new Date(Date.now() - PAYMENT_HOLD_MINUTES * 60000).toISOString();
  const d = db();
  const stale = d.prepare(`SELECT id, listing_id, qty FROM orders WHERE status = 'pending_payment' AND created_at < ?`).all(cutoff) as {
    id: string;
    listing_id: string;
    qty: number;
  }[];
  if (!stale.length) return;
  d.transaction(() => {
    for (const o of stale) {
      d.prepare(`UPDATE orders SET status = 'expired' WHERE id = ? AND status = 'pending_payment'`).run(o.id);
      d.prepare(`UPDATE listings SET quantity_left = quantity_left + ? WHERE id = ?`).run(o.qty, o.listing_id);
    }
  })();
}

// ---------- Listings ----------

const LISTING_SELECT = `
  SELECT l.*, sp.display_name AS seller_name, sp.type AS seller_type,
    (SELECT AVG(rating) FROM reviews r WHERE r.seller_id = l.seller_id) AS rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.seller_id = l.seller_id) AS review_count
  FROM listings l JOIN seller_profiles sp ON sp.user_id = l.seller_id`;

function toView(row: Omit<ListingView, 'distance' | 'seller_initial'>, from: { lat: number; lng: number }): ListingView {
  return {
    ...row,
    seller_initial: (row.seller_name || '?').trim().charAt(0).toUpperCase(),
    distance: milesBetween(from, row),
  };
}

export function getFeed(opts: { neighborhood: string; category?: string; q?: string }): ListingView[] {
  releaseExpiredHolds();
  const from = findNeighborhood(opts.neighborhood);
  const params: unknown[] = [nowIso()];
  let where = `l.status = 'active' AND sp.status = 'approved' AND l.pickup_end > ? AND l.quantity_left > 0`;
  if (opts.category && opts.category !== 'all') {
    where += ' AND l.category = ?';
    params.push(opts.category);
  }
  if (opts.q) {
    where += ` AND (l.title LIKE ? OR l.description LIKE ? OR sp.display_name LIKE ?)`;
    const like = '%' + opts.q.replace(/[%_]/g, '') + '%';
    params.push(like, like, like);
  }
  const rows = db().prepare(`${LISTING_SELECT} WHERE ${where}`).all(...params) as Omit<ListingView, 'distance' | 'seller_initial'>[];
  return rows
    .map((r) => toView(r, from))
    .filter((l) => l.distance <= 10)
    .sort((a, b) => a.distance - b.distance || a.pickup_start.localeCompare(b.pickup_start));
}

export function getListing(id: string, neighborhood: string): ListingView | null {
  const row = db().prepare(`${LISTING_SELECT} WHERE l.id = ?`).get(id) as Omit<ListingView, 'distance' | 'seller_initial'> | undefined;
  return row ? toView(row, findNeighborhood(neighborhood)) : null;
}

export function isListingAvailable(l: Listing, sellerStatus?: string) {
  return l.status === 'active' && l.quantity_left > 0 && l.pickup_end > nowIso() && (sellerStatus ?? 'approved') === 'approved';
}

export function sellerListings(sellerId: string): Listing[] {
  return db().prepare(`SELECT * FROM listings WHERE seller_id = ? ORDER BY created_at DESC`).all(sellerId) as Listing[];
}

export function createListing(sellerId: string, input: Omit<Listing, 'id' | 'seller_id' | 'quantity_left' | 'status' | 'created_at'>): string {
  const id = newId('lst');
  db()
    .prepare(
      `INSERT INTO listings (id, seller_id, category, title, description, unit, price_cents, quantity, quantity_left,
        pickup_start, pickup_end, pickup_spot, pickup_details, allergens, photo, neighborhood, lat, lng)
       VALUES (@id, @seller_id, @category, @title, @description, @unit, @price_cents, @quantity, @quantity,
        @pickup_start, @pickup_end, @pickup_spot, @pickup_details, @allergens, @photo, @neighborhood, @lat, @lng)`,
    )
    .run({ ...input, id, seller_id: sellerId });
  return id;
}

export function setListingStatus(listingId: string, sellerId: string | null, status: Listing['status']) {
  if (sellerId) db().prepare(`UPDATE listings SET status = ? WHERE id = ? AND seller_id = ? AND status != 'suspended'`).run(status, listingId, sellerId);
  else db().prepare(`UPDATE listings SET status = ? WHERE id = ?`).run(status, listingId);
}

// ---------- Orders ----------

function pickupCode(): string {
  return String(crypto.randomInt(1000, 10000));
}

export function createOrder(buyerId: string, listingId: string, qty: number, demo: boolean): Order {
  releaseExpiredHolds();
  const d = db();
  return d.transaction(() => {
    const l = d.prepare(`SELECT l.*, sp.status AS seller_status FROM listings l JOIN seller_profiles sp ON sp.user_id = l.seller_id WHERE l.id = ?`).get(listingId) as
      | (Listing & { seller_status: string })
      | undefined;
    if (!l || !isListingAvailable(l, l.seller_status)) throw new UserError('Sorry, this listing is no longer available.');
    if (l.seller_id === buyerId) throw new UserError('You can’t reserve your own listing.');
    if (!Number.isInteger(qty) || qty < 1) throw new UserError('Choose a quantity.');
    if (qty > l.quantity_left) throw new UserError(`Only ${l.quantity_left} left.`);
    const item = l.price_cents * qty;
    const order: Order = {
      id: newId('ord'),
      listing_id: l.id,
      buyer_id: buyerId,
      seller_id: l.seller_id,
      qty,
      item_cents: item,
      fee_cents: BUYER_SERVICE_FEE_CENTS,
      commission_cents: Math.round(item * SELLER_COMMISSION),
      total_cents: item + BUYER_SERVICE_FEE_CENTS,
      status: demo ? 'reserved' : 'pending_payment',
      cancel_reason: '',
      pickup_code: pickupCode(),
      stripe_session_id: null,
      payment_intent: null,
      demo_payment: demo ? 1 : 0,
      created_at: nowIso(),
      picked_up_at: null,
    };
    d.prepare(`UPDATE listings SET quantity_left = quantity_left - ? WHERE id = ?`).run(qty, l.id);
    d.prepare(
      `INSERT INTO orders (id, listing_id, buyer_id, seller_id, qty, item_cents, fee_cents, commission_cents, total_cents, status, pickup_code, demo_payment, created_at)
       VALUES (@id, @listing_id, @buyer_id, @seller_id, @qty, @item_cents, @fee_cents, @commission_cents, @total_cents, @status, @pickup_code, @demo_payment, @created_at)`,
    ).run(order);
    return order;
  })();
}

export function attachCheckoutSession(orderId: string, sessionId: string) {
  db().prepare(`UPDATE orders SET stripe_session_id = ? WHERE id = ?`).run(sessionId, orderId);
}

/** Marks an order paid. Safe to call more than once (webhook + success redirect). */
export function markOrderPaid(orderId: string, paymentIntent: string | null) {
  const d = db();
  d.transaction(() => {
    const o = d.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as Order | undefined;
    if (!o) return;
    if (o.status === 'pending_payment') {
      d.prepare(`UPDATE orders SET status = 'reserved', payment_intent = ? WHERE id = ?`).run(paymentIntent, orderId);
    } else if (o.status === 'expired') {
      // Paid after the hold lapsed: take the stock back if it's still there, else it gets refunded by the caller.
      const l = d.prepare(`SELECT quantity_left FROM listings WHERE id = ?`).get(o.listing_id) as { quantity_left: number };
      if (l.quantity_left >= o.qty) {
        d.prepare(`UPDATE listings SET quantity_left = quantity_left - ? WHERE id = ?`).run(o.qty, o.listing_id);
        d.prepare(`UPDATE orders SET status = 'reserved', payment_intent = ? WHERE id = ?`).run(paymentIntent, orderId);
      } else {
        d.prepare(`UPDATE orders SET status = 'cancelled', payment_intent = ?, cancel_reason = 'Sold out before payment finished' WHERE id = ?`).run(paymentIntent, orderId);
      }
    } else if (!o.payment_intent && paymentIntent) {
      d.prepare(`UPDATE orders SET payment_intent = ? WHERE id = ?`).run(paymentIntent, orderId);
    }
  })();
}

export function markCheckoutExpired(orderId: string) {
  const d = db();
  d.transaction(() => {
    const o = d.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as Order | undefined;
    if (!o || o.status !== 'pending_payment') return;
    d.prepare(`UPDATE orders SET status = 'expired' WHERE id = ?`).run(orderId);
    d.prepare(`UPDATE listings SET quantity_left = quantity_left + ? WHERE id = ?`).run(o.qty, o.listing_id);
  })();
}

const ORDER_SELECT = `
  SELECT o.*, l.title, l.category, l.photo, l.pickup_start, l.pickup_end, l.pickup_spot, l.pickup_details,
    l.neighborhood AS listing_neighborhood, sp.display_name AS seller_name, sp.phone AS seller_phone,
    sp.pickup_address, u.name AS buyer_name, r.rating
  FROM orders o
  JOIN listings l ON l.id = o.listing_id
  JOIN seller_profiles sp ON sp.user_id = o.seller_id
  JOIN users u ON u.id = o.buyer_id
  LEFT JOIN reviews r ON r.order_id = o.id`;

export function getOrder(id: string): OrderView | null {
  return (db().prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(id) as OrderView | undefined) ?? null;
}

export function buyerOrders(buyerId: string): OrderView[] {
  releaseExpiredHolds();
  return db()
    .prepare(`${ORDER_SELECT} WHERE o.buyer_id = ? AND o.status != 'expired' ORDER BY l.pickup_start DESC`)
    .all(buyerId) as OrderView[];
}

export function sellerOrders(sellerId: string): OrderView[] {
  releaseExpiredHolds();
  return db()
    .prepare(`${ORDER_SELECT} WHERE o.seller_id = ? AND o.status IN ('reserved','picked_up','cancelled') ORDER BY l.pickup_start ASC`)
    .all(sellerId) as OrderView[];
}

export function canBuyerCancel(o: Order & { pickup_start: string }) {
  return o.status === 'reserved' && new Date(o.pickup_start).getTime() - Date.now() > CANCEL_CUTOFF_HOURS * 3600000;
}

export async function cancelOrder(orderId: string, by: 'buyer' | 'seller' | 'admin', reason: string) {
  const d = db();
  const o = d.prepare(`SELECT o.*, l.pickup_start FROM orders o JOIN listings l ON l.id = o.listing_id WHERE o.id = ?`).get(orderId) as
    | (Order & { pickup_start: string })
    | undefined;
  if (!o || o.status !== 'reserved') throw new UserError('This order can’t be cancelled.');
  if (by === 'buyer' && !canBuyerCancel(o)) throw new UserError(`Orders can only be cancelled up to ${CANCEL_CUTOFF_HOURS} hours before pickup. Message the seller instead.`);
  if (o.payment_intent && !o.demo_payment) {
    const seller = d.prepare(`SELECT stripe_account_id FROM seller_profiles WHERE user_id = ?`).get(o.seller_id) as { stripe_account_id: string | null };
    await refundPayment(o.payment_intent, !!seller?.stripe_account_id);
  }
  d.transaction(() => {
    d.prepare(`UPDATE orders SET status = 'cancelled', cancel_reason = ? WHERE id = ?`).run(`${by}: ${reason}`.slice(0, 300), orderId);
    d.prepare(`UPDATE listings SET quantity_left = quantity_left + ? WHERE id = ?`).run(o.qty, o.listing_id);
  })();
}

export function markPickedUp(orderId: string, sellerId: string, code: string) {
  const o = db().prepare(`SELECT * FROM orders WHERE id = ? AND seller_id = ?`).get(orderId, sellerId) as Order | undefined;
  if (!o || o.status !== 'reserved') throw new UserError('This order isn’t waiting for pickup.');
  if (o.pickup_code !== code.replace(/\D/g, '')) throw new UserError('That pickup code doesn’t match.');
  db().prepare(`UPDATE orders SET status = 'picked_up', picked_up_at = ? WHERE id = ?`).run(nowIso(), orderId);
}

export function addReview(orderId: string, buyerId: string, rating: number, comment: string) {
  const o = db().prepare(`SELECT * FROM orders WHERE id = ? AND buyer_id = ?`).get(orderId, buyerId) as Order | undefined;
  if (!o || o.status !== 'picked_up') throw new UserError('You can review an order after you pick it up.');
  if (!(rating >= 1 && rating <= 5)) throw new UserError('Choose 1 to 5 stars.');
  db()
    .prepare(`INSERT INTO reviews (id, order_id, buyer_id, seller_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(order_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment`)
    .run(newId('rev'), orderId, buyerId, o.seller_id, Math.round(rating), comment.slice(0, 1000));
}

// ---------- Reports ----------

/** Food-safety reports suspend the listing immediately, pending admin review. */
export function fileReport(args: { orderId: string; reporterId: string; kind: 'food_safety' | 'other'; details: string }) {
  const o = db().prepare(`SELECT * FROM orders WHERE id = ? AND buyer_id = ?`).get(args.orderId, args.reporterId) as Order | undefined;
  if (!o) throw new UserError('Order not found.');
  if (args.details.trim().length < 10) throw new UserError('Please describe what happened.');
  db().transaction(() => {
    db()
      .prepare(`INSERT INTO reports (id, listing_id, order_id, reporter_id, seller_id, kind, details) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(newId('rpt'), o.listing_id, o.id, args.reporterId, o.seller_id, args.kind, args.details.slice(0, 3000));
    if (args.kind === 'food_safety') setListingStatus(o.listing_id, null, 'suspended');
  })();
}

export type ReportView = {
  id: string;
  kind: string;
  details: string;
  status: string;
  created_at: string;
  listing_id: string;
  listing_title: string;
  listing_status: string;
  seller_id: string;
  seller_name: string;
  reporter_email: string;
  upheld_count: number;
};

export function openReports(): ReportView[] {
  return db()
    .prepare(
      `SELECT r.*, l.title AS listing_title, l.status AS listing_status, sp.display_name AS seller_name, u.email AS reporter_email,
        (SELECT COUNT(*) FROM reports r2 WHERE r2.seller_id = r.seller_id AND r2.status = 'upheld') AS upheld_count
       FROM reports r JOIN listings l ON l.id = r.listing_id JOIN seller_profiles sp ON sp.user_id = r.seller_id JOIN users u ON u.id = r.reporter_id
       WHERE r.status = 'open' ORDER BY r.created_at ASC`,
    )
    .all() as ReportView[];
}

export function resolveReport(reportId: string, decision: 'upheld' | 'dismissed') {
  const d = db();
  const r = d.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId) as { listing_id: string; seller_id: string } | undefined;
  if (!r) return;
  d.transaction(() => {
    d.prepare(`UPDATE reports SET status = ? WHERE id = ?`).run(decision, reportId);
    if (decision === 'dismissed') {
      d.prepare(`UPDATE listings SET status = 'active' WHERE id = ? AND status = 'suspended'`).run(r.listing_id);
    } else {
      const n = (d.prepare(`SELECT COUNT(*) AS n FROM reports WHERE seller_id = ? AND status = 'upheld'`).get(r.seller_id) as { n: number }).n;
      if (n >= AUTO_SUSPEND_AFTER_UPHELD_REPORTS) {
        d.prepare(`UPDATE seller_profiles SET status = 'suspended', review_note = 'Suspended after repeated verified complaints' WHERE user_id = ?`).run(r.seller_id);
        d.prepare(`UPDATE listings SET status = 'suspended' WHERE seller_id = ? AND status = 'active'`).run(r.seller_id);
      }
    }
  })();
}

// ---------- Sellers ----------

export function getSellerProfile(userId: string): SellerProfile | null {
  return (db().prepare(`SELECT * FROM seller_profiles WHERE user_id = ?`).get(userId) as SellerProfile | undefined) ?? null;
}

export function createSellerProfile(userId: string, type: SellerType, displayName: string, neighborhood: string) {
  db()
    .prepare(
      `INSERT INTO seller_profiles (user_id, type, display_name, neighborhood) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET type = excluded.type, display_name = excluded.display_name, neighborhood = excluded.neighborhood
       WHERE seller_profiles.status IN ('setup', 'rejected')`,
    )
    .run(userId, type, displayName, neighborhood);
}

export function updateSellerDetails(userId: string, fields: { display_name: string; bio: string; neighborhood: string; pickup_address: string }) {
  db()
    .prepare(`UPDATE seller_profiles SET display_name = @display_name, bio = @bio, neighborhood = @neighborhood, pickup_address = @pickup_address WHERE user_id = @user_id`)
    .run({ ...fields, user_id: userId });
}

export type RequirementState = { key: string; done: number; value: string; files: string };

export function getRequirements(userId: string): Record<string, RequirementState> {
  const rows = db().prepare(`SELECT key, done, value, files FROM seller_requirements WHERE user_id = ?`).all(userId) as RequirementState[];
  return Object.fromEntries(rows.map((r) => [r.key, r]));
}

export function saveRequirement(userId: string, key: string, patch: { done: boolean; value?: string; files?: string[] }) {
  db()
    .prepare(
      `INSERT INTO seller_requirements (user_id, key, done, value, files, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET done = excluded.done, value = excluded.value, files = excluded.files, updated_at = excluded.updated_at`,
    )
    .run(userId, key, patch.done ? 1 : 0, patch.value ?? '', JSON.stringify(patch.files ?? []), nowIso());
  if (key === 'phone' && patch.value) db().prepare(`UPDATE seller_profiles SET phone = ? WHERE user_id = ?`).run(patch.value, userId);
}

/** Moves a seller forward once every requirement is done: straight to approved, or to review for bakers. */
export function refreshSellerStatus(userId: string) {
  const p = getSellerProfile(userId);
  if (!p || !['setup', 'rejected'].includes(p.status)) return;
  const reqs = getRequirements(userId);
  const allDone = REQUIREMENTS[p.type].every((r) => reqs[r.key]?.done);
  if (!allDone || !p.pickup_address.trim()) return;
  const next = SELLER_TYPES[p.type].needsReview ? 'pending' : 'approved';
  db().prepare(`UPDATE seller_profiles SET status = ?, review_note = '' WHERE user_id = ?`).run(next, userId);
}

export function setStripeAccount(userId: string, account: string) {
  db().prepare(`UPDATE seller_profiles SET stripe_account_id = ? WHERE user_id = ?`).run(account, userId);
}

export function pendingSellers(): (SellerProfile & { email: string })[] {
  return db()
    .prepare(`SELECT sp.*, u.email FROM seller_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.status = 'pending' ORDER BY sp.created_at ASC`)
    .all() as (SellerProfile & { email: string })[];
}

export function allSellers(): (SellerProfile & { email: string; listing_count: number })[] {
  return db()
    .prepare(
      `SELECT sp.*, u.email, (SELECT COUNT(*) FROM listings l WHERE l.seller_id = sp.user_id) AS listing_count
       FROM seller_profiles sp JOIN users u ON u.id = sp.user_id ORDER BY sp.created_at DESC`,
    )
    .all() as (SellerProfile & { email: string; listing_count: number })[];
}

export function reviewSeller(userId: string, decision: 'approved' | 'rejected' | 'suspended', note: string) {
  const d = db();
  d.transaction(() => {
    d.prepare(`UPDATE seller_profiles SET status = ?, review_note = ? WHERE user_id = ?`).run(decision, note.slice(0, 500), userId);
    if (decision === 'suspended') d.prepare(`UPDATE listings SET status = 'suspended' WHERE seller_id = ? AND status = 'active'`).run(userId);
  })();
}

export function sellerStats(sellerId: string) {
  return db()
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'picked_up' THEN item_cents - commission_cents END), 0) AS earned_cents,
        COALESCE(SUM(CASE WHEN status = 'reserved' THEN 1 END), 0) AS upcoming,
        COALESCE(SUM(CASE WHEN status = 'picked_up' THEN 1 END), 0) AS completed
       FROM orders WHERE seller_id = ?`,
    )
    .get(sellerId) as { earned_cents: number; upcoming: number; completed: number };
}

export function sellerReviews(sellerId: string) {
  return db()
    .prepare(`SELECT r.rating, r.comment, r.created_at, u.name FROM reviews r JOIN users u ON u.id = r.buyer_id WHERE r.seller_id = ? ORDER BY r.created_at DESC LIMIT 20`)
    .all(sellerId) as { rating: number; comment: string; created_at: string; name: string }[];
}
