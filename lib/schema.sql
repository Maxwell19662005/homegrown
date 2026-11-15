CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  neighborhood TEXT NOT NULL DEFAULT 'Ridgewood',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL,
  pickup_address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'setup', -- setup | pending | approved | rejected | suspended
  review_note TEXT NOT NULL DEFAULT '',
  stripe_account_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS seller_requirements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  value TEXT NOT NULL DEFAULT '',
  files TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  quantity_left INTEGER NOT NULL,
  pickup_start TEXT NOT NULL,
  pickup_end TEXT NOT NULL,
  pickup_spot TEXT NOT NULL DEFAULT 'home', -- home | public
  pickup_details TEXT NOT NULL DEFAULT '',
  allergens TEXT NOT NULL DEFAULT '',
  photo TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | closed | suspended
  neighborhood TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS listings_status ON listings(status, pickup_end);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  qty INTEGER NOT NULL,
  item_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL, -- pending_payment | reserved | picked_up | cancelled | expired
  cancel_reason TEXT NOT NULL DEFAULT '',
  pickup_code TEXT NOT NULL,
  stripe_session_id TEXT,
  payment_intent TEXT,
  demo_payment INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  picked_up_at TEXT
);
CREATE INDEX IF NOT EXISTS orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller ON orders(seller_id);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  order_id TEXT,
  reporter_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  kind TEXT NOT NULL, -- food_safety | other
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | upheld | dismissed
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
