import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { shipAction } from "@/app/actions/shop";
import { Banner, Frame, PageHeader } from "@/components/frame";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { getDb } from "@/lib/db";
import { formatAddress, formatWhen, pieces } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { getProductById, listAdminLines } from "@/lib/shop";
import type { ReservationStatus, SearchParams } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Piece" };

const filters: { label: string; value?: ReservationStatus }[] = [
  { label: "All" },
  { label: "Reserve", value: "reserved" },
  { label: "Pay", value: "paid" },
  { label: "Ship", value: "shipped" },
];

export default function AdminProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <AdminProduct params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const product = getProductById(getDb(), id);
  if (!product) notFound();
  const state = filters.some((filter) => filter.value === query.state) ? (query.state as ReservationStatus) : undefined;
  const lines = listAdminLines(getDb(), product.id, state);
  const notice = typeof query.notice === "string" ? query.notice : "";

  return (
    <Frame>
      <Link href="/admin" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Ordered items
      </Link>
      <PageHeader kicker="States" title={product.name}>
        <p>
          {product.reservedQty} reserved · {product.paidQty} paid · {product.shippedQty} shipped.
          {product.paymentDueQty > 0 ? ` ${product.paymentDueQty} reserved pieces have been asked to pay.` : ""}
        </p>
      </PageHeader>
      {notice ? <Banner tone="warn">{notice}</Banner> : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((filter) => {
          const href = filter.value ? `/admin/products/${product.id}?state=${filter.value}` : `/admin/products/${product.id}`;
          const active = (filter.value ?? undefined) === state;
          return (
            <Link
              key={filter.label}
              href={href}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
        {product.paidQty > 0 ? (
          <form action={shipAction} className="ml-auto">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="all" value="1" />
            <SubmitButton variant="outline" pendingLabel="Shipping…">
              Ship all paid
            </SubmitButton>
          </form>
        ) : null}
      </div>
      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          Nothing in this state.
        </p>
      ) : (
        <ul className="grid gap-3">
          {lines.map((line) => (
            <li key={line.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {line.address.name} · {pieces(line.quantity)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {line.email} · {formatWhen(line.createdAt)}
                  </p>
                  <p className="mt-1 text-sm">{formatAddress(line.address)}</p>
                </div>
                <StatusBadge status={line.status} vocabulary="order" />
              </div>
              {line.status === "paid" ? (
                <form action={shipAction} className="mt-3">
                  <input type="hidden" name="id" value={line.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <SubmitButton pendingLabel="Marking…">Mark shipped</SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
