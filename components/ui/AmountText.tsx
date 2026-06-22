import { formatINR } from "@/lib/utils/currency";

type Size = "sm" | "md" | "lg" | "hero";
type Tone = "ink" | "on-dark" | "alert" | "accent" | "auto";

const SIZES: Record<Size, string> = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-3xl",
  hero: "text-6xl leading-none",
};

const TONES: Record<Exclude<Tone, "auto">, string> = {
  ink: "text-ink",
  "on-dark": "text-on-dark",
  alert: "text-alert",
  accent: "text-accent",
};

export interface AmountTextProps {
  amount: number | null | undefined;
  size?: Size;
  tone?: Tone;
  className?: string;
}

// The one way to render money. Whole-rupee INR, mono + tabular-nums. tone="auto"
// turns negative/overrun amounts terracotta. See docs/design-system.md.
export function AmountText({
  amount,
  size = "md",
  tone = "ink",
  className = "",
}: AmountTextProps) {
  const resolvedTone: Exclude<Tone, "auto"> =
    tone === "auto" ? ((amount ?? 0) < 0 ? "alert" : "ink") : tone;

  return (
    <span
      className={[
        "font-mono tabular-nums tracking-tight",
        SIZES[size],
        TONES[resolvedTone],
        className,
      ].join(" ")}
    >
      {formatINR(amount)}
    </span>
  );
}

export default AmountText;
