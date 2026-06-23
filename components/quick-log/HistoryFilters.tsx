"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import type { Category } from "@/lib/types";

// Search + category filter for the history page. Writes to the URL so the server
// page re-queries; keeps state shareable and back-button friendly.
export function HistoryFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const activeCat = params.get("cat") ?? "";

  function apply(next: { q?: string; cat?: string }) {
    const sp = new URLSearchParams(params.toString());
    if (next.q !== undefined) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
    }
    if (next.cat !== undefined) {
      if (next.cat) sp.set("cat", next.cat);
      else sp.delete("cat");
    }
    startTransition(() => router.replace(`/history?${sp.toString()}`));
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: search.trim() });
        }}
        className="relative"
      >
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search expenses"
          className="w-full rounded-xl bg-surface px-10 py-3 text-ink placeholder:text-ink-soft/60 outline-none focus:ring-2 focus:ring-accent/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              apply({ q: "" });
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
          >
            <X size={16} />
          </button>
        )}
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip
          label="All"
          active={!activeCat}
          onClick={() => apply({ cat: "" })}
        />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            active={activeCat === c.id}
            onClick={() => apply({ cat: c.id })}
          />
        ))}
      </div>

      {isPending && <span className="sr-only">Loading…</span>}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors",
        active ? "bg-pace-good text-canvas" : "bg-surface text-ink hover:bg-surface-2/70",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default HistoryFilters;
