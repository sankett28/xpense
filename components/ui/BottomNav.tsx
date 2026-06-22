"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, LayoutDashboard, BarChart3 } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/credits", label: "Credits", icon: Wallet },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
] as const;

// Sticky bottom navigation for mobile. Stays within the centered app column.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto w-full max-w-[480px] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around rounded-2xl bg-dark px-2 py-2 shadow-lg">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors",
                  active ? "text-accent" : "text-on-dark/70 hover:text-on-dark",
                ].join(" ")}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium tracking-wide">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default BottomNav;
