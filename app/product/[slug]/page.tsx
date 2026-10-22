import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BatchMeter } from "@/components/batch-meter";
import { Frame, PageHeader } from "@/components/frame";
import { ProductArt } from "@/components/product-art";
import { QuantityPicker } from "@/components/shop-forms";
import { getDb } from "@/lib/db";
import { formatChf, pieces } from "@/lib/format";
import { live } from "@/lib/live";
import { readSessionUser } from "@/lib/session";
import { getProductBySlug } from "@/lib/shop";
import type { SearchParams } from "@/lib/types";

export default function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={null}>
      <ProductDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  await live();
  const { slug } = await params;
  const query = await searchParams;
  const product = getProductBySlug(getDb(), slug);
  if (!product) notFound();
  const user = await readSessionUser();
  const notice = typeof query.notice === "string" ? query.notice : "";

  return (
    <Frame>
      <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        All pieces
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-border">
          <ProductArt slug={product.slug} name={product.name} />
        </div>
        <div>
          <PageHeader kicker="Made in batches of 100" title={product.name}>
            <p>{product.summary}</p>
          </PageHeader>
          <p className="mb-4 font-serif text-3xl tabular-nums">{formatChf(product.priceCents)}</p>
          {product.hasOpenBatch ? (
            <BatchMeter filled={product.openFilled} />
          ) : (
            <p className="text-sm text-muted-foreground">
              The previous hundred is closed. Ordering now opens the next batch at zero.
            </p>
          )}
          {product.paymentDueQty > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {pieces(product.paymentDueQty)} in a full batch are still waiting on payment.
            </p>
          ) : null}
          <p className="mt-5 leading-7 text-muted-foreground">{product.description}</p>
          {notice ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {notice}
            </p>
          ) : null}
          <div className="mt-6">
            <QuantityPicker
              productId={product.id}
              openFilled={product.hasOpenBatch ? product.openFilled : 0}
              signedIn={Boolean(user)}
              returnTo={`/product/${product.slug}`}
            />
          </div>
        </div>
      </div>
    </Frame>
  );
}
