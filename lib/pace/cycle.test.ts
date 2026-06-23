import { describe, it, expect } from "vitest";
import { resolveCalendarCycle } from "./cycle";

describe("resolveCalendarCycle", () => {
  it("today after reset day: cycle starts this month", () => {
    const c = resolveCalendarCycle(25, "2026-06-27");
    expect(c.start).toBe("2026-06-25");
    expect(c.end).toBe("2026-07-25");
    expect(c.daysInCycle).toBe(30);
    expect(c.daysElapsed).toBe(3); // 25,26,27
    expect(c.daysRemaining).toBe(27);
  });

  it("today before reset day: cycle started last month", () => {
    const c = resolveCalendarCycle(25, "2026-06-10");
    expect(c.start).toBe("2026-05-25");
    expect(c.end).toBe("2026-06-25");
    expect(c.daysInCycle).toBe(31); // May 25 -> Jun 25
    expect(c.daysElapsed).toBe(17); // May25..Jun10
  });

  it("today exactly on reset day: that day is day 1", () => {
    const c = resolveCalendarCycle(25, "2026-06-25");
    expect(c.start).toBe("2026-06-25");
    expect(c.daysElapsed).toBe(1);
  });

  it("reset day clamps in short months (31 -> Feb 28)", () => {
    const c = resolveCalendarCycle(31, "2026-02-15");
    expect(c.start).toBe("2026-01-31");
    expect(c.end).toBe("2026-02-28"); // Feb clamps 31 -> 28
  });

  it("reset day 1 is a clean calendar month", () => {
    const c = resolveCalendarCycle(1, "2026-06-15");
    expect(c.start).toBe("2026-06-01");
    expect(c.end).toBe("2026-07-01");
    expect(c.daysInCycle).toBe(30);
  });
});
