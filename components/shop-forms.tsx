"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { payAction, reserveAction } from "@/app/actions/shop";
import { addToCartAction } from "@/app/actions/shop";
import { AddressFields } from "@/components/address-fields";
import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allocationCopy } from "@/lib/batches";
import { emptyState } from "@/lib/form";
import { formatChf } from "@/lib/format";
import type { Address } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuantityPicker({
  productId,
  openFilled,
  signedIn,
  returnTo,
}: {
  productId: string;
  openFilled: number;
  signedIn: boolean;
  returnTo: string;
}) {
  const [quantity, setQuantity] = useState(1);
  return (
    <form action={addToCartAction} className="grid gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Field label="Quantity" name="quantity" hint="As many as you need. The quantity is not limited.">
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="h-10 w-28 bg-background"
        />
      </Field>
      <p className="text-sm leading-6 text-muted-foreground">{allocationCopy(openFilled, Number.isFinite(quantity) ? quantity : 1)}</p>
      {signedIn ? (
        <SubmitButton pendingLabel="Adding…">Add to cart</SubmitButton>
      ) : (
        <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={cn(buttonVariants({ size: "lg" }), "h-11 w-fit px-5")}>
          Sign in to add this
        </Link>
      )}
    </form>
  );
}

export function ReserveForm({ values }: { values: Address }) {
  const [state, action] = useActionState(reserveAction, emptyState);
  const current = { ...values, ...state.values };
  return (
    <form action={action} className="grid gap-5">
      {state.formError ? (
        <p className="text-sm text-destructive" role="alert">
          {state.formError}
        </p>
      ) : null}
      <AddressFields values={current} errors={state.fieldErrors} />
      <SubmitButton pendingLabel="Reserving…">Reserve these pieces</SubmitButton>
    </form>
  );
}

export function PayForm({
  lines,
}: {
  lines: {
    id: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
  }[];
}) {
  const [state, action] = useActionState(payAction, emptyState);
  const [selected, setSelected] = useState(lines.map((line) => line.id));
  const total = lines
    .filter((line) => selected.includes(line.id))
    .reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const values = state.values ?? {};

  return (
    <form action={action} className="grid gap-6">
      {state.formError ? (
        <p className="text-sm text-destructive" role="alert">
          {state.formError}
        </p>
      ) : null}
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-medium">Reservations ready to pay</legend>
        {lines.map((line) => (
          <label key={line.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3">
            <input
              type="checkbox"
              name="reservationId"
              value={line.id}
              checked={selected.includes(line.id)}
              onChange={(event) => {
                setSelected((current) =>
                  event.target.checked ? [...current, line.id] : current.filter((id) => id !== line.id),
                );
              }}
              className="mt-1 accent-[#8e3b2a]"
            />
            <span>
              <span className="block font-medium">{line.productName}</span>
              <span className="text-sm text-muted-foreground">
                {line.quantity} × {formatChf(line.unitPriceCents)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="font-serif text-3xl tabular-nums">{formatChf(total)}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name on card" name="cardName" error={state.fieldErrors?.cardName}>
          <Input id="cardName" name="cardName" autoComplete="cc-name" required defaultValue={values.cardName ?? ""} className="h-10 bg-background" />
        </Field>
        <Field label="Card number" name="cardNumber" error={state.fieldErrors?.cardNumber} hint="Test card 4242 4242 4242 4242. Nothing is charged.">
          <Input id="cardNumber" name="cardNumber" inputMode="numeric" autoComplete="cc-number" required defaultValue={values.cardNumber ?? ""} className="h-10 bg-background" />
        </Field>
        <Field label="Expiry" name="expiry" error={state.fieldErrors?.expiry}>
          <Input id="expiry" name="expiry" placeholder="12/28" autoComplete="cc-exp" required defaultValue={values.expiry ?? ""} className="h-10 bg-background" />
        </Field>
        <Field label="CVC" name="cvc" error={state.fieldErrors?.cvc}>
          <Input id="cvc" name="cvc" inputMode="numeric" autoComplete="cc-csc" required defaultValue={values.cvc ?? ""} className="h-10 bg-background" />
        </Field>
      </div>
      <SubmitButton pendingLabel="Taking payment…">Pay and start production</SubmitButton>
    </form>
  );
}
