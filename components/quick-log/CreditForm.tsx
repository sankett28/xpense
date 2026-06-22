"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { logCredit } from "@/app/(app)/actions";
import { CREDIT_KINDS, type CreditKind } from "@/lib/types";
import { todayISO } from "@/lib/utils/date";

// Form for logging any credit. Salary is the default and is flagged as the
// cycle anchor; all other kinds are inflow only.
export function CreditForm() {
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<CreditKind>("salary");
  const [source, setSource] = useState("");
  const [creditedAt, setCreditedAt] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const numericAmount = Number(amount);
  const canSave = Number.isFinite(numericAmount) && numericAmount > 0 && creditedAt;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setError(null);
    startTransition(async () => {
      try {
        await logCredit({
          amount: numericAmount,
          kind,
          source: source.trim() || null,
          creditedAt,
          note: note.trim() || null,
        });
        // Reset for the next entry; keep the date.
        setAmount("");
        setSource("");
        setNote("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save credit");
      }
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label-caps">Amount</label>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            className="mt-1 w-full rounded-xl bg-surface-2 px-4 py-3 font-mono text-2xl text-ink outline-none"
            autoFocus
          />
        </div>

        <div>
          <label className="label-caps">Kind</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {CREDIT_KINDS.map((k) => {
              const active = k === kind;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={[
                    "rounded-full px-3 py-1.5 text-sm capitalize",
                    active
                      ? k === "salary"
                        ? "bg-accent text-ink"
                        : "bg-dark text-on-dark"
                      : "bg-surface-2 text-ink-soft",
                  ].join(" ")}
                >
                  {k}
                </button>
              );
            })}
          </div>
          {kind === "salary" && (
            <p className="mt-2 text-xs text-ink-soft">
              Salary anchors a new budget cycle starting on the credit date.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-caps">Date</label>
            <input
              type="date"
              value={creditedAt}
              onChange={(e) => setCreditedAt(e.target.value)}
              className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-ink outline-none"
            />
          </div>
          <div>
            <label className="label-caps">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Acme Payroll"
              className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-ink placeholder:text-ink-soft/60 outline-none"
            />
          </div>
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-xl bg-surface-2 px-4 py-3 text-ink placeholder:text-ink-soft/60 outline-none"
        />

        {error && <p className="text-sm text-alert">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!canSave || isPending}
          className="w-full"
        >
          {isPending ? "Saving…" : "Log credit"}
        </Button>
      </form>
    </Card>
  );
}

export default CreditForm;
