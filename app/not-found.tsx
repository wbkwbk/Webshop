import Link from "next/link";
import { Frame } from "@/components/frame";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <Frame>
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Missing</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">That page is not in the workshop.</h1>
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 px-5")}>
        Back to the shop
      </Link>
    </Frame>
  );
}
