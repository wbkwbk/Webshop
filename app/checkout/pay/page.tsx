import Link from "next/link";
import { Suspense } from "react";
import { Frame, PageHeader } from "@/components/frame";
import { PayForm } from "@/components/shop-forms";
import { CheckoutStepper } from "@/components/stepper";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { listPaymentDue } from "@/lib/shop";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pay" };

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <Pay />
    </Suspense>
  );
}

async function Pay() {
  const user = await requireUser("/checkout/pay");
  const lines = listPaymentDue(getDb(), user.id);

  return (
    <Frame>
      <PageHeader kicker="Checkout · step 2 of 2" title="Pay, then we produce it">
        <p>
          Payment is open once at least 100 pieces are reserved. This checkout is simulated: use card 4242 4242 4242
          4242, any future expiry, and any three-digit CVC. Nothing is charged.
        </p>
      </PageHeader>
      <CheckoutStepper step={2} canPay={lines.length > 0} />
      {lines.length === 0 ? (
        <div className="max-w-xl rounded-xl border border-dashed border-border px-5 py-10">
          <p className="font-serif text-2xl">Nothing is waiting on payment.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Reservations stay unpaid until 100 AFM Saucer MOD reservations are in. After that, a new reservation can be paid straight away.
          </p>
          <Link href="/orders" className={cn(buttonVariants({ size: "lg" }), "mt-5 h-11 px-5")}>
            See your orders
          </Link>
        </div>
      ) : (
        <div className="max-w-2xl">
          <PayForm
            lines={lines.map((line) => ({
              id: line.id,
              productName: line.productName,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
            }))}
          />
        </div>
      )}
    </Frame>
  );
}
