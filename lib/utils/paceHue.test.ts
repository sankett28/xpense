import { describe, it, expect } from "vitest";
import { paceHue, verdictLabel } from "./paceHue";

describe("paceHue", () => {
  it("returns the good hue at or below plan", () => {
    expect(paceHue(0.5)).toBe("#5bd6c0");
    expect(paceHue(1.0)).toBe("#5bd6c0");
  });
  it("returns a string color when over plan", () => {
    const c = paceHue(1.5);
    expect(typeof c).toBe("string");
    expect(c.startsWith("#") || c.startsWith("rgb")).toBe(true);
  });
});

describe("verdictLabel", () => {
  it("maps verdicts to copy", () => {
    expect(verdictLabel("under")).toBe("UNDER PLAN");
    expect(verdictLabel("on")).toBe("ON PACE");
    expect(verdictLabel("over")).toBe("OVER");
  });
});
