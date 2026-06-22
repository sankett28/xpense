// INR formatting helpers. Both gracefully handle null/NaN by returning "₹0".

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isBad(amount: number | null | undefined): amount is null | undefined {
  return amount == null || Number.isNaN(amount);
}

// Whole-rupee display (no paise) — the default for figures across the UI.
export function formatINR(amount: number | null | undefined): string {
  if (isBad(amount)) return "₹0";
  return inrWhole.format(amount);
}

// Two-decimal variant for inputs / edits where paise matter.
export function formatINRWithPaise(amount: number | null | undefined): string {
  if (isBad(amount)) return "₹0.00";
  return inrPaise.format(amount);
}
