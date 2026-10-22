"use client";

import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileMenu({
  links,
  signedIn,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger
        className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm md:hidden"
        aria-label="Open menu"
      >
        Menu
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">Hundert</SheetTitle>
          <SheetDescription>Reserve first. Pay when the hundred is full.</SheetDescription>
        </SheetHeader>
        <nav className="grid gap-3 px-4">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="font-serif text-2xl tracking-tight">
              {link.label}
            </Link>
          ))}
          {signedIn ? (
            <form action={signOutAction} className="pt-4">
              <SubmitButton variant="outline" pendingLabel="Signing out…">
                Sign out
              </SubmitButton>
            </form>
          ) : (
            <Button nativeButton={false} render={<Link href="/login" />} className="mt-4 h-11 w-fit px-5">
              Sign in
            </Button>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
