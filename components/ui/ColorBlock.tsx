import type { ReactNode } from "react";
import { AmountText } from "./AmountText";
import { tokenColor } from "@/lib/utils/color";

type Variant = "accent" | "alert" | "dark" | "surface" | "custom";

const VARIANT_BG: Record<Exclude<Variant, "custom">, string> = {
  accent: "bg-accent",
  alert: "bg-alert",
  dark: "bg-dark",
  surface: "bg-surface-2",
};

// Text tone that reads on each block.
const VARIANT_TONE: Record<
  Exclude<Variant, "custom">,
  { label: string; amount: "ink" | "on-dark" }
> = {
  accent: { label: "text-ink/70", amount: "ink" },
  alert: { label: "text-on-dark/80", amount: "on-dark" },
  dark: { label: "text-on-dark/70", amount: "on-dark" },
  surface: { label: "text-ink-soft", amount: "ink" },
};

export interface ColorBlockProps {
  variant?: Variant;
  // DB-driven category color as a palette TOKEN NAME (e.g. "dark"); used when
  // variant="custom". Resolved to its CSS variable via tokenColor().
  color?: string | null;
  label?: string;
  amount?: number | null;
  // A centered figure (e.g. the giant "+" on the add block).
  center?: ReactNode;
  children?: ReactNode;
  className?: string;
}

// Full-bleed colored section: small caps label top-left, amount bottom-right,
// optional centered figure. Wrap in <FullBleed> to reach the column edges.
// See docs/design-system.md.
export function ColorBlock({
  variant = "surface",
  color,
  label,
  amount,
  center,
  children,
  className = "",
}: ColorBlockProps) {
  const isCustom = variant === "custom";
  const customColor = isCustom ? tokenColor(color) : null;
  const bgClass = isCustom ? (customColor ? "" : "bg-surface-2") : VARIANT_BG[variant];
  const tone = isCustom ? { label: "text-ink/70", amount: "ink" as const } : VARIANT_TONE[variant];

  return (
    <section
      className={[
        "relative flex min-h-[120px] flex-col justify-between px-5 py-5",
        bgClass,
        className,
      ].join(" ")}
      style={customColor ? { backgroundColor: customColor } : undefined}
    >
      {label && (
        <span
          className={[
            "label-caps",
            // override .label-caps default color per variant
            tone.label,
          ].join(" ")}
        >
          {label}
        </span>
      )}

      {center && (
        <div className="flex flex-1 items-center justify-center py-2">
          {center}
        </div>
      )}

      {children}

      {amount != null && (
        <div className="mt-2 self-end">
          <AmountText amount={amount} size="md" tone={tone.amount} />
        </div>
      )}
    </section>
  );
}

export default ColorBlock;
