"use client";

// One editable allowance row: category name + a numeric amount input.
export function AllowanceRow({
  name,
  amount,
  onChange,
}: {
  name: string;
  amount: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 border-b border-hairline">
      <span className="text-ink">{name}</span>
      <span className="flex items-center gap-2">
        <span className="text-ink-dim text-sm" aria-hidden>
          ₹
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={amount === 0 ? "" : amount}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-24 bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label={`Allowance for ${name}`}
        />
      </span>
    </label>
  );
}
