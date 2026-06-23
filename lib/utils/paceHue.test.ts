import { describe, it, expect } from "vitest";
import { paceHue, verdictLabel, dotPercent } from "./paceHue";

describe("paceHue", () => {
  it("returns the good hue at or below plan", () => {
    expect(paceHue(0.5)).toBe("#5bd6c0");
    expect(paceHue(1.0)).toBe("#5bd6c0");
  });
  it("returns the over-plan hue at the ceiling", () => {
    expect(paceHue(1.5)).toBe("#e0653e");
  });
});

describe("dotPercent", () => {
  it("maps ratio to track position with 1.0 centered", () => {
    expect(dotPercent(0)).toBe(8);
    expect(dotPercent(1)).toBe(50);
    expect(dotPercent(2)).toBe(92);
    expect(dotPercent(3)).toBe(92); // clamps at 2
  });
});

describe("verdictLabel", () => {
  it("maps verdicts to copy", () => {
    expect(verdictLabel("under")).toBe("UNDER PLAN");
    expect(verdictLabel("on")).toBe("ON PACE");
    expect(verdictLabel("over")).toBe("OVER");
  });
});
