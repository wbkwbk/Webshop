import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedWorkshop } from "./seed";
import { one } from "./sql";

export { many, one, run, withTransaction } from "./sql";

const globalForDb = globalThis as unknown as { hundertDb?: DatabaseSync };

export function openDatabase(filename: string, options?: { seed?: boolean }) {
  if (filename !== ":memory:") {
    mkdirSync(path.dirname(filename), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON;");
  if (filename !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }
  migrate(db);
  if (options?.seed !== false) {
    const count = one(db, "SELECT COUNT(*) AS count FROM products");
    const products = typeof count?.count === "number" ? count.count : Number(count?.count ?? 0);
    if (products === 0) seedWorkshop(db);
  }
  return db;
}

export function getDb() {
  if (!globalForDb.hundertDb) {
    const filename = process.env.SHOP_DB_PATH ?? path.join(process.cwd(), "data", "shop.db");
    globalForDb.hundertDb = openDatabase(filename, { seed: true });
  }
  return globalForDb.hundertDb;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      street TEXT NOT NULL DEFAULT '',
      house_number TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 100),
      PRIMARY KEY (user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      sequence INTEGER NOT NULL,
      target_qty INTEGER NOT NULL,
      filled_qty INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
      closed_at TEXT,
      UNIQUE (product_id, sequence)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS batches_one_open
      ON batches(product_id) WHERE status = 'open';

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      batch_id TEXT NOT NULL REFERENCES batches(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price_cents INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('reserved', 'paid', 'shipped')),
      ship_name TEXT NOT NULL,
      ship_street TEXT NOT NULL,
      ship_house_number TEXT NOT NULL,
      ship_postal_code TEXT NOT NULL,
      ship_city TEXT NOT NULL,
      ship_country TEXT NOT NULL,
      created_at TEXT NOT NULL,
      paid_at TEXT,
      shipped_at TEXT
    );

    CREATE INDEX IF NOT EXISTS reservations_product_status
      ON reservations(product_id, status);
    CREATE INDEX IF NOT EXISTS reservations_user
      ON reservations(user_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      href TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
