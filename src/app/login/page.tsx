import { LogIn } from "lucide-react";

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
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold">เข้าสู่ระบบด้วยรหัสจากชีท</h1>
          <p className="max-w-xl leading-7 text-muted">
            ใช้รหัสผู้ใช้และรหัสผ่านจากไฟล์ student.csv
            ที่ export มาจาก Supabase โดยใช้คอลัมน์ id, name, password, grade, role
            ระบบจะแยกบทบาทให้อัตโนมัติ ถ้าเป็นครูจะเข้าหน้าจัดการเกม
            ถ้าเป็นนักเรียนจะไปหน้าเข้าห้องแข่งขัน
          </p>
        </div>
        <Panel className="space-y-5">
          {params.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {params.error}
            </div>
          ) : null}
          {params.notice ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {params.notice}
            </div>
          ) : null}

          <form className="space-y-5" action={signInWithSheetAction}>
            <div>
              <label className="text-sm font-medium" htmlFor="user_code">
                รหัสผู้ใช้
              </label>
              <input
                id="user_code"
                name="user_code"
                className="mt-2 h-11 w-full rounded-md border border-border px-3 uppercase outline-none focus:border-primary"
                placeholder="เช่น admin หรือ 02074"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="password">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                placeholder="รหัสผ่านจากชีท"
                type="password"
                required
              />
            </div>
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
              type="submit"
            >
              <LogIn size={18} />
              เข้าสู่ระบบ
            </button>
          </form>

          <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm leading-6 text-muted">
            ตัวอย่างสำหรับทดสอบให้ใช้รหัสตามไฟล์ data/student.csv
          </div>
        </Panel>
      </section>
    </AppShell>
  );
}
