import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { AppRole } from "@/types/auth";
import { getAuthMode, isTrustedMutation } from "./mode";
import { getGoogleAccountState, googleStatePath } from "./google-session";

export async function authorizeApi(request: Request, role: AppRole) {
  const session = await getSession();
  if (!session || session.role !== role) {
    const state = getAuthMode() === "google" ? await getGoogleAccountState() : null;
    return { ok: false as const, response: NextResponse.json({ error: "บัญชีนี้ไม่มีสิทธิ์ใช้งาน กรุณาตรวจบัญชีหรือเข้าสู่ระบบอีกครั้ง", code: state?.kind === "denied" ? "ACCESS_DENIED" : "SESSION_EXPIRED", redirectTo: state ? googleStatePath(state) : "/login" }, { status: state && (session || state.kind === "denied") ? 403 : 401, headers: { "Cache-Control": "private, no-store" } }) };
  }
  if (session.authMode === "google" && !['GET','HEAD','OPTIONS'].includes(request.method) && !isTrustedMutation(request)) {
    return { ok: false as const, response: NextResponse.json({ error: "ต้นทางคำขอไม่ถูกต้อง" }, { status: 403 }) };
  }
  const expected = request.headers.get("x-client-session");
  if (expected && expected !== session.sessionId) return { ok: false as const, response: NextResponse.json({ error: "บัญชีที่ใช้งานเปลี่ยนไป กรุณาเปิดหน้าใหม่", code: "ACCOUNT_CHANGED", redirectTo: "/" }, { status: 409 }) };
  return { ok: true as const, session };
}
