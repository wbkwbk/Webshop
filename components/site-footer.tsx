import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-serif text-lg text-foreground">donmartins</p>
          <p className="mt-2 max-w-md leading-6">
            Please register to pre-order the AFM Saucer MOD. Production starts once we reach 100 reservations. No
            payment is required upfront. Payment on this shop is simulated, and nothing is charged.
          </p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Link href="/post" className="text-foreground underline-offset-4 hover:underline">
            Demo post office
          </Link>
          <p className="max-w-xs leading-6 sm:text-right">
            Your account confirmations, password resets, and payment letters are kept here.
          </p>
        </div>
      </div>
    </footer>
  );
}
