import type { DatabaseSync } from "node:sqlite";
import { DEMO_ACCOUNTS } from "./constants";
import { hashPassword } from "./password";
import { many, one, run } from "./sql";

type Person = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "customer" | "admin";
  street: string;
  house: string;
  postal: string;
  city: string;
};

const PEOPLE: Person[] = [
  {
    id: "usr_super",
    email: DEMO_ACCOUNTS.superuser.email,
    password: DEMO_ACCOUNTS.superuser.password,
    name: DEMO_ACCOUNTS.superuser.name,
    role: "admin",
    street: "Dienerstrasse",
    house: "12",
    postal: "8004",
    city: "Zürich",
  },
  {
    id: "usr_lea",
    email: DEMO_ACCOUNTS.buyer.email,
    password: DEMO_ACCOUNTS.buyer.password,
    name: DEMO_ACCOUNTS.buyer.name,
    role: "customer",
    street: "Bleicherweg",
    house: "18",
    postal: "8002",
    city: "Zürich",
  },
];

const SAUCER = {
  id: "prd_saucer",
  slug: "afm-saucer-mod",
  name: "AFM Saucer MOD",
  price: 18000,
  summary: "Please register to pre-order.",
  description:
    "Production starts once we reach 100 reservations. No payment is required upfront—you will only be asked to pay when production begins at 100 orders.",
};

export function seedWorkshop(db: DatabaseSync) {
  const created = "2026-06-01T08:00:00.000Z";
  for (const person of PEOPLE) {
    run(
      db,
      `INSERT INTO users (
        id, email, password_hash, name, street, house_number, postal_code, city, country, role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CH', ?, ?)`,
      person.id,
      person.email,
      hashPassword(person.password, `seed-${person.id}`),
      person.name,
      person.street,
      person.house,
      person.postal,
      person.city,
      person.role,
      created,
    );
  }
  insertSaucer(db);
  ensureSuperuser(db);
}

export function ensureCatalog(db: DatabaseSync) {
  const products = many(db, "SELECT slug FROM products");
  const onlySaucer = products.length === 1 && String(products[0]?.slug) === SAUCER.slug;
  if (onlySaucer) {
    run(
      db,
      "UPDATE products SET name = ?, summary = ?, description = ? WHERE slug = ?",
      SAUCER.name,
      SAUCER.summary,
      SAUCER.description,
      SAUCER.slug,
    );
    const batch = one(db, "SELECT id FROM batches WHERE product_id = ? AND status = 'open'", SAUCER.id);
    if (!batch) insertPool(db);
    return;
  }
  run(db, "DELETE FROM reservations");
  run(db, "DELETE FROM orders");
  run(db, "DELETE FROM cart_items");
  run(db, "DELETE FROM batches");
  run(db, "DELETE FROM products");
  insertSaucer(db);
}

function insertSaucer(db: DatabaseSync) {
  run(
    db,
    `INSERT INTO products (id, slug, name, summary, description, price_cents, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    SAUCER.id,
    SAUCER.slug,
    SAUCER.name,
    SAUCER.summary,
    SAUCER.description,
    SAUCER.price,
  );
  insertPool(db);
}

function insertPool(db: DatabaseSync) {
  const taken = one(db, "SELECT id FROM batches WHERE id = 'bat_saucer'");
  const id = taken ? crypto.randomUUID() : "bat_saucer";
  const sequence = one(
    db,
    "SELECT COALESCE(MAX(sequence), 0) AS sequence FROM batches WHERE product_id = ?",
    SAUCER.id,
  );
  const next = sequence ? Number(sequence.sequence) + 1 : 1;
  run(
    db,
    `INSERT INTO batches (id, product_id, sequence, target_qty, filled_qty, status, closed_at)
     VALUES (?, ?, ?, 1000000000, 0, 'open', NULL)`,
    id,
    SAUCER.id,
    next,
  );
}

export function ensureSuperuser(db: DatabaseSync) {
  const account = DEMO_ACCOUNTS.superuser;
  const passwordHash = hashPassword(account.password, "seed-usr_super");
  const existing = one(db, "SELECT id FROM users WHERE email = ?", account.email);
  if (!existing) {
    run(
      db,
      `INSERT INTO users (
        id, email, password_hash, name, street, house_number, postal_code, city, country, role, created_at
      ) VALUES ('usr_super', ?, ?, ?, 'Dienerstrasse', '12', '8004', 'Zürich', 'CH', 'admin', ?)`,
      account.email,
      passwordHash,
      account.name,
      "2026-10-01T08:00:00.000Z",
    );
  } else {
    run(
      db,
      "UPDATE users SET role = 'admin', password_hash = ?, name = ? WHERE email = ?",
      passwordHash,
      account.name,
      account.email,
    );
  }
  run(db, "UPDATE users SET role = 'customer' WHERE email != ? AND role = 'admin'", account.email);
}
