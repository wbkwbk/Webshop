import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { BATCH_SIZE, MAX_LINE_QTY, RESET_MINUTES } from "./constants";
import { ShopError } from "./errors";
import {
  paymentDueLetter,
  paymentReceivedLetter,
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
         (SELECT u.email FROM users u WHERE u.id = r.user_id) AS email
  FROM reservations r
  JOIN products p ON p.id = r.product_id
  JOIN batches b ON b.id = r.batch_id
`;

export function listProducts(db: DatabaseSync): ProductStat[] {
  return many(
    db,
    `SELECT p.id, p.slug, p.name, p.summary, p.description, p.price_cents,
            COALESCE((SELECT b.filled_qty FROM batches b WHERE b.product_id = p.id AND b.status = 'open' LIMIT 1), 0) AS open_filled,
            CASE WHEN EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id AND b.status = 'open') THEN 1 ELSE 0 END AS has_open,
            COALESCE((SELECT SUM(r.quantity) FROM reservations r WHERE r.product_id = p.id AND r.status = 'reserved'), 0) AS reserved_qty,
            COALESCE((SELECT SUM(r.quantity) FROM reservations r JOIN batches b ON b.id = r.batch_id WHERE r.product_id = p.id AND r.status = 'reserved' AND b.status = 'closed'), 0) AS payment_due_qty,
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
  const row = one(db, "SELECT * FROM users WHERE email = ?", email.trim().toLowerCase());
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
  deliver(db, id, email.value, welcomeLetter(value.name), now);
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

export function requestPasswordReset(db: DatabaseSync, email: string, now = new Date()) {
  const user = getUserByEmail(db, email);
  if (!user) return;
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
  run(
    db,
    `INSERT INTO outbox (id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    user.email,
    letter.subject,
    letter.body,
    now.toISOString(),
  );
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
            COALESCE((SELECT b.filled_qty FROM batches b WHERE b.product_id = p.id AND b.status = 'open' LIMIT 1), 0) AS open_filled
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
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QTY) {
    throw new ShopError(`Choose between 1 and ${MAX_LINE_QTY} pieces.`);
  }
  const product = one(db, "SELECT id FROM products WHERE id = ?", productId);
  if (!product) throw new ShopError("That piece is not in the workshop.");
  const existing = one(
    db,
    "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
    userId,
    productId,
  );
  const next = Math.min(MAX_LINE_QTY, (existing ? int(existing, "quantity") : 0) + quantity);
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
  const capped = Math.min(MAX_LINE_QTY, quantity);
  run(
    db,
    "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?",
    capped,
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
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QTY) {
      throw new ShopError(`You can reserve between 1 and ${MAX_LINE_QTY} pieces of each product at a time.`);
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

  for (const line of lines) {
    const product = one(db, "SELECT id, price_cents FROM products WHERE id = ?", line.productId);
    if (!product) throw new ShopError("A piece in your cart is no longer in the workshop.");
    let remaining = line.quantity;
    while (remaining > 0) {
      const open = one(
        db,
        "SELECT id, target_qty, filled_qty FROM batches WHERE product_id = ? AND status = 'open'",
        line.productId,
      );
      let batchId: string;
      let filledQty: number;
      let targetQty: number;
      if (!open) {
        const max = one(
          db,
          "SELECT COALESCE(MAX(sequence), 0) AS sequence FROM batches WHERE product_id = ?",
          line.productId,
        );
        batchId = crypto.randomUUID();
        filledQty = 0;
        targetQty = BATCH_SIZE;
        run(
          db,
          `INSERT INTO batches (id, product_id, sequence, target_qty, filled_qty, status, closed_at)
           VALUES (?, ?, ?, ?, 0, 'open', NULL)`,
          batchId,
          line.productId,
          (max ? int(max, "sequence") : 0) + 1,
          BATCH_SIZE,
        );
      } else {
        batchId = str(open, "id");
        filledQty = int(open, "filled_qty");
        targetQty = int(open, "target_qty");
      }
      const space = targetQty - filledQty;
      if (space <= 0) throw new ShopError("The open batch is already full.");
      const take = Math.min(space, remaining);
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
        take,
        int(product, "price_cents"),
        value.name,
        value.street,
        value.houseNumber,
        value.postalCode,
        value.city,
        value.country,
        now,
      );
      const filled = filledQty + take;
      if (filled >= targetQty) {
        run(
          db,
          "UPDATE batches SET filled_qty = ?, status = 'closed', closed_at = ? WHERE id = ?",
          filled,
          now,
          batchId,
        );
        closedBatchIds.push(batchId);
      } else {
        run(db, "UPDATE batches SET filled_qty = ? WHERE id = ?", filled, batchId);
      }
      remaining -= take;
    }
  }

  for (const batchId of closedBatchIds) notifyBatchClosed(db, batchId, now);
  return { orderId, closedBatchIds };
}

function notifyBatchClosed(db: DatabaseSync, batchId: string, now: string) {
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
     WHERE r.batch_id = ?
     GROUP BY u.id`,
    batchId,
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
     WHERE r.user_id = ? AND r.status = 'reserved' AND b.status = 'closed'
     ORDER BY b.closed_at, p.sort_order`,
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
      if (line.batchStatus !== "closed") {
        throw new ShopError("Payment opens when 100 pieces of this product are reserved.");
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
  return rows.map((row) => ({
    ...mapReservation(row),
    userId: str(row, "user_id"),
    email: str(row, "email"),
  }));
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

export function listLetters(db: DatabaseSync): Letter[] {
  return many(
    db,
    "SELECT id, to_email, subject, body, created_at FROM outbox ORDER BY created_at DESC, id DESC",
  ).map((row) => ({
    id: str(row, "id"),
    toEmail: str(row, "to_email"),
    subject: str(row, "subject"),
    body: str(row, "body"),
    createdAt: str(row, "created_at"),
  }));
}

export function getLetter(db: DatabaseSync, id: string) {
  return listLetters(db).find((letter) => letter.id === id) ?? null;
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
