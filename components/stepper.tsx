import Link from "next/link";
import { cn } from "@/lib/utils";

export function CheckoutStepper({ step, canPay }: { step: 1 | 2; canPay: boolean }) {
  return (
    <ol className="mb-8 grid gap-3 sm:grid-cols-2">
      <li className={cn("rounded-lg border px-4 py-3", step === 1 ? "border-primary bg-card" : "border-border")}>
        <p className="font-serif text-2xl text-primary">1</p>
        <p className="font-medium">Reserve</p>
        <p className="text-sm text-muted-foreground">Hold the pieces. You are not charged.</p>
      </li>
      <li className={cn("rounded-lg border px-4 py-3", step === 2 ? "border-primary bg-card" : "border-border")}>
        <p className="font-serif text-2xl text-primary">2</p>
        <p className="font-medium">Pay</p>
        {canPay ? (
          <Link href="/checkout/pay" className="text-sm text-primary underline-offset-4 hover:underline">
            Production has started. Pay so we can make it.
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Opens once 100 pieces are reserved. You can keep reserving after that.</p>
        )}
      </li>
    </ol>
  );
}
