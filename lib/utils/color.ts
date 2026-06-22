// Category colors are stored in the DB as PALETTE TOKEN NAMES (e.g. "dark",
// "accent"), never raw hex — so app/globals.css stays the single source of truth
// for what each color actually is. This resolves a token name to its CSS
// variable reference for use in an inline style (the one place Tailwind can't
// help, since the value is runtime/DB-driven).

const TOKENS = [
  "bg",
  "surface",
  "surface-2",
  "ink",
  "ink-soft",
  "accent",
  "alert",
  "dark",
  "on-dark",
] as const;

export type PaletteToken = (typeof TOKENS)[number];

function isToken(value: string): value is PaletteToken {
  return (TOKENS as readonly string[]).includes(value);
}

// Returns a CSS color value for a stored category color token, or null if the
// stored value isn't a recognized token (so callers can fall back to a default
// class). Returns `var(--token)` so the actual hex resolves from globals.css.
export function tokenColor(value: string | null | undefined): string | null {
  if (!value || !isToken(value)) return null;
  return `var(--${value})`;
}
