"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { findAccountByCredentials } from "@/lib/auth/accounts";
import { normalizeUserCode } from "@/lib/auth/account-format";
import { clearSession, createSession } from "@/lib/auth/session";
import { getSessionLanding } from "@/lib/auth/landing";
import { getDataBackend } from "@/lib/data/backend";
import { getAuthMode, getTrustedAppUrl } from "@/lib/auth/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error: string; userCode: string };
export async function signInWithSheetAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (getAuthMode() !== "legacy") return { error: "กรุณาเข้าสู่ระบบด้วย Google", userCode: "" };
  const userCode = normalizeUserCode(String(formData.get("user_code") || ""));
  const password = String(formData.get("password") || "");
  if (!userCode || !password) return { error: "กรุณากรอกรหัสผู้ใช้และรหัสผ่านให้ครบ", userCode };
  if (userCode.length > 100 || password.length > 256) return { error: "รหัสผู้ใช้หรือรหัสผ่านยาวเกินไป", userCode };
  const traceId = randomUUID().slice(0, 8);
  let destination: string;
  try {
    const account = await findAccountByCredentials(userCode, password);
    if (!account) return { error: "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจแล้วลองอีกครั้ง", userCode };
    destination = await getSessionLanding(account);
    await createSession(account);
    if (process.env.AUTH_DIAGNOSTICS === "1") console.info("auth_login", { traceId, backend: getDataBackend(), role: account.role, destination: account.role });
  } catch (error) {
    const code = error instanceof Error ? error.message : "BACKEND_ERROR";
    // Never log credentials, tokens, or raw database errors.
    console.error("auth_login_failed", { traceId, backend: getDataBackend(), category: code.startsWith("ACCOUNT_") ? "account_configuration" : code.startsWith("AUTH_SECRET") ? "session_configuration" : "backend" });
    const message = code.startsWith("ACCOUNT_")
      ? "ข้อมูลบัญชีหรือสิทธิ์ยังไม่ถูกต้อง กรุณาให้ผู้ดูแลตรวจบัญชีนี้ก่อน"
      : code.startsWith("AUTH_SECRET") ? "ระบบเข้าสู่ระบบยังตั้งค่าไม่ครบ กรุณาแจ้งผู้ดูแล"
      : "เชื่อมต่อข้อมูลบัญชีไม่ได้ กรุณาลองอีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแล";
    return { error: `${message} (อ้างอิง ${traceId})`, userCode };
  }
  redirect(destination);
}
export async function signOutAction() {
  if (getAuthMode() === "google") {
    try {
      const client = await createSupabaseServerClient();
      // Local removes this browser's cookies; other classroom devices stay signed in.
      await client.auth.signOut({ scope: "local" });
    } catch { /* Local credentials must still be cleared when Auth is unavailable. */ }
    finally {
      const { cookies } = await import("next/headers");
      const store = await cookies();
      store.getAll().filter(cookie => /^sb-.+-auth-token(?:\.\d+|-code-verifier(?:\.\d+)?)?$/.test(cookie.name))
        .forEach(cookie => store.delete(cookie.name));
    }
  }
  await clearSession();
  redirect("/login?notice=signed_out");
}

export async function signInWithGoogleAction(_previous: { error: string }): Promise<{ error: string }> {
  void _previous;
  if (getAuthMode() !== "google") return { error: "ยังไม่ได้เปิดใช้ Google Login" };
  let destination: string;
  try {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google", options: {
        redirectTo: new URL("/auth/callback", getTrustedAppUrl()).toString(),
        skipBrowserRedirect: true, scopes: "openid email profile", queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data.url) return { error: "เปิด Google Login ไม่สำเร็จ กรุณาลองอีกครั้ง" };
    destination = data.url;
  } catch { return { error: "ระบบ Google Login ยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแล" }; }
  redirect(destination);
}
