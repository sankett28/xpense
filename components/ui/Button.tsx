import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "dark" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-canvas hover:brightness-110 active:brightness-95",
  dark: "bg-dark text-on-dark hover:brightness-110 active:brightness-95",
  ghost:
    "bg-transparent text-ink border border-ink-soft/30 hover:bg-surface-2/60 active:bg-surface-2",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-base rounded-xl",
  lg: "h-14 px-6 text-lg rounded-2xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// Pure presentational button. Server-safe (no "use client"); accepts all native
// button props including onClick, which the consuming client component supplies.
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium",
        "transition-[filter,background-color] disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark/40",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export default Button;
