import { Suspense } from "react";
import { ForgotForm } from "@/components/auth-forms";
import { Frame, PageHeader } from "@/components/frame";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Forgot password" };

export default function ForgotPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Forgot searchParams={searchParams} />
    </Suspense>
  );
}

async function Forgot({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  return (
    <Frame>
      <PageHeader kicker="Account" title="Forgot password">
        <p>
          Ask for a reset letter. Because this shop has no mail server, the letter appears in the demo post office
          instead of an inbox.
        </p>
      </PageHeader>
      <ForgotForm sent={query.sent === "1"} />
    </Frame>
  );
}
