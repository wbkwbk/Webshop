import Link from "next/link";
import { Suspense } from "react";
import { Frame, PageHeader } from "@/components/frame";
import { ReserveForm } from "@/components/shop-forms";
import { CheckoutStepper } from "@/components/stepper";
import { allocationCopy } from "@/lib/batches";
import { getDb } from "@/lib/db";
import { formatChf } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getCart, listPaymentDue } from "@/lib/shop";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reserve" };

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <Checkout />
    </Suspense>
  );
}

async function Checkout() {
  const user = await requireUser("/checkout");
  const db = getDb();
  const lines = getCart(db, user.id);
  const canPay = listPaymentDue(db, user.id).length > 0;

  return (
    <Frame>
      <PageHeader kicker="Checkout · step 1 of 2" title="Reserve, don’t pay yet">
        <p>
          We keep the postal address on this reservation so we can ship after the pieces are made. Payment opens once
          100 AFM Saucer Mods are reserved. You can reserve more than that.
        </p>
      </PageHeader>
      <CheckoutStepper step={1} canPay={canPay} />
      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-10">
          <p className="font-serif text-2xl">Nothing to reserve.</p>
          <Link href="/cart" className={cn(buttonVariants({ size: "lg" }), "mt-4 h-11 px-5")}>
            Back to the cart
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ReserveForm values={user} />
          <aside className="h-fit rounded-xl border border-border bg-card p-4">
            <h2 className="font-serif text-2xl">This reservation</h2>
            <ul className="mt-3 grid gap-3">
              {lines.map((line) => (
                <li key={line.productId}>
                  <p className="font-medium">
                    {line.name} · {line.quantity}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatChf(line.priceCents * line.quantity)}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {allocationCopy(line.openFilled, line.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </Frame>
  );
}
