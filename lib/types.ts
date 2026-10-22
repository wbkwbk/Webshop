export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export type Role = "customer" | "admin";
export type ReservationStatus = "reserved" | "paid" | "shipped";
export type BatchStatus = "open" | "closed";

export type Address = {
  name: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
};

export type User = Address & {
  id: string;
  email: string;
  role: Role;
};

export type ProductStat = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  priceCents: number;
  openFilled: number;
  hasOpenBatch: boolean;
  reservedQty: number;
  paymentDueQty: number;
  paidQty: number;
  shippedQty: number;
};

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
  openFilled: number;
};

export type ReservationLine = {
  id: string;
  orderId: string;
  productId: string;
  slug: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  status: ReservationStatus;
  batchId: string;
  batchSequence: number;
  batchStatus: BatchStatus;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  address: Address;
};

export type OrderGroup = {
  id: string;
  createdAt: string;
  lines: ReservationLine[];
};

export type AdminLine = ReservationLine & {
  userId: string;
  email: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

export type Letter = {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  createdAt: string;
};

export type CardDetails = {
  name: string;
  number: string;
  expiry: string;
  cvc: string;
};
