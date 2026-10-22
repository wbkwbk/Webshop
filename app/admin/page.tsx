import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { shipAction } from "@/app/actions/shop";
import { Frame, PageHeader } from "@/components/frame";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { getDb } from "@/lib/db";
import { formatAddress, formatChf, formatWhen, pieces } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { groupOrderedItems, listOrderedItems, listProducts, type OrderGroupBy, type OrderSort } from "@/lib/shop";
import type { SearchParams } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ordered items" };

const groups: { value: OrderGroupBy; label: string }[] = [
  { value: "none", label: "No group" },
  { value: "user", label: "User" },
  { value: "state", label: "Order state" },
  { value: "date", label: "Order date" },
];

const sorts: { value: OrderSort; label: string }[] = [
  { value: "user", label: "User" },
  { value: "state", label: "Order state" },
  { value: "date", label: "Order date" },
];

const directions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
] as const;

export default function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <OrderedItems searchParams={searchParams} />
    </Suspense>
  );
}

function oneOf<T extends string>(value: string | string[] | undefined, allowed: readonly T[], fallback: T): T {
  const raw = Array.isArray(value) ? value[0] : value;
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

function queryHref(current: { group: OrderGroupBy; sort: OrderSort; dir: "asc" | "desc" }, patch: Partial<typeof current>) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams({ group: next.group, sort: next.sort, dir: next.dir });
  return `/admin?${params.toString()}`;
}

async function OrderedItems({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const query = await searchParams;
  const group = oneOf(query.group, groups.map((item) => item.value), "none");
  const sort = oneOf(query.sort, sorts.map((item) => item.value), "date");
  const dir = oneOf(query.dir, ["asc", "desc"] as const, "desc");
  const current = { group, sort, dir };
  const returnTo = queryHref(current, {});
  const db = getDb();
  const lines = listOrderedItems(db);
  const grouped = groupOrderedItems(lines, group, sort, dir);
  const product = listProducts(db)[0];
  const reserved = lines.filter((line) => line.status === "reserved").reduce((sum, line) => sum + line.quantity, 0);
  const paid = lines.filter((line) => line.status === "paid").reduce((sum, line) => sum + line.quantity, 0);
  const shipped = lines.filter((line) => line.status === "shipped").reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Frame>
      <PageHeader kicker="Superuser" title="Ordered items">
        <p>
          Every reservation in the shop, from every account. Reserve is held and not yet paid. Pay means the money is
          in and production can include those pieces. Ship means they have left for the address on the reservation.
        </p>
      </PageHeader>
      {product ? (
        <p className="mb-6 text-sm text-muted-foreground">
          {product.name}: {product.openFilled} already reserved in total
          {product.openFilled >= 100 ? ", so production has started" : ", production starts at 100"}. {reserved} in
          Reserve · {paid} in Pay · {shipped} in Ship.
        </p>
      ) : null}
      <div className="mb-6 grid gap-4">
        <FilterRow label="Group by">
          {groups.map((item) => (
            <FilterLink key={item.value} href={queryHref(current, { group: item.value })} active={group === item.value}>
              {item.label}
            </FilterLink>
          ))}
        </FilterRow>
        <FilterRow label="Sort by">
          {sorts.map((item) => (
            <FilterLink key={item.value} href={queryHref(current, { sort: item.value })} active={sort === item.value}>
              {item.label}
            </FilterLink>
          ))}
          {directions.map((item) => (
            <FilterLink key={item.value} href={queryHref(current, { dir: item.value })} active={dir === item.value}>
              {item.label}
            </FilterLink>
          ))}
        </FilterRow>
      </div>
      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          Nothing is reserved yet. The AFM Saucer MOD starts at 0.
        </p>
      ) : (
        <div className="grid min-w-0 gap-8">
          {grouped.map((section) => (
            <section key={section.key} className="min-w-0">
              {section.label ? <h2 className="mb-3 font-serif text-2xl tracking-tight">{section.label}</h2> : null}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="bg-secondary/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2 font-medium">User</th>
                      <th className="px-3 py-2 font-medium">State</th>
                      <th className="px-3 py-2 font-medium">Order date</th>
                      <th className="px-3 py-2 font-medium">Pieces</th>
                      <th className="px-3 py-2 font-medium">Ship to</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {section.lines.map((line) => (
                      <tr key={line.id} className="border-t border-border align-top">
                        <td className="px-3 py-3">
                          <p className="font-medium">{line.address.name}</p>
                          <p className="text-muted-foreground">{line.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={line.status} vocabulary="order" />
                        </td>
                        <td className="px-3 py-3">{formatWhen(line.createdAt)}</td>
                        <td className="px-3 py-3">
                          <p>{pieces(line.quantity)}</p>
                          <p className="text-muted-foreground">{formatChf(line.quantity * line.unitPriceCents)}</p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{formatAddress(line.address)}</td>
                        <td className="px-3 py-3">
                          {line.status === "paid" ? (
                            <form action={shipAction}>
                              <input type="hidden" name="id" value={line.id} />
                              <input type="hidden" name="productId" value={line.productId} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <SubmitButton pendingLabel="Shipping…">Mark shipped</SubmitButton>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
      {product && product.paidQty > 0 ? (
        <form action={shipAction} className="mt-6">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="all" value="1" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <SubmitButton variant="outline" pendingLabel="Shipping…">
            Ship all paid
          </SubmitButton>
        </form>
      ) : null}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href={product ? `/admin/products/${product.id}` : "/"} className="underline-offset-4 hover:underline">
          {product ? product.name : "Shop"} detail
        </Link>
      </p>
    </Frame>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 text-xs tracking-[0.14em] text-muted-foreground uppercase">{label}</span>
      {children}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
      )}
    >
      {children}
    </Link>
  );
}
