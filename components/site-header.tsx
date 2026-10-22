import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions/auth";
import { MobileMenu } from "@/components/mobile-menu";
import { SubmitButton } from "@/components/submit-button";
import { live } from "@/lib/live";
import { readSessionUser } from "@/lib/session";
import { cartCount, listPaymentDue, unreadCount } from "@/lib/shop";
import { getDb } from "@/lib/db";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="block shrink-0">
          <span className="font-serif text-2xl tracking-tight">Hundert</span>
          <span className="block text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
            Zürich atelier
          </span>
        </Link>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Shop</p>}>
          <SessionNav />
        </Suspense>
      </div>
    </header>
  );
}

async function SessionNav() {
  await live();
  const user = await readSessionUser();
  const db = getDb();
  const count = user ? cartCount(db, user.id) : 0;
  const unread = user ? unreadCount(db, user.id) : 0;
  const due = user ? listPaymentDue(db, user.id).length : 0;
  const links = navLinks(user, count, unread, due);

  return (
    <>
      <nav className="hidden items-center gap-x-4 gap-y-2 text-sm md:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-primary">
            {link.label}
          </Link>
        ))}
        {user ? (
          <form action={signOutAction}>
            <SubmitButton variant="ghost" className="h-8 px-2" pendingLabel="Signing out…">
              Sign out
            </SubmitButton>
          </form>
        ) : (
          <Link href="/login" className="font-medium text-primary">
            Sign in
          </Link>
        )}
      </nav>
      <MobileMenu links={links} signedIn={Boolean(user)} />
    </>
  );
}

function navLinks(
  user: { name: string; role: string } | null,
  count: number,
  unread: number,
  due: number,
) {
  const links = [
    { href: "/", label: "Shop" },
    { href: "/post", label: "Post" },
  ];
  if (user) {
    links.push(
      { href: "/orders", label: "Orders" },
      { href: "/cart", label: count > 0 ? `Cart ${count}` : "Cart" },
      { href: "/notifications", label: unread > 0 ? `Notices ${unread}` : "Notices" },
      { href: "/account", label: user.name.split(" ")[0] ?? "Account" },
    );
    if (due > 0) links.push({ href: "/checkout/pay", label: "Pay" });
    if (user.role === "admin") links.push({ href: "/admin", label: "Ordered items" });
  } else {
    links.push({ href: "/register", label: "Register" });
  }
  return links;
}
