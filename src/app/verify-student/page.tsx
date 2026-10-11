import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StudentLinkForm } from "@/components/auth/student-link-form";
import { signOutAction } from "@/app/auth/actions";
import { getAuthMode } from "@/lib/auth/mode";
import { getGoogleAccountState, googleStatePath } from "@/lib/auth/google-session";
import { getSessionLanding } from "@/lib/auth/landing";
export const dynamic = "force-dynamic";

export default async function VerifyStudentPage() {
  if (getAuthMode() !== "google") redirect("/login");
  const state = await getGoogleAccountState();
  if (state.kind === "linked") redirect(await getSessionLanding(state.session));
  if (state.kind !== "unlinked") redirect(googleStatePath(state));
  return <AppShell><section className="identity-page"><h1>เชื่อมรหัสนักเรียน</h1>
    <p className="text-muted">เข้าสู่ระบบด้วย <strong className="identity-email">{state.identity.email}</strong></p>
    <p>กรอกรหัสของคุณ แล้วตรวจสอบชื่อและชั้นก่อนยืนยัน</p>
    <StudentLinkForm />
    <p className="identity-footnote">สำหรับครู: ใช้บัญชี Google ที่ผู้ดูแลเพิ่มสิทธิ์ไว้ หากยังไม่มีสิทธิ์ กรุณาติดต่อผู้ดูแล</p>
    <form action={signOutAction}><button className="identity-secondary" type="submit">ออกจากระบบเพื่อเลือกบัญชี Google อื่น</button></form>
  </section></AppShell>;
}
