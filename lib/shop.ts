import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { DEMO_ACCOUNTS, PRODUCTION_AT, RESET_MINUTES } from "./constants";
import { ShopError } from "./errors";
import { formatDay, zurichDayKey } from "./format";
import {
  paymentDueLetter,
  paymentReceivedLetter,
  reservationLetter,
  resetLetter,
  shippedLetter,
  welcomeLetter,
} from "./letters";
import { hashPassword, sha256, verifyPassword } from "./password";
import { int, str, strOrNull, type Row } from "./rows";
import { many, one, run, withTransaction } from "./sql";
import type {
  Address,
  AdminLine,
  CardDetails,
  CartLine,
  Letter,
  Notice,
  OrderGroup,
  ProductStat,
  ReservationLine,
  ReservationStatus,
  User,
} from "./types";
import { validateAddress, validateCard, validateEmail, validatePassword } from "./validate";

export type RegisterInput = Address & {
  email: string;
  password: string;
};

export type LineRequest = {
  productId: string;
  quantity: number;
};

function mapUser(row: Row): User {
  return {
    id: str(row, "id"),
    email: str(row, "email"),
    name: str(row, "name"),
    role: str(row, "role") === "admin" ? "admin" : "customer",
    street: str(row, "street"),
    houseNumber: str(row, "house_number"),
    postalCode: str(row, "postal_code"),
    city: str(row, "city"),
    country: str(row, "country"),
  };
}

function mapAddress(row: Row, prefix = "ship_"): Address {
  return {
    name: str(row, `${prefix}name`),
    street: str(row, `${prefix}street`),
    houseNumber: str(row, `${prefix}house_number`),
    postalCode: str(row, `${prefix}postal_code`),
    city: str(row, `${prefix}city`),
    country: str(row, `${prefix}country`),
  };
}

function mapReservation(row: Row): ReservationLine {
  return {
    id: str(row, "id"),
    orderId: str(row, "order_id"),
    productId: str(row, "product_id"),
    slug: str(row, "slug"),
    productName: str(row, "product_name"),
    quantity: int(row, "quantity"),
    unitPriceCents: int(row, "unit_price_cents"),
    status: str(row, "status") as ReservationStatus,
    batchId: str(row, "batch_id"),
    batchSequence: int(row, "sequence"),
    batchStatus: str(row, "batch_status") === "closed" ? "closed" : "open",
    paymentOpen: int(row, "reserved_total") >= PRODUCTION_AT,
    createdAt: str(row, "created_at"),
    paidAt: strOrNull(row, "paid_at"),
    shippedAt: strOrNull(row, "shipped_at"),
    address: mapAddress(row),
  };
}

const RESERVATION_SELECT = `
  SELECT r.id, r.order_id, r.user_id, r.product_id, r.batch_id, r.quantity, r.unit_price_cents,
         r.status, r.created_at, r.paid_at, r.shipped_at,
         r.ship_name, r.ship_street, r.ship_house_number, r.ship_postal_code, r.ship_city, r.ship_country,
         p.slug, p.name AS product_name,
         b.sequence, b.status AS batch_status,
         (SELECT COALESCE(SUM(x.quantity), 0) FROM reservations x WHERE x.product_id = r.product_id) AS reserved_total,
         (SELECT u.email FROM users u WHERE u.id = r.user_id) AS email
  FROM reservations r
  JOIN products p ON p.id = r.product_id
  JOIN batches b ON b.id = r.batch_id
`;

export function listProducts(db: DatabaseSync): ProductStat[] {
  return many(
    db,
    `SELECT p.id, p.slug, p.name, p.summary, p.description, p.price_cents,
            COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.product_id = p.id), 0) AS open_filled,
            1 AS has_open,
            COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.product_id = p.id AND r.status = 'reserved'), 0) AS reserved_qty,
            COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.product_id = p.id AND r.status = 'reserved' AND (SELECT COALESCE(SUM(r2.quantity), 0) FROM reservations r2 WHERE r2.product_id = p.id) >= ${PRODUCTION_AT}), 0) AS payment_due_qty,
            COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.product_id = p.id AND r.status = 'paid'), 0) AS paid_qty,
            COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.product_id = p.id AND r.status = 'shipped'), 0) AS shipped_qty
     FROM products p
     ORDER BY p.sort_order`,
  ).map((row) => ({
    id: str(row, "id"),
    slug: str(row, "slug"),
    name: str(row, "name"),
    summary: str(row, "summary"),
    description: str(row, "description"),
    priceCents: int(row, "price_cents"),
    openFilled: int(row, "open_filled"),
    hasOpenBatch: int(row, "has_open") === 1,
    reservedQty: int(row, "reserved_qty"),
    paymentDueQty: int(row, "payment_due_qty"),
    paidQty: int(row, "paid_qty"),
    shippedQty: int(row, "shipped_qty"),
  }));
}

export function getProductBySlug(db: DatabaseSync, slug: string) {
  return listProducts(db).find((product) => product.slug === slug) ?? null;
}

export function getProductById(db: DatabaseSync, id: string) {
  return listProducts(db).find((product) => product.id === id) ?? null;
}

export function getUserById(db: DatabaseSync, id: string) {
  const row = one(db, "SELECT * FROM users WHERE id = ?", id);
  return row ? mapUser(row) : null;
}

export function getUserByEmail(db: DatabaseSync, email: string) {
  const row = one(db, "SELECT * FROM users WHERE email = ?", email.trim().toLowerCase());
  return row ? mapUser(row) : null;
}

export function authenticate(db: DatabaseSync, email: string, password: string) {
  const key = email.trim().toLowerCase();
  const lookup = key === DEMO_ACCOUNTS.superuser.login ? DEMO_ACCOUNTS.superuser.email : key;
  const row = one(db, "SELECT * FROM users WHERE email = ?", lookup);
  if (!row) return null;
  if (!verifyPassword(password, str(row, "password_hash"))) return null;
  return mapUser(row);
}

export function registerUser(db: DatabaseSync, input: RegisterInput) {
  const email = validateEmail(input.email);
  if (!email.ok) throw new ShopError(email.formError, email.fieldErrors);
  const password = validatePassword(input.password);
  if (!password.ok) throw new ShopError(password.formError, password.fieldErrors);
  const address = validateAddress(input);
  if (!address.ok) throw new ShopError(address.formError, address.fieldErrors);
  if (getUserByEmail(db, email.value)) {
    throw new ShopError("An account with this email already exists.", {
      email: "An account with this email already exists.",
    });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const value = address.value;
  run(
    db,
    `INSERT INTO users (
      id, email, password_hash, name, street, house_number, postal_code, city, country, role, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'customer', ?)`,
    id,
    email.value,
    hashPassword(password.value),
    value.name,
    value.street,
    value.houseNumber,
    value.postalCode,
    value.city,
    value.country,
    now,
  );
  deliver(db, id, email.value, welcomeLetter(email.value), now);
  const user = getUserById(db, id);
  if (!user) throw new ShopError("The account could not be created.");
  return user;
}

export function saveAddress(db: DatabaseSync, userId: string, input: Address) {
  const address = validateAddress(input);
  if (!address.ok) throw new ShopError(address.formError, address.fieldErrors);
  const value = address.value;
  const result = run(
    db,
    `UPDATE users
     SET name = ?, street = ?, house_number = ?, postal_code = ?, city = ?, country = ?
     WHERE id = ?`,
    value.name,
    value.street,
    value.houseNumber,
    value.postalCode,
    value.city,
    value.country,
    userId,
  );
  if (Number(result.changes) !== 1) throw new ShopError("Account not found.");
  return value;
}

export function requestPasswordReset(db: DatabaseSync, email: string, now = new Date()): Letter | null {
  const user = getUserByEmail(db, email);
  if (!user) return null;
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(now.getTime() + RESET_MINUTES * 60 * 1000).toISOString();
  run(
    db,
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at)
     VALUES (?, ?, ?, ?, NULL)`,
    crypto.randomUUID(),
    user.id,
    sha256(token),
    expires,
  );
  const letter = resetLetter({ name: user.name, email: user.email, token });
  const createdAt = now.toISOString();
  const id = crypto.randomUUID();
  run(
    db,
    `INSERT INTO outbox (id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    id,
    user.email,
    letter.subject,
    letter.body,
    createdAt,
  );
  return { id, toEmail: user.email, subject: letter.subject, body: letter.body, createdAt };
}

export function resetPassword(db: DatabaseSync, token: string, password: string, now = new Date()) {
  const checked = validatePassword(password);
  if (!checked.ok) throw new ShopError(checked.formError, checked.fieldErrors);
  const row = one(db, "SELECT * FROM password_resets WHERE token_hash = ?", sha256(token));
  if (!row || strOrNull(row, "used_at") || str(row, "expires_at") <= now.toISOString()) {
    throw new ShopError("This reset link is invalid or has expired.");
  }
  const userId = str(row, "user_id");
  const stamp = now.toISOString();
  run(db, "UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(checked.value), userId);
  run(
    db,
    "UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
    stamp,
    userId,
  );
  run(db, "DELETE FROM sessions WHERE user_id = ?", userId);
  return userId;
}

export function getCart(db: DatabaseSync, userId: string): CartLine[] {
  return many(
    db,
    `SELECT c.product_id, c.quantity, p.slug, p.name, p.price_cents,
            COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.product_id = p.id), 0) AS open_filled
     FROM cart_items c
     JOIN products p ON p.id = c.product_id
     WHERE c.user_id = ?
     ORDER BY p.sort_order`,
    userId,
  ).map((row) => ({
    productId: str(row, "product_id"),
    slug: str(row, "slug"),
    name: str(row, "name"),
    priceCents: int(row, "price_cents"),
    quantity: int(row, "quantity"),
    openFilled: int(row, "open_filled"),
  }));
}

export function cartCount(db: DatabaseSync, userId: string) {
  const row = one(db, "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM cart_items WHERE user_id = ?", userId);
  return row ? int(row, "quantity") : 0;
}

export function addToCart(db: DatabaseSync, userId: string, productId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ShopError("Choose at least 1 piece. The quantity is not limited.");
  }
  const product = one(db, "SELECT id FROM products WHERE id = ?", productId);
  if (!product) throw new ShopError("That piece is not in the workshop.");
  const existing = one(
    db,
    "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
    userId,
    productId,
  );
  const next = (existing ? int(existing, "quantity") : 0) + quantity;
  run(
    db,
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
     ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = excluded.quantity`,
    userId,
    productId,
    next,
  );
}

export function setCartQuantity(db: DatabaseSync, userId: string, productId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    run(db, "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", userId, productId);
    return;
  }
  run(
    db,
    "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?",
    quantity,
    userId,
    productId,
  );
}

export function reserveForUser(db: DatabaseSync, userId: string, lines: LineRequest[]) {
  return withTransaction(db, () => allocate(db, userId, lines));
}

export function reserveCart(db: DatabaseSync, userId: string) {
  return withTransaction(db, () => {
    const lines = many(db, "SELECT product_id, quantity FROM cart_items WHERE user_id = ?", userId).map(
      (row) => ({
        productId: str(row, "product_id"),
        quantity: int(row, "quantity"),
      }),
    );
    const result = allocate(db, userId, lines);
    run(db, "DELETE FROM cart_items WHERE user_id = ?", userId);
    return result;
  });
}

function allocate(db: DatabaseSync, userId: string, lines: LineRequest[]) {
  if (lines.length === 0) throw new ShopError("Your cart is empty.");
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new ShopError("Reserve at least 1 piece. The quantity is not limited.");
    }
  }
  const user = getUserById(db, userId);
  if (!user) throw new ShopError("Account not found.");
  const address = validateAddress(user);
  if (!address.ok) {
    throw new ShopError("We need a valid postal address before we can reserve anything.", address.fieldErrors);
  }

  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();
  run(db, "INSERT INTO orders (id, user_id, created_at) VALUES (?, ?, ?)", orderId, userId, now);
  const closedBatchIds: string[] = [];
  let openedProduction = false;
  let payable = false;
  const before = new Map(lines.map((line) => [line.productId, reservedCount(db, line.productId)]));

  for (const line of lines) {
    const product = one(db, "SELECT id, name, price_cents FROM products WHERE id = ?", line.productId);
    if (!product) throw new ShopError("A piece in your cart is no longer in the workshop.");
    const batchId = ensurePool(db, line.productId);
    const value = address.value;
    run(
      db,
      `INSERT INTO reservations (
        id, order_id, user_id, product_id, batch_id, quantity, unit_price_cents, status,
        ship_name, ship_street, ship_house_number, ship_postal_code, ship_city, ship_country,
        created_at, paid_at, shipped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'reserved', ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      crypto.randomUUID(),
      orderId,
      userId,
      line.productId,
      batchId,
      line.quantity,
      int(product, "price_cents"),
      value.name,
      value.street,
      value.houseNumber,
      value.postalCode,
      value.city,
      value.country,
      now,
    );
    run(
      db,
      "UPDATE batches SET filled_qty = filled_qty + ? WHERE id = ?",
      line.quantity,
      batchId,
    );
    deliver(
      db,
      userId,
      user.email,
      reservationLetter({
        name: user.name,
        productName: str(product, "name"),
        quantity: line.quantity,
      }),
      now,
    );
    const previous = before.get(line.productId) ?? 0;
    const total = reservedCount(db, line.productId);
    if (total >= PRODUCTION_AT) {
      payable = true;
      closedBatchIds.push(batchId);
      if (previous < PRODUCTION_AT) {
        openedProduction = true;
        notifyProductionStarted(db, line.productId, now);
      } else {
        notifyPayer(db, userId, orderId, now);
      }
    }
  }

  return { orderId, closedBatchIds, openedProduction, payable };
}

function reservedCount(db: DatabaseSync, productId: string) {
  const row = one(
    db,
    "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM reservations WHERE product_id = ?",
    productId,
  );
  return row ? int(row, "quantity") : 0;
}

function ensurePool(db: DatabaseSync, productId: string) {
  const open = one(
    db,
    "SELECT id FROM batches WHERE product_id = ? AND status = 'open'",
    productId,
  );
  if (open) return str(open, "id");
  const max = one(
    db,
    "SELECT COALESCE(MAX(sequence), 0) AS sequence FROM batches WHERE product_id = ?",
    productId,
  );
  const batchId = crypto.randomUUID();
  run(
    db,
    `INSERT INTO batches (id, product_id, sequence, target_qty, filled_qty, status, closed_at)
     VALUES (?, ?, ?, ?, 0, 'open', NULL)`,
    batchId,
    productId,
    (max ? int(max, "sequence") : 0) + 1,
    1_000_000_000,
  );
  return batchId;
}

function productionOpen(db: DatabaseSync, productId: string) {
  return reservedCount(db, productId) >= PRODUCTION_AT;
}

function notifyProductionStarted(db: DatabaseSync, productId: string, now: string) {
  notifyHolders(db, now, "r.product_id = ? AND r.status = 'reserved'", [productId]);
}

function notifyPayer(db: DatabaseSync, userId: string, orderId: string, now: string) {
  notifyHolders(db, now, "r.user_id = ? AND r.order_id = ? AND r.status = 'reserved'", [userId, orderId]);
}

function notifyHolders(db: DatabaseSync, now: string, where: string, params: string[]) {
  const holders = many(
    db,
    `SELECT u.id AS user_id, u.email, u.name,
            p.name AS product_name, b.sequence,
            r.ship_name, r.ship_street, r.ship_house_number, r.ship_postal_code, r.ship_city, r.ship_country,
            SUM(r.quantity) AS quantity
     FROM reservations r
     JOIN users u ON u.id = r.user_id
     JOIN products p ON p.id = r.product_id
     JOIN batches b ON b.id = r.batch_id
     WHERE ${where}
     GROUP BY u.id, p.id`,
    ...params,
  );
  for (const row of holders) {
    const letter = paymentDueLetter({
      name: str(row, "name"),
      productName: str(row, "product_name"),
      sequence: int(row, "sequence"),
      quantity: int(row, "quantity"),
      address: mapAddress(row),
    });
    deliver(db, str(row, "user_id"), str(row, "email"), letter, now);
  }
}

export function listPaymentDue(db: DatabaseSync, userId: string) {
  return many(
    db,
    `${RESERVATION_SELECT}
     WHERE r.user_id = ? AND r.status = 'reserved'
       AND (SELECT COALESCE(SUM(r2.quantity), 0) FROM reservations r2 WHERE r2.product_id = r.product_id) >= ${PRODUCTION_AT}
     ORDER BY r.created_at, p.sort_order`,
    userId,
  ).map(mapReservation);
}

export function payReservations(
  db: DatabaseSync,
  userId: string,
  reservationIds: string[],
  card: CardDetails,
  now = new Date(),
) {
  const checked = validateCard(card, now);
  if (!checked.ok) throw new ShopError(checked.formError, checked.fieldErrors);
  const ids = [...new Set(reservationIds.filter(Boolean))];
  if (ids.length === 0) throw new ShopError("Choose at least one reservation to pay.");

  return withTransaction(db, () => {
    const lines: ReservationLine[] = [];
    for (const id of ids) {
      const row = one(db, `${RESERVATION_SELECT} WHERE r.id = ? AND r.user_id = ?`, id, userId);
      if (!row) throw new ShopError("That reservation is not on your account.");
      const line = mapReservation(row);
      if (line.status !== "reserved") throw new ShopError("That reservation is already paid or shipped.");
      if (!productionOpen(db, line.productId)) {
        throw new ShopError("Payment opens when 100 pieces are reserved. You can keep reserving until then.");
      }
      lines.push(line);
    }
    const stamp = now.toISOString();
    for (const line of lines) {
      run(db, "UPDATE reservations SET status = 'paid', paid_at = ? WHERE id = ?", stamp, line.id);
    }
    const user = getUserById(db, userId);
    if (!user) throw new ShopError("Account not found.");
    const letter = paymentReceivedLetter({
      name: user.name,
      lines: lines.map((line) => ({ productName: line.productName, quantity: line.quantity })),
    });
    deliver(db, userId, user.email, letter, stamp);
    const totalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
    return { totalCents, count: lines.length };
  });
}

export function listOrders(db: DatabaseSync, userId: string): OrderGroup[] {
  const lines = many(
    db,
    `${RESERVATION_SELECT}
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC, p.sort_order`,
    userId,
  ).map(mapReservation);
  const orders = new Map<string, OrderGroup>();
  for (const line of lines) {
    const existing = orders.get(line.orderId);
    if (existing) {
      existing.lines.push(line);
      if (line.createdAt < existing.createdAt) existing.createdAt = line.createdAt;
    } else {
      orders.set(line.orderId, { id: line.orderId, createdAt: line.createdAt, lines: [line] });
    }
  }
  return [...orders.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getOrder(db: DatabaseSync, userId: string, orderId: string) {
  return listOrders(db, userId).find((order) => order.id === orderId) ?? null;
}

export type OrderSort = "user" | "state" | "date";
export type OrderGroupBy = "none" | "user" | "state" | "date";

const STATE_RANK: Record<ReservationStatus, number> = {
  reserved: 0,
  paid: 1,
  shipped: 2,
};

export const ORDER_STATE_LABEL: Record<ReservationStatus, string> = {
  reserved: "Reserve",
  paid: "Pay",
  shipped: "Ship",
};

function mapAdminLine(row: Row): AdminLine {
  return {
    ...mapReservation(row),
    userId: str(row, "user_id"),
    email: str(row, "email"),
  };
}

export function listOrderedItems(db: DatabaseSync): AdminLine[] {
  return many(db, `${RESERVATION_SELECT} ORDER BY r.created_at, r.id`).map(mapAdminLine);
}

function compareOrdered(a: AdminLine, b: AdminLine, sort: OrderSort) {
  if (sort === "user") {
    const name = a.address.name.localeCompare(b.address.name, "en", { sensitivity: "base" });
    if (name !== 0) return name;
    return a.email.localeCompare(b.email, "en", { sensitivity: "base" });
  }
  if (sort === "state") return STATE_RANK[a.status] - STATE_RANK[b.status];
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}

export function sortOrderedItems(lines: AdminLine[], sort: OrderSort, dir: "asc" | "desc") {
  const sign = dir === "desc" ? -1 : 1;
  return [...lines].sort((a, b) => sign * compareOrdered(a, b, sort) || a.id.localeCompare(b.id));
}

export function groupOrderedItems(
  lines: AdminLine[],
  group: OrderGroupBy,
  sort: OrderSort,
  dir: "asc" | "desc",
) {
  const sorted = sortOrderedItems(lines, sort, dir);
  if (group === "none") return [{ key: "all", label: "", lines: sorted }];
  const buckets = new Map<string, AdminLine[]>();
  for (const line of sorted) {
    const key =
      group === "user"
        ? line.email.toLowerCase()
        : group === "state"
          ? line.status
          : zurichDayKey(line.createdAt);
    const existing = buckets.get(key);
    if (existing) existing.push(line);
    else buckets.set(key, [line]);
  }
  const groups = [...buckets.entries()].map(([key, items]) => ({
    key,
    label:
      group === "user"
        ? `${items[0].address.name} · ${items[0].email}`
        : group === "state"
          ? ORDER_STATE_LABEL[items[0].status]
          : formatDay(items[0].createdAt),
    lines: items,
  }));
  const sign = dir === "desc" ? -1 : 1;
  groups.sort((a, b) => {
    if (group === "state") {
      return sign * (STATE_RANK[a.key as ReservationStatus] - STATE_RANK[b.key as ReservationStatus]);
    }
    return sign * a.key.localeCompare(b.key, "en", { sensitivity: "base" });
  });
  return groups;
}

export function listAdminLines(db: DatabaseSync, productId: string, status?: ReservationStatus): AdminLine[] {
  const rows = status
    ? many(
        db,
        `${RESERVATION_SELECT}
         WHERE r.product_id = ? AND r.status = ?
         ORDER BY b.sequence, r.created_at`,
        productId,
        status,
      )
    : many(
        db,
        `${RESERVATION_SELECT}
         WHERE r.product_id = ?
         ORDER BY b.sequence, r.created_at`,
        productId,
      );
  return rows.map(mapAdminLine);
}

export function markShipped(db: DatabaseSync, reservationId: string, now = new Date()) {
  return withTransaction(db, () => {
    const row = one(db, `${RESERVATION_SELECT} WHERE r.id = ?`, reservationId);
    if (!row) throw new ShopError("That reservation does not exist.");
    const line = mapReservation(row);
    if (line.status === "shipped") throw new ShopError("Those pieces have already shipped.");
    if (line.status !== "paid") {
      throw new ShopError("Payment has to come in before these pieces can ship.");
    }
    const stamp = now.toISOString();
    run(db, "UPDATE reservations SET status = 'shipped', shipped_at = ? WHERE id = ?", stamp, line.id);
    const letter = shippedLetter({
      name: line.address.name,
      productName: line.productName,
      quantity: line.quantity,
      address: line.address,
    });
    deliver(db, str(row, "user_id"), str(row, "email"), letter, stamp);
    return line;
  });
}

export function markAllPaidShipped(db: DatabaseSync, productId: string) {
  const ids = many(
    db,
    "SELECT id FROM reservations WHERE product_id = ? AND status = 'paid'",
    productId,
  ).map((row) => str(row, "id"));
  for (const id of ids) markShipped(db, id);
  return ids.length;
}

export type ReservationNotice = Notice & {
  email: string;
  name: string;
};

export function listReservationNotices(db: DatabaseSync): ReservationNotice[] {
  return many(
    db,
    `SELECT n.id, n.title, n.body, n.href, n.read_at, n.created_at, u.email, u.name
     FROM notifications n
     JOIN users u ON u.id = n.user_id
     WHERE n.href IN ('/checkout/pay', '/orders')
     ORDER BY n.created_at DESC, n.id DESC`,
  ).map((row) => ({
    id: str(row, "id"),
    title: str(row, "title"),
    body: str(row, "body"),
    href: strOrNull(row, "href"),
    createdAt: str(row, "created_at"),
    readAt: strOrNull(row, "read_at"),
    email: str(row, "email"),
    name: str(row, "name"),
  }));
}

export function clearLeaNoticesOnce(db: DatabaseSync) {
  db.exec("CREATE TABLE IF NOT EXISTS shop_flags (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
  const flag = one(db, "SELECT value FROM shop_flags WHERE key = 'lea_notices_cleared'");
  if (flag) return;
  run(
    db,
    "DELETE FROM notifications WHERE user_id = (SELECT id FROM users WHERE email = ?)",
    DEMO_ACCOUNTS.buyer.email,
  );
  run(db, "INSERT INTO shop_flags (key, value) VALUES ('lea_notices_cleared', '1')");
}

export function listNotices(db: DatabaseSync, userId: string): Notice[] {
  return many(
    db,
    `SELECT id, title, body, href, read_at, created_at
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
    userId,
  ).map((row) => ({
    id: str(row, "id"),
    title: str(row, "title"),
    body: str(row, "body"),
    href: strOrNull(row, "href"),
    createdAt: str(row, "created_at"),
    readAt: strOrNull(row, "read_at"),
  }));
}

export function unreadCount(db: DatabaseSync, userId: string) {
  const row = one(
    db,
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL",
    userId,
  );
  return row ? int(row, "count") : 0;
}

export function markNoticesRead(db: DatabaseSync, userId: string, now = new Date()) {
  run(
    db,
    "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL",
    now.toISOString(),
    userId,
  );
}

function mapLetter(row: Row): Letter {
  return {
    id: str(row, "id"),
    toEmail: str(row, "to_email"),
    subject: str(row, "subject"),
    body: str(row, "body"),
    createdAt: str(row, "created_at"),
  };
}

export function listLetters(db: DatabaseSync, email?: string): Letter[] {
  const scoped = Boolean(email);
  return many(
    db,
    `SELECT id, to_email, subject, body, created_at
     FROM outbox
     ${scoped ? "WHERE to_email = ? COLLATE NOCASE" : ""}
     ORDER BY created_at DESC, id DESC`,
    ...(email ? [email] : []),
  ).map(mapLetter);
}

export function getLetter(db: DatabaseSync, id: string, email: string) {
  const row = one(
    db,
    `SELECT id, to_email, subject, body, created_at
     FROM outbox
     WHERE id = ? AND to_email = ? COLLATE NOCASE`,
    id,
    email,
  );
  return row ? mapLetter(row) : null;
}

function deliver(
  db: DatabaseSync,
  userId: string,
  email: string,
  letter: { title: string; subject: string; body: string; href: string },
  now: string,
) {
  run(
    db,
    `INSERT INTO notifications (id, user_id, title, body, href, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    crypto.randomUUID(),
    userId,
    letter.title,
    letter.body,
    letter.href,
    now,
  );
  run(
    db,
    "INSERT INTO outbox (id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?)",
    crypto.randomUUID(),
    email,
    letter.subject,
    letter.body,
    now,
  );
}
