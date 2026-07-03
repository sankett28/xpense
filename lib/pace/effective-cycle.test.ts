import { describe, it, expect } from "vitest";
import { resolveEffectiveCycle } from "./cycle";

describe("resolveEffectiveCycle", () => {
  it("no salary yet: falls back to the calendar cycle", () => {
    const c = resolveEffectiveCycle(null, 25, "2026-06-27");
    expect(c.start).toBe("2026-06-25");
    expect(c.end).toBe("2026-07-25");
    expect(c.expectedEnd).toBe("2026-07-25");
    expect(c.overdue).toBe(false);
    expect(c.daysInCycle).toBe(30);
  });

  it("on-time salary: expected end is the next reset day one month out", () => {
    // Salary landed exactly on the reset day.
    const c = resolveEffectiveCycle("2026-06-25", 25, "2026-06-27");
    expect(c.start).toBe("2026-06-25");
    expect(c.expectedEnd).toBe("2026-07-25");
    expect(c.end).toBe("2026-07-25");
    expect(c.daysInCycle).toBe(30);
    expect(c.daysElapsed).toBe(3); // 25,26,27
    expect(c.daysRemaining).toBe(27);
    expect(c.overdue).toBe(false);
  });

  it("late salary: cycle anchors to the real credit date, not the reset day", () => {
    // Expected payday 25th, but salary landed on the 28th.
    const c = resolveEffectiveCycle("2026-06-28", 25, "2026-06-30");
    expect(c.start).toBe("2026-06-28");
    expect(c.expectedEnd).toBe("2026-07-25");
    expect(c.daysInCycle).toBe(27); // 28 Jun -> 25 Jul
    expect(c.overdue).toBe(false);
  });

  it("early salary: expected payday skips to next month (not this month's reset)", () => {
    // Salary landed on the 22nd, 3 days before the reset day. Expected end must
    // NOT be this month's 25th (that would be a 3-day cycle).
    const c = resolveEffectiveCycle("2026-06-22", 25, "2026-06-24");
    expect(c.expectedEnd).toBe("2026-07-25");
    expect(c.daysInCycle).toBe(33); // 22 Jun -> 25 Jul
    expect(c.overdue).toBe(false);
  });

  it("overdue: today is past the expected payday and no new salary logged", () => {
    // Cycle started 25 May, expected next payday 25 Jun, but it's already 28 Jun.
    const c = resolveEffectiveCycle("2026-05-25", 25, "2026-06-28");
    expect(c.expectedEnd).toBe("2026-06-25");
    expect(c.overdue).toBe(true);
    // Query window extends through today so overdue-period spend still counts.
    expect(c.end).toBe("2026-06-29"); // today + 1
    // Projection denominator stays the expected length, not the extension.
    expect(c.daysInCycle).toBe(31); // 25 May -> 25 Jun
    expect(c.daysElapsed).toBe(31); // clamped to daysInCycle
    expect(c.daysRemaining).toBe(0);
  });

  it("today exactly on the expected payday is not yet overdue", () => {
    // expectedEnd is exclusive (next cycle's start), so today == expectedEnd
    // means the new salary is due today but the old cycle still owns the day.
    const c = resolveEffectiveCycle("2026-05-25", 25, "2026-06-25");
    expect(c.expectedEnd).toBe("2026-06-25");
    expect(c.overdue).toBe(false);
    expect(c.end).toBe("2026-06-25");
  });

  it("one day past the expected payday flips to overdue", () => {
    const c = resolveEffectiveCycle("2026-05-25", 25, "2026-06-26");
    expect(c.overdue).toBe(true);
    expect(c.end).toBe("2026-06-27"); // today + 1
    expect(c.daysInCycle).toBe(31); // denominator unchanged by the extension
    expect(c.daysRemaining).toBe(0);
  });

  it("reset day clamps in short months", () => {
    const c = resolveEffectiveCycle("2026-01-31", 31, "2026-02-10");
    expect(c.expectedEnd).toBe("2026-02-28"); // Feb clamps 31 -> 28
    expect(c.daysInCycle).toBe(28); // 31 Jan -> 28 Feb
    expect(c.overdue).toBe(false);
  });

  it("very late salary: next reset day is still ~a month out", () => {
    // Salary expected 25 Jun but landed 2 Jul. Next expected payday 25 Jul.
    const c = resolveEffectiveCycle("2026-07-02", 25, "2026-07-05");
    expect(c.expectedEnd).toBe("2026-07-25");
    expect(c.daysInCycle).toBe(23); // 2 Jul -> 25 Jul
    expect(c.overdue).toBe(false);
  });
});
