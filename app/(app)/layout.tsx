import type { ReactNode } from "react";
import { TopBar } from "@/components/ui/TopBar";

// Authenticated app shell: sage page background, sticky top bar, and a centered
// phone-width column. Navigation lives in the top bar's dropdown menu. Server
// component.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <TopBar />
      <main className="mx-auto w-full max-w-[480px] px-4 pb-12">{children}</main>
    </div>
  );
}
