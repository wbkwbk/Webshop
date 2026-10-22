import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { Frame, PageHeader } from "@/components/frame";
import { live, safeNext } from "@/lib/live";
import { readSessionUser } from "@/lib/session";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Register" };

export default function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Register searchParams={searchParams} />
    </Suspense>
  );
}

async function Register({ searchParams }: { searchParams: SearchParams }) {
  await live();
  const query = await searchParams;
  const next = safeNext(typeof query.next === "string" ? query.next : "/");
  const user = await readSessionUser();
  if (user) redirect(next);
  return (
    <Frame>
      <PageHeader kicker="Account" title="Create an account">
        <p>
          Registration asks for a postal address up front. When the account is created, a confirmation email is sent.
          You can read it in Notices. There is no outside mail server, so the same letter is kept in the post office.
        </p>
      </PageHeader>
      <RegisterForm next={next} />
    </Frame>
  );
}
