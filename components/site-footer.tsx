import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-serif text-lg text-foreground">Hundert</p>
          <p>Dienerstrasse 12, 8004 Zürich</p>
          <p className="mt-2 max-w-md leading-6">
            A piece is made only after 100 of the same product are reserved. Payment on this shop is simulated, and
            nothing is charged.
          </p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Link href="/post" className="text-foreground underline-offset-4 hover:underline">
            Demo post office
          </Link>
          <p className="max-w-xs leading-6 sm:text-right">
            There is no mail server. Password resets and payment letters are kept here.
          </p>
        </div>
      </div>
    </footer>
  );
}
