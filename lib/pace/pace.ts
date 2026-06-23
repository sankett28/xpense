// Pure pace/projection math. No Supabase, no implicit time. All amounts are
// rupees as numbers. See docs/superpowers/specs/2026-06-23-plan-driven-reframe-design.md.

import type {
  CalendarCycle,
  CategoryPace,
  PaceInputs,
  PaceResult,
  PaceVerdict,
} from "@/lib/types";

// A small tolerance band so "basically on plan" doesn't read as off-pace.
export function verdictFor(ratio: number): PaceVerdict {
  if (ratio > 1.03) return "over";
  if (ratio < 0.97) return "under";
  return "on";
}

function project(spentSoFar: number, cycle: CalendarCycle): number {
  if (cycle.daysElapsed <= 0) return 0;
  return (spentSoFar / cycle.daysElapsed) * cycle.daysInCycle;
}

export function computePace(inputs: PaceInputs, allocated: number): PaceResult {
  const { salary, buffer, committed, spentSoFar, cycle } = inputs;

  const spendable = salary - buffer - committed;
  const savingsGoal = salary - allocated - buffer;
  const expectedByToday =
    cycle.daysInCycle > 0 ? (spendable * cycle.daysElapsed) / cycle.daysInCycle : 0;
  const projectedSpend = project(spentSoFar, cycle);
  const projectedSavings = salary - projectedSpend - committed - buffer;

  const remainingDiscretionary = spendable - spentSoFar;
  const denomDays = cycle.daysRemaining > 0 ? cycle.daysRemaining : 1;
  const safeToSpendToday = Math.max(0, remainingDiscretionary / denomDays);

  const paceRatio = spendable > 0 ? projectedSpend / spendable : 0;

  return {
    spendable,
    savingsGoal,
    expectedByToday,
    projectedSpend,
    projectedSavings,
    safeToSpendToday,
    verdict: verdictFor(paceRatio),
    paceRatio,
  };
}

export function computeCategoryPace(args: {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  allowance: number;
  spent: number;
  cycle: CalendarCycle;
}): CategoryPace {
  const projected = project(args.spent, args.cycle);
  const paceRatio = args.allowance > 0 ? projected / args.allowance : 0;
  return {
    categoryId: args.categoryId,
    name: args.name,
    icon: args.icon,
    color: args.color,
    allowance: args.allowance,
    spent: args.spent,
    projected,
    verdict: verdictFor(paceRatio),
    paceRatio,
  };
}
