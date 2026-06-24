import Link from "next/link";
import { Plane } from "lucide-react";

// Shown on monthly screens while a trip is active, since trip spend is tracked
// separately and the monthly numbers below are effectively paused.
export function TripNotice({ name }: { name: string }) {
  return (
    <Link
      href="/vacation"
      className="mt-4 flex items-center gap-3 rounded-2xl border border-hairline bg-panel p-3 text-sm"
    >
      <Plane size={16} className="text-pace-good" />
      <span className="text-ink-dim">
        Trip in progress — <span className="text-ink">{name}</span>. Monthly numbers are paused.
      </span>
    </Link>
  );
}
