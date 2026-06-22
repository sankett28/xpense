import Link from "next/link";
import { Card, CardLabel } from "@/components/ui/Card";
import { DisplayHeading } from "@/components/ui/DisplayHeading";

const RANGES = ["week", "month", "quarter"] as const;
type Range = (typeof RANGES)[number];

// Reports stub — a visual range toggle driven by ?range= (no charts yet).
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const active: Range = (RANGES as readonly string[]).includes(range ?? "")
    ? (range as Range)
    : "month";

  return (
    <div className="pt-4">
      <DisplayHeading muted="Your" bold="Reports" />
      <p className="mt-2 mb-5 text-sm text-ink-soft">Coming soon.</p>

      {/* Range toggle */}
      <div className="mb-5 inline-flex rounded-full bg-surface-2 p-1">
        {RANGES.map((r) => {
          const isActive = r === active;
          return (
            <Link
              key={r}
              href={`/reports?range=${r}`}
              aria-current={isActive ? "page" : undefined}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                isActive ? "bg-accent text-ink" : "text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {r}
            </Link>
          );
        })}
      </div>

      <div className="space-y-4">
        <Card>
          <CardLabel>Spend by category</CardLabel>
          <div className="tick-motif mt-4 h-32 rounded-lg" />
        </Card>

        <Card>
          <CardLabel>Trend</CardLabel>
          <div className="tick-motif mt-4 h-24 rounded-lg" />
        </Card>
      </div>
    </div>
  );
}
