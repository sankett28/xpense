import { Card, CardLabel } from "@/components/ui/Card";

// Dashboard stub — placeholder cards styled per the design system.
export default function DashboardPage() {
  return (
    <div className="py-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">Coming soon.</p>
      </header>

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
