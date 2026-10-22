import type { DatabaseSync } from "node:sqlite";
import { DEMO_ACCOUNTS } from "./constants";
import { hashPassword } from "./password";
import { paymentDueLetter } from "./letters";
import { run } from "./sql";

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
    id: "usr_ada",
    email: DEMO_ACCOUNTS.admin.email,
    password: DEMO_ACCOUNTS.admin.password,
    name: DEMO_ACCOUNTS.admin.name,
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
  {
    id: "usr_noa",
    email: "noa@hundert.shop",
    password: "batch-demo",
    name: "Noa Steiner",
    role: "customer",
    street: "Langstrasse",
    house: "84",
    postal: "8004",
    city: "Zürich",
  },
  {
    id: "usr_jonas",
    email: "jonas@hundert.shop",
    password: "batch-demo",
    name: "Jonas Frei",
    role: "customer",
    street: "Feldbergstrasse",
    house: "42",
    postal: "4057",
    city: "Basel",
  },
  {
    id: "usr_mira",
    email: "mira@hundert.shop",
    password: "batch-demo",
    name: "Mira Baumgartner",
    role: "customer",
    street: "Rue de Carouge",
    house: "27",
    postal: "1205",
    city: "Genève",
  },
  {
    id: "usr_sven",
    email: "sven@hundert.shop",
    password: "batch-demo",
    name: "Sven Roth",
    role: "customer",
    street: "Kramgasse",
    house: "11",
    postal: "3011",
    city: "Bern",
  },
  {
    id: "usr_elias",
    email: "elias@hundert.shop",
    password: "batch-demo",
    name: "Elias Brunner",
    role: "customer",
    street: "Neumarkt",
    house: "5",
    postal: "8001",
    city: "Zürich",
  },
];

const PRODUCTS = [
  {
    id: "prd_apron",
    slug: "heavy-linen-apron",
    name: "Heavy linen apron",
    price: 8900,
    sort: 1,
    summary: "Cross-back apron in undyed Belgian linen, with brass hardware.",
    description:
      "Cut in Zürich from a heavy Belgian linen that softens after a few washes. The straps cross in the back and stay off the neck. The whole batch is cut together once a hundred pieces are reserved, then each apron is posted to the address on the reservation.",
  },
  {
    id: "prd_bowl",
    slug: "stoneware-bowl",
    name: "Stoneware breakfast bowl",
    price: 4200,
    sort: 2,
    summary: "Speckled clay bowl with an oatmeal glaze, wide enough for breakfast.",
    description:
      "Thrown in small groups, and fired only when a full hundred are reserved. The glaze breaks warm over the speckled clay. Each bowl holds about half a litre.",
  },
  {
    id: "prd_board",
    slug: "oak-serving-board",
    name: "Oak serving board",
    price: 7600,
    sort: 3,
    summary: "Solid Swiss oak, oiled, with a shallow juice groove.",
    description:
      "Sawn from Swiss oak and finished with a food-safe oil. The groove is cut after the batch is confirmed, so the workshop does not mill boards nobody asked for.",
  },
  {
    id: "prd_throw",
    slug: "merino-throw",
    name: "Merino throw",
    price: 16000,
    sort: 4,
    summary: "Undyed merino throw, 140 by 200 centimetres.",
    description:
      "Woven once a hundred throws are reserved. The wool is left undyed, so the batch shares one quiet colour. In the demo workshop, Lea Keller still owes payment on this batch.",
  },
  {
    id: "prd_kettle",
    slug: "enamel-kettle",
    name: "Enamel kettle",
    price: 6800,
    sort: 5,
    summary: "One-and-a-half litre stovetop kettle, cream enamel, black rim.",
    description:
      "A simple kettle for a gas or electric hob. Payment opens when a hundred kettles are reserved, and production starts for the pieces that have been paid.",
  },
  {
    id: "prd_candles",
    slug: "beeswax-candles",
    name: "Beeswax candles",
    price: 2800,
    sort: 6,
    summary: "Four hand-dipped tapers, tied with cotton tape.",
    description:
      "Dipped from Swiss beeswax. A reservation is for one set of four. The batch closes at one hundred sets, not one hundred individual tapers.",
  },
];

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

  for (const product of PRODUCTS) {
    run(
      db,
      `INSERT INTO products (id, slug, name, summary, description, price_cents, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      product.id,
      product.slug,
      product.name,
      product.summary,
      product.description,
      product.price,
      product.sort,
    );
  }

  const reserve = (input: {
    id: string;
    orderId: string;
    userId: string;
    productId: string;
    batchId: string;
    quantity: number;
    price: number;
    status: "reserved" | "paid" | "shipped";
    createdAt: string;
    paidAt?: string;
    shippedAt?: string;
  }) => {
    const person = PEOPLE.find((item) => item.id === input.userId);
    if (!person) throw new Error(`Unknown seed user ${input.userId}`);
    run(
      db,
      `INSERT INTO orders (id, user_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      input.orderId,
      input.userId,
      input.createdAt,
    );
    run(
      db,
      `INSERT INTO reservations (
        id, order_id, user_id, product_id, batch_id, quantity, unit_price_cents, status,
        ship_name, ship_street, ship_house_number, ship_postal_code, ship_city, ship_country,
        created_at, paid_at, shipped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CH', ?, ?, ?)`,
      input.id,
      input.orderId,
      input.userId,
      input.productId,
      input.batchId,
      input.quantity,
      input.price,
      input.status,
      person.name,
      person.street,
      person.house,
      person.postal,
      person.city,
      input.createdAt,
      input.paidAt ?? null,
      input.shippedAt ?? null,
    );
  };

  const batch = (
    id: string,
    productId: string,
    sequence: number,
    filled: number,
    status: "open" | "closed",
    closedAt: string | null,
  ) => {
    run(
      db,
      `INSERT INTO batches (id, product_id, sequence, target_qty, filled_qty, status, closed_at)
       VALUES (?, ?, ?, 100, ?, ?, ?)`,
      id,
      productId,
      sequence,
      filled,
      status,
      closedAt,
    );
  };

  batch("bat_apron_1", "prd_apron", 1, 97, "open", null);
  reserve({ id: "rsv_apron_noa", orderId: "ord_apron_noa", userId: "usr_noa", productId: "prd_apron", batchId: "bat_apron_1", quantity: 20, price: 8900, status: "reserved", createdAt: "2026-10-01T09:00:00.000Z" });
  reserve({ id: "rsv_apron_jonas", orderId: "ord_apron_jonas", userId: "usr_jonas", productId: "prd_apron", batchId: "bat_apron_1", quantity: 20, price: 8900, status: "reserved", createdAt: "2026-10-02T09:00:00.000Z" });
  reserve({ id: "rsv_apron_mira", orderId: "ord_apron_mira", userId: "usr_mira", productId: "prd_apron", batchId: "bat_apron_1", quantity: 20, price: 8900, status: "reserved", createdAt: "2026-10-03T09:00:00.000Z" });
  reserve({ id: "rsv_apron_sven", orderId: "ord_apron_sven", userId: "usr_sven", productId: "prd_apron", batchId: "bat_apron_1", quantity: 20, price: 8900, status: "reserved", createdAt: "2026-10-04T09:00:00.000Z" });
  reserve({ id: "rsv_apron_elias", orderId: "ord_apron_elias", userId: "usr_elias", productId: "prd_apron", batchId: "bat_apron_1", quantity: 17, price: 8900, status: "reserved", createdAt: "2026-10-05T09:00:00.000Z" });

  batch("bat_bowl_1", "prd_bowl", 1, 41, "open", null);
  reserve({ id: "rsv_bowl_noa", orderId: "ord_bowl_noa", userId: "usr_noa", productId: "prd_bowl", batchId: "bat_bowl_1", quantity: 41, price: 4200, status: "reserved", createdAt: "2026-10-06T09:00:00.000Z" });

  batch("bat_board_1", "prd_board", 1, 100, "closed", "2026-08-01T10:00:00.000Z");
  reserve({ id: "rsv_board_mira", orderId: "ord_board_mira", userId: "usr_mira", productId: "prd_board", batchId: "bat_board_1", quantity: 100, price: 7600, status: "shipped", createdAt: "2026-07-20T09:00:00.000Z", paidAt: "2026-08-02T09:00:00.000Z", shippedAt: "2026-08-20T09:00:00.000Z" });
  batch("bat_board_2", "prd_board", 2, 20, "open", null);
  reserve({ id: "rsv_board_jonas", orderId: "ord_board_jonas", userId: "usr_jonas", productId: "prd_board", batchId: "bat_board_2", quantity: 20, price: 7600, status: "reserved", createdAt: "2026-10-08T09:00:00.000Z" });

  batch("bat_throw_1", "prd_throw", 1, 100, "closed", "2026-09-15T10:00:00.000Z");
  reserve({ id: "rsv_throw_lea", orderId: "ord_throw_lea", userId: "usr_lea", productId: "prd_throw", batchId: "bat_throw_1", quantity: 2, price: 16000, status: "reserved", createdAt: "2026-09-01T09:00:00.000Z" });
  reserve({ id: "rsv_throw_noa", orderId: "ord_throw_noa", userId: "usr_noa", productId: "prd_throw", batchId: "bat_throw_1", quantity: 20, price: 16000, status: "reserved", createdAt: "2026-09-02T09:00:00.000Z" });
  reserve({ id: "rsv_throw_jonas", orderId: "ord_throw_jonas", userId: "usr_jonas", productId: "prd_throw", batchId: "bat_throw_1", quantity: 30, price: 16000, status: "paid", createdAt: "2026-09-03T09:00:00.000Z", paidAt: "2026-09-16T09:00:00.000Z" });
  reserve({ id: "rsv_throw_mira", orderId: "ord_throw_mira", userId: "usr_mira", productId: "prd_throw", batchId: "bat_throw_1", quantity: 40, price: 16000, status: "paid", createdAt: "2026-09-04T09:00:00.000Z", paidAt: "2026-09-16T11:00:00.000Z" });
  reserve({ id: "rsv_throw_sven", orderId: "ord_throw_sven", userId: "usr_sven", productId: "prd_throw", batchId: "bat_throw_1", quantity: 8, price: 16000, status: "shipped", createdAt: "2026-09-05T09:00:00.000Z", paidAt: "2026-09-16T12:00:00.000Z", shippedAt: "2026-10-01T09:00:00.000Z" });
  batch("bat_throw_2", "prd_throw", 2, 12, "open", null);
  reserve({ id: "rsv_throw_elias", orderId: "ord_throw_elias", userId: "usr_elias", productId: "prd_throw", batchId: "bat_throw_2", quantity: 12, price: 16000, status: "reserved", createdAt: "2026-10-10T09:00:00.000Z" });

  batch("bat_kettle_1", "prd_kettle", 1, 100, "closed", "2026-10-01T10:00:00.000Z");
  reserve({ id: "rsv_kettle_sven", orderId: "ord_kettle_sven", userId: "usr_sven", productId: "prd_kettle", batchId: "bat_kettle_1", quantity: 60, price: 6800, status: "paid", createdAt: "2026-09-20T09:00:00.000Z", paidAt: "2026-10-02T09:00:00.000Z" });
  reserve({ id: "rsv_kettle_elias", orderId: "ord_kettle_elias", userId: "usr_elias", productId: "prd_kettle", batchId: "bat_kettle_1", quantity: 40, price: 6800, status: "reserved", createdAt: "2026-09-21T09:00:00.000Z" });

  batch("bat_candles_1", "prd_candles", 1, 8, "open", null);
  reserve({ id: "rsv_candles_lea", orderId: "ord_candles_lea", userId: "usr_lea", productId: "prd_candles", batchId: "bat_candles_1", quantity: 8, price: 2800, status: "reserved", createdAt: "2026-10-12T09:00:00.000Z" });

  const due = db
    .prepare(
      `SELECT u.id AS user_id, u.email, u.name, u.street, u.house_number, u.postal_code, u.city, u.country,
              p.name AS product_name, b.sequence AS sequence, b.id AS batch_id, SUM(r.quantity) AS quantity
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
       JOIN batches b ON b.id = r.batch_id
       WHERE r.status = 'reserved' AND b.status = 'closed'
       GROUP BY u.id, b.id`,
    )
    .all() as Array<Record<string, string | number | bigint | null>>;

  for (const row of due) {
    const quantity = Number(row.quantity);
    const letter = paymentDueLetter({
      name: String(row.name),
      productName: String(row.product_name),
      sequence: Number(row.sequence),
      quantity,
      address: {
        name: String(row.name),
        street: String(row.street),
        houseNumber: String(row.house_number),
        postalCode: String(row.postal_code),
        city: String(row.city),
        country: String(row.country),
      },
    });
    const stamp = "2026-10-18T09:00:00.000Z";
    const id = `ntc_${row.user_id}_${row.batch_id}`;
    run(
      db,
      `INSERT INTO notifications (id, user_id, title, body, href, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      id,
      String(row.user_id),
      letter.title,
      letter.body,
      letter.href,
      stamp,
    );
    run(
      db,
      `INSERT INTO outbox (id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?)`,
      `let_${row.user_id}_${row.batch_id}`,
      String(row.email),
      letter.subject,
      letter.body,
      stamp,
    );
  }
}
