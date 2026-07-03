import { describe, it, expect } from "vitest";
import { resolveCurrentCycle, previousSalaryWindow } from "./cycle";
import type { BudgetCycleRow } from "@/lib/types";

// Build a budget_cycles row. cycle_end null = the open (current) cycle.
function row(id: string, start: string, end: string | null): BudgetCycleRow {
  return {
    salary_credit_id: id,
    user_id: "u1",
    salary_amount: 50000,
    cycle_start: start,
    cycle_end: end,
  };
}

describe("resolveCurrentCycle", () => {
  it("returns null when no salary cycles exist", () => {
    expect(resolveCurrentCycle([], "2026-06-27")).toBeNull();
  });

  it("returns the open cycle once today reaches its start", () => {
    const rows = [row("a", "2026-05-25", "2026-06-27"), row("b", "2026-06-28", null)];
    const c = resolveCurrentCycle(rows, "2026-06-30");
    expect(c?.salaryCreditId).toBe("b");
    expect(c?.start).toBe("2026-06-28");
    expect(c?.isOpen).toBe(true);
  });

  it("returns the closed cycle that contains today", () => {
    const rows = [row("a", "2026-05-25", "2026-06-27"), row("b", "2026-06-28", null)];
    const c = resolveCurrentCycle(rows, "2026-06-10");
    expect(c?.salaryCreditId).toBe("a");
  });

  it("returns null when today precedes the first salary", () => {
    const rows = [row("a", "2026-06-28", null)];
    expect(resolveCurrentCycle(rows, "2026-06-01")).toBeNull();
  });

  it("does not rely on input ordering", () => {
    const rows = [row("b", "2026-06-28", null), row("a", "2026-05-25", "2026-06-27")];
    const c = resolveCurrentCycle(rows, "2026-06-30");
    expect(c?.salaryCreditId).toBe("b");
  });
});

describe("previousSalaryWindow", () => {
  it("returns null when there is no current cycle", () => {
    expect(previousSalaryWindow([], null)).toBeNull();
  });

  it("returns null when the current cycle is the first one", () => {
    const rows = [row("a", "2026-06-28", null)];
    const current = resolveCurrentCycle(rows, "2026-06-30");
    expect(previousSalaryWindow(rows, current)).toBeNull();
  });

  it("spans the prior row's start up to the current cycle's start", () => {
    const rows = [row("a", "2026-05-25", "2026-06-27"), row("b", "2026-06-28", null)];
    const current = resolveCurrentCycle(rows, "2026-06-30");
    expect(previousSalaryWindow(rows, current)).toEqual({
      start: "2026-05-25",
      end: "2026-06-28",
    });
  });

  it("picks the immediately preceding cycle across three cycles", () => {
    const rows = [
      row("a", "2026-04-25", "2026-05-24"),
      row("b", "2026-05-25", "2026-06-27"),
      row("c", "2026-06-28", null),
    ];
    const current = resolveCurrentCycle(rows, "2026-06-30");
    expect(previousSalaryWindow(rows, current)).toEqual({
      start: "2026-05-25",
      end: "2026-06-28",
    });
  });

  it("is unaffected by input ordering", () => {
    const rows = [
      row("c", "2026-06-28", null),
      row("a", "2026-04-25", "2026-05-24"),
      row("b", "2026-05-25", "2026-06-27"),
    ];
    const current = resolveCurrentCycle(rows, "2026-06-30");
    expect(previousSalaryWindow(rows, current)).toEqual({
      start: "2026-05-25",
      end: "2026-06-28",
    });
  });
});
