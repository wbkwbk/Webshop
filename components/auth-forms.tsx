"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { forgotAction, loginAction, registerAction, resetAction } from "@/app/actions/auth";
import { AddressFields } from "@/components/address-fields";
import { Field } from "@/components/field";
import { LetterBody } from "@/components/letter-body";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { emptyState } from "@/lib/form";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, emptyState);
  const [email, setEmail] = useState(state.values?.email ?? "");
  const [password, setPassword] = useState("");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,20rem)]">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        {state.formError ? (
          <p className="text-sm text-destructive" role="alert">
            {state.formError}
          </p>
        ) : null}
        <Field label="Email" name="email" error={state.fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 bg-background"
          />
        </Field>
        <Field label="Password" name="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 bg-background"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
          <Link href="/forgot-password" className="text-sm underline-offset-4 hover:underline">
            Forgot password
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          New here?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
      <aside className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Try the workshop</p>
        <div className="mt-3 grid gap-3">
          {[DEMO_ACCOUNTS.buyer, DEMO_ACCOUNTS.superuser].map((account) => {
            const signInAs = "login" in account ? account.login : account.email;
            return (
            <button
              key={account.email}
              type="button"
              className="rounded-lg border border-border px-3 py-3 text-left hover:border-primary"
              onClick={() => {
                setEmail(signInAs);
                setPassword(account.password);
              }}
            >
              <span className="block font-medium">{account.name}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{account.blurb}</span>
              <span className="mt-2 block text-xs text-muted-foreground">
                {signInAs} · {account.password}
              </span>
            </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, emptyState);
  const values = state.values ?? {};
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <input type="hidden" name="next" value={next} />
      {state.formError ? (
        <p className="text-sm text-destructive" role="alert">
          {state.formError}
        </p>
      ) : null}
      <AddressFields
        values={{
          name: values.name,
          street: values.street,
          houseNumber: values.houseNumber,
          postalCode: values.postalCode,
          city: values.city,
          country: values.country || "CH",
        }}
        errors={state.fieldErrors}
      />
      <Field label="Email" name="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={values.email ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          className="h-10 bg-background"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" name="password" error={state.fieldErrors?.password} hint="At least 8 characters.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={Boolean(state.fieldErrors?.password)}
            className="h-10 bg-background"
          />
        </Field>
        <Field label="Confirm password" name="confirm" error={state.fieldErrors?.confirm}>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={Boolean(state.fieldErrors?.confirm)}
            className="h-10 bg-background"
          />
        </Field>
      </div>
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ForgotForm({ sent }: { sent: boolean }) {
  const [state, action] = useActionState(forgotAction, emptyState);
  const delivered = sent || state.ok === "sent";
  return (
    <form action={action} className="grid max-w-md gap-4">
      {delivered ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6" role="status">
          If an account uses that email, the reset letter is below and is kept for that account. Other accounts cannot
          read it. This shop does not send real email.
        </p>
      ) : null}
      {state.letter ? (
        <article className="rounded-xl border border-border bg-card p-4">
          <p className="font-medium">{state.letter.subject}</p>
          <div className="mt-3">
            <LetterBody body={state.letter.body} />
          </div>
        </article>
      ) : null}
      {state.formError ? (
        <p className="text-sm text-destructive" role="alert">
          {state.formError}
        </p>
      ) : null}
      <Field label="Email" name="email">
        <Input id="email" name="email" type="email" autoComplete="email" required className="h-10 bg-background" />
      </Field>
      <SubmitButton pendingLabel="Sending…">Request reset letter</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetAction, emptyState);
  return (
    <form action={action} className="grid max-w-md gap-4">
      <input type="hidden" name="token" value={token} />
      {state.formError ? (
        <p className="text-sm text-destructive" role="alert">
          {state.formError}
        </p>
      ) : null}
      <Field label="New password" name="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-10 bg-background"
        />
      </Field>
      <Field label="Confirm password" name="confirm" error={state.fieldErrors?.confirm}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-10 bg-background"
        />
      </Field>
      <SubmitButton pendingLabel="Saving…">Set password</SubmitButton>
    </form>
  );
}
