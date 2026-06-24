"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { HomeLogger } from "@/components/quick-log/HomeLogger";
import { endTripAction } from "@/app/(app)/actions";
import { formatINR } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { Category, ExpenseItem, TripWithSpend } from "@/lib/types";

export function TripView({
  trip,
  categories,
  recentItems,
}: {
  trip: TripWithSpend;
  categories: Category[];
  recentItems: ExpenseItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col pt-8">
      <p className="label-caps">
        {trip.name} · Day {trip.dayNumber}
      </p>
      <p className="mt-2 text-xs text-ink-dim">Trip total</p>
      <p className="font-display tabular-nums text-7xl font-light leading-none mt-1 text-ink">
        {formatINR(trip.total)}
      </p>
      {trip.start_date ? (
        <p className="mt-2 text-sm text-ink-dim">Started {formatDate(trip.start_date)}</p>
      ) : null}

      <HomeLogger categories={categories} recentItems={recentItems} />

      {trip.byCategory.length > 0 ? (
        <>
          <p className="label-caps mt-8">On this trip</p>
          <div className="mt-2 divide-y divide-hairline border-t border-hairline">
            {trip.byCategory.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between py-3">
                <span className="text-ink">{c.name}</span>
                <span className="tabular-nums text-ink">{formatINR(c.spent)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <button
        onClick={() => {
          if (confirm("End this trip?")) {
            start(async () => {
              await endTripAction(trip.id);
              router.refresh();
            });
          }
        }}
        disabled={pending}
        className="mt-8 w-full rounded-md border border-hairline py-3 text-ink disabled:opacity-60"
      >
        {pending ? "Ending…" : "End trip"}
      </button>
    </div>
  );
}
