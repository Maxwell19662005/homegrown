# Stoopside

A neighborhood food marketplace for NYC. People buy backyard produce, eggs and honey, seedlings, farm boxes and home-baked goods from neighbors, reserve and pay in the app, and pick up locally. There's no delivery.

Grown on your block. (The repository, database file and Railway project keep the earlier working name "homegrown" so existing data and deploys aren't disturbed.)

## What's built

**Buyers**
- Discover feed sorted by distance from your neighborhood, with category filters and search
- Map of listings. Pins are approximate and the exact address is hidden until you reserve
- Listing page with seller rating, pickup window, stock left and allergens on baked goods
- Reserve and pay (Stripe Checkout, or demo mode), then get a 4-digit pickup code and the address
- Orders list, cancellation with refund up to 2 hours before pickup, star reviews after pickup
- Report a problem. Food-safety reports pause the listing immediately

**Sellers**
- Four seller types: backyard grower, home baker, local farm, plants and seedlings
- A setup checklist for each type. Growers, farms and plant sellers go live as soon as it's done. Home bakers upload their NY Home Processor registration, food handler certificate and 6 kitchen photos, sign a food-safety pledge, and wait for admin review
- Payouts through Stripe Connect Express (or demo mode)
- Post listings with a photo, price, quantity, pickup window, and home or public pickup spot
- Baked listings must declare the 9 major allergens. Items that need refrigeration (cheesecake, custard, meat and so on) are blocked
- Dashboard: reservations to hand over (confirmed with the buyer's code), cancellations with automatic refunds, listings, earnings

**Admin** (`/admin`)
- Kitchen review queue with the uploaded documents. Documents are private to the seller and admins
- Food-safety report queue: uphold (the listing stays paused) or dismiss (the listing is restored). Three upheld reports automatically suspend the seller
- Seller list with suspend and reinstate

**Fees** (in `lib/config.ts`): $0.75 buyer service fee per order and 10% seller commission.

## Run it locally

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env
npm run seed        # demo sellers and listings around Ridgewood, Queens
npm run dev         # http://localhost:3000
```

Demo logins, all with password `password123`:
- `buyer@example.com` (buyer)
- `rosa@example.com` and other `@example.com` sellers
- `admin@example.com` (admin)

Without Stripe keys the app runs in **demo payments mode**: reservations go through without charging a card, and that's clearly labeled.

## Turn on real payments (Stripe)

1. Create a Stripe account and enable **Connect** (Express accounts).
2. Set `STRIPE_SECRET_KEY` (start with a test key, `sk_test_…`).
3. Add a webhook endpoint at `https://YOUR-DOMAIN/api/stripe/webhook` for these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`

   Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Set `APP_URL` to your public URL.

Once Stripe is on, a seller's listings only appear after they connect their bank through Stripe (Shop → Connect with Stripe). Sellers who finished setup in demo mode are asked to connect.

Money flow: the buyer pays the item price plus the service fee. Stripe sends the item price minus the 10% commission to the seller's connected account. The platform keeps the fee and the commission. Refunds reverse the transfer and the platform fee.

## Deploy

It's one Node service with a SQLite database and uploaded files in `DATA_DIR`. Any host with a **persistent disk** works, such as Railway (attach a volume), Render (add a disk) or Fly.io (add a volume).
- Build: `npm run build`
- Start: `npm start`
- Set `DATA_DIR` to the volume's mount path.
- Set `ADMIN_EMAIL` to your email and sign up with it to become admin.

## Before real launch

- [ ] Attorney review: terms, privacy policy (the `/legal/*` pages are placeholders), seller agreement, the food rules in `lib/config.ts`, and whether eggs, honey and plants need permits
- [ ] Sales tax: NY marketplace-provider rules may require you to collect it. Stripe Tax can do this
- [ ] Email or SMS notifications (new reservation, pickup reminder, kitchen approved). Not built yet
- [ ] Password reset and email verification. Not built yet
- [ ] Use a commercial map tile provider (`NEXT_PUBLIC_MAP_TILE_URL`). OpenStreetMap's free tiles aren't meant for production traffic
- [ ] Back up the `DATA_DIR` volume. Move to Postgres once you outgrow one server
- [ ] Image resizing and compression for uploaded photos

## Code map

| Path | What |
|---|---|
| `lib/config.ts` | Fees, seller types, setup requirements, allergens, blocked terms |
| `lib/schema.sql`, `lib/db.ts` | Database |
| `lib/data.ts` | All business logic: feed, orders, stock holds, refunds, reports, seller status |
| `lib/payments.ts` | Stripe Checkout, Connect and refunds |
| `app/` | Pages (Next.js App Router) and server actions in `app/actions/` |
| `tests/e2e.js` | Browser test of the full buyer, seller, baker and admin flow |
