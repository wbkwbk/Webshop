import Link from "next/link";
import { Suspense } from "react";
import { AccountForm } from "@/components/account-form";
import { Banner, Frame, PageHeader } from "@/components/frame";
import { validateAddress } from "@/lib/validate";
import { requireUser } from "@/lib/session";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Account" };

export default function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}

async function Account({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/account");
  const query = await searchParams;
  const address = validateAddress(user);

  return (
    <Frame>
      <PageHeader kicker={user.email} title="Postal address">
        <p>
          Every reservation needs a street, house number, postal code, and city. We check the code against the country
          before we hold any pieces.
        </p>
      </PageHeader>
      {query.reset === "1" ? <Banner tone="good">Password updated. You are signed in.</Banner> : null}
      {address.ok ? (
        <p className="mb-4 text-sm text-[#234237]">This address can take a parcel.</p>
      ) : (
        <Banner tone="warn">This address is not ready for shipping. Fix it before you reserve.</Banner>
      )}
      <AccountForm values={user} />
      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/orders" className="text-foreground underline-offset-4 hover:underline">
          Your orders
        </Link>{" "}
        keep the address from the moment you reserved, even if you change it later.
      </p>
    </Frame>
  );
}
