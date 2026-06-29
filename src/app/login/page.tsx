import { LogIn, Sparkles, Trophy, UsersRound } from "lucide-react";
import Image from "next/image";

import { signInWithSheetAction } from "@/app/auth/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AppShell>
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-panel p-6 shadow-sm">
            <div className="relative space-y-8">
              <div>
                <Image
                  alt="KruEIonline"
                  className="h-28 w-auto object-contain drop-shadow-[0_18px_36px_rgba(67,221,255,0.24)]"
                  height={150}
                  priority
                  src="/assets/brand/logo.png"
                  width={280}
                />
                <h1 className="mt-3 max-w-md text-5xl font-semibold leading-tight text-white">
                  ร่วมกันตอบ ทำคะแนนสูงสุดเพื่อทีม
                </h1>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Room</span>
                    <span className="rounded-lg bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                      LIVE
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-5xl font-semibold tracking-[0.18em] text-white">
                    8527
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <UsersRound className="text-cyan" size={22} />
                    <p className="mt-4 text-2xl font-semibold">4</p>
                    <p className="text-xs text-muted">ทีม</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <Trophy className="text-warning" size={22} />
                    <p className="mt-4 text-2xl font-semibold">1</p>
                    <p className="text-xs text-muted">นำอยู่</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <Sparkles className="text-success" size={22} />
                    <p className="mt-4 text-2xl font-semibold">สด</p>
                    <p className="text-xs text-muted">คะแนน</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Panel className="mx-auto w-full max-w-md space-y-6 p-6 sm:p-8">
          <div className="space-y-2">
            <Image
              alt="KruEIonline"
              className="h-20 w-auto object-contain drop-shadow-[0_14px_30px_rgba(67,221,255,0.24)]"
              height={120}
              priority
              src="/assets/brand/logo.png"
              width={220}
            />
            <h2 className="text-3xl font-semibold text-white">
              เข้าสู่ระบบ
            </h2>
            <p className="text-sm text-muted">
              ร่วมกันตอบ ทำคะแนนสูงสุดเพื่อทีม
            </p>
          </div>

          {params.error ? (
            <div
              aria-live="polite"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {params.error}
            </div>
          ) : null}
          {params.notice ? (
            <div
              aria-live="polite"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
            >
              {params.notice}
            </div>
          ) : null}

          <form className="space-y-5" action={signInWithSheetAction}>
            <div>
              <label className="text-sm font-medium text-white" htmlFor="user_code">
                รหัสผู้ใช้
              </label>
              <input
                autoComplete="username"
                id="user_code"
                name="user_code"
                className="mt-2 h-12 w-full rounded-lg border border-border bg-background/70 px-4 uppercase outline-none transition focus:border-cyan focus:ring-4 focus:ring-cyan/20"
                placeholder="ใส่รหัสประจำตัวนักเรียนหรือรหัสครู"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white" htmlFor="password">
                รหัสผ่าน
              </label>
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                className="mt-2 h-12 w-full rounded-lg border border-border bg-background/70 px-4 outline-none transition focus:border-cyan focus:ring-4 focus:ring-cyan/20"
                placeholder="ใส่รหัสผ่านจากชีท"
                type="password"
                required
              />
            </div>
            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              type="submit"
            >
              <LogIn size={18} />
              เข้าสู่ระบบ
            </button>
          </form>
        </Panel>
      </section>
    </AppShell>
  );
}
