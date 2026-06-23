import { describe, it, expect } from "vitest";
import { computePace, computeCategoryPace, verdictFor } from "./pace";
import type { CalendarCycle } from "@/lib/types";

const cycle: CalendarCycle = {
  start: "2026-06-25",
  end: "2026-07-25",
  daysInCycle: 30,
  daysElapsed: 10,
  daysRemaining: 20,
};

describe("verdictFor", () => {
  it("classifies under/on/over with tolerance", () => {
    expect(verdictFor(0.5)).toBe("under");
    expect(verdictFor(1.0)).toBe("on");
    expect(verdictFor(1.02)).toBe("on");
    expect(verdictFor(1.2)).toBe("over");
  });
});

describe("computePace", () => {
  it("derives spendable, savings goal, projection, and verdict", () => {
    // salary 60000, buffer 4000, committed 6000 -> spendable 50000
    // allocated 11000 -> savingsGoal = 60000 - 11000 - 4000 = 45000
    // spentSoFar 10000 over 10 days -> projectedSpend 30000
    // projectedSavings = 60000 - 30000 - 6000 - 4000 = 20000
    const r = computePace(
      { salary: 60000, buffer: 4000, committed: 6000, spentSoFar: 10000, cycle },
      11000,
    );
    expect(r.spendable).toBe(50000);
    expect(r.savingsGoal).toBe(45000);
    expect(r.projectedSpend).toBe(30000);
    expect(r.projectedSavings).toBe(20000);
    expect(r.expectedByToday).toBeCloseTo(50000 * 10 / 30, 2);
    expect(r.safeToSpendToday).toBeCloseTo((50000 - 10000) / 20, 2);
    expect(r.paceRatio).toBeCloseTo(30000 / 50000, 4); // 0.6 -> under
    expect(r.verdict).toBe("under");
  });

  it("flags over when projected spend exceeds spendable", () => {
    // spentSoFar 25000 in 10 days -> projected 75000 > spendable 50000
    const r = computePace(
      { salary: 60000, buffer: 4000, committed: 6000, spentSoFar: 25000, cycle },
      11000,
    );
    expect(r.verdict).toBe("over");
    expect(r.projectedSavings).toBeLessThan(r.savingsGoal);
  });

  it("never returns negative safe-to-spend", () => {
    const r = computePace(
      { salary: 60000, buffer: 4000, committed: 6000, spentSoFar: 49000, cycle },
      11000,
    );
    expect(r.safeToSpendToday).toBeGreaterThanOrEqual(0);
  });
});

describe("computeCategoryPace", () => {
  it("projects a category and classifies it", () => {
    const c = computeCategoryPace({
      categoryId: "x", name: "Petrol", icon: null, color: "pace",
      allowance: 4000, spent: 3800, cycle,
    });
    expect(c.projected).toBeCloseTo(3800 / 10 * 30, 2); // 11400
    expect(c.paceRatio).toBeCloseTo(11400 / 4000, 4);
    expect(c.verdict).toBe("over");
  });
});
