import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReservationStatus } from "@/lib/types";

const labels: Record<ReservationStatus, string> = {
  reserved: "Reserved",
  paid: "Paid",
  shipped: "Shipped",
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-6 px-2",
        status === "paid" && "bg-[#efe3c4] text-[#6d5316]",
        status === "shipped" && "bg-[#234237] text-[#f3efe6]",
      )}
    >
      {labels[status]}
    </Badge>
  );
}
