import { describe, it, expect } from "vitest";
import { computeInsights, computeStreak } from "./insights";

describe("computeStreak", () => {
  it("counts consecutive recent on-goal cycles", () => {
    // most recent first
    expect(
      computeStreak([
        { savings: 5000, goal: 4000 },
        { savings: 4200, goal: 4000 },
        { savings: 3000, goal: 4000 }, // breaks
        { savings: 9000, goal: 4000 },
      ]),
    ).toBe(2);
  });
  it("returns 0 when latest cycle missed goal", () => {
    expect(computeStreak([{ savings: 100, goal: 4000 }])).toBe(0);
  });
});

describe("computeInsights", () => {
  it("returns nothing below the data threshold", () => {
    expect(computeInsights([{ amount: 100, spent_at: "2026-06-25T10:00:00Z", cycle_start: "2026-06-25" }])).toEqual([]);
  });

  it("detects a weekend-heavy pattern", () => {
    const rows: Array<{ amount: number; spent_at: string; cycle_start: string }> = [];
    // 4 weekend days at 1400, 10 weekday days at 200 -> weekend much higher
    const weekend = ["2026-06-27", "2026-06-28", "2026-07-04", "2026-07-05"]; // Sat/Sun
    const weekday = ["2026-06-25","2026-06-26","2026-06-29","2026-06-30","2026-07-01","2026-07-02","2026-07-03","2026-07-06","2026-07-07","2026-07-08"];
    for (const d of weekend) rows.push({ amount: 1400, spent_at: `${d}T10:00:00`, cycle_start: "2026-06-25" });
    for (const d of weekday) rows.push({ amount: 200, spent_at: `${d}T10:00:00`, cycle_start: "2026-06-25" });
    const insights = computeInsights(rows);
    expect(insights.some((i) => i.kind === "weekday")).toBe(true);
  });
});
