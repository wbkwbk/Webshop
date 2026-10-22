import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Frame, PageHeader } from "@/components/frame";
import { live } from "@/lib/live";
import { safeNext } from "@/lib/live";
import { readSessionUser } from "@/lib/session";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: { searchParams: SearchParams }) {
  await live();
  const query = await searchParams;
  const next = safeNext(typeof query.next === "string" ? query.next : "/");
  const user = await readSessionUser();
  if (user) redirect(next);
  return (
    <Frame>
      <PageHeader kicker="Account" title="Sign in">
        <p>Use your own account, or step in as Lea to pay a finished batch, or as Ada to see the workshop floor.</p>
      </PageHeader>
      <LoginForm next={next} />
    </Frame>
  );
}
