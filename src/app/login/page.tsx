import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Scene3D } from "@/components/game/scene-3d";
import { LoginForm } from "./login-form";
import { getSession } from "@/lib/auth/session";
import { getSessionLanding } from "@/lib/auth/landing";
import { getAuthMode } from "@/lib/auth/mode";
import { getGoogleAccountState, googleStatePath } from "@/lib/auth/google-session";
import { GoogleLoginForm } from "./google-login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{error?: string; notice?: string; reason?: string}> }) {
  const session = await getSession();
  if (session) redirect(await getSessionLanding(session));
  const google = getAuthMode() === "google";
  if (google) {
    const state = await getGoogleAccountState();
    if (state.kind !== "signed_out") redirect(googleStatePath(state));
  }
  const params = await searchParams;
  return <AppShell><section className="login-layout">
    <div className="login-world">
      <h1>ร่วมกันตอบ<br />ทำคะแนนสูงสุดเพื่อทีม</h1>
      <Scene3D variant="planet" />
      <p className="text-muted">เข้าสู่ระบบ แล้วเตรียมพร้อมสำหรับคำถามต่อไป</p>
    </div>
    <div className="login-card"><h2>เข้าสู่ระบบ</h2>
      <p className="text-muted">{google ? "เลือกบัญชี Google ของคุณเพื่อเข้าเกมหรือเปิดหน้าครู" : "ใช้รหัสประจำตัวและรหัสผ่านที่ได้รับจากครู"}</p>
      {params.error && <p className="form-error" role="alert">{google ? (params.error === "oauth_cancelled" ? "ยกเลิกการเข้าสู่ระบบแล้ว เลือกบัญชี Google อีกครั้งได้เลย" : "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่") : params.error}</p>}
      {params.reason === "session_expired" && <p className="form-error" role="alert">กรุณาเข้าสู่ระบบอีกครั้งเพื่อใช้งานต่อ</p>}
      {params.notice && <p className="form-notice" role="status">{params.notice === "signed_out" ? "ออกจากระบบแล้ว" : params.notice}</p>}
      {google ? <GoogleLoginForm /> : <LoginForm />}
    </div>
  </section></AppShell>;
}
