import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b border-cyan/20 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group inline-flex items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan"
          >
            <Image
              alt="KruEIonline"
              className="h-14 w-auto object-contain drop-shadow-[0_10px_28px_rgba(67,221,255,0.22)] transition duration-200 group-hover:scale-[1.02]"
              height={100}
              priority
              src="/assets/brand/logo.png"
              width={180}
            />
            <span className="sr-only">KruEIonline</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-medium text-muted">
            <Link
              aria-label="เข้าสู่ระบบ"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-cyan/40 bg-cyan/10 px-3 text-white transition hover:border-cyan hover:bg-cyan/20"
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
