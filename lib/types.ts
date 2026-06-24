// Shared domain types. These mirror the Supabase schema in
// supabase/migrations and are the contract between the data layer and the UI.

export type CreditKind =
  | "salary"
  | "freelance"
  | "bonus"
  | "refund"
  | "gift"
  | "interest"
  | "cashback"
  | "reimbursement"
  | "other";

export const CREDIT_KINDS: CreditKind[] = [
  "salary",
  "freelance",
  "bonus",
  "refund",
  "gift",
  "interest",
  "cashback",
  "reimbursement",
  "other",
];

export interface Profile {
  id: string;
  display_name: string | null;
  currency: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Credit {
  id: string;
  user_id: string;
  amount: number;
  kind: CreditKind;
  source: string | null;
  credited_at: string; // date (YYYY-MM-DD)
  note: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  monthly_budget: number | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
}

export interface ExpenseItem {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  icon: string | null;
  default_amount: number | null;
  use_count: number;
  last_used_at: string | null;
  is_pinned: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  item_id: string | null;
  category_id: string;
  amount: number;
  note: string | null;
  spent_at: string; // timestamptz
  recurring_id: string | null;
  trip_id: string | null;
  created_at: string;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  amount: number;
  day_of_month: number;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // null = forever
  is_active: boolean;
  created_at: string;
}

// Row shape of the budget_cycles view. cycle_end is null for the open cycle.
export interface BudgetCycleRow {
  salary_credit_id: string;
  user_id: string;
  salary_amount: number;
  cycle_start: string; // date
  cycle_end: string | null; // date or null (current/open cycle)
}

// Resolved cycle returned by lib/utils/cycle.ts — the single source of truth
// for "which cycle am I in" across the app.
export interface ResolvedCycle {
  salaryCreditId: string;
  salaryAmount: number;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (coalesced to today for the open cycle)
  isOpen: boolean; // true when this is the current, unbounded cycle
  dayNumber: number; // 1-based day within the cycle (relative to today)
}

// --- Plan-driven reframe ---

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  salary: number;
  buffer: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanAllowance {
  id: string;
  plan_id: string;
  category_id: string;
  amount: number;
}

// A plan joined with its allowances and the categories they reference.
export interface PlanWithAllowances extends Plan {
  allowances: Array<PlanAllowance & { category: Category }>;
}

// Calendar cycle derived from a reset day. Half-open [start, end): `end` is the
// first day of the NEXT cycle. `daysInCycle` and `daysElapsed` drive pacing.
export interface CalendarCycle {
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD exclusive (next cycle's start)
  daysInCycle: number; // total days in [start, end)
  daysElapsed: number; // 1-based: today counts as elapsed (clamped 1..daysInCycle)
  daysRemaining: number; // daysInCycle - daysElapsed, clamped >= 0
}

// Everything the pure pace math needs. No Supabase, no Date.now inside.
export interface PaceInputs {
  salary: number;
  buffer: number;
  committed: number; // full-cycle recurring total, reserved upfront
  spentSoFar: number; // discretionary spend so far this cycle
  cycle: CalendarCycle;
}

export type PaceVerdict = "under" | "on" | "over";

export interface PaceResult {
  spendable: number; // salary - savingsGoalDerived... see note; = salary - buffer - committed
  savingsGoal: number; // derived: salary - allocated(allowances) - buffer  (set by caller)
  expectedByToday: number; // spendable * daysElapsed / daysInCycle
  projectedSpend: number; // spentSoFar / daysElapsed * daysInCycle
  projectedSavings: number; // salary - projectedSpend - committed - buffer
  safeToSpendToday: number; // remaining discretionary / daysRemaining (>=0)
  verdict: PaceVerdict; // under/on/over vs expectedBytoday (with tolerance)
  paceRatio: number; // projectedSpend / spendable (1.0 = exactly on plan)
}

export interface CategoryPace {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  allowance: number;
  spent: number;
  projected: number; // spent / daysElapsed * daysInCycle
  verdict: PaceVerdict;
  paceRatio: number; // projected / allowance
}

export type InsightKind = "weekday" | "week-of-cycle" | "recurring-leak";

export interface Insight {
  kind: InsightKind;
  headline: string; // "You overspend most on weekends"
  detail: string; // "Sat–Sun avg ₹1,400/day vs ₹620 weekdays"
}

// --- Vacation mode ---

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
}

// Active trip with its running spend total and per-category breakdown.
export interface TripWithSpend extends Trip {
  total: number;
  byCategory: Array<{
    categoryId: string;
    name: string;
    icon: string | null;
    spent: number;
  }>;
  dayNumber: number; // 1-based days since start_date (or created_at), min 1
}
