import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AppRole, AppSession, SheetAccount } from "@/types/auth";

const SESSION_COOKIE = "rqg_session";

function encodeSession(session: AppSession) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodeSession(value: string): AppSession | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as AppSession;

    if (
      !parsed.userCode ||
      !parsed.displayName ||
      (parsed.role !== "teacher" && parsed.role !== "student")
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function createSession(account: SheetAccount) {
  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE,
    encodeSession({
      userCode: account.userCode,
      role: account.role,
      displayName: account.displayName,
      grade: account.grade,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  );
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  return value ? decodeSession(value) : null;
}

export async function requireRole(role: AppRole) {
  const session = await getSession();

  if (!session) {
    redirect("/login?error=กรุณาเข้าสู่ระบบก่อน");
  }

  if (session.role !== role) {
    const target = session.role === "teacher" ? "/teacher/question-sets" : "/join";
    redirect(target);
  }

  return session;
}
