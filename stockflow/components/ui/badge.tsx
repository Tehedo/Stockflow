import { cn, getStockStatus, statusTone } from "@/lib/utils";
import type { StockStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: StockStatus }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone.bg,
        tone.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {status}
    </span>
  );
}

export function StockStatusBadge({ quantity, reorderPoint }: { quantity: number; reorderPoint: number }) {
  return <StatusBadge status={getStockStatus(quantity, reorderPoint)} />;
}

export function PlainBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-surface-subtle text-ink-600"
      )}
    >
      {children}
    </span>
  );
}
