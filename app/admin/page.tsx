import Link from "next/link";
import { Suspense } from "react";
import { Frame, PageHeader } from "@/components/frame";
import { BatchMeter } from "@/components/batch-meter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { listProducts } from "@/lib/shop";

export const metadata = { title: "Workshop" };

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  await requireAdmin();
  const products = listProducts(getDb());

  return (
    <Frame>
      <PageHeader kicker="Workshop floor" title="Every piece, and where it stands">
        <p>
          Reserved pieces are held and not yet paid. That includes batches still filling, and full batches whose
          buyers have been asked to pay. Paid pieces can be produced. Shipped pieces have left for the address on the
          reservation. This list is always available.
        </p>
      </PageHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Piece</TableHead>
            <TableHead>Next batch</TableHead>
            <TableHead className="text-right">Reserved</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Shipped</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Link href={`/admin/products/${product.id}`} className="font-medium underline-offset-4 hover:underline">
                  {product.name}
                </Link>
                {product.paymentDueQty > 0 ? (
                  <p className="text-xs text-muted-foreground">{product.paymentDueQty} of the reserved pieces are waiting on payment</p>
                ) : null}
              </TableCell>
              <TableCell className="min-w-40">
                {product.hasOpenBatch ? (
                  <BatchMeter filled={product.openFilled} />
                ) : (
                  <span className="text-sm text-muted-foreground">Not started</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{product.reservedQty}</TableCell>
              <TableCell className="text-right tabular-nums">{product.paidQty}</TableCell>
              <TableCell className="text-right tabular-nums">{product.shippedQty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Frame>
  );
}
