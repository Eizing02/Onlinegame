import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
              <GraduationCap size={22} />
            </span>
            <span className="text-base font-semibold">Realtime Quiz Game</span>
          </Link>
          <nav className="hidden items-center gap-2 text-sm font-medium text-muted sm:flex">
            <Link
              className="rounded-md px-3 py-2 hover:bg-surface"
              href="/login"
            >
              ครู
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-surface" href="/login">
              นักเรียน
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
