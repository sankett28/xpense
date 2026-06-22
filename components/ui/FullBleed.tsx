import type { HTMLAttributes } from "react";

// Escapes the app column's horizontal padding so a child can bleed edge-to-edge.
// The (app) <main> uses px-4, so we counter it with -mx-4. Full-bleed color
// blocks (overrun banners, category blocks) wrap their content in this.
export function FullBleed({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={["-mx-4", className].join(" ")} {...props} />;
}

export default FullBleed;
