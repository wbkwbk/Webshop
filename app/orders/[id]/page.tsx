import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Banner, Frame, PageHeader } from "@/components/frame";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { formatAddress, formatChf, formatWhen, pieces } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getOrder } from "@/lib/shop";
import type { SearchParams } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reservation" };

export default function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <OrderDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser("/orders");
  const { id } = await params;
  const query = await searchParams;
  const order = getOrder(getDb(), user.id, id);
  if (!order) notFound();
  const ready = order.lines.some((line) => line.status === "reserved" && line.batchStatus === "closed");

  return (
    <Frame>
      <PageHeader kicker={formatWhen(order.createdAt)} title="Reservation">
        <p>The address below is the one we will ship to. It was checked when you reserved.</p>
      </PageHeader>
      {query.ready === "1" ? (
        <Banner tone="warn">
          This reservation filled a batch of 100. Everyone in it, including you, has been asked to pay. Production
          starts after payment.
        </Banner>
      ) : null}
      {query.reserved === "1" ? (
        <Banner>
          Reserved. You are not charged yet. We will write when this product reaches 100 pieces.
        </Banner>
      ) : null}
      <ul className="grid gap-4">
        {order.lines.map((line) => (
          <li key={line.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">{line.productName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pieces(line.quantity)} · batch {line.batchSequence} · {formatChf(line.unitPriceCents * line.quantity)}
                </p>
              </div>
              <StatusBadge status={line.status} />
            </div>
            <p className="mt-3 text-sm leading-6">
              {line.status === "reserved" && line.batchStatus === "open"
                ? "Waiting until 100 pieces of this product are reserved."
                : null}
              {line.status === "reserved" && line.batchStatus === "closed"
                ? "The hundred is full. Payment is open, and the piece stays reserved until you pay."
                : null}
              {line.status === "paid" ? "Paid. The workshop can produce this now." : null}
              {line.status === "shipped" ? `Shipped ${line.shippedAt ? formatWhen(line.shippedAt) : ""}.` : null}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Ship to {formatAddress(line.address)}</p>
          </li>
        ))}
      </ul>
      {ready ? (
        <Link href="/checkout/pay" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 px-5")}>
          Continue to payment
        </Link>
      ) : null}
    </Frame>
  );
}
