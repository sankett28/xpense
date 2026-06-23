import { paceHue, dotPercent } from "@/lib/utils/paceHue";

// The signature element. A track with a centered "expected today" tick and a
// dot at the user's actual position. Hue carries the verdict; the dot position
// and the aria-label carry it too (never color alone).
export function GlidePath({
  paceRatio,
  size = "hero",
  label,
}: {
  paceRatio: number;
  size?: "hero" | "row";
  label?: string;
}) {
  const hue = paceHue(paceRatio);
  const left = dotPercent(paceRatio);
  const aria =
    label ??
    (paceRatio <= 1
      ? "On or under pace"
      : paceRatio <= 1.15
        ? "Slightly over pace"
        : "Over pace");

  return (
    <div
      role="img"
      aria-label={aria}
      className={size === "hero" ? "py-3" : "py-1.5"}
      style={{ ["--pace-hue" as string]: hue }}
    >
      <div className="glide-track">
        <span className="glide-tick" style={{ left: "50%" }} aria-hidden />
        <span className="glide-dot" style={{ left: `${left}%` }} aria-hidden />
      </div>
    </div>
  );
}
