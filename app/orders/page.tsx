import Link from "next/link";
import { Suspense } from "react";
import { Banner, Frame, PageHeader } from "@/components/frame";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { formatChf, formatWhen, pieces } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { listOrders } from "@/lib/shop";
import type { SearchParams } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Orders" };

export default function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/orders");
  const query = await searchParams;
  const orders = listOrders(getDb(), user.id);
  const paid = query.paid === "1";
  const total = typeof query.total === "string" ? Number(query.total) : 0;

  return (
    <Frame>
      <PageHeader kicker="Your batches" title="Your orders">
        <p>This list is only yours. Reserved means we are holding your pieces. Paid means production can start. Shipped means they have left for you.</p>
      </PageHeader>
      {paid ? (
        <Banner tone="good">
          Payment received{Number.isFinite(total) && total > 0 ? ` for ${formatChf(total)}` : ""}. The workshop can
          produce the paid pieces. This was a simulated charge.
        </Banner>
      ) : null}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-10">
          <p className="font-serif text-2xl">You have not reserved anything yet.</p>
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-4 h-11 px-5")}>
            See the pieces
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/orders/${order.id}`} className="font-serif text-2xl hover:text-primary">
                  Reservation {formatWhen(order.createdAt)}
                </Link>
              </div>
              <ul className="mt-3 grid gap-3">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {line.productName} · {pieces(line.quantity)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Batch {line.batchSequence}
                        {line.status === "reserved" && line.batchStatus === "closed" ? " · payment requested" : ""}
                        {line.status === "reserved" && line.batchStatus === "open" ? " · waiting for 100" : ""}
                        {line.status === "paid" ? " · in production" : ""}
                      </p>
                    </div>
                    <StatusBadge status={line.status} />
                  </li>
                ))}
              </ul>
              {order.lines.some((line) => line.status === "reserved" && line.batchStatus === "closed") ? (
                <Link href="/checkout/pay" className={cn(buttonVariants({ size: "lg" }), "mt-4 h-11 px-5")}>
                  Pay this batch
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
