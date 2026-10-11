import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthMode } from "@/lib/auth/mode";
import { getGoogleAccountState } from "@/lib/auth/google-session";
import { authMessage } from "@/lib/auth/auth-messages";
import { signOutAction } from "@/app/auth/actions";
export const dynamic = "force-dynamic";

export default async function AccessDeniedPage() {
  if (getAuthMode() !== "google") redirect("/login");
  const state = await getGoogleAccountState();
  if (state.kind === "signed_out") redirect("/login");
  if (state.kind === "unlinked") redirect("/verify-student");
  return <AppShell><section className="identity-page"><h1>ยังเข้าใช้งานหน้านี้ไม่ได้</h1>
    {state.kind === "denied" && state.identity && <p className="text-muted identity-email">{state.identity.email}</p>}
    <p className="notice-error" role="alert">{state.kind === "denied" ? authMessage(state.code) : "บัญชีนี้ไม่ได้รับสิทธิ์จัดการครู หากต้องการสิทธิ์เพิ่มเติม กรุณาติดต่อผู้ดูแล"}</p>
    <div className="identity-actions"><Link className="identity-secondary" href="/">ตรวจสอบสิทธิ์อีกครั้ง</Link><form action={signOutAction}><button className="game-button" type="submit">ออกจากระบบ</button></form></div>
  </section></AppShell>;
}
