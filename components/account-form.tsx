"use client";

import { useActionState } from "react";
import { saveAddressAction } from "@/app/actions/auth";
import { AddressFields } from "@/components/address-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyState } from "@/lib/form";
import type { Address } from "@/lib/types";

export function AccountForm({ values }: { values: Address }) {
  const [state, action] = useActionState(saveAddressAction, emptyState);
  const current = { ...values, ...state.values };
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      {state.ok ? (
        <p className="rounded-lg border border-[#234237]/30 bg-[#234237]/8 px-4 py-3 text-sm" role="status">
          {state.ok}
        </p>
      ) : null}
      {state.formError ? (
        <p className="text-sm text-destructive" role="alert">
          {state.formError}
        </p>
      ) : null}
      <AddressFields values={current} errors={state.fieldErrors} />
      <SubmitButton pendingLabel="Saving…">Save postal address</SubmitButton>
    </form>
  );
}
