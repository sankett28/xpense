"use client";

import { Delete } from "lucide-react";

export interface NumericKeypadProps {
  value: string;
  onChange: (next: string) => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"] as const;

// Numeric keypad for fast amount entry. Big tappable keys, mono digits.
// Enforces a single decimal point and at most two decimal places.
export function NumericKeypad({ value, onChange }: NumericKeypadProps) {
  const press = (key: string) => {
    if (key === ".") {
      if (value.includes(".")) return;
      // Leading "." becomes "0."
      onChange(value === "" ? "0." : value + ".");
      return;
    }

    // Digit
    if (value.includes(".")) {
      const decimals = value.split(".")[1] ?? "";
      if (decimals.length >= 2) return; // max 2 dp
    }
    // Avoid leading zeros like "00" / "05" (but allow "0" and "0.x").
    if (value === "0") {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  const backspace = () => {
    onChange(value.slice(0, -1));
  };

  const keyCls =
    "h-16 rounded-2xl bg-surface text-2xl font-mono text-ink " +
    "active:bg-surface-2 transition-colors select-none " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark/40";

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className={keyCls}
          aria-label={k === "." ? "decimal point" : k}
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={backspace}
        className={keyCls + " grid place-items-center"}
        aria-label="backspace"
      >
        <Delete size={24} />
      </button>
    </div>
  );
}

export default NumericKeypad;
