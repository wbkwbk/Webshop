import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReservationStatus } from "@/lib/types";

const labels: Record<ReservationStatus, string> = {
  reserved: "Reserved",
  paid: "Paid",
  shipped: "Shipped",
};

const orderLabels: Record<ReservationStatus, string> = {
  reserved: "Reserve",
  paid: "Pay",
  shipped: "Ship",
};

export function StatusBadge({
  status,
  vocabulary = "account",
}: {
  status: ReservationStatus;
  vocabulary?: "account" | "order";
}) {
  const text = vocabulary === "order" ? orderLabels[status] : labels[status];
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-6 px-2",
        status === "paid" && "bg-[#efe3c4] text-[#6d5316]",
        status === "shipped" && "bg-[#234237] text-[#f3efe6]",
      )}
    >
      {text}
    </Badge>
  );
}
