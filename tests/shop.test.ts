import assert from "node:assert/strict";
import { test } from "node:test";
import { describeAllocation } from "../lib/batches";
import { openDatabase } from "../lib/db";
import { ensureCatalog } from "../lib/seed";
import { run } from "../lib/sql";
import {
  addToCart,
  authenticate,
  getCart,
  clearLeaNoticesOnce,
  groupOrderedItems,
  listReservationNotices,
  listLetters,
  listNotices,
  listOrderedItems,
  listOrders,
  listPaymentDue,
  listProducts,
  markShipped,
  payReservations,
  registerUser,
  requestPasswordReset,
  reserveCart,
  reserveForUser,
  resetPassword,
  setCartQuantity,
} from "../lib/shop";
import type { Address } from "../lib/types";
import { validateAddress, validateCard } from "../lib/validate";

const address: Address = {
  name: "Lea Keller",
  street: "Bahnhofstrasse",
  houseNumber: "12",
  postalCode: "8001",
  city: "Zürich",
  country: "CH",
};

function memory() {
  return openDatabase(":memory:", { seed: false });
}

function addProduct(db: ReturnType<typeof memory>, id = "prd_test", name = "Test bowl") {
  run(
    db,
    `INSERT INTO products (id, slug, name, summary, description, price_cents, sort_order)
     VALUES (?, ?, ?, 'A bowl', 'A bowl for the batch.', 4200, 1)`,
    id,
    id,
    name,
  );
}

function createUser(db: ReturnType<typeof memory>, email: string, patch?: Partial<Address>) {
  return registerUser(db, {
    email,
    password: "password-1",
    ...address,
    ...patch,
  });
}

const card = {
  name: "Lea Keller",
  number: "4242424242424242",
  expiry: "12/30",
  cvc: "123",
};

test("postal addresses need a street, a house number, and a real code", () => {
  const good = validateAddress(address);
  assert.equal(good.ok, true);

  const postbox = validateAddress({ ...address, street: "Postfach" });
  assert.equal(postbox.ok, false);
  if (!postbox.ok) assert.match(postbox.fieldErrors.street, /street address/);

  const noNumber = validateAddress({ ...address, houseNumber: "" });
  assert.equal(noNumber.ok, false);

  const badCode = validateAddress({ ...address, postalCode: "80" });
  assert.equal(badCode.ok, false);

  const germany = validateAddress({
    ...address,
    street: "Torstrasse",
    postalCode: "10115",
    city: "Berlin",
    country: "DE",
  });
  assert.equal(germany.ok, true);
});

test("card numbers use the Luhn check and a future expiry", () => {
  assert.equal(validateCard(card, new Date("2026-10-22T00:00:00.000Z")).ok, true);
  assert.equal(validateCard({ ...card, number: "4242424242424243" }).ok, false);
  const expired = validateCard({ ...card, expiry: "01/20" }, new Date("2026-10-22T00:00:00.000Z"));
  assert.equal(expired.ok, false);
});

test("allocation describes when a reservation closes the hundred", () => {
  const waiting = describeAllocation(97, 2);
  assert.equal(waiting.closesBatch, false);
  const exact = describeAllocation(97, 3);
  assert.equal(exact.closesBatch, true);
  assert.equal(exact.intoFollowing, 0);
  const span = describeAllocation(97, 5);
  assert.equal(span.intoOpen, 3);
  assert.equal(span.intoFollowing, 2);
  assert.equal(describeAllocation(0, 100).batchesClosed, 1);
});

test("the hundredth piece notifies every buyer and only then opens payment", () => {
  const db = memory();
  addProduct(db);
  const ada = createUser(db, "ada@example.com");
  const noa = createUser(db, "noa@example.com");
  reserveForUser(db, ada.id, [{ productId: "prd_test", quantity: 60 }]);
  assert.equal(listPaymentDue(db, ada.id).length, 0);
  const waitingId = listOrders(db, ada.id)[0]?.lines[0]?.id ?? "";
  assert.throws(() => payReservations(db, ada.id, [waitingId], card), /100 pieces/);

  reserveForUser(db, noa.id, [{ productId: "prd_test", quantity: 40 }]);
  const dueAda = listPaymentDue(db, ada.id);
  const dueNoa = listPaymentDue(db, noa.id);
  assert.equal(dueAda.length, 1);
  assert.equal(dueAda[0]?.quantity, 60);
  assert.equal(dueNoa[0]?.quantity, 40);
  assert.equal(listNotices(db, ada.id).filter((notice) => notice.href === "/checkout/pay").length, 1);
  assert.equal(listNotices(db, noa.id).filter((notice) => notice.href === "/checkout/pay").length, 1);

  const paid = payReservations(db, ada.id, [dueAda[0].id], card);
  assert.equal(paid.totalCents, 60 * 4200);
  assert.equal(listPaymentDue(db, ada.id).length, 0);
  assert.throws(() => markShipped(db, dueNoa[0].id), /Payment has to come in/);
  markShipped(db, dueAda[0].id);
  assert.equal(listProducts(db)[0]?.shippedQty, 60);
  assert.equal(listProducts(db)[0]?.paidQty, 0);
  assert.equal(listProducts(db)[0]?.reservedQty, 40);
});

test("a single order of 100 notifies only that buyer", () => {
  const db = memory();
  addProduct(db, "prd_one", "Kettle");
  const lea = createUser(db, "lea@example.com");
  const other = createUser(db, "other@example.com");
  reserveForUser(db, lea.id, [{ productId: "prd_one", quantity: 100 }]);
  assert.equal(listPaymentDue(db, lea.id)[0]?.quantity, 100);
  assert.equal(listNotices(db, other.id).some((notice) => notice.href === "/checkout/pay"), false);
});

test("quantity past 100 stays one reservation and opens payment for everyone", () => {
  const db = memory();
  addProduct(db);
  const first = createUser(db, "first@example.com", { name: "Ada Berg" });
  const second = createUser(db, "second@example.com", { name: "Noa Frei" });
  reserveForUser(db, first.id, [{ productId: "prd_test", quantity: 40 }]);
  const result = reserveForUser(db, second.id, [{ productId: "prd_test", quantity: 100 }]);
  assert.equal(result.openedProduction, true);
  assert.equal(listOrders(db, second.id)[0]?.lines.length, 1);
  assert.equal(listPaymentDue(db, second.id)[0]?.quantity, 100);
  assert.equal(listPaymentDue(db, first.id)[0]?.quantity, 40);
  const product = listProducts(db)[0];
  assert.equal(product?.openFilled, 140);
  assert.equal(product?.paymentDueQty, 140);
  assert.equal(product?.reservedQty, 140);
  payReservations(db, second.id, listPaymentDue(db, second.id).map((line) => line.id), card);
  assert.equal(listProducts(db)[0]?.paidQty, 100);
  assert.equal(listProducts(db)[0]?.reservedQty, 40);
  assert.equal(listProducts(db)[0]?.openFilled, 140);
});

test("a single order of 250 is one payable line", () => {
  const db = memory();
  addProduct(db);
  const lea = createUser(db, "lea@example.com");
  const other = createUser(db, "watcher@example.com");
  const result = reserveForUser(db, lea.id, [{ productId: "prd_test", quantity: 250 }]);
  assert.equal(result.openedProduction, true);
  assert.equal(listOrders(db, lea.id)[0]?.lines.length, 1);
  assert.equal(listPaymentDue(db, lea.id)[0]?.quantity, 250);
  assert.equal(listNotices(db, other.id).some((notice) => notice.href === "/checkout/pay"), false);
});

test("an order after production has started can be paid immediately", () => {
  const db = memory();
  addProduct(db);
  const first = createUser(db, "first@example.com");
  const second = createUser(db, "second@example.com");
  reserveForUser(db, first.id, [{ productId: "prd_test", quantity: 100 }]);
  const before = listNotices(db, first.id).filter((notice) => notice.href === "/checkout/pay").length;
  const result = reserveForUser(db, second.id, [{ productId: "prd_test", quantity: 5 }]);
  assert.equal(result.openedProduction, false);
  assert.equal(result.payable, true);
  assert.equal(listPaymentDue(db, second.id)[0]?.quantity, 5);
  assert.equal(listNotices(db, second.id).filter((notice) => notice.href === "/checkout/pay").length, 1);
  assert.equal(listNotices(db, first.id).filter((notice) => notice.href === "/checkout/pay").length, before);
});

test("reservation stores the postal address and refuses an invalid one", () => {
  const db = memory();
  addProduct(db);
  const user = createUser(db, "bad@example.com", { houseNumber: "4b" });
  run(db, "UPDATE users SET house_number = '' WHERE id = ?", user.id);
  assert.throws(() => reserveForUser(db, user.id, [{ productId: "prd_test", quantity: 1 }]), /postal address/);
});

test("cart checkout keeps any quantity and clears the cart", () => {
  const db = memory();
  addProduct(db);
  const user = createUser(db, "cart@example.com");
  addToCart(db, user.id, "prd_test", 30);
  addToCart(db, user.id, "prd_test", 80);
  assert.equal(getCart(db, user.id)[0]?.quantity, 110);
  addToCart(db, user.id, "prd_test", 390);
  assert.equal(getCart(db, user.id)[0]?.quantity, 500);
  const result = reserveCart(db, user.id);
  assert.equal(result.payable, true);
  assert.equal(getCart(db, user.id).length, 0);
  assert.equal(listPaymentDue(db, user.id)[0]?.quantity, 500);
  setCartQuantity(db, user.id, "prd_test", 0);
  assert.equal(getCart(db, user.id).length, 0);
});

test("a failed card does not mark the reservation paid", () => {
  const db = memory();
  addProduct(db);
  const user = createUser(db, "pay@example.com");
  reserveForUser(db, user.id, [{ productId: "prd_test", quantity: 100 }]);
  const id = listPaymentDue(db, user.id)[0].id;
  assert.throws(
    () => payReservations(db, user.id, [id], { ...card, number: "4111111111111112" }),
    /Nothing was charged/,
  );
  assert.equal(listPaymentDue(db, user.id).length, 1);
});

test("password reset letters work once", () => {
  const db = memory();
  const user = createUser(db, "reset@example.com");
  const before = listLetters(db).length;
  requestPasswordReset(db, "missing@example.com");
  assert.equal(listLetters(db).length, before);
  requestPasswordReset(db, "reset@example.com", new Date("2026-10-22T10:00:00.000Z"));
  const letter = listLetters(db).find((item) => item.subject.includes("Reset"));
  assert.ok(letter);
  const token = letter.body.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  assert.ok(token);
  const userId = resetPassword(db, token, "new-password", new Date("2026-10-22T10:30:00.000Z"));
  assert.equal(userId, user.id);
  assert.equal(authenticate(db, user.email, "new-password")?.id, user.id);
  assert.equal(authenticate(db, user.email, "password-1"), null);
  assert.throws(() => resetPassword(db, token, "another-password-2"), /invalid or has expired/);
});

test("registration rejects a duplicate email", () => {
  const db = memory();
  createUser(db, "same@example.com");
  assert.throws(() => createUser(db, "same@example.com"), /already exists/);
});

test("the shop starts with the AFM Saucer Mod and zero reserved", () => {
  const db = openDatabase(":memory:", { seed: true });
  const products = listProducts(db);
  assert.equal(products.length, 1);
  assert.equal(products[0]?.slug, "afm-saucer-mod");
  assert.equal(products[0]?.name, "AFM Saucer MOD");
  assert.equal(products[0]?.openFilled, 0);
  assert.equal(products[0]?.reservedQty, 0);
  assert.equal(products[0]?.priceCents, 18000);
  const lea = authenticate(db, "lea@hundert.shop", "lea-hundert");
  assert.equal(lea?.role, "customer");
  assert.ok(lea);
  assert.equal(listPaymentDue(db, lea.id).length, 0);
  assert.equal(listOrders(db, lea.id).length, 0);
  const superuser = authenticate(db, "superuser", "superuser");
  assert.equal(superuser?.role, "admin");
  assert.equal(authenticate(db, "superuser@hundert.shop", "superuser")?.id, superuser?.id);
  assert.equal(authenticate(db, "lea@hundert.shop", "superuser"), null);
});

test("an older catalog is replaced by the saucer and keeps user accounts", () => {
  const db = memory();
  addProduct(db, "prd_apron", "Heavy linen apron");
  const user = createUser(db, "kept@example.com");
  reserveForUser(db, user.id, [{ productId: "prd_apron", quantity: 3 }]);
  ensureCatalog(db);
  const products = listProducts(db);
  assert.equal(products.length, 1);
  assert.equal(products[0]?.name, "AFM Saucer MOD");
  assert.equal(products[0]?.openFilled, 0);
  assert.equal(listOrders(db, user.id).length, 0);
  assert.equal(authenticate(db, "kept@example.com", "password-1")?.id, user.id);
});

test("ordered items can be sorted and grouped by user, state, and date", () => {
  const db = memory();
  addProduct(db);
  const ada = createUser(db, "ada@example.com", { name: "Ada Berg" });
  const noa = createUser(db, "noa@example.com", { name: "Noa Frei" });
  reserveForUser(db, noa.id, [{ productId: "prd_test", quantity: 40 }]);
  reserveForUser(db, ada.id, [{ productId: "prd_test", quantity: 70 }]);
  const adaLine = listPaymentDue(db, ada.id)[0];
  const noaLine = listPaymentDue(db, noa.id)[0];
  assert.ok(adaLine);
  assert.ok(noaLine);
  run(db, "UPDATE reservations SET created_at = ? WHERE id = ?", "2026-10-02T10:00:00.000Z", noaLine.id);
  run(db, "UPDATE reservations SET created_at = ? WHERE id = ?", "2026-10-03T10:00:00.000Z", adaLine.id);
  payReservations(db, ada.id, [adaLine.id], card);
  markShipped(db, adaLine.id);

  const lines = listOrderedItems(db);
  assert.equal(lines.length, 2);
  const byUser = groupOrderedItems(lines, "user", "user", "asc").map((group) => group.label);
  assert.deepEqual(byUser, ["Ada Berg · ada@example.com", "Noa Frei · noa@example.com"]);
  const byState = groupOrderedItems(lines, "state", "state", "asc").map((group) => group.label);
  assert.deepEqual(byState, ["Reserve", "Ship"]);
  const byDate = groupOrderedItems(lines, "date", "date", "desc").map((group) => group.key);
  assert.deepEqual(byDate, ["2026-10-03", "2026-10-02"]);
  const newestFirst = groupOrderedItems(lines, "none", "date", "desc").flatMap((group) => group.lines.map((line) => line.email));
  assert.deepEqual(newestFirst, ["ada@example.com", "noa@example.com"]);
});

test("a new account gets the AMF confirmation letter", () => {
  const db = memory();
  const user = createUser(db, "new@example.com");
  const letter = listLetters(db).find((item) => item.toEmail === "new@example.com");
  assert.ok(letter);
  assert.equal(letter.subject, "Account Created for AMF Saucer Shop");
  assert.match(letter.body, /successfully created your account for the AMF Saucer Shop/);
  assert.match(letter.body, /Thank you/);
  assert.equal(listNotices(db, user.id).some((notice) => notice.title.includes("Account Created")), true);
});

test("reservation notices list every buyer, and Lea's old notices clear once", () => {
  const db = memory();
  addProduct(db);
  const lea = createUser(db, "lea@hundert.shop", { name: "Lea Keller" });
  const noa = createUser(db, "noa@example.com", { name: "Noa Frei" });
  assert.equal(listNotices(db, lea.id).length > 0, true);
  clearLeaNoticesOnce(db);
  assert.equal(listNotices(db, lea.id).length, 0);
  reserveForUser(db, lea.id, [{ productId: "prd_test", quantity: 2 }]);
  reserveForUser(db, noa.id, [{ productId: "prd_test", quantity: 3 }]);
  clearLeaNoticesOnce(db);
  assert.equal(listNotices(db, lea.id).some((notice) => notice.title === "Reservation received"), true);
  const notices = listReservationNotices(db);
  const emails = notices.map((notice) => notice.email).sort();
  assert.deepEqual(emails, ["lea@hundert.shop", "noa@example.com"]);
  assert.equal(listNotices(db, noa.id).some((notice) => notice.href === "/orders"), true);
});
