import Link from "next/link";
import { Suspense } from "react";
import { setCartQuantityAction } from "@/app/actions/shop";
import { Frame, PageHeader } from "@/components/frame";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { allocationCopy } from "@/lib/batches";
import { getDb } from "@/lib/db";
import { formatChf } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getCart } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <Cart />
    </Suspense>
  );
}

async function Cart() {
  const user = await requireUser("/cart");
  const lines = getCart(getDb(), user.id);
  const reservedValue = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);

  return (
    <Frame>
      <PageHeader kicker="Step 1 starts here" title="Cart">
        <p>These pieces are not reserved until you confirm checkout. Nothing is charged in the cart.</p>
      </PageHeader>
      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-10">
          <p className="font-serif text-2xl">The cart is empty.</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            The AFM Saucer MOD starts at zero reserved. Production starts once 100 reservations are in. No payment is required upfront.
          </p>
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-5 h-11 px-5")}>
            Browse the workshop
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <ul className="grid gap-4">
            {lines.map((line) => (
              <li key={line.productId} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/product/${line.slug}`} className="font-serif text-2xl hover:text-primary">
                      {line.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{formatChf(line.priceCents)} each</p>
                  </div>
                  <p className="tabular-nums">{formatChf(line.priceCents * line.quantity)}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {allocationCopy(line.openFilled, line.quantity)}
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <form action={setCartQuantityAction} className="flex items-end gap-2">
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      Quantity
                      <input
                        name="quantity"
                        type="number"
                        min={1}
                        defaultValue={line.quantity}
                        className="h-10 w-24 rounded-lg border border-input bg-background px-2"
                      />
                    </label>
                    <input type="hidden" name="productId" value={line.productId} />
                    <SubmitButton variant="outline" pendingLabel="Updating…">
                      Update
                    </SubmitButton>
                  </form>
                  <form action={setCartQuantityAction}>
                    <input type="hidden" name="productId" value={line.productId} />
                    <input type="hidden" name="quantity" value="0" />
                    <SubmitButton variant="ghost" pendingLabel="Removing…">
                      Remove
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Reserved value, due once 100 pieces are reserved</p>
            <p className="mt-1 font-serif text-3xl tabular-nums">{formatChf(reservedValue)}</p>
            <Link href="/checkout" className={cn(buttonVariants({ size: "lg" }), "mt-4 h-11 w-full px-5")}>
              Continue to reservation
            </Link>
          </aside>
        </div>
      )}
    </Frame>
  );
}
