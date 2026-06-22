import type { Transaction } from "@/lib/types";
import { formatTime } from "@/lib/utils/date";
import { tokenColor } from "@/lib/utils/color";
import { AmountText } from "./AmountText";
import { IconTile } from "./IconTile";

export interface TransactionRowProps {
  transaction: Transaction;
  // Resolved display fields (the page joins items/categories upstream).
  itemName: string;
  categoryName: string;
  icon?: string | null;
  // Optional category color as a palette TOKEN NAME → rendered as a left-edge
  // accent bar on the tile (resolved to its CSS variable via tokenColor()).
  accentColor?: string | null;
  className?: string;
}

// Transaction row: dark icon tile left (optional colored edge accent), name +
// small caps category middle, amount + time right (mono). See design-system.md.
export function TransactionRow({
  transaction,
  itemName,
  categoryName,
  icon,
  accentColor,
  className = "",
}: TransactionRowProps) {
  const accent = tokenColor(accentColor);
  return (
    <div className={["flex items-center gap-3 py-3", className].join(" ")}>
      <div className="relative">
        {accent && (
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
            style={{ backgroundColor: accent }}
          />
        )}
        <IconTile icon={icon} size="md" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{itemName}</p>
        <p className="label-caps truncate">{categoryName}</p>
      </div>

      <div className="shrink-0 text-right">
        <AmountText amount={transaction.amount} size="md" />
        <p className="text-xs text-ink-soft">{formatTime(transaction.spent_at)}</p>
      </div>
    </div>
  );
}

export default TransactionRow;
