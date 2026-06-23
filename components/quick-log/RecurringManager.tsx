"use client";

import { useState, useTransition } from "react";
import { Plus, Pause, Play, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AmountText } from "@/components/ui/AmountText";
import { DateField } from "@/components/ui/DateField";
import {
  createRecurring,
  editRecurring,
  toggleRecurring,
  removeRecurring,
} from "@/app/(app)/actions";
import { todayISO } from "@/lib/utils/date";
import type { Category, RecurringExpense } from "@/lib/types";

interface Props {
  recurring: RecurringExpense[];
  categories: Category[];
}

// Manage recurring expenses: add new, edit, pause/resume, delete. Each is
// time-bound (end date, or blank = forever) and editable. They materialize into
// real, individually-editable transactions on app visit.
export function RecurringManager({ recurring, categories }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="mt-5 flex flex-col gap-4">
      {!adding && editingId === null && (
        <Button variant="primary" onClick={() => setAdding(true)} className="self-start">
          <Plus size={18} /> Add recurring
        </Button>
      )}

      {adding && (
        <RecurringForm
          categories={categories}
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {recurring.length === 0 && !adding && (
        <p className="text-sm text-ink-soft">
          No recurring expenses yet. Add rent, subscriptions, or any fixed monthly
          cost — they&rsquo;ll log themselves each month.
        </p>
      )}

      {recurring.map((r) =>
        editingId === r.id ? (
          <RecurringForm
            key={r.id}
            categories={categories}
            existing={r}
            onDone={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <RecurringCard
            key={r.id}
            recurring={r}
            categoryName={catName.get(r.category_id) ?? ""}
            onEdit={() => setEditingId(r.id)}
          />
        ),
      )}
    </div>
  );
}

function RecurringCard({
  recurring: r,
  categoryName,
  onEdit,
}: {
  recurring: RecurringExpense;
  categoryName: string;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className={r.is_active ? "" : "opacity-60"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-ink">{r.name}</p>
          <p className="label-caps">
            {categoryName} · day {r.day_of_month} ·{" "}
            {r.end_date ? `until ${r.end_date}` : "forever"}
            {!r.is_active && " · paused"}
          </p>
        </div>
        <AmountText amount={r.amount} size="md" />
      </div>

      <div className="mt-3 flex gap-2 border-t border-ink-soft/15 pt-3 text-sm">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 text-ink-soft hover:text-ink"
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => toggleRecurring(r.id, !r.is_active))
          }
          className="flex items-center gap-1.5 text-ink-soft hover:text-ink"
        >
          {r.is_active ? <Pause size={14} /> : <Play size={14} />}
          {r.is_active ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => removeRecurring(r.id))}
          className="ml-auto flex items-center gap-1.5 text-alert"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </Card>
  );
}

function RecurringForm({
  categories,
  existing,
  onDone,
  onCancel,
}: {
  categories: Category[];
  existing?: RecurringExpense;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [categoryId, setCategoryId] = useState(
    existing?.category_id ?? categories[0]?.id ?? "",
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    String(existing?.day_of_month ?? 1),
  );
  const [startDate, setStartDate] = useState(
    existing?.start_date ?? todayISO(),
  );
  const [endDate, setEndDate] = useState(existing?.end_date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amt = Number(amount);
  const canSave = name.trim() && Number.isFinite(amt) && amt > 0 && categoryId;

  function handleSave() {
    if (!canSave) return;
    setError(null);
    startTransition(async () => {
      try {
        if (existing) {
          await editRecurring({
            id: existing.id,
            categoryId,
            name: name.trim(),
            amount: amt,
            dayOfMonth: Number(dayOfMonth) || 1,
            endDate: endDate || null,
          });
        } else {
          await createRecurring({
            categoryId,
            name: name.trim(),
            amount: amt,
            dayOfMonth: Number(dayOfMonth) || 1,
            startDate,
            endDate: endDate || null,
          });
        }
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div>
          <label className="label-caps">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rent, Netflix"
            className="mt-1.5 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-caps">Amount</label>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="mt-1.5 w-full rounded-xl bg-surface-2 px-4 py-3 font-mono text-ink outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="label-caps">Day of month</label>
            <input
              inputMode="numeric"
              value={dayOfMonth}
              onChange={(e) =>
                setDayOfMonth(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
              }
              placeholder="1"
              className="mt-1.5 w-full rounded-xl bg-surface-2 px-4 py-3 font-mono text-ink outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>

        <div>
          <label className="label-caps">Category</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={[
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  c.id === categoryId
                    ? "bg-pace-good text-canvas"
                    : "bg-surface-2 text-ink hover:bg-surface-2/70",
                ].join(" ")}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 items-end gap-3">
          {!existing && (
            <div className="flex min-w-0 flex-col">
              <label className="label-caps whitespace-nowrap">Starts</label>
              <DateField
                value={startDate}
                onChange={setStartDate}
                ariaLabel="Start date"
              />
            </div>
          )}
          <div className={`flex min-w-0 flex-col ${existing ? "col-span-2" : ""}`}>
            <label className="label-caps whitespace-nowrap">
              Until <span className="normal-case tracking-normal opacity-70">(blank = forever)</span>
            </label>
            <DateField
              value={endDate}
              onChange={setEndDate}
              placeholder="Forever"
              ariaLabel="End date"
            />
          </div>
        </div>

        {error && <p className="text-sm text-alert">{error}</p>}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isPending} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!canSave || isPending}
            className="flex-1"
          >
            {isPending ? "Saving…" : existing ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default RecurringManager;
