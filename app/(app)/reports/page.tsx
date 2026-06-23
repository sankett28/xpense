import { getInsights } from "@/lib/queries/insights";
import { getCyclePace } from "@/lib/queries/pace";
import { formatINR } from "@/lib/utils/currency";
import type { Insight } from "@/lib/types";

// Reports: progress (are you improving?), plain-language patterns, and where the
// money went. Insights only appear with enough data.
export default async function ReportsPage() {
  const [insightsData, paceData] = await Promise.all([getInsights(), getCyclePace()]);
  const { insights, savedThisCycle, savedLastCycle, streak } = insightsData;

  const delta = savedLastCycle != null ? savedThisCycle - savedLastCycle : null;
  const bySpent = [...(paceData?.categories ?? [])].sort((a, b) => b.spent - a.spent);
  const peak = bySpent[0]?.spent ?? 0;

  return (
    <div className="pt-8">
      <p className="label-caps">Your insights</p>

      <p className="label-caps mt-6">Progress</p>
      <div className="mt-2 divide-y divide-hairline border-t border-hairline">
        <Row label="Saved this cycle" value={formatINR(savedThisCycle)} />
        {delta != null ? (
          <Row
            label="vs last cycle"
            value={`${delta >= 0 ? "▲" : "▼"} ${formatINR(Math.abs(delta))}`}
          />
        ) : null}
        {streak > 0 ? (
          <Row label="Streak" value={`🔥 ${streak} ${streak === 1 ? "cycle" : "cycles"} on goal`} />
        ) : null}
      </div>

      {insights.length > 0 ? (
        <>
          <p className="label-caps mt-8">What the numbers say</p>
          <div className="mt-2 space-y-4">
            {insights.map((i: Insight, idx) => (
              <div key={idx}>
                <p className="text-ink">{i.headline}</p>
                <p className="text-sm text-ink-dim">{i.detail}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-8 text-sm text-ink-dim">
          Keep logging — patterns appear once there's enough data.
        </p>
      )}

      {bySpent.length > 0 ? (
        <>
          <p className="label-caps mt-8">Where it went</p>
          <div className="mt-2 space-y-2">
            {bySpent.map((c) => (
              <div key={c.categoryId}>
                <div className="flex items-center justify-between">
                  <span className="text-ink text-sm">{c.name}</span>
                  <span className="tabular-nums text-sm text-ink">{formatINR(c.spent)}</span>
                </div>
                <div className="glide-track mt-1" style={{ ["--pace-hue" as string]: "var(--color-ink-dim)" }}>
                  <span
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: peak > 0 ? `${(c.spent / peak) * 100}%` : "0%",
                      background: "var(--color-ink-dim)",
                      height: "2px",
                    }}
                    aria-hidden
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="label-caps">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
