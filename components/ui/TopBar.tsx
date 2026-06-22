"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  User,
  Home,
  Wallet,
  Tag,
  LayoutDashboard,
  BarChart3,
  LogOut,
} from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";

const MENU_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/credits", label: "Credits", icon: Wallet },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
] as const;

// 3x3 dot-grid menu glyph.
function DotGrid() {
  return (
    <span className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="h-[3px] w-[3px] rounded-full bg-ink" />
      ))}
    </span>
  );
}

// Authenticated top bar: avatar at left, dot-grid menu at right that opens a
// small dropdown with navigation + a sign-out action.
export function TopBar() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between px-4 py-3">
        {/* Avatar */}
        <Link
          href="/"
          aria-label="Account"
          className="grid h-10 w-10 place-items-center rounded-full bg-dark text-on-dark"
        >
          <User size={18} />
        </Link>

        {/* Menu */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2/60 active:bg-surface-2"
          >
            <DotGrid />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-12 w-52 overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-ink-soft/15"
            >
              <nav className="py-1">
                {MENU_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-ink hover:bg-surface-2/70"
                  >
                    <Icon size={17} className="text-ink-soft" />
                    <span className="text-sm">{label}</span>
                  </Link>
                ))}
              </nav>

              <div className="border-t border-ink-soft/20" />

              <form action={signOut}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-alert hover:bg-surface-2/70"
                >
                  <LogOut size={17} />
                  <span className="text-sm">Sign out</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
