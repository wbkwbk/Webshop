"use client";

import { Button } from "@/components/ui/button";
import { Frame } from "@/components/frame";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Frame>
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Workshop</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Something in the workshop stalled.</h1>
      <p className="mt-3 max-w-lg text-muted-foreground">
        The page did not finish. Your card was not charged. Try the same step again.
      </p>
      <Button type="button" className="mt-6 h-11 px-5" onClick={() => reset()}>
        Try again
      </Button>
    </Frame>
  );
}
