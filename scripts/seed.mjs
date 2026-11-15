// Adds demo accounts and listings around Ridgewood, Queens so you can try the app.
// Usage: npm run seed            (skips if data already exists)
//        npm run seed -- --force  (adds demo data anyway)
//
// Local (NODE_ENV not "production"): every demo account uses password123.
// Production: the admin account is created only if ADMIN_PASSWORD is set, demo sellers get
// random passwords nobody knows (they can't be logged into), no demo buyer is created, and demo
// listings are added only when SEED_DEMO=1.
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'homegrown.db'));
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf8'));

const force = process.argv.includes('--force');
const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (count > 0 && !force) {
  console.log('Database already has users; skipping seed (use --force to add demo data anyway).');
  process.exit(0);
}

const prod = process.env.NODE_ENV === 'production';
const id = (p) => p + '_' + crypto.randomBytes(9).toString('base64url');
const demoHash = bcrypt.hashSync(prod ? crypto.randomBytes(24).toString('base64url') : 'password123', 10);
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || (prod ? '' : 'password123');

function user(email, name, hood, role = 'user', hash = demoHash) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;
  const uid = id('usr');
  db.prepare('INSERT INTO users (id, email, password_hash, name, neighborhood, role) VALUES (?, ?, ?, ?, ?, ?)').run(uid, email, hash, name, hood, role);
  return uid;
}

if (adminPassword) user(adminEmail, 'Admin', 'Ridgewood', 'admin', bcrypt.hashSync(adminPassword, 10));
if (!prod) user('buyer@example.com', 'Jordan', 'Ridgewood');
if (prod && process.env.SEED_DEMO !== '1') {
  console.log(adminPassword ? `Created admin account ${adminEmail}. No demo listings (set SEED_DEMO=1 to add them).` : 'Nothing to seed.');
  process.exit(0);
}

const HOODS = { Ridgewood: [40.7043, -73.9018], Bushwick: [40.6944, -73.9213], Maspeth: [40.723, -73.9126] };
const sellers = [
  { email: 'rosa@example.com', name: 'Rosa', shop: 'Rosa’s Backyard', type: 'grower', hood: 'Ridgewood', bio: 'Heirloom tomatoes and herbs from my backyard since 2015.' },
  { email: 'dee@example.com', name: 'Dee', shop: 'Dee’s Kitchen', type: 'baker', hood: 'Bushwick', bio: 'Naturally leavened bread, baked in small batches.' },
  { email: 'coop@example.com', name: 'Sam', shop: 'The Coop on Cornelia', type: 'grower', hood: 'Ridgewood', bio: 'Four happy backyard hens.' },
  { email: 'kofi@example.com', name: 'Kofi', shop: 'Kofi Grows', type: 'plants', hood: 'Ridgewood', bio: 'Seedlings started indoors from seed.' },
  { email: 'farm@example.com', name: 'Lena', shop: 'Little Creek Farm', type: 'farm', hood: 'Ridgewood', bio: 'A family farm upstate, in the city every Saturday.' },
  { email: 'bees@example.com', name: 'Quinn', shop: 'Rooftop Bees Queens', type: 'grower', hood: 'Maspeth', bio: 'Rooftop hives across Queens.' },
];
const sellerIds = {};
for (const s of sellers) {
  const uid = user(s.email, s.name, s.hood);
  sellerIds[s.shop] = uid;
  db.prepare(
    `INSERT OR IGNORE INTO seller_profiles (user_id, type, display_name, bio, neighborhood, pickup_address, phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`,
  ).run(uid, s.type, s.shop, (prod ? 'Demo shop — ' : '') + s.bio, s.hood, '1B Sample St (demo address)', '(718) 555-0100');
}

// Pickup windows land on today (or tomorrow if it's late) at sensible hours, New York time.
const nyHour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })) % 24;
const nyMidnight = (() => {
  const d = new Date();
  const ny = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  ny.setHours(0, 0, 0, 0);
  return d.getTime() - (new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' })).getTime() - ny.getTime());
})();
const base = nyMidnight + (nyHour >= 13 ? 24 : 0) * 3600000;
const at = (h) => new Date(base + h * 3600000).toISOString();
const listings = [
  ['Rosa’s Backyard', 'produce', 'Heirloom cherry tomatoes', 'Sungold and Black Cherry, picked this morning. No sprays.', 'per pint', 500, 6, 16, 19],
  ['Dee’s Kitchen', 'baked', 'Sourdough country loaf', '24-hour ferment, baked this afternoon in a registered home kitchen.', 'per loaf', 900, 4, 15, 18, 'Wheat'],
  ['The Coop on Cornelia', 'eggs', 'Backyard eggs, half dozen', 'From four backyard hens, collected daily. Keep refrigerated after pickup.', 'per half dozen', 600, 3, 17, 20],
  ['Kofi Grows', 'plants', 'Pepper & tomato seedlings', 'Jalapeño, shishito and San Marzano. Ready to pot up.', 'each', 400, 12, 33, 36],
  ['Little Creek Farm', 'farm', 'Weekly veggie box', '8–10 seasonal items from our farm upstate.', 'per box', 2800, 10, 34, 37],
  ['Rooftop Bees Queens', 'eggs', 'Raw wildflower honey, 8 oz', 'Unfiltered and unheated, from rooftop hives in Queens.', 'per jar', 1200, 7, 18, 20],
  ['Dee’s Kitchen', 'baked', 'Cinnamon raisin swirl', 'Soft sandwich loaf with a cinnamon sugar swirl.', 'per loaf', 1000, 3, 14, 17, 'Wheat, Milk, Eggs'],
];
for (const [shop, cat, title, desc, unit, price, qty, startH, endH, allergens = ''] of listings) {
  const s = sellers.find((x) => x.shop === shop);
  const [lat, lng] = HOODS[s.hood];
  const j = () => (Math.random() - 0.5) * 0.012;
  db.prepare(
    `INSERT INTO listings (id, seller_id, category, title, description, unit, price_cents, quantity, quantity_left, pickup_start, pickup_end, pickup_spot, pickup_details, allergens, neighborhood, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'home', 'Ring the side gate', ?, ?, ?, ?)`,
  ).run(id('lst'), sellerIds[shop], cat, title, desc, unit, price, qty, qty, at(startH), at(endH), allergens, s.hood, lat + j(), lng + j());
}
console.log(prod
  ? `Seeded demo listings.${adminPassword ? ` Admin: ${adminEmail}` : ''}`
  : `Seeded demo data. Log in as buyer@example.com / password123, any seller (e.g. rosa@example.com), or ${adminEmail} (admin), all with password123.`);
