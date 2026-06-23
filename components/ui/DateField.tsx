"use client";

import { formatDate } from "@/lib/utils/date";

export interface DateFieldProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

// A date field that looks identical on every device. The visible box is a plain
// styled div we fully control (so it never collapses or overflows like a bare
// iOS <input type="date">); a transparent native date input is layered on top
// to capture taps and open the OS picker. The box shows the formatted date or a
// placeholder.
export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  ariaLabel,
}: DateFieldProps) {
  return (
    <div className="relative mt-1.5 h-12 w-full">
      {/* Visible, fully-controlled box. */}
      <div className="pointer-events-none flex h-12 w-full items-center rounded-xl bg-surface-2 px-3">
        {value ? (
          <span className="text-ink">{formatDate(value)}</span>
        ) : (
          <span className="text-ink-soft/60">{placeholder}</span>
        )}
      </div>
      {/* Transparent native input on top — opens the OS picker, no visuals. */}
      <input
        type="date"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

export default DateField;
