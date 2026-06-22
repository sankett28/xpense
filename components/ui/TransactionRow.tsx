import type { Transaction } from "@/lib/types";
import { formatINR } from "@/lib/utils/currency";
import { formatTime } from "@/lib/utils/date";
import { IconTile } from "./IconTile";

export interface TransactionRowProps {
  transaction: Transaction;
  // Resolved display fields (the data layer joins items/categories upstream).
  itemName: string;
  categoryName: string;
  icon?: string | null;
  className?: string;
}

// Transaction row: dark icon tile left, name + category middle, amount + time
// right (amount in mono).
export function TransactionRow({
  transaction,
  itemName,
  categoryName,
  icon,
  className = "",
}: TransactionRowProps) {
  return (
    <div className={["flex items-center gap-3 py-3", className].join(" ")}>
      <IconTile icon={icon} size="md" />

      <div className="min-w-0 flex-1">
        <p className="text-ink font-medium truncate">{itemName}</p>
        <p className="label-caps truncate">{categoryName}</p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-mono text-ink tabular-nums">
          {formatINR(transaction.amount)}
        </p>
        <p className="text-xs text-ink-soft">{formatTime(transaction.spent_at)}</p>
      </div>
    </div>
  );
}

export default TransactionRow;
