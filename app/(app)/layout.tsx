import type { ReactNode } from "react";
import { TopBar } from "@/components/ui/TopBar";
import { BottomNav } from "@/components/ui/BottomNav";

// Authenticated app shell: sage page background, sticky top bar, a centered
// phone-width column, and a sticky bottom nav. Server component.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <TopBar />
      <main className="mx-auto w-full max-w-[480px] px-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
