import { Card, CardLabel } from "@/components/ui/Card";
import { DisplayHeading } from "@/components/ui/DisplayHeading";

// Dashboard stub — placeholder cards styled per the design system. The radial
// "TOTAL SPENT" line-burst and real charts land in a later phase.
export default function DashboardPage() {
  return (
    <div className="pt-4">
      <DisplayHeading muted="Your" bold="Dashboard" />
      <p className="mt-2 mb-6 text-sm text-ink-soft">Coming soon.</p>

      <div className="space-y-4">
        <Card>
          <CardLabel>Budget vs left</CardLabel>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-mono text-3xl text-ink tabular-nums">₹0</span>
            <span className="font-mono text-sm text-ink-soft tabular-nums">
              of ₹0
            </span>
          </div>
          <div className="tick-motif mt-4 h-6 rounded-md" />
        </Card>

        <Card>
          <CardLabel>Recent</CardLabel>
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-surface-2" />
            <div className="h-4 w-1/2 rounded bg-surface-2" />
            <div className="h-4 w-2/3 rounded bg-surface-2" />
          </div>
        </Card>
      </div>
    </div>
  );
}
