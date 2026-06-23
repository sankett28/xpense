// Minimal helpers local to lib/pace so the math stays dependency-light and
// testable. daysBetween mirrors lib/utils/date but avoids importing UI code.

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ua = Date.UTC(ay, (am ?? 1) - 1, ad ?? 1);
  const ub = Date.UTC(by, (bm ?? 1) - 1, bd ?? 1);
  return Math.round((ub - ua) / 86400000);
}

// Compact rupee string for insight sentences ("₹1,400"). Whole rupees.
export function formatINRish(amount: number): string {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}
