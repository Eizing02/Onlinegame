import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { StudentLinkForm } from "@/components/auth/student-link-form";
import { requireRole } from "@/lib/auth/session";
import { getAuthMode } from "@/lib/auth/mode";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (getAuthMode() !== "google") redirect("/join");
  const session = await requireRole("student");
  return <AppShell><section className="identity-page"><Link className="identity-back" href="/join">กลับไปเข้าห้องเกม</Link><h1>ข้อมูลบัญชี</h1>
    <dl className="identity-details"><div><dt>บัญชี Google</dt><dd>{session.email}</dd></div><div><dt>รหัสนักเรียน</dt><dd>{session.userCode}</dd></div><div><dt>ชื่อ–นามสกุล</dt><dd>{session.displayName}</dd></div><div><dt>ชั้น</dt><dd>{session.grade || "ยังไม่ได้ระบุ"}</dd></div></dl>
    <details className="identity-disclosure"><summary>เปลี่ยนรหัสประจำตัวนักเรียน</summary><StudentLinkForm changing sessionId={session.sessionId} /></details>
    <p className="identity-footnote">รหัสถูกผูกกับบัญชีอื่นหรือข้อมูลไม่ใช่ของคุณ ให้ติดต่อผู้ดูแลเพื่อตรวจสอบและแก้ไขการเชื่อมบัญชี</p>
  </section></AppShell>;
}
