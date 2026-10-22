import Link from "next/link";
import { Suspense } from "react";
import { addToCartAction } from "@/app/actions/shop";
import { BatchMeter } from "@/components/batch-meter";
import { Frame } from "@/components/frame";
import { ProductArt } from "@/components/product-art";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCTION_AT } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { formatChf } from "@/lib/format";
import { live } from "@/lib/live";
import { readSessionUser } from "@/lib/session";
import { listProducts } from "@/lib/shop";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <ShopHome />
    </Suspense>
  );
}

async function ShopHome() {
  await live();
  const user = await readSessionUser();
  const products = listProducts(getDb());
  const reserved = products.reduce((sum, product) => sum + product.openFilled, 0);

  return (
    <>
      <Frame className="pb-4">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.6fr)]">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">AFM Saucer Mod · Zürich</p>
            <h1 className="mt-3 max-w-xl font-serif text-5xl leading-[0.95] tracking-tight text-balance sm:text-6xl">
              Production starts at one hundred.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              The shop has one piece, the AFM Saucer Mod. Reserve as many as you need. Everyone can see how many are
              already reserved. Production starts once at least 100 are reserved, and you can keep reserving after that.
            </p>
          </div>
          <div>
            <p className="font-serif text-[7rem] leading-none tracking-tight text-primary italic sm:text-[8rem]">{reserved}</p>
            <p className="text-sm text-muted-foreground">already reserved</p>
          </div>
        </div>
        <ol className="mt-10 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
          <li>
            <p className="font-serif text-2xl">1 · Reserve</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Add a piece to your cart and confirm a street address. This step does not charge you.
            </p>
          </li>
          <li>
            <p className="font-serif text-2xl">2 · Pay</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Once 100 are reserved, everyone who reserved is asked to pay. Later reservations can be paid straight away.
            </p>
          </li>
          <li>
            <p className="font-serif text-2xl">3 · Ship</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Paid pieces are made and posted. The workshop marks them shipped when they leave.
            </p>
          </li>
        </ol>
      </Frame>
      <Frame className="pt-0">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl tracking-tight">In the workshop now</h2>
          <p className="text-sm text-muted-foreground">One piece</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const until = PRODUCTION_AT - product.openFilled;
            return (
              <article key={product.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                <Link href={`/product/${product.slug}`} className="block aspect-[4/3] overflow-hidden">
                  <ProductArt slug={product.slug} name={product.name} />
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="font-serif text-2xl tracking-tight">
                      <Link href={`/product/${product.slug}`} className="hover:text-primary">
                        {product.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{product.summary}</p>
                  </div>
                  <p className="font-medium tabular-nums">{formatChf(product.priceCents)}</p>
                  <BatchMeter filled={product.openFilled} />
                  {until > 0 && until <= 10 ? (
                    <p className="text-sm text-primary">
                      {until} more {until === 1 ? "piece starts" : "pieces start"} production.
                    </p>
                  ) : null}
                  <div className="mt-auto pt-2">
                    {user ? (
                      <form action={addToCartAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="quantity" value="1" />
                        <input type="hidden" name="returnTo" value="/" />
                        <SubmitButton pendingLabel="Adding…">Add one to cart</SubmitButton>
                      </form>
                    ) : (
                      <Link
                        href={`/login?next=${encodeURIComponent(`/product/${product.slug}`)}`}
                        className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}
                      >
                        Sign in to reserve
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Frame>
    </>
  );
}
