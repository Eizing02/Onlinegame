import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { AppRole } from "@/types/auth";

export async function authorizeApi(request: Request, role: AppRole) {
  const session = await getSession();
  if (!session || session.role !== role) return { ok: false as const, response: NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง", code: "SESSION_EXPIRED", redirectTo: "/login" }, { status: 401 }) };
  const expected = request.headers.get("x-client-session");
  if (expected && expected !== session.sessionId) return { ok: false as const, response: NextResponse.json({ error: "บัญชีที่ใช้งานเปลี่ยนไป กรุณาเปิดหน้าใหม่", code: "ACCOUNT_CHANGED", redirectTo: "/" }, { status: 409 }) };
  return { ok: true as const, session };
}
