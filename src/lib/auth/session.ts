import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findAccountByCode } from "@/lib/auth/accounts";
import { createSessionToken, matchesAccountVersion, SESSION_DURATION, verifySessionToken } from "@/lib/auth/session-token";
import type { AppRole, AppSession, SheetAccount } from "@/types/auth";
const SESSION_COOKIE = "rqg_session_v2";
export function getRoleHome(role: AppRole) { return role === "teacher" ? "/teacher/question-sets" : "/join"; }
export async function createSession(account: SheetAccount) {
  const store = await cookies();
  const { token } = await createSessionToken(account);
  store.delete("rqg_session");
  store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DURATION });
}
export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE); store.delete("rqg_session");
}
export const getSession = cache(async (): Promise<AppSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const verified = await verifySessionToken(token);
  if (!verified) return null;
  const account = await findAccountByCode(verified.userCode);
  if (!account || !await matchesAccountVersion(account, verified.version)) return null;
  return { userCode: account.userCode, role: account.role, displayName: account.displayName, grade: account.grade, sessionId: verified.sessionId };
});
export async function requireRole(role: AppRole) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (session.role !== role) redirect(getRoleHome(session.role));
  return session;
}
