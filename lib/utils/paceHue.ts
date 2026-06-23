import type { PaceVerdict } from "@/lib/types";

const GOOD = [0x5b, 0xd6, 0xc0] as const;
const WARN = [0xe0, 0xa3, 0x3e] as const;
const OVER = [0xe0, 0x65, 0x3e] as const;

function hex(rgb: readonly number[]): string {
  return "#" + rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
}
function lerp(a: readonly number[], b: readonly number[], t: number): number[] {
  return a.map((av, i) => av + (b[i] - av) * t);
}

// ratio = projected/spendable (or projected/allowance). <=1 calm; grows warmer.
export function paceHue(ratio: number): string {
  if (ratio <= 1) return hex(GOOD);
  if (ratio <= 1.15) return hex(lerp(GOOD, WARN, (ratio - 1) / 0.15));
  if (ratio >= 1.5) return hex(OVER);
  return hex(lerp(WARN, OVER, (ratio - 1.15) / 0.35));
}

export function verdictLabel(verdict: PaceVerdict): string {
  if (verdict === "under") return "UNDER PLAN";
  if (verdict === "over") return "OVER";
  return "ON PACE";
}

// Track position (0..100%) for the user's dot; 1.0 sits at the centered tick.
export function dotPercent(ratio: number): number {
  const clamped = Math.min(Math.max(ratio, 0), 2);
  return 8 + (clamped / 2) * 84; // 8%..92%
}
