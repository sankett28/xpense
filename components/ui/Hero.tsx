import { AmountText } from "./AmountText";

export interface HeroProps {
  label: string;
  amount: number | null | undefined;
  // auto → terracotta when negative (overrun); ink otherwise.
  tone?: "ink" | "alert" | "auto";
  className?: string;
}

// The page hero: a small caps label above one oversized mono amount, sitting on
// the page background (no card). The tick motif fills the empty right space.
export function Hero({ label, amount, tone = "auto", className = "" }: HeroProps) {
  return (
    <div className={["relative", className].join(" ")}>
      <span className="label-caps">{label}</span>
      <div className="mt-1">
        <AmountText amount={amount} size="hero" tone={tone} />
      </div>
    </div>
  );
}

export default Hero;
