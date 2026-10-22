import { Suspense } from "react";
import { ResetForm } from "@/components/auth-forms";
import { Frame, PageHeader } from "@/components/frame";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Reset password" };

export default function ResetPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Reset searchParams={searchParams} />
    </Suspense>
  );
}

async function Reset({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  return (
    <Frame>
      <PageHeader kicker="Account" title="Choose a new password">
        <p>The link from the post office works once, and only for an hour.</p>
      </PageHeader>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-sm text-muted-foreground">This page needs the token from your reset letter.</p>
      )}
    </Frame>
  );
}
