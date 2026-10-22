import { Suspense } from "react";
import { ForgotForm } from "@/components/auth-forms";
import { Frame, PageHeader } from "@/components/frame";
import { mailIsConfigured } from "@/lib/mail";
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
          Ask for a reset letter. It is kept for that account only.
          {mailIsConfigured()
            ? " The same letter is emailed from afmsaucer@donmartinshop.ch."
            : " It is also shown on this page."}
        </p>
      </PageHeader>
      <ForgotForm sent={query.sent === "1"} mailed={mailIsConfigured()} />
    </Frame>
  );
}
