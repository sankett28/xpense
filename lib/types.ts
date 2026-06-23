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
