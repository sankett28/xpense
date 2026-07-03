import { describe, it, expect } from "vitest";
import { addDays, daysBetween } from "./date";

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-06-10", 5)).toBe("2026-06-15");
  });

  it("rolls over a month boundary", () => {
    expect(addDays("2026-06-28", 4)).toBe("2026-07-02");
  });

  it("rolls over a year boundary", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("handles month-length differences (Jan 31 + 1 = Feb 1)", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("adds zero days (identity)", () => {
    expect(addDays("2026-06-15", 0)).toBe("2026-06-15");
  });

  it("subtracts with a negative offset", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is the inverse of daysBetween", () => {
    const start = "2026-06-25";
    const end = addDays(start, 30);
    expect(daysBetween(start, end)).toBe(30);
  });
});
