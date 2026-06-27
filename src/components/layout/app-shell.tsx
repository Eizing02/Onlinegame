import Link from "next/link";
import { GraduationCap, LogIn } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white shadow-sm transition group-hover:bg-primary-dark">
              <GraduationCap size={22} />
            </span>
            <span className="text-sm font-semibold tracking-wide text-white sm:text-base">
              KruEIonline
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-medium text-muted">
            <Link
              aria-label="เข้าสู่ระบบ"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-panel px-3 text-white transition hover:border-primary/70 hover:bg-primary/20"
              href="/login"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">เข้าสู่ระบบ</span>
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
