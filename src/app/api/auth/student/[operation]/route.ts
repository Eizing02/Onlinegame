import { NextResponse } from "next/server";
import { getAuthMode, isTrustedMutation } from "@/lib/auth/mode";
import { getGoogleAccountState } from "@/lib/auth/google-session";
import { studentAccountOperation, authMessage } from "@/lib/auth/account-linking";

export async function POST(request: Request, { params }: { params: Promise<{ operation: string }> }) {
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  if (getAuthMode() !== "google") return json({ error: "เส้นทางนี้ใช้กับ Google Login", code: "GOOGLE_MODE_REQUIRED" }, 404);
  if (!isTrustedMutation(request)) return json({ error: "ต้นทางคำขอไม่ถูกต้อง" }, 403);
  const state = await getGoogleAccountState();
  if (state.kind !== "unlinked" && !(state.kind === "linked" && state.session.role === "student")) {
    return json({ error: authMessage(state.kind === "denied" ? state.code : "SESSION_EXPIRED"), code: "ACCESS_DENIED" }, state.kind === "signed_out" ? 401 : 403);
  }
  if (state.kind === "linked") {
    const expected = request.headers.get("x-client-session");
    if (expected && expected !== state.session.sessionId) return json({ error: authMessage("ACCOUNT_CHANGED"), code: "ACCOUNT_CHANGED" }, 409);
  }
  const { operation } = await params;
  const action = operation === "change-code" ? "switch" : operation;
  if (!['lookup','claim','switch'].includes(action)) return json({ error: "ไม่พบรายการนี้" }, 404);
  if (Number(request.headers.get("content-length") || 0) > 2048) return json({ error: "ข้อมูลยาวเกินไป" }, 413);
  let code: string;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: "ข้อมูลยาวเกินไป" }, 413);
    const body = JSON.parse(text);
    code = typeof body.studentCode === "string" ? body.studentCode : "";
  } catch { return json({ error: "ข้อมูลคำขอไม่ถูกต้อง" }, 400); }
  const result = await studentAccountOperation(state.identity, action as "lookup" | "claim" | "switch", code);
  if (!result.ok) return json({ code: result.code, error: authMessage(result.code) }, result.code === "RATE_LIMITED" ? 429 : result.code === "AUTH_CONFIGURATION" ? 503 : 409);
  return json({ ...result, redirectTo: action === "lookup" ? undefined : "/" });
}
